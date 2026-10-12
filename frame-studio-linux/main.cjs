const { app, BrowserWindow, ipcMain, dialog, shell, protocol, net, session } = require('electron');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');
const { execFile, spawn } = require('node:child_process');
const { promisify } = require('node:util');
const execFileAsync = promisify(execFile);
const { pathToFileURL } = require('node:url');
const { checkMediaTools, probeMedia, transcodeWebmToMp4, renderFrameSequenceToMp4, ExportCanceledError } = require('./media-export.cjs');
const activeExports = new Map();
const activeYoutubeDownloads = new Map();
const trustedRendererURL = pathToFileURL(path.join(__dirname, 'index.html')).href;
let microphonePermissionDecision = null;

function assertTrustedSender(event) {
  if (!event?.senderFrame || event.senderFrame.url !== trustedRendererURL) {
    throw new Error('Unauthorized IPC origin.');
  }
}

function sendExportProgress(sender, data) {
  if (!sender.isDestroyed()) sender.send('frame:export-progress', data);
}

protocol.registerSchemesAsPrivileged([
  { scheme: 'frame-media', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }
]);

function supportsAutomaticUpdates() {
  if (!app.isPackaged) return false;
  if (process.platform === 'win32') {
    // electron-updater supports the installed NSIS build, not electron-builder's portable EXE.
    return !process.env.PORTABLE_EXECUTABLE_DIR && !process.env.PORTABLE_EXECUTABLE_FILE;
  }
  // On Linux, automatic replacement is supported for the user-owned AppImage.
  // DEB/RPM installations should be updated through their package workflow.
  if (process.platform === 'linux') return Boolean(process.env.APPIMAGE);
  return false;
}

function setupAutomaticUpdates() {
  if (!supportsAutomaticUpdates()) {
    console.info('FRAME Studio automatic updates are disabled for this development/package format.');
    return;
  }

  let autoUpdater;
  try {
    ({ autoUpdater } = require('electron-updater'));
  } catch (error) {
    console.warn('FRAME Studio updater dependency is unavailable:', error?.message || error);
    return;
  }

  autoUpdater.logger = console;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;
  autoUpdater.allowDowngrade = false;

  let promptOpen = false;
  let downloadRequested = false;
  const getWindow = () => BrowserWindow.getAllWindows().find(win => !win.isDestroyed()) || null;
  const showMessage = async options => {
    const win = getWindow();
    return win ? dialog.showMessageBox(win, options) : dialog.showMessageBox(options);
  };
  const notifyRenderer = state => {
    const win = getWindow();
    if (win && !win.webContents.isDestroyed()) win.webContents.send('frame:auto-update-progress', state);
  };

  autoUpdater.on('checking-for-update', () => console.info('Checking for FRAME Studio updates…'));
  autoUpdater.on('update-not-available', info => console.info(`FRAME Studio is up to date (${info?.version || app.getVersion()}).`));

  autoUpdater.on('update-available', async info => {
    if (promptOpen) return;
    promptOpen = true;
    try {
      const result = await showMessage({
        type: 'info',
        title: 'FRAME Studio — Update available',
        message: `FRAME Studio ${info.version} is available`,
        detail: `Installed version: ${app.getVersion()}.\nDownload the update now? You can keep working while it downloads.`,
        buttons: ['Download update', 'Later'],
        defaultId: 0,
        cancelId: 1,
        noLink: true
      });
      if (result.response === 0) {
        downloadRequested = true;
        notifyRenderer({ stage: 'downloading', percent: 0 });
        autoUpdater.downloadUpdate().catch(async error => {
          if (!downloadRequested) return;
          downloadRequested = false;
          notifyRenderer({ stage: 'error' });
          console.error('FRAME Studio update download failed:', error);
          await showMessage({
            type: 'error',
            title: 'FRAME Studio — Update failed',
            message: 'The update could not be downloaded.',
            detail: String(error?.message || error).slice(0, 1800),
            buttons: ['OK'],
            noLink: true
          }).catch(() => {});
        });
      }
    } catch (error) {
      console.error('Could not display the FRAME Studio update prompt:', error);
    } finally {
      promptOpen = false;
    }
  });

  autoUpdater.on('download-progress', progress => {
    notifyRenderer({ stage: 'downloading', percent: Number(progress?.percent) || 0 });
  });

  autoUpdater.on('update-downloaded', async info => {
    downloadRequested = false;
    notifyRenderer({ stage: 'downloaded', percent: 100 });
    try {
      const result = await showMessage({
        type: 'info',
        title: 'FRAME Studio — Update ready',
        message: `FRAME Studio ${info.version} has been downloaded.`,
        detail: 'Restart now to install the update. If you choose Later, it will install when you close the app.',
        buttons: ['Restart now', 'Later — install on close'],
        defaultId: 0,
        cancelId: 1,
        noLink: true
      });
      if (result.response === 0) autoUpdater.quitAndInstall(false, true);
    } catch (error) {
      console.error('Could not display the FRAME Studio restart prompt:', error);
    }
  });

  autoUpdater.on('error', error => {
    console.warn('FRAME Studio update check/update error:', error?.message || error);
    if (!downloadRequested) return; // Keep offline startup quiet unless the user chose to update.
    downloadRequested = false;
    notifyRenderer({ stage: 'error' });
    showMessage({
      type: 'error',
      title: 'FRAME Studio — Update failed',
      message: 'The update could not be installed.',
      detail: String(error?.message || error).slice(0, 1800),
      buttons: ['OK'],
      noLink: true
    }).catch(() => {});
  });

  const check = () => {
    if (downloadRequested) return;
    autoUpdater.checkForUpdates().catch(error => console.warn('FRAME Studio update check failed:', error?.message || error));
  };
  const startupCheck = setTimeout(check, 9000);
  startupCheck.unref?.();
  const periodicCheck = setInterval(check, 6 * 60 * 60 * 1000);
  periodicCheck.unref?.();
}

function toolFilename(tool) {
  const suffix = process.platform === 'win32' ? '.exe' : '';
  return `${tool}${suffix}`;
}

function bundledToolPath(tool) {
  const filename = toolFilename(tool);
  const platformFolder = process.platform === 'win32' ? 'win' : process.platform === 'linux' ? 'linux' : process.platform;
  const candidates = [];
  if (app.isPackaged && process.resourcesPath) candidates.push(path.join(process.resourcesPath, 'downloader', filename));
  candidates.push(path.join(__dirname, 'vendor', platformFolder, filename));
  for (const candidate of candidates) {
    try {
      if (fsSync.statSync(candidate).isFile()) return candidate;
    } catch {}
  }
  return null;
}

function downloaderToolCommand(tool) {
  return bundledToolPath(tool) || toolFilename(tool);
}

function configureBundledMediaTools() {
  const ffmpeg = bundledToolPath('ffmpeg');
  const ffprobe = bundledToolPath('ffprobe');
  if (ffmpeg && !process.env.FRAME_FFMPEG_PATH) process.env.FRAME_FFMPEG_PATH = ffmpeg;
  if (ffprobe && !process.env.FRAME_FFPROBE_PATH) process.env.FRAME_FFPROBE_PATH = ffprobe;
}

