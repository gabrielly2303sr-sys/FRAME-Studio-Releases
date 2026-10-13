'use strict';
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const main = require('node:fs').readFileSync(path.join(root, 'main.cjs'), 'utf8');
const preload = require('node:fs').readFileSync(path.join(root, 'preload.cjs'), 'utf8');
assert.match(main, /ipcMain\.handle\('frame:generate-waveform'/, 'waveform IPC exists');
assert.match(main, /ipcMain\.handle\('frame:extract-audio'/, 'extract-audio IPC exists');
assert.match(main, /ipcMain\.handle\('frame:save-audio-recording'/, 'recording-save IPC exists');
assert.match(preload, /generateWaveform:\s*\(path, duration\)/, 'renderer can request waveforms');
assert.match(preload, /extractAudio:\s*\(payload\)/, 'renderer can extract source audio');
assert.match(main, /setPermissionRequestHandler/, 'microphone permission request is handled in Electron');

const available = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
if (available.error || available.status !== 0) {
  console.log('FRAME Studio audio-tool integration: skipped (FFmpeg unavailable)');
  process.exit(0);
}
const run = (args, options = {}) => {
  const result = spawnSync('ffmpeg', args, { encoding: options.encoding, maxBuffer: 32 * 1024 * 1024, timeout: 30000 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error((result.stderr || '').slice(-6000) || `FFmpeg exit ${result.status}`);
  return result;
};
(async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'frame-audio-tools-'));
  try {
    const video = path.join(temp, 'with-audio.mp4');
    const extracted = path.join(temp, 'extracted.m4a');
    run(['-y', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc=size=160x90:rate=10:duration=2', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=2', '-shortest', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', video]);
    const pcm = run(['-v', 'error', '-i', video, '-map', '0:a:0', '-vn', '-ac', '1', '-ar', '4000', '-f', 's16le', 'pipe:1']);
    const raw = pcm.stdout;
    assert.ok(Buffer.isBuffer(raw) && raw.length > 4000, 'waveform path returns real PCM samples');
    let peak = 0;
    for (let i = 0; i + 1 < raw.length; i += 2) peak = Math.max(peak, Math.abs(raw.readInt16LE(i)) / 32768);
    assert.ok(peak > 0.1, 'decoded test tone produces nonzero waveform peaks');
    run(['-y', '-v', 'error', '-i', video, '-ss', '0.4', '-t', '0.8', '-map', '0:a:0', '-vn', '-c:a', 'copy', extracted]);
    const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', extracted], { encoding: 'utf8', timeout: 10000 });
    assert.equal(probe.status, 0, 'extracted audio can be probed');
    const duration = Number(probe.stdout.trim());
    assert.ok(duration >= 0.5 && duration <= 1.3, `trimmed audio duration should remain synchronized (${duration}s)`);
    console.log('FRAME Studio audio-tool integration tests: OK');
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
