'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { serveMediaFile } = require('../media-protocol.cjs');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const main = fs.readFileSync(path.join(root, 'main.cjs'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
async function body(response) { return Buffer.from(await response.arrayBuffer()); }

function extractionSandbox(sourceClip, failExtraction = false) {
  const sandbox = {
    clips: [sourceClip],
    assets: [{ id: 'asset-video', kind: 'video', name: 'downloaded.mp4', path: '/tmp/downloaded.mp4' }],
    undoCount: 0, messages: [], statuses: [], nextId: 0, nodes: {},
    window: { frameAPI: {
      mediaURL: mediaPath => `frame-media://asset/?path=${encodeURIComponent(mediaPath)}`,
      extractAudio: async () => {
        if (failExtraction) throw new Error('expected extraction failure');
        return { path: '/tmp/extracted.m4a', name: 'downloaded - audio.m4a', duration: 6 };
      }
    } }
  };
  Object.assign(sandbox, {
    getClip: id => sandbox.clips.find(clip => clip.id === id),
    selected: () => sandbox.clips.find(clip => clip.id === 'audio-clip') || sourceClip,
    makeId: () => `new-${++sandbox.nextId}`,
    clamp: (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0)),
    $: selector => (sandbox.nodes[selector] ||= { hidden: false, disabled: false }),
    setStatus: text => sandbox.statuses.push(text),
    message: text => sandbox.messages.push(text),
    createAssetFromPath: async meta => ({ ...meta, el: {}, missing: false }),
    requestWaveform: () => {},
    pushUndo: () => { sandbox.undoCount++; },
    newClip: (asset, options) => ({ id: 'audio-clip', assetId: asset.id, name: asset.name, kind: 'audio', start: options.start, track: options.track, inPoint: 0, outPoint: asset.duration, speed: 1, volume: 100 }),
    updateLibrary: () => {}, updateTimeline: () => {}, updateInspector: () => {}, syncMedia: () => {}, drawPreview: () => {}, queueAutosave: () => {},
    fmtShort: value => `${value}s`
  });
  vm.createContext(sandbox);
  const fn = html.match(/async function extractAudioFromVideo\(clipId\)\s*\{[\s\S]*?\n\}/);
  assert.ok(fn, 'extractAudioFromVideo is present');
  vm.runInContext(`${fn[0]}\nthis.runExtract=extractAudioFromVideo;`, sandbox);
  return sandbox;
}

(async () => {
  assert.equal(pkg.version, '2.4.24');

  // Exercise several non-sequential byte requests, as media seeking does.
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'frame-seek-'));
  try {
    const source = path.join(folder, 'downloaded.mp4');
    const bytes = Buffer.from(Array.from({ length: 2 * 1024 * 1024 + 333 }, (_, i) => (i * 31) % 251));
    fs.writeFileSync(source, bytes);
    for (const [start, end] of [[0, 1023], [1024 * 1024 + 17, 1024 * 1024 + 4096], [bytes.length - 900, bytes.length - 1]]) {
      const response = await serveMediaFile(source, `bytes=${start}-${end}`);
      assert.equal(response.status, 206);
      assert.equal(response.headers.get('accept-ranges'), 'bytes');
      assert.equal(response.headers.get('content-range'), `bytes ${start}-${end}/${bytes.length}`);
      assert.equal(response.headers.get('content-length'), String(end - start + 1));
      assert.ok((await body(response)).equals(bytes.subarray(start, end + 1)), `range ${start}-${end} returns the requested bytes`);
    }
    const openEndedStart = bytes.length - 127;
    const openEnded = await serveMediaFile(source, `bytes=${openEndedStart}-`);
    assert.ok((await body(openEnded)).equals(bytes.subarray(openEndedStart)));
    const options = await serveMediaFile(source, null, 'OPTIONS');
    assert.equal(options.status, 204);
    assert.match(options.headers.get('access-control-allow-headers'), /Range/i);
  } finally { fs.rmSync(folder, { recursive: true, force: true }); }

  const protocol = fs.readFileSync(path.join(root, 'media-protocol.cjs'), 'utf8');
  assert.match(protocol, /require\('node:stream\/web'\)/);
  assert.match(protocol, /new ReadableStream\(/);
  assert.match(main, /Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS'/);
  assert.match(html, /c\.kind==='video'&&c\.audioMuted\?0:/, 'muted video source audio is silent in preview playback');
  assert.match(html, /clip\.kind==='video'&&clip\.audioMuted\)\)continue/, 'muted video source audio is excluded from export mixing');
  assert.match(html, /id="mutevideoaudio"/);
  assert.match(html, /audioMuted=!!c\.audioMuted/);

  const sourceClip = { id: 'video-1', kind: 'video', assetId: 'asset-video', name: 'downloaded.mp4', start: 3, inPoint: 1, outPoint: 7, speed: 1, volume: 100, track: 1 };
  const state = extractionSandbox(sourceClip);
  await state.runExtract('video-1');
  assert.equal(sourceClip.audioMuted, true, 'successful extraction mutes the embedded video audio');
  assert.equal(state.clips.length, 2, 'one extracted audio clip is added');
  assert.equal(state.clips[1].kind, 'audio');
  assert.equal(state.clips[1].track, 0, 'extracted audio is placed on the audio layer');
  assert.equal(state.undoCount, 1, 'extraction is undoable');
  assert.ok(state.messages.some(message => /original video audio is now muted/i.test(message)));

  const failedClip = { ...sourceClip, id: 'video-2', audioMuted: false };
  const failedState = extractionSandbox(failedClip, true);
  await failedState.runExtract('video-2');
  assert.equal(failedClip.audioMuted, false, 'failure keeps original video audio unchanged');
  assert.equal(failedState.clips.length, 1, 'failure does not add a partial audio clip');
  assert.equal(failedState.undoCount, 0, 'failure does not create an undo operation');
  assert.ok(failedState.messages.some(message => /expected extraction failure/.test(message)));

  console.log('FRAME Studio 2.4.24 downloaded-media seek and audio-extraction regression tests: OK');
})().catch(error => { console.error(error); process.exitCode = 1; });