async function videoDownloaderToolsStatus() {
  const check = async (tool) => {
    const bundledPath = bundledToolPath(tool);
    const command = bundledPath || toolFilename(tool);
    try {
      const result = await execFileAsync(command, ['--version'], { encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024, windowsHide: true });
      const output = `${result.stdout || ''}\n${result.stderr || ''}`;
      return { available: true, version: output.split(/\r?\n/).map(line => line.trim()).find(Boolean) || '', source: bundledPath ? 'bundled' : 'system' };
    } catch (error) {
      return { available: false, version: '', source: 'missing', reason: error?.code === 'ENOENT' ? 'not-found' : String(error?.message || error).slice(0, 240) };
    }
  };
  const [ytDlp, ffmpeg] = await Promise.all([check('yt-dlp'), check('ffmpeg')]);
  return {
    ytDlp: ytDlp.available,
    ytDlpVersion: ytDlp.version,
    ytDlpSource: ytDlp.source,
    ffmpeg: ffmpeg.available,
    ffmpegVersion: ffmpeg.version,
    ffmpegSource: ffmpeg.source,
    ffprobe: (await check('ffprobe')).available,
    bundled: ytDlp.source === 'bundled' && ffmpeg.source === 'bundled',
    platform: process.platform
  };
}

const DOWNLOADED_MEDIA_EXTENSIONS = new Set([
  '.mp4', '.m4v', '.mov', '.mkv', '.webm', '.avi', '.mpeg', '.mpg', '.wmv',
  '.mp3', '.m4a', '.aac', '.wav', '.ogg', '.opus', '.flac',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.avif'
]);

function downloadedMediaRoot() {
  return path.join(app.getPath('userData'), 'Media Library', 'Downloaded Media');
}

function normalizeLibraryRelative(value, allowRoot = true) {
  if (value == null || value === '') {
    if (allowRoot) return '';
    throw new Error('Choose a downloaded media file.');
  }
  const raw = String(value).trim().replace(/\\/g, '/');
  if (!raw || raw.startsWith('/') || /^[a-zA-Z]:/.test(raw) || raw.includes('\0')) throw new Error('Invalid library path.');
  const pieces = raw.split('/').filter(Boolean);
  if (!pieces.length && allowRoot) return '';
  if (pieces.some(piece => piece === '.' || piece === '..' || piece.includes('\0'))) throw new Error('Invalid library path.');
  return pieces.join('/');
}

function resolveLibraryPath(relative = '') {
  const root = path.resolve(downloadedMediaRoot());
  const normalized = normalizeLibraryRelative(relative, true);
  const target = path.resolve(root, ...normalized.split('/').filter(Boolean));
  const fromRoot = path.relative(root, target);
  if (fromRoot === '..' || fromRoot.startsWith(`..${path.sep}`) || path.isAbsolute(fromRoot)) throw new Error('Library path escapes the downloaded-media folder.');
  return { root, target, relative: normalized };
}

function downloadedMediaKind(extension) {
  const ext = String(extension || '').toLowerCase();
  if (['.mp3', '.m4a', '.aac', '.wav', '.ogg', '.opus', '.flac'].includes(ext)) return 'audio';
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.avif'].includes(ext)) return 'image';
  if (['.mp4', '.m4v', '.mov', '.mkv', '.webm', '.avi', '.mpeg', '.mpg', '.wmv'].includes(ext)) return 'video';
  return null;
}

async function collectLibraryFolders(root) {
  const result = [''];
  const walk = async (directory, relative, depth) => {
    if (depth >= 12) return;
    let entries = [];
    try { entries = await fs.readdir(directory, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink() || entry.name.startsWith('.')) continue;
      const childRelative = relative ? `${relative}/${entry.name}` : entry.name;
      result.push(childRelative);
      await walk(path.join(directory, entry.name), childRelative, depth + 1);
    }
  };
  await walk(root, '', 0);
  return result.sort((a, b) => a.localeCompare(b));
}

async function listDownloadedMediaFolder(relativeFolder = '') {
  const { root, target, relative } = resolveLibraryPath(relativeFolder);
  await fs.mkdir(target, { recursive: true });
  const stat = await fs.lstat(target);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('The selected library location is not a folder.');
  const rawEntries = await fs.readdir(target, { withFileTypes: true });
  const entries = [];
  for (const entry of rawEntries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(target, entry.name);
    if (entry.isDirectory() && !entry.isSymbolicLink()) {
      entries.push({ type: 'folder', name: entry.name, relativePath: relative ? `${relative}/${entry.name}` : entry.name });
      continue;
    }
    if (!entry.isFile() || entry.isSymbolicLink()) continue;
    const extension = path.extname(entry.name).toLowerCase();
    const kind = downloadedMediaKind(extension);
    if (!kind) continue;
    let fileStat;
    try { fileStat = await fs.stat(fullPath); } catch { continue; }
    entries.push({ type: 'file', name: entry.name, extension, kind, size: fileStat.size, modifiedAt: fileStat.mtimeMs, relativePath: relative ? `${relative}/${entry.name}` : entry.name });
  }
  entries.sort((a, b) => a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'folder' ? -1 : 1);
  const parentFolder = relative.includes('/') ? relative.slice(0, relative.lastIndexOf('/')) : '';
  return { rootLabel: 'Downloaded Media', currentFolder: relative, parentFolder, entries, folders: await collectLibraryFolders(root) };
}

