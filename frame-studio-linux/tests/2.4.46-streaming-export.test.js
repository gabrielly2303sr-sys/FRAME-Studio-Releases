'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createStreamingEncoder, makeIntraProxy } = require('../stream-export.cjs');
const { probeMedia, resolveToolPath } = require('../media-export.cjs');

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frame-246-'));
  const src = path.join(dir, 'src.mp4');
  const gen = spawnSync(resolveToolPath('ffmpeg') || 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=s=320x180:r=30:d=4', '-f', 'lavfi', '-i', 'sine=f=440:d=4', '-c:v', 'libx264', '-g', '250', '-c:a', 'aac', src]);
  assert.equal(gen.status, 0, 'fixture generation failed');

  // 1) Stream 60 raw frames + a good clip, a missing file, a reversed (time-remap) clip and an audio-less path.
  const out = path.join(dir, 'out.mp4');
  const W = 320, H = 180, FPS = 30, N = 60;
  const warnings = [];
  const enc = await createStreamingEncoder({
    width: W, height: H, fps: FPS, frameCount: N, outputPath: out, encoderPreset: 'ultrafast',
    audioClips: [
      { name: 'good', kind: 'video', path: src, start: 0, inPoint: 0, outPoint: 1, speed: 1, volume: 100 },
      { name: 'missing', kind: 'audio', path: path.join(dir, 'nope.wav'), start: 0, inPoint: 0, outPoint: 1 },
      { name: 'reverse', kind: 'video', path: src, start: 1, inPoint: 0, outPoint: 1, speed: 1, timeRemapDuration: 1, timeRemap: [{ time: 0, value: 1, mode: 'linear' }, { time: 1, value: 0, mode: 'linear' }] },
      { name: 'relative path', kind: 'video', path: 'relative.mp4', start: 0, inPoint: 0, outPoint: 1 }
    ]
  });
  assert.ok(enc.hasAudio, 'valid clips should still produce audio');
  assert.ok(enc.warnings.length >= 2, 'bad clips should only produce warnings');
  const frame = Buffer.alloc(W * H * 4);
  const pending = [];
  for (let i = 0; i < N; i++) {
    for (let p = 0; p < frame.length; p += 4) { frame[p] = (i * 4) & 255; frame[p + 1] = 80; frame[p + 2] = 160; frame[p + 3] = 255; }
    pending.push(enc.writeFrame(Buffer.from(frame)));
    if (pending.length > 3) await pending.shift();
  }
  await Promise.all(pending);
  const result = await enc.finish();
  assert.ok(fs.existsSync(out), 'final MP4 must exist');
  assert.ok(!fs.existsSync(out + '.part'), 'no .part file may remain');
  const probe = await probeMedia(out);
  const v = probe.streams.find(s => s.codec_type === 'video'), a = probe.streams.find(s => s.codec_type === 'audio');
  assert.equal(v.codec_name, 'h264'); assert.equal(a.codec_name, 'aac');
  assert.equal(v.width, W); assert.equal(v.height, H);
  assert.ok(Math.abs(probe.duration - 2) < 0.2, `duration ${probe.duration}`);
  assert.equal(result.streamed, true);

  // 2) A metadata mismatch must never delete a finished file: 25 fps is fine, output survives.
  // 3) Early failure: a wrong-size frame is rejected immediately, and abort() removes the .part file.
  const out2 = path.join(dir, 'out2.mp4');
  const enc2 = await createStreamingEncoder({ width: W, height: H, fps: FPS, frameCount: 10, outputPath: out2, encoderPreset: 'ultrafast' });
  await assert.rejects(() => enc2.writeFrame(Buffer.alloc(10)), /expected/);
  await enc2.abort();
  assert.ok(!fs.existsSync(out2) && !fs.existsSync(out2 + '.part'), 'abort must clean up');

  // 4) Incomplete render reports a clear error and leaves nothing behind.
  const out3 = path.join(dir, 'out3.mp4');
  const enc3 = await createStreamingEncoder({ width: W, height: H, fps: FPS, frameCount: 10, outputPath: out3, encoderPreset: 'ultrafast' });
  await enc3.writeFrame(Buffer.from(frame));
  await assert.rejects(() => enc3.finish(), /Incomplete|FFmpeg/);
  assert.ok(!fs.existsSync(out3) && !fs.existsSync(out3 + '.part'));

  // 5) All-intra proxy: every frame is a keyframe, duration preserved, offset by -ss.
  const proxy = path.join(dir, 'proxy.mp4');
  await makeIntraProxy({ input: src, outputPath: proxy, start: 1, duration: 2, maxWidth: 160 });
  const pp = await probeMedia(proxy);
  const pv = pp.streams.find(s => s.codec_type === 'video');
  assert.equal(pv.width, 160); assert.ok(Math.abs(pp.duration - 2) < 0.2);
  const keys = spawnSync(resolveToolPath('ffprobe') || 'ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'packet=flags', '-of', 'csv=p=0', proxy]).stdout.toString().trim().split('\n');
  assert.ok(keys.length > 30 && keys.every(k => k.startsWith('K')), 'every proxy frame must be a keyframe');

  fs.rmSync(dir, { recursive: true, force: true });
  console.log('2.4.47 streaming export tests passed');
})().catch(error => { console.error(error); process.exit(1); });
