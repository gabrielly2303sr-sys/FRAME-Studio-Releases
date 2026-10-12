'use strict';

// Single authoritative definition of how FRAME Studio validates its bundled media tools.
// Used by main.cjs (downloader status), media-export.cjs (export checks),
// scripts/prepare-bundled-tools.cjs and scripts/verify-bundled-tools.cjs (CI smoke test).
// This module must stay free of Electron imports so it can run in plain Node (tests/CI).

const path = require('node:path');
const { execFile } = require('node:child_process');

// yt-dlp is a Python/PyInstaller program that uses GNU-style long options.
// FFmpeg and ffprobe use single-dash options: `-version` is the documented flag and
// `--version` is NOT equivalent (FFmpeg 7 prints the banner but exits nonzero).
const TOOL_VERSION_ARGS = Object.freeze({
  'yt-dlp': Object.freeze(['--version']),
  ffmpeg: Object.freeze(['-version']),
  ffprobe: Object.freeze(['-version'])
});

const TOOL_NAMES = Object.freeze(Object.keys(TOOL_VERSION_ARGS));
const DEFAULT_TIMEOUT_MS = 10000;
const MAX_BUFFER = 1024 * 1024;

function assertKnownTool(tool) {
  if (!Object.prototype.hasOwnProperty.call(TOOL_VERSION_ARGS, tool)) {
    throw new Error(`Unknown media tool "${tool}". Expected one of: ${TOOL_NAMES.join(', ')}.`);
  }
}

function versionArgsFor(tool) {
  assertKnownTool(tool);
  return [...TOOL_VERSION_ARGS[tool]];
}

function toolFilename(tool, platform = process.platform) {
  assertKnownTool(tool);
  return `${tool}${platform === 'win32' ? '.exe' : ''}`;
}

function platformFolder(platform = process.platform) {
  return platform === 'win32' ? 'win' : platform === 'linux' ? 'linux' : platform;
}

// Candidate locations for a tool, in priority order. Packaged builds only ever look under
// the application's own resources (never PATH). Works for:
//   Linux AppImage: /tmp/.mount_FRAME-XXXXXX/resources/downloader/<tool>
//   Windows:        C:\...\FRAME Studio\resources\downloader\<tool>.exe
// `pathApi` lets tests resolve Windows layouts on Linux (and vice versa).
function bundledToolCandidates(tool, options = {}) {
  const {
    platform = process.platform,
    isPackaged = false,
    resourcesPath = '',
    appPath = '',
    sourceRoot = __dirname,
    pathApi = platform === 'win32' ? path.win32 : path.posix
  } = options;
  const filename = toolFilename(tool, platform);
  const candidates = [];
  if (isPackaged) {
    if (resourcesPath) candidates.push(pathApi.join(resourcesPath, 'downloader', filename));
    if (appPath) {
      const appParent = pathApi.dirname(appPath);
      candidates.push(pathApi.join(appParent, 'downloader', filename));
      candidates.push(pathApi.join(appParent, 'app.asar.unpacked', 'downloader', filename));
    }
  } else {
    candidates.push(pathApi.join(sourceRoot, 'vendor', platformFolder(platform), filename));
  }
  return [...new Set(candidates)];
}