async function createDownloadedMediaFolder(relativeParent, folderName) {
  const parent = normalizeLibraryRelative(relativeParent, true);
  const name = String(folderName || '').trim();
  if (!name || name === '.' || name === '..' || /[\\/:*?"<>|\u0000-\u001f]/.test(name)) throw new Error('Use a folder name without path separators or reserved characters.');
  const clean = name.replace(/\.+$/g, '').trim();
  if (!clean || clean.startsWith('.')) throw new Error('Choose a different folder name.');
  const relative = parent ? `${parent}/${clean}` : clean;
  const { target } = resolveLibraryPath(relative);
  await fs.mkdir(target, { recursive: false });
  return { name: clean, relativePath: relative };
}

async function resolveDownloadedMedia(relativeFile) {
  const { root, target, relative } = resolveLibraryPath(normalizeLibraryRelative(relativeFile, false));
  const stat = await fs.lstat(target).catch(() => null);
  if (!stat?.isFile() || stat.isSymbolicLink()) throw new Error('Downloaded media was not found in the library.');
  const extension = path.extname(target).toLowerCase();
  const kind = downloadedMediaKind(extension);
  if (!kind) throw new Error('This file type is not supported in the media library.');
  return { path: target, name: path.basename(target), extension, kind, size: stat.size, relativePath: relative, root };
}

function validateYouTubeURL(value) {
  let url;
  try { url = new URL(String(value || '').trim()); } catch { throw new Error('Enter a valid YouTube video URL.'); }
  if (url.protocol !== 'https:') throw new Error('Only HTTPS YouTube URLs are accepted.');
  const host = url.hostname.toLowerCase();
  const allowed = host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtube-nocookie.com' || host.endsWith('.youtube-nocookie.com');
  if (!allowed) throw new Error('This downloader only accepts youtube.com and youtu.be URLs.');
  if (url.username || url.password) throw new Error('URLs containing credentials are not allowed.');
  return url.toString();
}

function sendYoutubeProgress(sender, data) {
  if (sender && !sender.isDestroyed()) sender.send('frame:youtube-download-progress', data);
}

async function runYoutubeDownload(event, payload) {
  assertTrustedSender(event);
  if (payload?.authorized !== true) throw new Error('Confirm that you own this content or have permission/a license to download it. Do not bypass DRM or access restrictions.');
  if (activeYoutubeDownloads.has(event.sender.id)) throw new Error('A YouTube download is already running.');
  const url = validateYouTubeURL(payload?.url);
  const format = payload?.format === 'mp3' ? 'mp3' : 'mp4';
  const allowedResolutions = new Set([360, 480, 720, 1080, 1440, 2160, 4320]);
  const allowedFps = new Set(['auto', '24', '25', '30', '50', '60', '120']);
  const maxHeight = Number(payload?.maxHeight);
  const maxFps = String(payload?.maxFps ?? 'auto');
  if (!allowedResolutions.has(maxHeight)) throw new Error('Choose a supported maximum resolution.');
  if (!allowedFps.has(maxFps)) throw new Error('Choose a supported maximum FPS.');

  const tools = await videoDownloaderToolsStatus();
  if (!tools.ytDlp) throw new Error('Bundled yt-dlp is unavailable and no system yt-dlp executable was found. Reinstall the official FRAME Studio package or install yt-dlp.');
  if (!tools.ffmpeg) throw new Error('Bundled FFmpeg is unavailable and no system FFmpeg executable was found. Reinstall the official FRAME Studio package or install FFmpeg.');

  const { root, target: targetDir, relative: targetRelative } = resolveLibraryPath(payload?.folder || '');
  await fs.mkdir(targetDir, { recursive: true });
  const folderStat = await fs.lstat(targetDir);
  if (!folderStat.isDirectory() || folderStat.isSymbolicLink()) throw new Error('Selected download destination is not a valid folder.');
  const tempDir = path.join(app.getPath('temp'), 'frame-ytdlp', randomUUID());
  await fs.mkdir(tempDir, { recursive: true });
  const ext = format === 'mp3' ? 'mp3' : 'mp4';
  const ytdlpCommand = downloaderToolCommand('yt-dlp');
  const bundledFfmpeg = bundledToolPath('ffmpeg');
  const args = [
    '--no-playlist', '--newline', '--progress', '--windows-filenames', '--no-overwrites',
    '--progress-template', 'download:FRAME_PROGRESS:%(progress._percent_str)s|%(progress.eta)s',
    '--paths', `home:${targetDir}`, '--paths', `temp:${tempDir}`,
    '-o', '%(title).180B [%(id)s].%(ext)s',
    '--print', 'after_move:FRAME_OUTPUT:%(filepath)s'
  ];
  if (bundledFfmpeg) args.push('--ffmpeg-location', path.dirname(bundledFfmpeg));
  if (format === 'mp3') {
    args.push('-f', 'bestaudio/best', '-x', '--audio-format', 'mp3', '--audio-quality', '0');
  } else {
    const cap = `[height<=${maxHeight}]${maxFps === 'auto' ? '' : `[fps<=${maxFps}]`}`;
    args.push('-f', `bv*${cap}+ba/b${cap}`, '--merge-output-format', 'mp4', '--remux-video', 'mp4');
  }
  args.push('--', url);
  sendYoutubeProgress(event.sender, { stage: 'starting', percent: 0, format, folder: targetRelative, detail: `Saving to ${targetRelative || 'Downloaded Media'}` });

  let finalOutputPath = '';
  try {
    await new Promise((resolve, reject) => {
      const child = spawn(ytdlpCommand, args, { cwd: tempDir, windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
      activeYoutubeDownloads.set(event.sender.id, child);
      let settled = false, lineBuffer = '', lastLog = '';
      const finish = (error) => {
        if (settled) return;
        settled = true;
        activeYoutubeDownloads.delete(event.sender.id);
        if (error) reject(error); else resolve();
      };
      const processText = (text, flush = false) => {
        lineBuffer += String(text || '');
        const lines = lineBuffer.split(/\r?\n/);
        lineBuffer = flush ? '' : (lines.pop() || '');
        if (flush && lines.length === 0 && text) lines.push(String(text));
        for (const line of lines) {
          const output = line.match(/^FRAME_OUTPUT:(.*)$/);
          if (output) { finalOutputPath = output[1].trim(); continue; }
          const progress = line.match(/FRAME_PROGRESS:\s*([\d.]+)%?\s*\|\s*(.*)/);
          if (progress) {
            sendYoutubeProgress(event.sender, { stage: 'downloading', percent: Math.max(0, Math.min(100, Number(progress[1]) || 0)), eta: progress[2].trim(), folder: targetRelative });
          } else if (line.trim()) {
            lastLog = line.trim().slice(0, 1200);
            if (/\[Merger\]|\[VideoConvertor\]|\[ExtractAudio\]|Post-process|Deleting original file/i.test(line)) sendYoutubeProgress(event.sender, { stage: 'processing', percent: 100, detail: lastLog });
          }
        }
      };
      child.stdout.on('data', processText);
      child.stderr.on('data', processText);
      child.once('error', error => finish(new Error(error?.code === 'ENOENT' ? 'Bundled yt-dlp could not start. Reinstall the official package or install yt-dlp.' : `Could not start yt-dlp: ${error?.message || error}`)));
      child.once('close', code => {
        if (lineBuffer.trim()) processText('\n', true);
        if (child.__frameCancelled) {
          sendYoutubeProgress(event.sender, { stage: 'cancelled', percent: 0 });
          finish(new Error('Download canceled by user.'));
          return;
        }
        if (code === 0) {
          finish();
        } else {
          sendYoutubeProgress(event.sender, { stage: 'error', percent: 0, detail: lastLog || `yt-dlp exited with code ${code}` });
          finish(new Error(`Download failed (exit code ${code}). ${lastLog}`));
        }
      });
    });

    let outputPath = finalOutputPath
      ? (path.isAbsolute(finalOutputPath) ? path.resolve(finalOutputPath) : path.resolve(targetDir, finalOutputPath))
      : '';
    if (outputPath) {
      const relativeToTarget = path.relative(targetDir, outputPath);
      if (relativeToTarget === '..' || relativeToTarget.startsWith(`..${path.sep}`) || path.isAbsolute(relativeToTarget)) throw new Error('Downloader reported a file outside the selected media folder.');
    } else {
      // Fallback for yt-dlp releases which do not emit the after_move print line.
      const entries = await fs.readdir(targetDir, { withFileTypes: true });
      const candidates = [];
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        const candidate = path.join(targetDir, entry.name);
        const stat = await fs.stat(candidate).catch(() => null);
        if (stat?.isFile() && stat.mtimeMs >= Date.now() - 10 * 60 * 1000 && path.extname(entry.name).toLowerCase() === `.${ext}`) candidates.push({ path: candidate, mtimeMs: stat.mtimeMs });
      }
      candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
      outputPath = candidates[0]?.path || '';
    }
    const outputStat = outputPath ? await fs.stat(outputPath).catch(() => null) : null;
    if (!outputPath || !outputStat?.isFile()) throw new Error('Download finished, but the final media file could not be found in the selected library folder.');
    const relativePath = path.relative(root, outputPath).split(path.sep).join('/');
    sendYoutubeProgress(event.sender, { stage: 'complete', percent: 100, output: path.basename(outputPath), relativePath, folder: targetRelative, detail: `Saved to ${targetRelative ? `Downloaded Media/${targetRelative}` : 'Downloaded Media'}` });
    return { canceled: false, path: outputPath, relativePath, format, folder: targetRelative };
  } finally {
    activeYoutubeDownloads.delete(event.sender.id);
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1580,
    height: 1000,
    minWidth: 1020,
    minHeight: 720,
    backgroundColor: '#101013',
    title: `FRAME Studio ${app.getVersion()}`,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  win.loadFile(path.join(__dirname, 'index.html'));
  return win;
}

app.whenReady().then(() => {
  configureBundledMediaTools();
  // Ask for microphone access only after the user starts an explicit recording.
  // This is scoped to the trusted local renderer and grants audio capture only.
  const appSession = session.defaultSession;
  appSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    if (permission !== 'media' || webContents?.getURL() !== trustedRendererURL) return false;
    if (details?.mediaTypes?.includes('video')) return false;
    return microphonePermissionDecision === true;
  });
  appSession.setPermissionRequestHandler(async (webContents, permission, callback, details) => {
    if (permission !== 'media' || webContents?.getURL() !== trustedRendererURL || details?.mediaTypes?.includes('video')) {
      callback(false);
      return;
    }
    if (microphonePermissionDecision !== null) {
      callback(microphonePermissionDecision === true);
      return;
    }
    try {
      const win = BrowserWindow.fromWebContents(webContents);
      const options = {
        type: 'question',
        title: 'Allow Microphone Access',
        message: 'FRAME Studio wants to use your microphone to record audio into the current project.',
        detail: 'Access is only used when you start a recording. You can deny access and continue editing normally.',
        buttons: ['Allow Microphone', 'Don’t Allow'],
        defaultId: 0,
        cancelId: 1,
        noLink: true
      };
      const result = win ? await dialog.showMessageBox(win, options) : await dialog.showMessageBox(options);
      microphonePermissionDecision = result.response === 0;
      callback(microphonePermissionDecision);
    } catch (error) {
      microphonePermissionDecision = false;
      callback(false);
    }
  });
  protocol.handle('frame-media', async (request) => {
    try {
      const target = new URL(request.url).searchParams.get('path');
      if (!target || !path.isAbsolute(target)) return new Response('Invalid media path', { status: 400 });
      const range = request.headers.get('range');
      const response = await net.fetch(pathToFileURL(target).toString(), range ? { headers: { Range: range } } : {});
      const headers = new Headers(response.headers);
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
      headers.set('Cache-Control', 'no-cache');
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    } catch (error) {
      return new Response(`Could not open media: ${error.message}`, { status: 404 });
    }
  });

  createWindow();
  setupAutomaticUpdates();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('frame:check-export-tools', async event => {
  assertTrustedSender(event);
  return checkMediaTools();
});

ipcMain.on('frame:cancel-export', event => {
  try { assertTrustedSender(event); } catch { return; }
  activeExports.get(event.sender.id)?.controller.abort();
});

// Deterministic frame-sequence export: the renderer seeks/draws each project-time
// frame in order; FFmpeg encodes the completed numbered sequence, never a live capture.
ipcMain.handle('frame:begin-frame-export', async (event, payload) => {
  assertTrustedSender(event);
  if (activeExports.has(event.sender.id)) throw new Error('An export is already running in this window.');
  if (!payload || !Number.isFinite(Number(payload.fps)) || !Number.isFinite(Number(payload.duration)) || !Number.isSafeInteger(Number(payload.frameCount))) {
    throw new Error('Invalid render configuration.');
  }
  const fps = Math.max(1, Math.min(120, Math.round(Number(payload.fps))));
  const duration = Number(payload.duration);
  const frameCount = Number(payload.frameCount);
  if (duration <= 0 || duration > 43200 || frameCount < 1 || frameCount > fps * 43200 || Math.abs(frameCount / fps - duration) > 1 / fps + 0.002) {
    throw new Error('Duration or frame count is outside the supported limits.');
  }
  const safeBase = String(payload.name || 'frame-studio-export')
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-')
    .replace(/\.(?:webm|mp4)$/i, '').slice(0, 150) || 'frame-studio-export';
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showSaveDialog(win, {
    title: 'Render deterministic composition to MP4',
    defaultPath: path.join(app.getPath('videos'), `${safeBase}.mp4`),
    filters: [{ name: 'MP4 Video (H.264 + AAC)', extensions: ['mp4'] }]
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  const extension = path.extname(result.filePath);
  const outputPath = extension.toLowerCase() === '.mp4'
    ? result.filePath
    : extension
      ? path.join(path.dirname(result.filePath), `${path.basename(result.filePath, extension)}.mp4`)
      : `${result.filePath}.mp4`;
  const controller = new AbortController();
  let tempDir;
  try {
    tempDir = await fs.mkdtemp(path.join(path.dirname(outputPath), '.frame-studio-render-'));
    const audioClips = Array.isArray(payload.audioClips) ? payload.audioClips.slice(0, 500).map(clip => ({
      name: String(clip?.name || 'Clipe'),
      kind: clip?.kind === 'audio' ? 'audio' : 'video',
      path: typeof clip?.path === 'string' ? clip.path : null,
      start: Number(clip?.start) || 0,
      inPoint: Number(clip?.inPoint) || 0,
      outPoint: Number(clip?.outPoint),
      speed: Number(clip?.speed) || 1,
      volume: Math.max(0, Math.min(200, Number(clip?.volume ?? 100))),
      volumeKeyframes: Array.isArray(clip?.volumeKeyframes) ? clip.volumeKeyframes.slice(0, 500).map(key => ({ time: Number(key?.time) || 0, value: Math.max(0, Math.min(200, Number(key?.value) || 0)), ease: key?.ease && typeof key.ease === 'object' ? { x1: Number(key.ease.x1), y1: Number(key.ease.y1), x2: Number(key.ease.x2), y2: Number(key.ease.y2) } : undefined })) : [],
      timeRemap: Array.isArray(clip?.timeRemap) ? clip.timeRemap.slice(0, 100).map(key => ({ time: Math.max(0, Math.min(1, Number(key?.time) || 0)), value: Math.max(0, Math.min(1, Number(key?.value) || 0)), mode: ['linear', 'smooth', 'hold'].includes(key?.mode) ? key.mode : 'linear', ease: key?.ease && typeof key.ease === 'object' ? { x1: Number(key.ease.x1), y1: Number(key.ease.y1), x2: Number(key.ease.x2), y2: Number(key.ease.y2) } : undefined })) : [],
      timeRemapDuration: Math.max(0, Math.min(43200, Number(clip?.timeRemapDuration) || 0)),
      fadeIn: Math.max(0, Math.min(30, Number(clip?.fadeIn) || 0)),
      fadeOut: Math.max(0, Math.min(30, Number(clip?.fadeOut) || 0))
    })) : [];
    const session = {
      id: randomUUID(), controller, tempDir, outputPath,
      temporaryOutputPath: path.join(tempDir, 'rendered.mp4'),
      framePattern: path.join(tempDir, 'frame-%08d.png'),
      nextFrame: 0, expectedFrames: frameCount, fps, duration,
      crf: Math.max(16, Math.min(28, Math.round(Number(payload.crf) || 18))),
      rateMode: payload.rateMode === 'bitrate' ? 'bitrate' : 'crf',
      videoBitrate: Math.max(2, Math.min(100, Number(payload.videoBitrate) || 12)),
      encoderPreset: ['veryfast', 'fast', 'medium', 'slow', 'slower'].includes(payload.encoderPreset) ? payload.encoderPreset : 'medium',
      audioBitrate: [96, 128, 160, 192, 256, 320].includes(Number(payload.audioBitrate)) ? Number(payload.audioBitrate) : 192,
      audioClips
    };
    activeExports.set(event.sender.id, { controller, frameSession: session });
    sendExportProgress(event.sender, { stage: 'rendering', progress: 0, seconds: 0, duration });
    return { canceled: false, sessionId: session.id, frameCount, fps, duration };
  } catch (error) {
    if (tempDir) await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
});

ipcMain.handle('frame:write-export-frame', async (event, payload) => {
  assertTrustedSender(event);
  const job = activeExports.get(event.sender.id);
  const session = job?.frameSession;
  if (!session || payload?.sessionId !== session.id) throw new Error('Render session not found.');
  if (job.controller.signal.aborted) throw new ExportCanceledError();
  if (Number(payload.frameIndex) !== session.nextFrame) throw new Error(`Invalid frame order: expected ${session.nextFrame}, received ${payload.frameIndex}.`);
  if (!(payload.buffer instanceof ArrayBuffer) || payload.buffer.byteLength < 16 || payload.buffer.byteLength > 64 * 1024 * 1024) {
    throw new Error('Invalid PNG frame or frame exceeds the 64 MiB limit.');
  }
  const bytes = Buffer.from(payload.buffer);
  if (!bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) throw new Error('The submitted frame is not a valid PNG.');
  const filename = path.join(session.tempDir, `frame-${String(session.nextFrame).padStart(8, '0')}.png`);
  await fs.writeFile(filename, bytes, { flag: 'wx' });
  session.nextFrame += 1;
  if (session.nextFrame % Math.max(1, Math.round(session.fps / 2)) === 0 || session.nextFrame === session.expectedFrames) {
    sendExportProgress(event.sender, {
      stage: 'rendering', progress: session.nextFrame / session.expectedFrames * 100,
      seconds: session.nextFrame / session.fps, duration: session.duration
    });
  }
  return { written: session.nextFrame };
});

ipcMain.handle('frame:finish-frame-export', async (event, payload) => {
  assertTrustedSender(event);
  const job = activeExports.get(event.sender.id);
  const session = job?.frameSession;
  if (!session || payload?.sessionId !== session.id) throw new Error('Render session not found.');
  try {
    if (job.controller.signal.aborted) throw new ExportCanceledError();
    if (session.nextFrame !== session.expectedFrames) {
      throw new Error(`Incomplete sequence: received ${session.nextFrame} of ${session.expectedFrames} frames.`);
    }
    const metadata = await renderFrameSequenceToMp4({
      framePattern: session.framePattern,
      frameCount: session.expectedFrames,
      outputPath: session.temporaryOutputPath,
      expectedDuration: session.duration,
      fps: session.fps,
      crf: session.crf,
      rateMode: session.rateMode,
      videoBitrate: session.videoBitrate,
      encoderPreset: session.encoderPreset,
      audioBitrate: session.audioBitrate,
      audioClips: session.audioClips,
      signal: job.controller.signal,
      onProcess: (_kind, child) => {
        if (job.controller.signal.aborted && child.exitCode === null) child.kill('SIGTERM');
      },
      onProgress: progress => sendExportProgress(event.sender, progress)
    });
    if (job.controller.signal.aborted) throw new ExportCanceledError();
    await fs.rename(session.temporaryOutputPath, session.outputPath);
    sendExportProgress(event.sender, { stage: 'complete', progress: 100, seconds: metadata.duration, duration: metadata.duration });
    return {
      canceled: false, filePath: session.outputPath, size: metadata.size,
      duration: metadata.duration, videoCodec: metadata.videoCodec,
      audioCodec: metadata.audioCodec, fps: metadata.fps,
      frameCount: metadata.frameCount, crf: metadata.crf, rateMode: metadata.rateMode, videoBitrate: metadata.videoBitrate, encoderPreset: metadata.encoderPreset, audioBitrate: metadata.audioBitrate, deterministicFrames: true
    };
  } catch (error) {
    if (error?.code === 'EXPORT_CANCELED' || job.controller.signal.aborted) return { canceled: true };
    sendExportProgress(event.sender, { stage: 'failed', progress: 0, error: error?.message || String(error) });
    throw error;
  } finally {
    await fs.rm(session.tempDir, { recursive: true, force: true }).catch(() => {});
    if (activeExports.get(event.sender.id) === job) activeExports.delete(event.sender.id);
  }
});

ipcMain.handle('frame:cancel-frame-export', async (event, sessionId) => {
  try { assertTrustedSender(event); } catch { return { canceled: true }; }
  const job = activeExports.get(event.sender.id);
  if (!job?.frameSession || job.frameSession.id !== sessionId) return { canceled: true };
  job.controller.abort();
  await fs.rm(job.frameSession.tempDir, { recursive: true, force: true }).catch(() => {});
  if (activeExports.get(event.sender.id) === job) activeExports.delete(event.sender.id);
  return { canceled: true };
});

ipcMain.handle('frame:save-video', async (event, payload) => {
  assertTrustedSender(event);
  if (activeExports.has(event.sender.id)) throw new Error('An export is already running in this window.');
  if (!payload || !(payload.buffer instanceof ArrayBuffer) || payload.buffer.byteLength === 0) {
    throw new Error('The temporary WebM capture is empty. Please export again.');
  }
  const requestId = event.sender.id;
  const controller = new AbortController();
  activeExports.set(requestId, { controller });
  let tempDir = null;
  try {
    const win = BrowserWindow.fromWebContents(event.sender);
    const safeBase = String(payload.name || 'frame-studio-export.mp4')
      .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-')
      .replace(/\.(?:webm|mp4)$/i, '').slice(0, 150) || 'frame-studio-export';
    const result = await dialog.showSaveDialog(win, {
      title: 'Export composition to MP4',
      defaultPath: path.join(app.getPath('videos'), `${safeBase}.mp4`),
      filters: [{ name: 'MP4 Video (H.264 + AAC when audio is present)', extensions: ['mp4'] }]
    });
    if (controller.signal.aborted || result.canceled || !result.filePath) return { canceled: true };
    const chosenExt = path.extname(result.filePath);
    const outputPath = chosenExt.toLowerCase() === '.mp4'
      ? result.filePath
      : chosenExt
        ? path.join(path.dirname(result.filePath), `${path.basename(result.filePath, chosenExt)}.mp4`)
        : `${result.filePath}.mp4`;

    // Os temporários ficam ao lado do destino; só o MP4 validado é renomeado para o nome final.
    tempDir = await fs.mkdtemp(path.join(path.dirname(outputPath), '.frame-studio-export-'));
    const inputPath = path.join(tempDir, 'composition.webm');
    const temporaryOutputPath = path.join(tempDir, 'rendered.mp4');
    await fs.writeFile(inputPath, Buffer.from(payload.buffer));
    if (controller.signal.aborted) return { canceled: true };
    sendExportProgress(event.sender, { stage: 'validating', progress: 0, seconds: 0, duration: Number(payload.duration) || 0 });
    const metadata = await transcodeWebmToMp4({
      inputPath,
      outputPath: temporaryOutputPath,
      expectedDuration: Number(payload.duration) || 0,
      fps: Number(payload.fps) || 30,
      crf: payload.crf,
      signal: controller.signal,
      onProcess: (_kind, child) => {
        // O controller encerra tanto FFmpeg quanto ffprobe sem montar comandos de shell.
        if (controller.signal.aborted && child.exitCode === null) child.kill('SIGTERM');
      },
      onProgress: progress => sendExportProgress(event.sender, progress)
    });
    if (controller.signal.aborted) return { canceled: true };
    await fs.rename(temporaryOutputPath, outputPath);
    sendExportProgress(event.sender, { stage: 'complete', progress: 100, seconds: metadata.duration, duration: metadata.duration });
    return { canceled: false, filePath: outputPath, size: metadata.size, duration: metadata.duration, videoCodec: metadata.videoCodec, audioCodec: metadata.audioCodec };
  } catch (error) {
    if (error?.code === 'EXPORT_CANCELED' || controller.signal.aborted) return { canceled: true };
    sendExportProgress(event.sender, { stage: 'failed', progress: 0, error: error?.message || String(error) });
    throw error;
  } finally {
    if (tempDir) await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    if (activeExports.get(requestId)?.controller === controller) activeExports.delete(requestId);
  }
});

async function mediaAssetDirectory(kind) {
  const folderName = kind === 'recording' ? 'Recordings' : 'Extracted Audio';
  const dir = path.join(app.getPath('documents'), 'FRAME Studio', folderName);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}
function safeMediaBase(value, fallback) {
  return String(value || fallback).replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-').replace(/\.+$/g, '').trim().slice(0, 100) || fallback;
}
async function uniqueMediaPath(dir, base, ext) {
  let target = path.join(dir, `${base}${ext}`), n = 2;
  while (true) {
    try { await fs.access(target); target = path.join(dir, `${base} (${n++})${ext}`); }
    catch (error) { if (error.code === 'ENOENT') return target; throw error; }
  }
}

ipcMain.handle('frame:media-info', async (event, target) => {
  assertTrustedSender(event);
  if (typeof target !== 'string' || !path.isAbsolute(target)) throw new Error('Invalid media path.');
  const stat = await fs.stat(target).catch(() => null);
  if (!stat?.isFile()) throw new Error('The media file does not exist.');
  const info = await probeMedia(target);
  return { duration: info.duration, streams: info.streams.map(stream => ({ codec_type: stream.codec_type, codec_name: stream.codec_name, sample_rate: stream.sample_rate, channels: stream.channels })) };
});

ipcMain.handle('frame:generate-waveform', async (event, payload) => {
  assertTrustedSender(event);
  const target = payload?.path;
  if (typeof target !== 'string' || !path.isAbsolute(target)) throw new Error('Invalid media path for waveform generation.');
  const stat = await fs.stat(target).catch(() => null);
  if (!stat?.isFile()) throw new Error('Media file not found for waveform generation.');
  const duration = Math.max(0.01, Math.min(43200, Number(payload.duration) || 1));
  const sampleRate = 4000;
  const bucketCount = Math.max(120, Math.min(18000, Math.ceil(duration * 25)));
  const samplesPerBucket = Math.max(1, Math.ceil(duration * sampleRate / bucketCount));
  const left = [];
  let bucketPeak = 0, bucketSamples = 0, carryByte = null, sampleCount = 0;
  await new Promise((resolve, reject) => {
    const binary = process.env.FRAME_FFMPEG_PATH || 'ffmpeg';
    let child, stderr = '', settled = false;
    const finish = (fn, value) => { if (settled) return; settled = true; fn(value); };
    try { child = spawn(binary, ['-v', 'error', '-i', target, '-map', '0:a:0', '-vn', '-ac', '1', '-ar', String(sampleRate), '-f', 's16le', 'pipe:1'], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }); }
    catch (error) { finish(reject, error); return; }
    child.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-6000); });
    child.stdout.on('data', chunk => {
      let i = 0;
      if (carryByte !== null && chunk.length) {
        const value = (carryByte | (chunk[0] << 8));
        bucketPeak = Math.max(bucketPeak, Math.abs(value > 32767 ? value - 65536 : value) / 32768);
        bucketSamples++; sampleCount++; i = 1; carryByte = null;
        if (bucketSamples >= samplesPerBucket) { left.push(bucketPeak); bucketPeak = 0; bucketSamples = 0; }
      }
      for (; i + 1 < chunk.length; i += 2) {
        const value = chunk.readInt16LE(i);
        bucketPeak = Math.max(bucketPeak, Math.abs(value) / 32768);
        bucketSamples++; sampleCount++;
        if (bucketSamples >= samplesPerBucket) { if (left.length < 18000) left.push(bucketPeak); bucketPeak = 0; bucketSamples = 0; }
      }
      if (i < chunk.length) carryByte = chunk[i];
    });
    child.once('error', error => finish(reject, error));
    child.once('close', code => {
      if (bucketSamples && left.length < 18000) left.push(bucketPeak);
      if (code !== 0 || !sampleCount || !left.length) return finish(reject, new Error(stderr.trim() || 'The media does not contain decodable audio.'));
      finish(resolve);
    });
  });
  return { left, right: null, duration, sampleRate, samplesPerBucket };
});

ipcMain.handle('frame:save-audio-recording', async (event, payload) => {
  assertTrustedSender(event);
  if (!payload || !(payload.buffer instanceof ArrayBuffer) || !payload.buffer.byteLength || payload.buffer.byteLength > 1024 * 1024 * 1024) throw new Error('The recording is empty or exceeds the allowed size limit.');
  const allowed = { webm: '.webm', ogg: '.ogg', wav: '.wav', m4a: '.m4a', mp3: '.mp3' };
  const ext = allowed[String(payload.extension || 'webm').toLowerCase()] || '.webm';
  const dir = await mediaAssetDirectory('recording');
  const base = safeMediaBase(payload.name, `Recording ${new Date().toISOString().replace(/[:.]/g, '-')}`);
  const outputPath = await uniqueMediaPath(dir, base, ext);
  await fs.writeFile(outputPath, Buffer.from(payload.buffer), { flag: 'wx' });
  return { path: outputPath, name: path.basename(outputPath), size: (await fs.stat(outputPath)).size };
});

ipcMain.handle('frame:extract-audio', async (event, payload) => {
  assertTrustedSender(event);
  const sourcePath = payload?.path;
  if (typeof sourcePath !== 'string' || !path.isAbsolute(sourcePath)) throw new Error('Invalid video path.');
  const stat = await fs.stat(sourcePath).catch(() => null);
  if (!stat?.isFile()) throw new Error('The source video does not exist.');
  const info = await probeMedia(sourcePath);
  const stream = info.streams.find(item => item.codec_type === 'audio');
  if (!stream) throw new Error('This video does not contain an audio track.');
  const inPoint = Math.max(0, Number(payload.inPoint) || 0);
  const duration = Math.max(0.05, Math.min(43200, Number(payload.duration) || (info.duration - inPoint)));
  if (inPoint >= info.duration || inPoint + duration > info.duration + 0.5) throw new Error('The trimmed video range is outside the media duration.');
  const dir = await mediaAssetDirectory('extracted');
  const base = safeMediaBase(payload.name, path.basename(sourcePath, path.extname(sourcePath)) + ' - audio');
  const codec = String(stream.codec_name || '').toLowerCase();
  const preserveExt = codec === 'aac' || codec === 'alac' ? '.m4a' : codec === 'mp3' ? '.mp3' : ['opus','vorbis'].includes(codec) ? '.webm' : codec === 'flac' ? '.flac' : null;
  const copyExt = preserveExt || '.m4a';
  let outputPath = await uniqueMediaPath(dir, base, copyExt);
  const runFfmpeg = args => new Promise((resolve, reject) => {
    const child = spawn(process.env.FRAME_FFMPEG_PATH || 'ffmpeg', args, { stdio: ['ignore','ignore','pipe'], windowsHide: true });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-10000); });
    child.once('error', reject);
    child.once('close', code => code === 0 ? resolve() : reject(new Error(stderr.trim() || `FFmpeg exited with code ${code}.`)));
  });
  const common = ['-y', '-v', 'error', '-i', sourcePath, '-ss', inPoint.toFixed(6), '-t', duration.toFixed(6), '-map', '0:a:0', '-vn'];
  try {
    if (!preserveExt) throw new Error('The source codec requires a compatible container.');
    await runFfmpeg([...common, '-c:a', 'copy', outputPath]);
  } catch (copyError) {
    await fs.rm(outputPath, { force: true }).catch(() => {});
    outputPath = await uniqueMediaPath(dir, base, '.m4a');
    try { await runFfmpeg([...common, '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', outputPath]); }
    catch (error) { await fs.rm(outputPath, { force: true }).catch(() => {}); throw new Error(`Failed to extract audio: ${error.message || copyError.message}`); }
  }
  const metadata = await probeMedia(outputPath);
  return { path: outputPath, name: path.basename(outputPath), duration: metadata.duration || duration, codec: metadata.streams.find(item => item.codec_type === 'audio')?.codec_name || 'unknown' };
});

