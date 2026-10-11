const { app, BrowserWindow, ipcMain, dialog, shell, protocol, net, session } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');
const { execFile, spawn } = require('node:child_process');
const { promisify } = require('node:util');
const execFileAsync = promisify(execFile);
const { pathToFileURL } = require('node:url');
const { checkMediaTools, probeMedia, transcodeWebmToMp4, renderFrameSequenceToMp4, ExportCanceledError } = require('./media-export.cjs');
const activeExports = new Map();
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
      crf: Number(payload.crf) || 18, audioClips
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
      frameCount: metadata.frameCount, crf: metadata.crf, deterministicFrames: true
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
