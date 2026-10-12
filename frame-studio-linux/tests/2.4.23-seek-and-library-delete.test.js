'use strict';
// 2.4.23: frozen-frame scrubbing fix for downloaded videos + right-click delete in Media / Saved.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const Module = require('node:module');
const { parseByteRange, serveMediaFile, mimeTypeFor } = require('../media-protocol.cjs');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

async function readAll(response) { return Buffer.from(await response.arrayBuffer()); }

(async () => {
  // ---------- frame-media:// Range support (real file, real Response objects) ----------
  assert.deepEqual(parseByteRange('bytes=0-9', 100), { start: 0, end: 9 });
  assert.deepEqual(parseByteRange('bytes=90-', 100), { start: 90, end: 99 });
  assert.deepEqual(parseByteRange('bytes=-10', 100), { start: 90, end: 99 });
  assert.deepEqual(parseByteRange('bytes=50-5000', 100), { start: 50, end: 99 }, 'end is clamped to file size');
  assert.equal(parseByteRange('bytes=100-', 100), 'unsatisfiable');
  assert.equal(parseByteRange('bytes=9-3', 100), 'unsatisfiable');
  assert.equal(parseByteRange(null, 100), null);
  assert.equal(parseByteRange('garbage', 100), null);
  assert.equal(mimeTypeFor('/x/Clip.MP4'), 'video/mp4');
  assert.equal(mimeTypeFor('/x/a.webm'), 'video/webm');
  assert.equal(mimeTypeFor('/x/a.unknown'), 'application/octet-stream');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frame-range-'));
  try {
    const file = path.join(dir, 'downloaded.mp4');
    const data = Buffer.from(Array.from({ length: 1000 }, (_, i) => i % 251));
    fs.writeFileSync(file, data);

    const full = await serveMediaFile(file, null);
    assert.equal(full.status, 200);
    assert.equal(full.headers.get('accept-ranges'), 'bytes');
    assert.equal(full.headers.get('content-type'), 'video/mp4');
    assert.equal(full.headers.get('content-length'), '1000');
    assert.ok((await readAll(full)).equals(data));

    const part = await serveMediaFile(file, 'bytes=100-199');
    assert.equal(part.status, 206);
    assert.equal(part.headers.get('content-range'), 'bytes 100-199/1000');
    assert.equal(part.headers.get('content-length'), '100');
    assert.ok((await readAll(part)).equals(data.subarray(100, 200)));

    const tail = await serveMediaFile(file, 'bytes=-50');
    assert.equal(tail.status, 206);
    assert.equal(tail.headers.get('content-range'), 'bytes 950-999/1000');
    assert.ok((await readAll(tail)).equals(data.subarray(950)));

    // Browsers probing for the moov atom at the end of a non-faststart MP4.
    const openEnded = await serveMediaFile(file, 'bytes=900-');
    assert.equal(openEnded.status, 206);
    assert.equal(openEnded.headers.get('content-range'), 'bytes 900-999/1000');

    const bad = await serveMediaFile(file, 'bytes=5000-6000');
    assert.equal(bad.status, 416);
    assert.equal(bad.headers.get('content-range'), 'bytes */1000');

    const head = await serveMediaFile(file, 'bytes=0-9', 'HEAD');
    assert.equal(head.status, 206);
    assert.equal((await readAll(head)).length, 0);

    assert.equal((await serveMediaFile(path.join(dir, 'missing.mp4'), null)).status, 404);
    assert.equal((await serveMediaFile(dir, null)).status, 404, 'directories are not served');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }

  // ---------- Renderer: removal from the Media bin with undo (functions executed from index.html) ----------
  const grab = (name) => {
    const match = html.match(new RegExp(`(?:async )?function ${name}\\([\\s\\S]*?\\r?\\n\\}\\r?\\n`));
    assert.ok(match, `${name} located in index.html`);
    return match[0];
  };
  const source = ['removeAssetFromProject', 'reviveStashedAssets', 'deleteSavedMediaFile'].map(grab).join('\n');
  const calls = [];
  const sandbox = {
    assets: [{ id: 'a1', name: 'clip.mp4', path: '/lib/clip.mp4', el: { paused: true } }, { id: 'a2', name: 'other.mp4', path: '/lib/other.mp4' }],
    clips: [{ id: 'c1', assetId: 'a1' }, { id: 'c2', assetId: 'a1' }, { id: 'c3', assetId: 'a2' }],
    selectedIds: new Set(['c1', 'c3']), selectedId: 'c1', sourcePreviewId: 'a1', sourcePlaybackEpoch: 0, sourcePlaying: true, previewMode: 'source',
    removedAssetStash: new Map(), confirmAnswer: true, undoStack: [], statusText: '',
    confirm: (text) => { calls.push(['confirm', text]); return sandbox.confirmAnswer; },
    stateSnapshot: () => JSON.stringify({ clips: sandbox.clips.map(c => c.id) }),
    pushUndo: () => { sandbox.undoStack.push(sandbox.stateSnapshot()); },
    updateLibrary: () => calls.push(['updateLibrary']), updateTimeline: () => {}, updateInspector: () => {}, drawPreview: () => {}, queueAutosave: () => {},
    setStatus: (t) => { sandbox.statusText = t; }, message: (t) => calls.push(['message', t]),
    refreshDownloadedMedia: async () => calls.push(['refreshSaved']), downloadedMediaFolder: '',
    window: { frameAPI: {} }
  };
  vm.createContext(sandbox);
  vm.runInContext(source + '\nthis.removeAssetFromProject=removeAssetFromProject;this.reviveStashedAssets=reviveStashedAssets;this.deleteSavedMediaFile=deleteSavedMediaFile;', sandbox);

  // Canceling the confirmation changes nothing.
  sandbox.confirmAnswer = false;
  sandbox.removeAssetFromProject('a1');
  assert.equal(sandbox.assets.length, 2); assert.equal(sandbox.clips.length, 3);

  sandbox.confirmAnswer = true;
  sandbox.removeAssetFromProject('a1');
  assert.deepEqual(sandbox.assets.map(a => a.id), ['a2']);
  assert.deepEqual(sandbox.clips.map(c => c.id), ['c3'], 'clips using the removed media are removed');
  assert.deepEqual([...sandbox.selectedIds], ['c3']);
  assert.equal(sandbox.sourcePreviewId, null);
  assert.equal(sandbox.previewMode, 'timeline', 'source preview of the removed media is closed');
  assert.match(calls.find(c => c[0] === 'confirm')[1], /2 clipe/, 'confirmation mentions affected clips');
  assert.ok(sandbox.removedAssetStash.has('a1'));

  // Undo restores the bin entry together with the clips (restoreSnapshot calls reviveStashedAssets(raw)).
  sandbox.clips = [{ id: 'c1', assetId: 'a1' }, { id: 'c2', assetId: 'a1' }, { id: 'c3', assetId: 'a2' }];
  sandbox.reviveStashedAssets(sandbox.undoStack[0]);
  assert.ok(sandbox.assets.some(a => a.id === 'a1'), 'asset returns to the Media bin on undo');
  assert.equal(sandbox.removedAssetStash.size, 0);
  assert.match(html, /reviveStashedAssets\(raw\);configureCanvas\(\)/, 'restoreSnapshot revives stashed assets');

  // Removing an UNUSED asset is also undoable (matched by the snapshot taken before removal).
  sandbox.clips = [{ id: 'c3', assetId: 'a2' }];
  sandbox.assets = [{ id: 'a9', name: 'unused.mp3' }, { id: 'a2', name: 'other.mp4' }];
  sandbox.removeAssetFromProject('a9');
  assert.deepEqual(sandbox.assets.map(a => a.id), ['a2']);
  sandbox.reviveStashedAssets(sandbox.undoStack[sandbox.undoStack.length - 1]);
  assert.ok(sandbox.assets.some(a => a.id === 'a9'));

  // ---------- Renderer: deleting from Saved ----------
  sandbox.assets = [{ id: 'a2', name: 'other.mp4', path: '/lib/other.mp4', missing: false }];
  sandbox.window.frameAPI.deleteDownloadedMedia = async (rel) => ({ deleted: true, trashed: true, relativePath: rel, path: '/lib/other.mp4' });
  await sandbox.deleteSavedMediaFile({ name: 'other.mp4', relativePath: 'other.mp4' });
  assert.equal(sandbox.assets[0].missing, true, 'project media pointing at the deleted file is flagged as missing');
  assert.ok(calls.some(c => c[0] === 'refreshSaved'), 'Saved list is refreshed');
  calls.length = 0;
  sandbox.window.frameAPI.deleteDownloadedMedia = async () => ({ deleted: false, canceled: true });
  await sandbox.deleteSavedMediaFile({ name: 'x.mp4', relativePath: 'x.mp4' });
  assert.equal(calls.length, 0, 'canceled deletion changes nothing');
  sandbox.window.frameAPI.deleteDownloadedMedia = async () => { throw new Error('boom'); };
  await sandbox.deleteSavedMediaFile({ name: 'x.mp4', relativePath: 'x.mp4' });
  assert.ok(calls.some(c => c[0] === 'message' && /boom/.test(c[1])), 'errors are surfaced to the user');

  // Both lists wire the right-click menu.
  assert.match(html, /id="librarycontextmenu"/);
  assert.match(html, /b\.addEventListener\('contextmenu'[\s\S]{0,200}removeAssetFromProject\(a\.id\)/, 'Media cards have a context menu');
  assert.match(html, /row\.addEventListener\('contextmenu'[\s\S]{0,400}deleteSavedMediaFile\(item\)/, 'Saved files have a context menu');
  assert.match(html, /initLibraryContextMenu\(\);/);

  // ---------- main.cjs: the delete IPC handler, executed with a mocked Electron ----------
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'frame-userdata-'));
  const handlers = new Map();
  const dialogAnswers = [];
  const trashed = [];
  let trashFails = false;
  const noop = () => {};
  const electronMock = new Proxy({
    app: new Proxy({ getPath: () => userData, isPackaged: false, getAppPath: () => root, getVersion: () => '0', whenReady: () => new Promise(noop), on: noop, once: noop, requestSingleInstanceLock: () => true, quit: noop, commandLine: { appendSwitch: noop } }, { get: (t, k) => (k in t ? t[k] : noop) }),
    ipcMain: { handle: (name, fn) => handlers.set(name, fn), on: noop },
    dialog: { showMessageBox: async (...args) => { const options = args[args.length - 1]; dialogAnswers.push(options); return { response: dialogAnswers.next ?? 0 }; } },
    shell: { trashItem: async (p) => { if (trashFails) throw new Error('no trash'); trashed.push(p); fs.rmSync(p); }, openPath: async () => '' },
    protocol: { registerSchemesAsPrivileged: noop, handle: noop },
    net: { fetch: async () => new Response('') }, session: {},
    BrowserWindow: Object.assign(function () {}, { fromWebContents: () => null, getAllWindows: () => [] })
  }, { get: (t, k) => (k in t ? t[k] : noop) });
  const originalLoad = Module._load;
  Module._load = function (request, ...rest) {
    if (request === 'electron') return electronMock;
    if (request === 'electron-updater') return { autoUpdater: new Proxy({}, { get: () => noop, set: () => true }) };
    return originalLoad.call(this, request, ...rest);
  };
  try {
    require('../main.cjs');
  } finally { Module._load = originalLoad; }
  const del = handlers.get('frame:downloaded-media-delete');
  assert.equal(typeof del, 'function', 'delete IPC handler is registered');
  const trusted = { senderFrame: { url: require('node:url').pathToFileURL(path.join(root, 'index.html')).href }, sender: {} };
  const libraryRoot = path.join(userData, 'Media Library', 'Downloaded Media');
  fs.mkdirSync(path.join(libraryRoot, 'sub'), { recursive: true });
  const target = path.join(libraryRoot, 'sub', 'video.mp4');
  fs.writeFileSync(target, 'x');
  const outside = path.join(userData, 'secret.mp4');
  fs.writeFileSync(outside, 'x');

  await assert.rejects(() => del({ senderFrame: { url: 'file:///evil.html' }, sender: {} }, 'sub/video.mp4'), /Unauthorized/);
  await assert.rejects(() => del(trusted, '../../secret.mp4'), /Invalid library path/, 'path traversal is rejected');
  await assert.rejects(() => del(trusted, '/etc/passwd'), /Invalid library path/);
  await assert.rejects(() => del(trusted, 'sub/not-media.txt'), /not found|not supported/);
  assert.ok(fs.existsSync(outside) && fs.existsSync(target), 'nothing was removed by rejected requests');

  dialogAnswers.next = 1; // user presses Cancel
  let result = await del(trusted, 'sub/video.mp4');
  assert.equal(result.deleted, false); assert.ok(fs.existsSync(target), 'cancel keeps the file');
  dialogAnswers.next = 0; // user confirms
  result = await del(trusted, 'sub/video.mp4');
  assert.equal(result.deleted, true); assert.equal(result.trashed, true);
  assert.deepEqual(trashed, [target], 'file goes to the trash');
  assert.ok(!fs.existsSync(target));
  assert.match(dialogAnswers[0].message, /video\.mp4/);

  // Trash unavailable -> separate confirmation for permanent deletion.
  fs.writeFileSync(target, 'x'); trashFails = true;
  result = await del(trusted, 'sub/video.mp4');
  assert.equal(result.deleted, true); assert.equal(result.trashed, false); assert.ok(!fs.existsSync(target));
  fs.rmSync(userData, { recursive: true, force: true });

  console.log('FRAME Studio 2.4.23 seek/range and library-delete tests: OK');
  process.exit(0);
})().catch(error => { console.error(error); process.exit(1); });