ipcMain.handle('frame:save-project', async (event, data) => {
  assertTrustedSender(event);
  if (!data || data.format !== 'frameproj' || !Array.isArray(data.clips) || !Array.isArray(data.assets)) {
    throw new Error('Invalid project data.');
  }
  const win = BrowserWindow.fromWebContents(event.sender);
  const safeName = String(data.name || 'Projeto FRAME').replace(/[\\/:*?"<>|]+/g, '-');
  const result = await dialog.showSaveDialog(win, {
    title: 'Save FRAME Studio Project',
    defaultPath: path.join(app.getPath('documents'), `${safeName}.frameproj`),
    filters: [{ name: 'Projeto FRAME Studio', extensions: ['frameproj'] }, { name: 'JSON', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  await fs.writeFile(result.filePath, JSON.stringify(data, null, 2), 'utf8');
  return { canceled: false, filePath: result.filePath };
});

ipcMain.handle('frame:open-project', async (event) => {
  assertTrustedSender(event);
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win, {
    title: 'Open FRAME Studio Project',
    properties: ['openFile'],
    filters: [{ name: 'Projeto FRAME Studio', extensions: ['frameproj', 'json'] }]
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };
  const filePath = result.filePaths[0];
  const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
  return { canceled: false, filePath, data };
});


ipcMain.handle('frame:open-project-path', async (event, target) => {
  assertTrustedSender(event);
  if (typeof target !== 'string' || !path.isAbsolute(target) || !['.frameproj', '.json'].includes(path.extname(target).toLowerCase())) {
    throw new Error('Invalid recent-project path.');
  }
  const stat = await fs.stat(target).catch(() => null);
  if (!stat?.isFile()) throw new Error('The recent project file no longer exists.');
  const data = JSON.parse(await fs.readFile(target, 'utf8'));
  if (!data || data.format !== 'frameproj' || !Array.isArray(data.clips) || !Array.isArray(data.assets)) {
    throw new Error('The selected file is not a valid FRAME project.');
  }
  return { canceled: false, filePath: target, data };
});

ipcMain.handle('frame:media-exists', async (event, target) => {
  assertTrustedSender(event);
  if (typeof target !== 'string' || !path.isAbsolute(target)) return false;
  try { await fs.access(target); return true; } catch { return false; }
});

ipcMain.handle('frame:select-media', async (event) => {
  assertTrustedSender(event);
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win, {
    title: 'Relink Missing Media',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Media', extensions: ['mp4','m4v','mov','webm','mkv','avi','mpeg','mpg','mp3','wav','ogg','m4a','flac','aac','png','jpg','jpeg','webp','gif','bmp','avif'] }]
  });
  if (result.canceled) return { canceled: true };
  return { canceled: false, paths: result.filePaths };
});

ipcMain.handle('frame:select-custom-background', async (event) => {
  assertTrustedSender(event);
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win, {
    title: 'Choose FRAME Studio Background',
    properties: ['openFile'],
    filters: [{ name: 'Image, GIF, and Video Backgrounds', extensions: ['png','jpg','jpeg','webp','gif','bmp','avif','mp4','m4v','mov','webm','mkv','avi'] }]
  });
  if (result.canceled || !result.filePaths?.[0]) return { canceled: true };
  const filePath = result.filePaths[0];
  const stat = await fs.stat(filePath).catch(() => null);
  if (!stat?.isFile()) throw new Error('The selected file is not available.');
  if (stat.size > 1024 * 1024 * 1024) throw new Error('O fundo precisa ter menos de 1 GiB.');
  const ext = path.extname(filePath).toLowerCase();
  const video = ['.mp4','.m4v','.mov','.webm','.mkv','.avi'].includes(ext);
  return { canceled: false, filePath, name: path.basename(filePath), kind: video ? 'video' : 'image', size: stat.size };
});

async function customFontsDirectory() {
  const dir = path.join(app.getPath('userData'), 'custom-fonts');
  await fs.mkdir(dir, { recursive: true });
  return dir;
}
async function readCustomFontIndex() {
  const dir = await customFontsDirectory();
  const indexPath = path.join(dir, 'index.json');
  try {
    const parsed = JSON.parse(await fs.readFile(indexPath, 'utf8'));
    return Array.isArray(parsed) ? parsed.filter(item => item && /^[a-f0-9]{64}$/.test(item.id) && ['.ttf', '.otf', '.woff2'].includes(item.ext)) : [];
  } catch { return []; }
}
async function writeCustomFontIndex(entries) {
  const dir = await customFontsDirectory();
  await fs.writeFile(path.join(dir, 'index.json'), JSON.stringify(entries, null, 2), 'utf8');
}
const FONT_META = {
  '.ttf': { mime: 'font/ttf', format: 'truetype' },
  '.otf': { mime: 'font/otf', format: 'opentype' },
  '.woff2': { mime: 'font/woff2', format: 'woff2' }
};
async function enumerateSystemFonts() {
  const fallback = [
    'Arial', 'Arial Black', 'Calibri', 'Cambria', 'Comic Sans MS', 'Consolas',
    'Courier New', 'Georgia', 'Impact', 'Inter', 'Liberation Sans', 'Liberation Serif',
    'Noto Sans', 'Noto Serif', 'Roboto', 'Tahoma', 'Times New Roman', 'Trebuchet MS',
    'Verdana', 'monospace', 'sans-serif', 'serif'
  ];
  let output = '';
  if (process.platform === 'win32') {
    const script = "Add-Type -AssemblyName System.Drawing; $collection = New-Object System.Drawing.Text.InstalledFontCollection; $collection.Families | ForEach-Object { $_.Name }; $collection.Dispose()";
    try {
      const result = await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script], {
        encoding: 'utf8', timeout: 20000, maxBuffer: 8 * 1024 * 1024, windowsHide: true
      });
      output = String(result.stdout || '');
    } catch (error) {
      console.warn('Could not enumerate Windows system fonts:', error?.message || error);
    }
  } else {
    try {
      const result = await execFileAsync('fc-list', ['--format=%{family}\n'], {
        encoding: 'utf8', timeout: 12000, maxBuffer: 8 * 1024 * 1024
      });
      output = String(result.stdout || '');
    } catch (error) {
      console.warn('fontconfig is unavailable; using common fallback font names:', error?.message || error);
    }
  }
  const names = new Set();
  for (const rawLine of output.split(/\r?\n/)) {
    for (const part of rawLine.split(',')) {
      const family = part.replace(/\s+/g, ' ').trim();
      if (family && family.length <= 100 && !/[\u0000-\u001f]/.test(family)) names.add(family);
    }
  }
  const source = names.size ? [...names] : fallback;
  return source.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })).slice(0, 2000);
}
ipcMain.handle('frame:list-system-fonts', async event => {
  assertTrustedSender(event);
  return enumerateSystemFonts();
});

