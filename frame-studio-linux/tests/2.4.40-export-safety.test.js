'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const {
  chooseFrameIntermediateFormat,
  renderFrameSequenceToMp4,
  probeMedia
} = require('../media-export.cjs');

const root = path.resolve(__dirname, '..');
const pkg = require(path.join(root, 'package.json'));
const main = require('node:fs').readFileSync(path.join(root, 'main.cjs'), 'utf8');
const html = require('node:fs').readFileSync(path.join(root, 'index.html'), 'utf8');
assert.equal(pkg.version, '2.4.40');
assert.match(main, /frame-%08d\.\$\{frameStorage\.format === 'jpeg' \? 'jpg' : 'png'\}/);
assert.match(main, /submitted frame does not match the selected/);
assert.match(html, /function canvasFrameBlob\(format='png'\)/);
assert.match(html, /function migrateLegacyClipRanges\(data\)/);

function fnSource(name) {
  const start = html.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} exists`);
  const brace = html.indexOf('{', start);
  let depth = 0, quote = null, escape = false;
  for (let i = brace; i < html.length; i++) {
    const c = html[i];
    if (quote) {
      if (escape) escape = false;
      else if (c === '\\') escape = true;
      else if (c === quote) quote = null;
    } else {
      if (c === "'" || c === '\"' || c === '`') quote = c;
      else if (c === '{') depth++;
      else if (c === '}' && --depth === 0) return html.slice(start, i + 1);
    }
  }
  throw new Error(`function end not found: ${name}`);
}
const migrationContext = require('node:vm').createContext({ clamp: (n, lo, hi) => Math.max(lo, Math.min(hi, n)), Math, Number, Map, Array });
require('node:vm').runInContext(`globalThis.migrateLegacyClipRanges = (${fnSource('migrateLegacyClipRanges')});`, migrationContext);
const legacyProject = {
  assets: [{ id: 'old-video', duration: 10 }, { id: 'old-audio', duration: 8 }],
  clips: [
    { id: 'old-a', assetId: 'old-video', start: undefined, inPoint: undefined, outPoint: undefined, speed: 2, duration: 3 },
    { id: 'old-b', assetId: 'old-audio', start: 4, inPoint: 2, outPoint: null, speed: 1 }
  ]
};
migrationContext.migrateLegacyClipRanges(legacyProject);
assert.equal(legacyProject.clips[0].start, 0, 'old clips missing start get a safe timeline origin');
assert.equal(legacyProject.clips[0].inPoint, 0, 'old clips missing source in-point default to zero');
assert.equal(legacyProject.clips[0].outPoint, 6, 'legacy timeline duration is converted to a source range using playback speed');
assert.equal(legacyProject.clips[1].outPoint, 8, 'if old clip range is absent, source duration fills it from the in-point');

const mib = 1024 ** 2;
const gib = 1024 ** 3;
const ample = chooseFrameIntermediateFormat({ frameCount: 30, width: 1920, height: 1080, availableBytes: 3 * gib });
assert.equal(ample.format, 'png', 'with ample space, keep the existing lossless PNG path');
const constrained = chooseFrameIntermediateFormat({ frameCount: 30, width: 1920, height: 1080, availableBytes: 60 * mib, reserveBytes: 1 * mib });
assert.equal(constrained.format, 'jpeg', 'when PNG is risky but JPEG fits, use high-quality JPEG intermediates');
const unknown = chooseFrameIntermediateFormat({ frameCount: 30, width: 1920, height: 1080, availableBytes: null });
assert.equal(unknown.format, 'png', 'unknown filesystem capacity must not unexpectedly lower quality');
assert.throws(
  () => chooseFrameIntermediateFormat({ frameCount: 30, width: 1920, height: 1080, availableBytes: 10 * mib, reserveBytes: 1 * mib }),
  /Not enough free disk space.*Free disk space/s,
  'very low free space should produce an actionable preflight error'
);
assert.throws(
  () => chooseFrameIntermediateFormat({ frameCount: 0, width: 1920, height: 1080, availableBytes: 3 * gib }),
  /Invalid frame storage estimate/
);

function run(binary, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
    let stderr = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-8000); });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`${binary} failed (${code}): ${stderr}`)));
  });
}

(async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'frame-2.4.40-export-'));
  try {
    const pattern = path.join(dir, 'frame-%08d.jpg');
    const output = path.join(dir, 'jpeg-intermediate.mp4');
    await run('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi',
      '-i', 'testsrc2=size=320x180:rate=10:duration=1.2',
      '-frames:v', '12', '-start_number', '0', '-q:v', '2', pattern
    ]);
    const result = await renderFrameSequenceToMp4({
      framePattern: pattern,
      frameCount: 12,
      outputPath: output,
      expectedDuration: 1.2,
      fps: 10,
      crf: 23,
      audioClips: []
    });
    const probe = await probeMedia(output);
    assert.equal(result.videoCodec, 'h264');
    assert.equal(result.frameCount, 12);
    assert.ok(Math.abs(probe.duration - 1.2) < 0.2, `JPEG intermediate export duration is plausible: ${probe.duration}`);
    assert.ok(probe.streams.some(stream => stream.codec_type === 'video' && stream.codec_name === 'h264'));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
  console.log('FRAME Studio 2.4.40 export safety regressions: OK');
})().catch(error => {
  console.error('FRAME Studio 2.4.40 export safety regressions: FAILED');
  console.error(error?.stack || error);
  process.exitCode = 1;
});
