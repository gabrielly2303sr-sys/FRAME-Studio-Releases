'use strict';

// Downloads the native media tools into vendor/<platform> before local runs/builds.
// Official CI builds also run this script (it is a no-op when tools are already present).
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { pipeline } = require('node:stream/promises');
const { Readable } = require('node:stream');

const root = path.resolve(__dirname, '..');
const quiet = process.argv.includes('--quiet');
const verifyOnly = process.argv.includes('--verify');
const allowMissing = process.argv.includes('--allow-missing');
const platform = process.platform;
const arch = process.arch;
const folder = platform === 'win32' ? 'win' : platform === 'linux' ? 'linux' : null;
const vendor = folder ? path.join(root, 'vendor', folder) : null;
const names = platform === 'win32'
  ? { yt: 'yt-dlp.exe', ffmpeg: 'ffmpeg.exe', ffprobe: 'ffprobe.exe' }
  : { yt: 'yt-dlp', ffmpeg: 'ffmpeg', ffprobe: 'ffprobe' };

function log(message) { if (!quiet) process.stdout.write(`[FRAME tools] ${message}\n`); }
function fail(message) { process.stderr.write(`[FRAME tools] ERROR: ${message}\n`); process.exitCode = 1; }
function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8', timeout: 20000, windowsHide: true, maxBuffer: 4 * 1024 * 1024,
    ...options
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error((result.stderr || result.stdout || `${command} exited with ${result.status}`).trim());
  return result;
}
async function fetchToFile(url, destination) {
  log(`Downloading ${path.basename(destination)}…`);
  const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(180000) });
  if (!response.ok || !response.body) throw new Error(`Download failed (${response.status}) for ${url}`);
  await fsp.mkdir(path.dirname(destination), { recursive: true });
  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(destination));
  const stat = await fsp.stat(destination);
  if (stat.size < 1000) throw new Error(`Downloaded file is unexpectedly small: ${destination}`);
}
function toolWorks(file, args) {
  try { run(file, args); return true; } catch { return false; }
}
function allToolsReady() {
  return fs.existsSync(vendor)
    && toolWorks(path.join(vendor, names.yt), ['--version'])
    && toolWorks(path.join(vendor, names.ffmpeg), ['-version'])
    && toolWorks(path.join(vendor, names.ffprobe), ['-version']);
}
async function copyLicenseFilesRecursively(source, destination) {
  let entries = [];
  try { entries = await fsp.readdir(source, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    const full = path.join(source, entry.name);
    if (entry.isDirectory()) {
      if (path.resolve(full) !== path.resolve(destination)) await copyLicenseFilesRecursively(full, destination);
    } else if (entry.isFile() && /^(LICENSE|COPYING|GPL|LGPL|README|AUTHORS|NOTICE)/i.test(entry.name)) {
      await fsp.mkdir(destination, { recursive: true });
      await fsp.copyFile(full, path.join(destination, entry.name)).catch(() => {});
    }
  }
}
async function downloadLicenseFiles(temp, target) {
  const licenseDir = path.join(target, 'licenses');
  await fsp.mkdir(licenseDir, { recursive: true });
  try { await fetchToFile('https://raw.githubusercontent.com/yt-dlp/yt-dlp/master/LICENSE', path.join(licenseDir, 'yt-dlp-LICENSE.txt')); }
  catch (error) { log(`Could not refresh yt-dlp license text: ${error.message}`); }
  await copyLicenseFilesRecursively(temp, path.join(licenseDir, 'ffmpeg'));
  const notes = path.join(root, 'THIRD_PARTY_NOTICES.md');
  if (fs.existsSync(notes)) await fsp.copyFile(notes, path.join(licenseDir, 'THIRD_PARTY_NOTICES.md'));
}
async function prepareWindows() {
  if (arch !== 'x64') throw new Error(`Bundled Windows tools are currently provided for x64, not ${arch}.`);
  await fsp.mkdir(vendor, { recursive: true });
  const ytPath = path.join(vendor, names.yt);
  if (!toolWorks(ytPath, ['--version'])) await fetchToFile('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe', ytPath);
  if (!toolWorks(path.join(vendor, names.ffmpeg), ['-version']) || !toolWorks(path.join(vendor, names.ffprobe), ['-version'])) {
    const temp = await fsp.mkdtemp(path.join(os.tmpdir(), 'frame-ffmpeg-win-'));
    try {
      const archive = path.join(temp, 'ffmpeg-release-essentials.zip');
      const extracted = path.join(temp, 'unpacked');
      await fetchToFile('https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip', archive);
      await fsp.mkdir(extracted, { recursive: true });
      const ps = [
        "$ErrorActionPreference = 'Stop'",
        'Expand-Archive -LiteralPath $env:FRAME_FFMPEG_ARCHIVE -DestinationPath $env:FRAME_FFMPEG_EXTRACT -Force',
        "$bin = Get-ChildItem -Path $env:FRAME_FFMPEG_EXTRACT -Directory -Recurse | ForEach-Object { Join-Path $_.FullName 'bin' } | Where-Object { (Test-Path (Join-Path $_ 'ffmpeg.exe')) -and (Test-Path (Join-Path $_ 'ffprobe.exe')) } | Select-Object -First 1",
        "if (-not $bin) { throw 'FFmpeg binaries not found in the downloaded archive.' }",
        "Copy-Item (Join-Path $bin 'ffmpeg.exe') $env:FRAME_FFMPEG_VENDOR -Force",
        "Copy-Item (Join-Path $bin 'ffprobe.exe') $env:FRAME_FFMPEG_VENDOR -Force",
        "Get-ChildItem -Path $bin -Filter '*.dll' -File | Copy-Item -Destination $env:FRAME_FFMPEG_VENDOR -Force",
        "$licenseDir = Join-Path $env:FRAME_FFMPEG_VENDOR 'licenses/ffmpeg'; New-Item -ItemType Directory -Force -Path $licenseDir | Out-Null",
        "Get-ChildItem -Path $env:FRAME_FFMPEG_EXTRACT -File -Recurse | Where-Object { $_.Name -match '^(LICENSE|COPYING|GPL|LGPL|README|AUTHORS|NOTICE)' } | ForEach-Object { Copy-Item $_.FullName $licenseDir -Force }"
      ].join('; ');
      run('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps], {
        env: { ...process.env, FRAME_FFMPEG_ARCHIVE: archive, FRAME_FFMPEG_EXTRACT: extracted, FRAME_FFMPEG_VENDOR: vendor }
      });
      await downloadLicenseFiles(temp, vendor);
    } finally { await fsp.rm(temp, { recursive: true, force: true }); }
  }
}
async function recursiveFind(dir, baseName) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isFile() && entry.name === baseName) return full;
    if (entry.isDirectory()) {
      const match = await recursiveFind(full, baseName);
      if (match) return match;
    }
  }
  return null;
}
async function prepareLinux() {
  if (arch !== 'x64') throw new Error(`Bundled Linux tools are currently provided for x64, not ${arch}.`);
  await fsp.mkdir(vendor, { recursive: true });
  const ytPath = path.join(vendor, names.yt);
  if (!toolWorks(ytPath, ['--version'])) {
    await fetchToFile('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp', ytPath);
    await fsp.chmod(ytPath, 0o755);
  }
  if (!toolWorks(path.join(vendor, names.ffmpeg), ['-version']) || !toolWorks(path.join(vendor, names.ffprobe), ['-version'])) {
    const temp = await fsp.mkdtemp(path.join(os.tmpdir(), 'frame-ffmpeg-linux-'));
    try {
      const archive = path.join(temp, 'ffmpeg-release-amd64-static.tar.xz');
      await fetchToFile('https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz', archive);
      await fsp.mkdir(path.join(temp, 'unpacked'), { recursive: true });
      run('tar', ['-xJf', archive, '-C', path.join(temp, 'unpacked')]);
      const ffmpeg = await recursiveFind(path.join(temp, 'unpacked'), 'ffmpeg');
      const ffprobe = await recursiveFind(path.join(temp, 'unpacked'), 'ffprobe');
      if (!ffmpeg || !ffprobe) throw new Error('FFmpeg or ffprobe was not found in the downloaded static archive.');
      await fsp.copyFile(ffmpeg, path.join(vendor, names.ffmpeg));
      await fsp.copyFile(ffprobe, path.join(vendor, names.ffprobe));
      await fsp.chmod(path.join(vendor, names.ffmpeg), 0o755);
      await fsp.chmod(path.join(vendor, names.ffprobe), 0o755);
      await downloadLicenseFiles(temp, vendor);
    } finally { await fsp.rm(temp, { recursive: true, force: true }); }
  }
}

(async () => {
  if (!vendor || !names) throw new Error(`Automatic bundled tools are currently supported for Windows and Linux. Detected ${platform}.`);
  if (verifyOnly) {
    if (!allToolsReady()) throw new Error(`Bundled tools are missing or cannot execute in ${vendor}. Run the prepare script to download them.`);
    log('yt-dlp, FFmpeg and ffprobe are present and executable.');
    return;
  }
  if (allToolsReady()) { log('yt-dlp, FFmpeg and ffprobe are already bundled.'); return; }
  log(`Preparing bundled tools for ${platform}/${arch}; this happens automatically before starting/building from source.`);
  if (platform === 'win32') await prepareWindows();
  else await prepareLinux();
  if (!allToolsReady()) throw new Error(`Bundled tool verification failed in ${vendor}.`);
  log('All media tools are ready.');
})().catch(error => {
  if (allowMissing) {
    log(`Tools could not be prepared automatically in this development run: ${error.message || error}`);
    log('The editor will still start; media download/export features may stay unavailable until the tools can be prepared.');
    return;
  }
  fail(`${error.message || error}\nRelease builds are required to bundle these tools. Check the network and retry.`);
});