ipcMain.handle('frame:list-custom-fonts', async event => {
  assertTrustedSender(event);
  return (await readCustomFontIndex()).map(({ id, family, ext, bytes }) => ({ id, family, ext, bytes, format: FONT_META[ext].format }));
});
ipcMain.handle('frame:read-custom-font', async (event, id) => {
  assertTrustedSender(event);
  if (typeof id !== 'string' || !/^[a-f0-9]{64}$/.test(id)) throw new Error('Invalid font identifier.');
  const entry = (await readCustomFontIndex()).find(item => item.id === id);
  if (!entry) throw new Error('The requested font is not installed.');
  const dir = await customFontsDirectory();
  const bytes = await fs.readFile(path.join(dir, `${entry.id}${entry.ext}`));
  if (bytes.length > 20 * 1024 * 1024) throw new Error('A fonte excede o limite de leitura.');
  return { id: entry.id, family: entry.family, mime: FONT_META[entry.ext].mime, format: FONT_META[entry.ext].format, base64: bytes.toString('base64') };
});
ipcMain.handle('frame:import-fonts-zip', async event => {
  assertTrustedSender(event);
  const win = BrowserWindow.fromWebContents(event.sender);
  const picked = await dialog.showOpenDialog(win, {
    title: 'Import Fonts from ZIP',
    properties: ['openFile'], filters: [{ name: 'Pacote de fontes ZIP', extensions: ['zip'] }]
  });
  if (picked.canceled || !picked.filePaths[0]) return { canceled: true, fonts: [] };
  const zipPath = picked.filePaths[0];
  const stat = await fs.stat(zipPath).catch(() => null);
  if (!stat?.isFile() || stat.size > 200 * 1024 * 1024) throw new Error('The ZIP must be a valid file no larger than 200 MiB.');
  let listing;
  try {
    const result = await execFileAsync('unzip', ['-Z1', zipPath], { encoding: 'utf8', timeout: 15000, maxBuffer: 4 * 1024 * 1024 });
    listing = String(result.stdout || '').split(/\r?\n/).filter(Boolean);
  } catch (error) {
    if (error?.code === 'ENOENT') throw new Error('The unzip utility is not installed. Install it with your distribution package manager.');
    throw new Error('Could not open the ZIP. Check whether the archive is corrupted.');
  }
  if (listing.length > 5000) throw new Error('The ZIP contains too many files for safe import.');
  const candidates = [];
  for (const entry of listing) {
    const normalized = entry.replace(/\\/g, '/');
    if (!normalized || normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized) || normalized.startsWith('-') || normalized.split('/').some(part => part === '..' || part === '.')) continue;
    const ext = path.posix.extname(normalized).toLowerCase();
    if (!FONT_META[ext] || normalized.endsWith('/')) continue;
    candidates.push({ entry, ext, baseName: path.posix.basename(normalized, ext) });
    if (candidates.length >= 40) break;
  }
  if (!candidates.length) return { canceled: false, fonts: [] };
  let totalBytes = 0;
  const dir = await customFontsDirectory();
  const index = await readCustomFontIndex();
  const byId = new Map(index.map(item => [item.id, item]));
  const imported = [];
  for (const candidate of candidates) {
    let output;
    try {
      const result = await execFileAsync('unzip', ['-p', zipPath, candidate.entry], { encoding: 'buffer', timeout: 20000, maxBuffer: 20 * 1024 * 1024 });
      output = Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.from(result.stdout || '');
    } catch { continue; }
    if (!output.length || output.length > 20 * 1024 * 1024 || output.length < 4) continue;
    const signature = output.readUInt32BE(0);
    const validSignature = candidate.ext === '.woff2'
      ? signature === 0x774f4632
      : candidate.ext === '.otf'
        ? [0x4f54544f, 0x00010000, 0x74727565].includes(signature)
        : [0x00010000, 0x74727565, 0x74797031].includes(signature);
    if (!validSignature) continue;
    totalBytes += output.length;
    if (totalBytes > 50 * 1024 * 1024) throw new Error('As fontes descompactadas ultrapassam o limite total de 50 MiB.');
    const id = createHash('sha256').update(output).digest('hex');
    let family = candidate.baseName.replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, 80) || 'Fonte importada';
    if (byId.has(id)) {
      imported.push(byId.get(id));
      continue;
    }
    const sameName = index.some(item => item.family.toLowerCase() === family.toLowerCase());
    if (sameName) family = `${family} (${id.slice(0, 6)})`;
    await fs.writeFile(path.join(dir, `${id}${candidate.ext}`), output, { flag: 'wx' }).catch(async error => {
      if (error.code === 'EEXIST') return;
      throw error;
    });
    const item = { id, family, ext: candidate.ext, bytes: output.length };
    index.push(item); byId.set(id, item); imported.push(item);
  }
  await writeCustomFontIndex(index);
  return { canceled: false, fonts: imported.map(({ id, family, ext, bytes }) => ({ id, family, ext, bytes, format: FONT_META[ext].format })) };
});

