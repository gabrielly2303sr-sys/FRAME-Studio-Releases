'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const media = require('../media-export.cjs');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const main = fs.readFileSync(path.join(root, 'main.cjs'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.equal(pkg.version, '2.4.30');
for (const encoder of ['h264_nvenc', 'h264_qsv', 'h264_amf', 'h264_vaapi', 'h264_videotoolbox', 'libx264']) {
  const args = media.videoEncoderOutputArgs({ encoder, hardware: encoder !== 'libx264', ...(encoder === 'h264_vaapi' ? { vaapiDevice: '/dev/dri/renderD128' } : {}) }, { fps: 30, crf: 18, rateMode: 'crf', encoderPreset: 'medium', videoBitrate: 12 });
  assert.ok(args.includes(encoder), `encoder args should use ${encoder}`);
  assert.ok(args.includes('-vf'), 'each encoder should get an appropriate scale/upload filter');
}
const nvenc = media.videoEncoderOutputArgs({ encoder: 'h264_nvenc', hardware: true }, { fps: 30, crf: 18, rateMode: 'crf', videoBitrate: 12 });
assert.ok(nvenc.includes('-cq'), 'NVENC should use a hardware quality control');
const vaapi = media.videoEncoderOutputArgs({ encoder: 'h264_vaapi', hardware: true, vaapiDevice: '/dev/dri/renderD128' }, { fps: 30, crf: 18, rateMode: 'crf', videoBitrate: 12 });
assert.ok(vaapi[vaapi.indexOf('-vf') + 1].includes('hwupload'), 'VAAPI must upload frames to the GPU');
assert.match(main, /encoder: metadata\.encoder, hardwareAcceleration: metadata\.hardwareAcceleration/);
assert.match(html, /function scheduleScrubPreviewDraw\(\)\{if\(scrubPreviewFrameRequest\)return;scrubPreviewFrameRequest=requestAnimationFrame\(\(\)=>\{scrubPreviewFrameRequest=0;if\(playheadDrag&&!offlineRendering\)syncMedia\(true\);drawPreview\(\)\}\)\}/);
const refresh = html.match(/function attachTimelineVideoPreviewEvents\(asset,el\)\{([^\n]+)/)?.[1] || '';
assert.ok(refresh.includes('if(el.seeking){if(pendingGap>tolerance)seekVideoPreviewTo(el,wanted,{precise:!playheadDrag});if(playheadDrag)scheduleScrubPreviewDraw();return}'), 'pending seek should not start a recursive RAF render loop');
console.log('FRAME Studio 2.4.30 GPU export, group persistence and preview scrub checks: OK');
