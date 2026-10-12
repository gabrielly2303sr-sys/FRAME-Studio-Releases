'use strict';
// Regression tests for the 2.4.22 "Bundled media tools could not start" bug.
// These tests exercise the real shared helper (media-tools.cjs), the real checkMediaTools()
// in media-export.cjs and the real scripts/verify-bundled-tools.cjs. They do NOT grep source text.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  TOOL_VERSION_ARGS, versionArgsFor, toolFilename, bundledToolCandidates, classifyToolFailure, checkToolVersion
} = require('../media-tools.cjs');
const { checkMediaTools } = require('../media-export.cjs');
const { verifyDirectory } = require('../scripts/verify-bundled-tools.cjs');

const commandLog = [];
function recordingRunner(behaviors = {}) {
  return async (command, args) => {
    commandLog.push({ command, args: [...args] });
    const base = path.win32.basename(path.posix.basename(command)).replace(/\.exe$/, '');
    const behavior = behaviors[base];
    if (behavior) return behavior(command, args);
    return { stdout: `${base} version 1.0\nextra line\n`, stderr: '' };
  };
}
function failure(props) { return Object.assign(new Error(props.message || 'Command failed'), props); }

(async () => {
  // 1. Exact arguments per tool (the primary regression).
  assert.deepEqual(TOOL_VERSION_ARGS['yt-dlp'], ['--version']);
  assert.deepEqual(TOOL_VERSION_ARGS.ffmpeg, ['-version']);
  assert.deepEqual(TOOL_VERSION_ARGS.ffprobe, ['-version']);
  assert.throws(() => versionArgsFor('curl'), /Unknown media tool/);
  const mutated = versionArgsFor('ffmpeg'); mutated.push('--oops');
  assert.deepEqual(versionArgsFor('ffmpeg'), ['-version'], 'callers must not be able to mutate shared args');

  for (const [tool, expected] of [['yt-dlp', ['--version']], ['ffmpeg', ['-version']], ['ffprobe', ['-version']]]) {
    commandLog.length = 0;
    const res = await checkToolVersion(tool, `/opt/frame/${tool}`, { runner: recordingRunner() });
    assert.equal(commandLog.length, 1);
    assert.deepEqual(commandLog[0].args, expected, `${tool} must be invoked with ${expected.join(' ')}`);
    assert.equal(res.available, true);
    assert.equal(res.version, `${tool} version 1.0`);
    console.log(`  command used: ${commandLog[0].command} ${commandLog[0].args.join(' ')}`);
  }

  // 2. Genuine nonzero exit is a failure and output is preserved.
  const nonzero = await checkToolVersion('ffmpeg', '/x/ffmpeg', { runner: recordingRunner({
    ffmpeg: async () => { throw failure({ code: 3, stdout: 'ffmpeg version 7.0.2-static\n', stderr: 'boom\n' }); }
  }) });
  assert.equal(nonzero.available, false);
  assert.equal(nonzero.kind, 'nonzero-exit');
  assert.match(nonzero.stdout, /ffmpeg version 7\.0\.2-static/);
  assert.match(nonzero.stderr, /boom/);
  assert.match(nonzero.reason, /status 3/);

  // 3. stderr noise with exit 0 is still success.
  const noisy = await checkToolVersion('ffprobe', '/x/ffprobe', { runner: recordingRunner({
    ffprobe: async () => ({ stdout: 'ffprobe version 7.0.2-static\n', stderr: 'warning: something harmless\nerror-looking text\n' })
  }) });
  assert.equal(noisy.available, true);
  assert.match(noisy.stderr, /harmless/);
  const stderrOnly = await checkToolVersion('yt-dlp', '/x/yt-dlp', { runner: recordingRunner({ 'yt-dlp': async () => ({ stdout: '', stderr: '2026.01.01\n' }) }) });
  assert.equal(stderrOnly.available, true);
  assert.equal(stderrOnly.version, '2026.01.01');

  // 4. Failure categories are distinguished.
  const missing = await checkToolVersion('ffmpeg', '/nope/ffmpeg', { fileExists: false, runner: recordingRunner({ ffmpeg: async () => { throw failure({ code: 'ENOENT' }); } }) });
  assert.equal(missing.available, false); assert.equal(missing.kind, 'missing-file');
  const noBinaryPath = await checkToolVersion('ffmpeg', null, { runner: recordingRunner() });
  assert.equal(noBinaryPath.kind, 'missing-file'); assert.equal(commandLog.filter(c => c.command === null).length, 0);
  const loaderMissing = await checkToolVersion('ffmpeg', '/x/ffmpeg', { fileExists: true, runner: recordingRunner({ ffmpeg: async () => { throw failure({ code: 'ENOENT' }); } }) });
  assert.equal(loaderMissing.kind, 'missing-runtime-library');
  const sharedLib = await checkToolVersion('ffprobe', '/x/ffprobe', { runner: recordingRunner({ ffprobe: async () => { throw failure({ code: 127, stderr: 'ffprobe: error while loading shared libraries: libfoo.so.1: cannot open shared object file' }); } }) });
  assert.equal(sharedLib.kind, 'missing-runtime-library');
  const winDll = await checkToolVersion('ffmpeg', 'C:\\app\\ffmpeg.exe', { runner: recordingRunner({ ffmpeg: async () => { throw failure({ code: 3221225781, message: 'Command failed' }); } }) });
  assert.equal(winDll.kind, 'missing-runtime-library');
  const perm = await checkToolVersion('yt-dlp', '/x/yt-dlp', { runner: recordingRunner({ 'yt-dlp': async () => { throw failure({ code: 'EACCES' }); } }) });
  assert.equal(perm.kind, 'permission-denied');
  const arch = await checkToolVersion('yt-dlp', '/x/yt-dlp', { runner: recordingRunner({ 'yt-dlp': async () => { throw failure({ code: 'ENOEXEC' }); } }) });
  assert.equal(arch.kind, 'incompatible-executable');
  const execFormat = classifyToolFailure(failure({ code: 126, stderr: 'cannot execute binary file: Exec format error' }));
  assert.equal(execFormat.kind, 'incompatible-executable');
  const badArgs = await checkToolVersion('ffmpeg', '/x/ffmpeg', { runner: recordingRunner({ ffmpeg: async () => { throw failure({ code: 1, stderr: 'Unrecognized option \'--bogus\'.' }); } }) });
  assert.equal(badArgs.kind, 'invalid-arguments');
  const slow = await checkToolVersion('ffmpeg', '/x/ffmpeg', { timeoutMs: 1234, runner: recordingRunner({ ffmpeg: async () => { throw failure({ killed: true, signal: 'SIGTERM', code: null }); } }) });
  assert.equal(slow.kind, 'timeout'); assert.match(slow.reason, /1 s|within/);

  // 5. Packaged tool paths for Linux AppImage and Windows.
  const appImage = bundledToolCandidates('ffprobe', {
    platform: 'linux', isPackaged: true, resourcesPath: '/tmp/.mount_FRAME-X07i58/resources', appPath: '/tmp/.mount_FRAME-X07i58/resources/app.asar'
  });
  assert.equal(appImage[0], '/tmp/.mount_FRAME-X07i58/resources/downloader/ffprobe');
  assert.ok(appImage.every(p => p.startsWith('/tmp/.mount_FRAME-X07i58/')), 'AppImage candidates stay inside the mount');
  const win = bundledToolCandidates('yt-dlp', {
    platform: 'win32', isPackaged: true, resourcesPath: 'C:\\Program Files\\FRAME Studio\\resources', appPath: 'C:\\Program Files\\FRAME Studio\\resources\\app.asar'
  });
  assert.equal(win[0], 'C:\\Program Files\\FRAME Studio\\resources\\downloader\\yt-dlp.exe');
  assert.equal(toolFilename('ffmpeg', 'win32'), 'ffmpeg.exe');
  const dev = bundledToolCandidates('ffmpeg', { platform: 'linux', isPackaged: false, sourceRoot: '/src/frame' });
  assert.deepEqual(dev, ['/src/frame/vendor/linux/ffmpeg']);
  for (const list of [appImage, win]) assert.ok(!list.some(p => /^ffmpeg|^yt-dlp|^ffprobe/.test(p)), 'packaged candidates are absolute bundled paths, never bare PATH names');

  // 6. media-export.cjs uses the same helper and the same arguments.
  commandLog.length = 0;
  const exportCheck = await checkMediaTools({ ffmpegPath: '/pkg/ffmpeg', ffprobePath: '/pkg/ffprobe', runner: recordingRunner() });
  assert.equal(exportCheck.available, true);
  assert.deepEqual(commandLog.map(c => [path.basename(c.command), ...c.args]).sort(), [['ffmpeg', '-version'], ['ffprobe', '-version']]);
  const exportFail = await checkMediaTools({ ffmpegPath: '/pkg/ffmpeg', ffprobePath: '/pkg/ffprobe', runner: recordingRunner({ ffprobe: async () => { throw failure({ code: 2, stderr: 'bad' }); } }) });
  assert.equal(exportFail.available, false);
  assert.equal(exportFail.ffmpeg.available, true);
  assert.equal(exportFail.ffprobe.available, false);
  assert.match(exportFail.ffprobe.error, /nonzero-exit/);

  // 7. Real child processes (POSIX): a tool that behaves like FFmpeg 7 — prints its banner for
  //    `--version` but exits nonzero — must pass with `-version` and fail with the old argument.
  if (process.platform !== 'win32') {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frame-tools-test-'));
    try {
      const ffLike = [
        '#!/bin/sh',
        'if [ "$1" = "-version" ]; then echo "ffmpeg version 7.0.2-static"; echo "built with test" 1>&2; exit 0; fi',
        'echo "ffmpeg version 7.0.2-static"; exit 1'
      ].join('\n');
      const ytLike = '#!/bin/sh\nif [ "$1" = "--version" ]; then echo 2026.01.01; exit 0; fi\necho "yt-dlp: error: no such option: $1" 1>&2; exit 2\n';
      for (const [name, body] of [['yt-dlp', ytLike], ['ffmpeg', ffLike], ['ffprobe', ffLike.replace(/ffmpeg/g, 'ffprobe')]]) {
        fs.writeFileSync(path.join(dir, name), body, { mode: 0o755 });
      }
      const results = await verifyDirectory(dir, 'linux');
      assert.deepEqual(results.map(r => r.available), [true, true, true]);
      assert.deepEqual(results.map(r => r.args), [['--version'], ['-version'], ['-version']]);
      // Old behaviour reproduced: --version on the FFmpeg-like tool fails with a genuine nonzero exit.
      const legacy = await checkToolVersion('ffmpeg', path.join(dir, 'ffmpeg'), { runner: (c, a, o) => require('../media-tools.cjs').checkToolVersion && new Promise((res, rej) => require('node:child_process').execFile(c, ['--version'], o, (e, so, se) => e ? rej(Object.assign(e, { stdout: so, stderr: se })) : res({ stdout: so, stderr: se }))) });
      assert.equal(legacy.available, false);
      assert.equal(legacy.kind, 'nonzero-exit');
      assert.match(legacy.stdout, /ffmpeg version 7\.0\.2-static/, 'diagnostics keep the banner output');
      // Missing and non-executable files in a directory are reported separately.
      fs.unlinkSync(path.join(dir, 'ffprobe'));
      fs.chmodSync(path.join(dir, 'ffmpeg'), 0o644);
      const broken = await verifyDirectory(dir, 'linux');
      assert.equal(broken.find(r => r.tool === 'ffprobe').kind, 'missing-file');
      if (typeof process.getuid === 'function' && process.getuid() !== 0) assert.equal(broken.find(r => r.tool === 'ffmpeg').kind, 'permission-denied');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }

  console.log('FRAME Studio 2.4.23 media tool validation tests: OK');
})().catch(error => { console.error(error); process.exit(1); });
