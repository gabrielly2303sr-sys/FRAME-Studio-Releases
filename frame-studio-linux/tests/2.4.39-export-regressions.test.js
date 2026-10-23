'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const renderer = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0]?.[1] || '';
assert.equal(pkg.version, '2.4.39');
new vm.Script(renderer, { filename: 'renderer-inline.js' });
assert.match(renderer, /offlineVideoFrameSnapshots\.get\(c\.id\)/, 'each timeline clip must use its own decoded video snapshot');
assert.match(renderer, /offlineVideoFrameCanvases\.get\(clip\.id\)/, 'frame canvases are reused per clip to avoid per-frame allocations');
assert.doesNotMatch(renderer, /A mesma mídia está em dois clipes de vídeo sobrepostos em tempos de origem diferentes/, 'overlapping instances of one asset must not abort export');
assert.match(renderer, /Falha ao preparar\/renderizar o frame \$\{frameIndex\+1\}\/\$\{frameCount\}/, 'render errors include frame number and time');

function fnSource(name) {
  let start = renderer.indexOf(`async function ${name}(`);
  if (start < 0) start = renderer.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} exists`);
  const brace = renderer.indexOf('{', start);
  let depth = 0, quote = null, escape = false;
  for (let i = brace; i < renderer.length; i++) {
    const c = renderer[i];
    if (quote) {
      if (escape) escape = false;
      else if (c === '\\') escape = true;
      else if (c === quote) quote = null;
    } else {
      if (c === "'" || c === '"' || c === '`') quote = c;
      else if (c === '{') depth++;
      else if (c === '}' && --depth === 0) return renderer.slice(start, i + 1);
    }
  }
  throw new Error(`function end not found: ${name}`);
}

const duration = c => Math.max(0, (Number(c.outPoint) - Number(c.inPoint)) / Math.max(.1, Number(c.speed) || 1));
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const sourceTimeAt = (c, t) => Number(c.inPoint || 0) + clamp((t - c.start) / Math.max(.001, duration(c)), 0, 1) * (Number(c.outPoint) - Number(c.inPoint));
const makeVideoElement = () => ({ currentTime: 0, duration: 20, videoWidth: 640, videoHeight: 360, readyState: 4, seeking: false, pause() {} });
const source = makeVideoElement();
const asset = { id: 'same-asset', name: 'shared.mp4', path: '/tmp/shared.mp4', kind: 'video', duration: 20, width: 640, height: 360, el: source, missing: false };
const frameCanvases = new Map();
const snapshots = new Map();
const ctx = vm.createContext({
  Math, Number, Object, Array, Map, Promise, Error, console,
  clips: [], assets: [asset], trackSettings: {}, offlineRendering: true,
  offlineVideoFrameSnapshots: snapshots, offlineVideoFrameCanvases: frameCanvases,
  duration, clamp, sourceTimeAt,
  waitForVideoSeek: async (el, target) => { el.currentTime = target; el.seeking = false; },
  document: { createElement: type => {
    assert.equal(type, 'canvas');
    const frame = { width: 0, height: 0, capturedTime: null, getContext: () => ({ clearRect() {}, drawImage: el => { frame.capturedTime = el.currentTime; } }) };
    return frame;
  } }
});
vm.runInContext(`globalThis.activeAt = (${fnSource('activeAt')}); globalThis.activeAtTest = globalThis.activeAt; globalThis.prepareTest = (${fnSource('prepareVideoFramesAt')});`, ctx);

(async () => {
  const oldClip = { id: 'old', kind: 'video', assetId: 'same-asset', track: 1, start: 0, inPoint: 0, outPoint: 2, speed: 1 };
  const newClip = { id: 'new', kind: 'video', assetId: 'same-asset', track: 1, start: 2, inPoint: 2, outPoint: 4, speed: 1 };
  ctx.clips = [oldClip, newClip];
  assert.deepEqual(Array.from(ctx.activeAtTest(2), c => c.id), ['new'], 'exact cut boundary activates only the new clip during deterministic rendering');

  const first = { id: 'first', kind: 'video', assetId: 'same-asset', track: 1, start: 0, inPoint: 0, outPoint: 4, speed: 1 };
  const second = { id: 'second', kind: 'video', assetId: 'same-asset', track: 1, start: 1, inPoint: 8, outPoint: 12, speed: 1 };
  ctx.clips = [first, second];
  assert.equal(ctx.activeAtTest(2).length, 2, 'overlapping instances of the same asset remain active');
  await ctx.prepareTest(2);
  assert.equal(snapshots.size, 2, 'export captures both clips independently');
  assert.equal(snapshots.get('first').canvas.capturedTime, 2, 'first clip snapshot uses first clip source time');
  assert.equal(snapshots.get('second').canvas.capturedTime, 9, 'second clip snapshot uses second clip source time');
  assert.equal(frameCanvases.size, 2, 'one reusable canvas is retained per clip');
  assert.equal(snapshots.get('first').time, 2);
  assert.equal(snapshots.get('second').time, 9);
  console.log('FRAME Studio 2.4.39 MP4 export regressions: OK');
})().catch(error => { console.error(error); process.exitCode = 1; });