// Classify why a version check failed so diagnostics are actionable.
// kind: missing-file | permission-denied | incompatible-executable | missing-runtime-library
//       | invalid-arguments | timeout | nonzero-exit | spawn-failure
function classifyToolFailure(error, details = {}) {
  const stderr = String(details.stderr ?? error?.stderr ?? '');
  const stdout = String(details.stdout ?? error?.stdout ?? '');
  const combined = `${stderr}\n${stdout}\n${error?.message || ''}`;
  const code = error?.code;
  const exitCode = typeof code === 'number' ? code : (details.exitCode ?? null);

  if (error?.killed && (error?.signal === 'SIGTERM' || code === 'ETIMEDOUT') || code === 'ETIMEDOUT') {
    return { kind: 'timeout', message: `did not finish within ${Math.round((details.timeoutMs || DEFAULT_TIMEOUT_MS) / 1000)} s` };
  }
  if (code === 'ENOENT') {
    // ENOENT from spawn is also raised when an ELF interpreter / loader is missing.
    if (details.fileExists) return { kind: 'missing-runtime-library', message: 'file exists but could not be started (missing dynamic loader or runtime dependency)' };
    return { kind: 'missing-file', message: 'executable file not found' };
  }
  if (code === 'EACCES' || code === 'EPERM') return { kind: 'permission-denied', message: 'permission denied (executable bit missing or blocked by the system)' };
  if (code === 'ENOEXEC' || code === 'EBADARCH' || /exec format error|bad cpu type|not a valid win32 application|%1 is not a valid/i.test(combined)) {
    return { kind: 'incompatible-executable', message: 'executable is not compatible with this platform/architecture' };
  }
  // Windows loader failure: STATUS_DLL_NOT_FOUND (0xC0000135), reported unsigned or signed.
  if (exitCode === 3221225781 || exitCode === -1073741515) {
    return { kind: 'missing-runtime-library', message: 'a required DLL was not found (exit status 0xC0000135)' };
  }
  if (/error while loading shared libraries|cannot open shared object file|GLIBC_[0-9.]+' not found|libc\.so|\.dll was not found|The code execution cannot proceed because|0xc0000135|3221225781/i.test(combined)) {
    return { kind: 'missing-runtime-library', message: 'a required runtime library is missing' };
  }
  if (/unrecognized option|unknown option|no such option|unrecognized arguments|invalid option|Unrecognized option/i.test(combined)) {
    return { kind: 'invalid-arguments', message: 'tool rejected the version arguments' };
  }
  if (exitCode !== null && exitCode !== undefined) return { kind: 'nonzero-exit', message: `exited with status ${exitCode}` };
  return { kind: 'spawn-failure', message: String(error?.message || error || 'unknown failure') };
}

function defaultRunner(command, args, options) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { encoding: 'utf8', windowsHide: true, ...options }, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        return reject(error);
      }
      resolve({ stdout, stderr });
    });
  });
}

function firstNonEmptyLine(text) {
  return String(text || '').split(/\r?\n/).map(line => line.trim()).find(Boolean) || '';
}

// Run the tool-specific version command. A tool is `available` ONLY when that exact command
// completes with exit status 0. stderr content never changes the verdict; stdout/stderr are
// preserved in the result for diagnostics.
async function checkToolVersion(tool, command, options = {}) {
  assertKnownTool(tool);
  const {
    runner = defaultRunner,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    fileExists = null
  } = options;
  const args = versionArgsFor(tool);
  const base = { tool, command: command || '', args, available: false, version: '', stdout: '', stderr: '', kind: '', reason: '' };
  if (!command) return { ...base, kind: 'missing-file', reason: 'executable file not found' };
  try {
    const result = await runner(command, args, { timeout: timeoutMs, maxBuffer: MAX_BUFFER, windowsHide: true });
    const stdout = String(result?.stdout ?? '');
    const stderr = String(result?.stderr ?? '');
    return {
      ...base,
      available: true,
      version: firstNonEmptyLine(stdout) || firstNonEmptyLine(stderr),
      stdout,
      stderr
    };
  } catch (error) {
    const stdout = String(error?.stdout ?? '');
    const stderr = String(error?.stderr ?? '');
    const exists = typeof fileExists === 'function' ? !!fileExists(command) : !!fileExists;
    const classified = classifyToolFailure(error, { stdout, stderr, timeoutMs, fileExists: exists });
    const detail = firstNonEmptyLine(stderr) || firstNonEmptyLine(stdout);
    return {
      ...base,
      stdout,
      stderr,
      kind: classified.kind,
      reason: `${classified.message}${detail && classified.kind !== 'nonzero-exit' ? ` — ${detail.slice(0, 200)}` : ''}${classified.kind === 'nonzero-exit' && detail ? ` — ${detail.slice(0, 200)}` : ''}`
    };
  }
}

module.exports = {
  TOOL_VERSION_ARGS,
  TOOL_NAMES,
  DEFAULT_TIMEOUT_MS,
  versionArgsFor,
  toolFilename,
  platformFolder,
  bundledToolCandidates,
  classifyToolFailure,
  checkToolVersion,
  firstNonEmptyLine
};
