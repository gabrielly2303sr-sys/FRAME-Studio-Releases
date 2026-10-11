'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const renderer = html.match(/<script[^>]*>([\s\S]*?)<\/script>/)?.[1] || '';
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

// Exercise the independent timeline track geometry with saved/default heights.
const trackStart = renderer.indexOf('function defaultTrackHeight(');
const trackEnd = renderer.indexOf('function updateTimeline()', trackStart);
assert.ok(trackStart >= 0 && trackEnd > trackStart, 'timeline geometry block is present');
const trackContext = vm.createContext({
  clamp, MAX_VIDEO_TRACKS: 32, TRACK_ROW_HEIGHT: 36,
  videoTrackCount: 3, trackHeights: { 0: 54, 1: 42, 2: 78, 3: 32 }
});
vm.runInContext(renderer.slice(trackStart, trackEnd), trackContext);
const geometry = vm.runInContext('timelineTrackGeometry(3)', trackContext);
assert.equal(geometry.heights[0], 54, 'audio track keeps its independent height');
assert.equal(geometry.heights[2], 78, 'video track keeps its independent height');
assert.equal(geometry.tops[3], 0, 'top track starts at the top of the track zone');
assert.equal(geometry.tops[2], 32, 'track positions sum the heights above them');
assert.equal(geometry.total, 206, 'total timeline track height includes every track once');

// Exercise actual perspective projection and the inverse transform used when editing
// a child whose visible transform includes one or more parent groups.
const sceneStart = renderer.indexOf('function sceneViewState(');
const sceneEnd = renderer.indexOf('function setCameraViewportMode(', sceneStart);
assert.ok(sceneStart >= 0 && sceneEnd > sceneStart, 'scene viewport block is present');
const groups = [{ id: 'g1', parentId: null, transform: { x: 100, y: 50, scaleX: 200, scaleY: 50, rotation: 90 } }];
const sceneContext = vm.createContext({
  clamp, canvas: { width: 1280, height: 720 },
  camera3d: { editorView: { orbitYaw: 0, orbitPitch: 0, distance: 1500, pivotX: 0, pivotY: 0, pivotZ: 0 } },
  groups, groupById: id => groups.find(g => g.id === id),
  rotateVector: (v, rx, ry, rz) => { let { x, y, z } = v; let c=Math.cos(rx), s=Math.sin(rx); [y,z]=[y*c-z*s,y*s+z*c]; c=Math.cos(ry);s=Math.sin(ry);[x,z]=[x*c+z*s,-x*s+z*c];c=Math.cos(rz);s=Math.sin(rz);[x,y]=[x*c-y*s,x*s+y*c];return {x,y,z}; },
  transformedWorldPoint: (x, y, p) => ({ x: x + (p.x || 0), y: y + (p.y || 0), z: p.z || 0 }),
  setDirectProp: (clip, key, value) => { clip.props[key] = value; },
  clip: { id: 'child', groupId: 'g1', props: {} },
  updateCameraUI() {}, drawPreview() {}, defaultCamera3d: () => ({ editorView: {} }),
  $: () => null, $$: () => [], document: {}, queueAutosave() {}, message() {}
});
vm.runInContext(renderer.slice(sceneStart, sceneEnd), sceneContext);
const projectedOrigin = vm.runInContext('sceneProjectPoint({x:0,y:0,z:0})', sceneContext);
assert.ok(projectedOrigin && Math.abs(projectedOrigin.x - 640) < 0.01 && Math.abs(projectedOrigin.y - 360) < 0.01,
  'external viewport projects its orbit pivot to the view center');
const local = vm.runInContext("sceneLocalPositionForWorld({groupId:'g1'},60,55)", sceneContext);
assert.ok(Math.abs(local.x - 10) < 0.001 && Math.abs(local.y - 20) < 0.001,
  'world-space manipulations invert the selected group transform before writing child properties');
vm.runInContext("setSceneLayerWorldTransform(clip,{x:61,y:55,z:0,rotationZ:95,scaleX:200,scaleY:50},['x'])", sceneContext);
assert.ok(Math.abs(sceneContext.clip.props.x - 10) < 0.001 && Math.abs(sceneContext.clip.props.y - 19.5) < 0.001,
  'moving a grouped child along world X adjusts its local X/Y without losing the parent transform');

for (const required of [
  'function zoomTimelineAtPointer(', 'function applyTrackLayoutOnly(',
  "e.button===2?'look':'orbit'", "g.type==='look'", 'function attachSceneViewportNavigation(',
  'function drawSceneEditorViewport(', 'data-scene-gizmo="camera-select"',
  'function insertRecordedAudio(', 'function extractAudioFromVideo(',
  'frame:generate-waveform', 'frame:save-audio-recording', 'frame:extract-audio'
]) assert.ok(html.includes(required) || fs.readFileSync(path.join(root, 'main.cjs'), 'utf8').includes(required), `missing interaction integration: ${required}`);

console.log('FRAME Studio editor interaction logic tests: OK');