ipcMain.handle('frame:open-path', async (event, target) => {
  assertTrustedSender(event);
  if (typeof target !== 'string' || !path.isAbsolute(target)) throw new Error('Invalid path.');
  return shell.openPath(target);
});

ipcMain.handle('frame:downloaded-media-list', async (event, relativeFolder) => {
  assertTrustedSender(event);
  return listDownloadedMediaFolder(relativeFolder || '');
});
ipcMain.handle('frame:downloaded-media-create-folder', async (event, payload) => {
  assertTrustedSender(event);
  return createDownloadedMediaFolder(payload?.parentFolder || '', payload?.name || '');
});
ipcMain.handle('frame:downloaded-media-resolve', async (event, relativeFile) => {
  assertTrustedSender(event);
  const resolved = await resolveDownloadedMedia(relativeFile);
  const { root, ...safe } = resolved;
  return safe;
});
ipcMain.handle('frame:downloaded-media-open-folder', async (event, relativeFolder) => {
  assertTrustedSender(event);
  const { target } = resolveLibraryPath(relativeFolder || '');
  await fs.mkdir(target, { recursive: true });
  const stat = await fs.lstat(target);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('The selected library location is not a folder.');
  return shell.openPath(target);
});

ipcMain.handle('frame:youtube-tools-status', async event => {
  assertTrustedSender(event);
  return videoDownloaderToolsStatus();
});
ipcMain.handle('frame:youtube-download', async (event, payload) => runYoutubeDownload(event, payload));
ipcMain.on('frame:youtube-cancel', event => {
  try { assertTrustedSender(event); } catch { return; }
  const child = activeYoutubeDownloads.get(event.sender.id);
  if (child && !child.killed) {
    child.__frameCancelled = true;
    child.kill('SIGTERM');
  }
});

