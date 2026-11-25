'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const renderer = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0]?.[1] || '';
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.equal(pkg.version, '2.4.44');

function functionSource(name) {
  const start = renderer.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `function ${name} exists`);
  const brace = renderer.indexOf('{', start);
  let depth = 0, quote = null, escaped = false;
  for (let i = brace; i < renderer.length; i++) {
    const ch = renderer[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
    } else {
      if (ch === '"' || ch === "'" || ch === '`') quote = ch;
      else if (ch === '{') depth++;
      else if (ch === '}' && --depth === 0) return renderer.slice(start, i + 1);
    }
  }
  throw new Error(`could not extract ${name}`);
}

const migrate = vm.runInNewContext(`(${functionSource('stripLegacyGroupMetadata')})`);
const modern = {
  format: 'frameproj', version: 10, groupSchema: 'frame-layer-groups-v1',
  groups: [{ id: 'g1', name: 'Intro', parentId: null, maskMode: 'none', transform: { x: 12, y: 6, scaleX: 110, scaleY: 110, rotation: 0, opacity: 100 } }],
  clips: [{ id: 'a', groupId: 'g1', groupName: 'Intro', start: 0, track: 1 }, { id: 'b', groupId: 'g1', groupName: 'Intro', start: 2, track: 2 }],
  selectedGroupId: 'g1', activeGroupViewId: null, collapsedGroups: ['g1']
};
migrate(modern);
assert.equal(modern.groups.length, 1, 'current layer-group data remains intact on load/restore');
assert.equal(modern.clips[0].groupId, 'g1', 'clip membership is preserved');
assert.equal(modern.selectedGroupId, 'g1', 'group selection survives snapshots');
assert.deepEqual(modern.collapsedGroups, ['g1'], 'collapsed state survives snapshots');

const legacy = {
  format: 'frameproj', version: 9,
  groups: [{ id: 'old', name: 'Legacy', parentId: null, maskMode: 'alpha', transform: { x: 20, y: 10, scaleX: 120, scaleY: 90, rotation: 5, opacity: 80 } }],
  clips: [{ id: 'old-clip', groupId: 'old', groupName: 'Legacy', groupParentId: null }],
  selectedGroupId: 'old', activeGroupViewId: 'old', collapsedGroups: ['old']
};
migrate(legacy);
assert.equal(legacy.groups.length, 0, 'legacy pre-schema groups are still migrated safely');
assert.equal(legacy.clips[0].groupId, undefined, 'legacy group membership is flattened');
assert.equal(legacy.clips[0].legacyGroupTransforms[0].x, 20, 'legacy transform is retained on its clip');

const clamp = vm.runInNewContext(`(${functionSource('clampGroupMoveDeltas')})`, {
  clamp: (n, a, b) => Math.max(a, Math.min(b, n)),
  MAX_VIDEO_TRACKS: 12,
  videoTrackCount: 6,
  Number, Math, Array
});
const selection = [
  { id: 'a', kind: 'video', start: 2, track: 3 },
  { id: 'b', kind: 'video', start: 8, track: 5 }
];
let movement = clamp(selection, -20, -20, 6);
assert.deepEqual(JSON.parse(JSON.stringify(movement)), { timeDelta: -2, trackDelta: -2 }, 'left and bottom limits clamp the whole group using one shared delta');
const shifted = selection.map(clip => ({ start: clip.start + movement.timeDelta, track: clip.track + movement.trackDelta }));
assert.deepEqual(shifted, [{ start: 0, track: 1 }, { start: 6, track: 3 }], 'relative temporal and track spacing is preserved at bounds');

movement = clamp(selection, 20, 20, 6);
assert.deepEqual(JSON.parse(JSON.stringify(movement)), { timeDelta: 20, trackDelta: 1 }, 'upper track limit clamps the selection as a whole');
const upward = selection.map(clip => clip.track + movement.trackDelta);
assert.deepEqual(upward, [4, 6], 'clips never collapse onto one track when the upper boundary is reached');

assert.match(renderer, /version:10,groupSchema:'frame-layer-groups-v1'/, 'undo snapshots identify current group schema');
assert.match(renderer, /version:10,groupSchema:'frame-layer-groups-v1',activeGroupViewId/, 'saved projects identify current group schema');
console.log('FRAME Studio group persistence and rigid movement tests: OK');
