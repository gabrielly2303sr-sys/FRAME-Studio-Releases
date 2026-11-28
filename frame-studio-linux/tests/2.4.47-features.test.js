'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

// UI affordances for the preview build.
for (const id of [
  'previewFullscreen', 'chromapick', 'addaudiotrack', 'snapclipedges',
  'copykeyframes', 'pastekeyframes', 'textanimation', 'textanimationduration',
  'mutevideoaudio'
]) assert.match(html, new RegExp(`id="${id}"`), `${id} control exists`);
assert.match(html, /data-prop="hue"/, 'hue adjustment is available');
for (const prop of ['chromaColor', 'colorizeColor', 'textColor', 'colorizeIntensity', 'chromaTolerance', 'textSize', 'hue']) {
  assert.match(html, new RegExp(`data-key="${prop}"`), `${prop} can receive keyframes`);
}

// The playhead is recreated when the timeline rerenders, so its pointer handler
// must be delegated from the stable track zone (exactly one handler on that zone).
assert.equal((html.match(/#trackzone'\)\.addEventListener\('pointerdown'/g) || []).length, 1);
assert.match(html, /e\.target\.closest\('#playhead'\)\)\{beginPlayheadDrag\(e\);return\}/);

// Multi-lane audio geometry: video tracks are positive, A1=0, A2=-1, A3=-2.
const geomStart = html.indexOf('function defaultTrackHeight(');
const geomEnd = html.indexOf('function trackAtTimelineY(', geomStart);
assert.ok(geomStart >= 0 && geomEnd > geomStart, 'track geometry functions exist');
const geomSource = html.slice(geomStart, geomEnd);
const geomApi = vm.runInNewContext(`${geomSource};({timelineTrackGeometry})`, {
  MAX_VIDEO_TRACKS: 32,
  audioTrackCount: 3,
  trackHeights: {},
  clamp: (n, a, b) => Math.max(a, Math.min(b, n)),
  Number, Math
});
const geometry = geomApi.timelineTrackGeometry(2, -2);
assert.deepEqual(Object.keys(geometry.tops).sort(), ['-1', '-2', '0', '1', '2'].sort());
assert.ok(geometry.tops[-2] > geometry.tops[-1] && geometry.tops[-1] > geometry.tops[0]);
assert.equal(geometry.total, 36 * 2 + 46 * 3);
assert.match(html, /current\.track=clamp\(dropTrack,minAudio,0\)/, 'audio clips can move between audio lanes');
assert.match(html, /for\(let track=maxTrack;track>=minTrack;track--\)/, 'timeline renders audio and video lanes together');

// Hex color keyframes interpolate instead of becoming NaN.
const colorStart = html.indexOf('function interpolateKeyValue(');
const colorEnd = html.indexOf('function getPropsAt(', colorStart);
assert.ok(colorStart >= 0 && colorEnd > colorStart, 'color interpolation helper exists');
const interpolate = vm.runInNewContext(`${html.slice(colorStart, colorEnd)};interpolateKeyValue`);
assert.equal(interpolate('#000000', '#ffffff', 0.5), '#808080');
assert.equal(interpolate('#ff0000', '#0000ff', 0.5), '#800080');

// Autosave must happen before the destructive project reset and on app unload.
assert.match(html, /flushAutosaveNow\(\);pushUndo\('new-project'\);clips=\[\]/);
assert.match(html, /beforeunload',\(\)=>\{flushAutosaveNow\(\)/);
assert.match(html, /function showHome\(\)\{flushAutosaveNow\(\)/);

// Extracting a video's audio mutes the source and export respects that state.
assert.match(html, /pushUndo\('extract-audio'\);c\.audioMuted=true/);
assert.match(html, /c\.kind==='video'&&c\.audioMuted\?0:1/);
assert.match(html, /\(clip\.kind==='video'&&clip\.audioMuted\)/);
assert.match(html, /selectedAsset\?\.hasAudio/);

// Preview, effects, and editor workflows.
assert.match(html, /requestFullscreen\?\.\(\)/);
assert.match(html, /prioritizePreviewVideoPreload\(playhead\)/);
assert.match(html, /preload=shouldLoad\?'auto':'metadata'/);
assert.match(html, /function copyKeyframesToClipboard\(/);
assert.match(html, /function pasteKeyframesFromClipboard\(/);
assert.match(html, /preset==='typewriter'/);
assert.match(html, /preset==='slide-left'/);
assert.match(html, /margin=Math\.min\(512,/);
assert.match(html, /function setKeyableNumericValue\(/);
assert.match(html, /data-key="chromaTolerance"/);
assert.match(html, /data-key="colorizeIntensity"/);
assert.match(html, /data-key="textSize"/);
assert.match(html, /scene-tools button\.active/);

// Retained editor capabilities from the earlier 2.4.27/2.4.30 source previews.
for (const id of [
  'camerapivotenabled', 'groupselected', 'ungroupselected',
  'remappreset-freeze-split', 'trimendjoin', 'customAccentMode'
]) assert.match(html, new RegExp(`id=\"${id}\"`), `${id} retained`);
assert.match(html, /function orbitCamera\(action\)/, 'numeric camera pivot/orbit implementation retained');
assert.match(html, /function groupSelectedClips\(/, 'layer grouping retained');
assert.match(html, /function ungroupSelectedClips\(/, 'layer ungrouping retained');
assert.match(html, /function freezeFrameSplitAtPlayhead\(/, 'freeze-frame split retained');
assert.match(html, /function trimEndAndCloseGap\(/, 'end-and-join operation retained');
for (const mode of ['solid', 'rgb', 'background-rgb', 'custom-gradient']) {
  assert.match(html, new RegExp(`value=\"${mode}\"`), `${mode} accent mode retained`);
}
assert.match(html, /audioEl/, 'separate video audio element retained');
assert.match(html, /createMediaElementSource/, 'audio graph routing retained');

console.log('FRAME Studio 2.4.47 preview feature/regression tests: OK');

// 2.4.47 release gate: color correction must use lookup tables (no per-pixel Math.pow) and the window must not be a "Preview".
{
  const fs2 = require('node:fs'), path2 = require('node:path'), assert2 = require('node:assert/strict');
  const page = fs2.readFileSync(path2.join(__dirname, '..', 'index.html'), 'utf8');
  const pkg2 = require('../package.json');
  assert2.equal(pkg2.version, '2.4.47');
  assert2.match(page, /<title>FRAME Studio 2\.4\.47<\/title>/);
  assert2.doesNotMatch(page, /2\.4\.47 Preview/);
  assert2.match(page, /const lut1=new Uint8ClampedArray\(256\),STEPS=64/, 'color pass builds lookup tables');
  const start = page.indexOf('const lut1=new Uint8ClampedArray(256)');
  const loop = page.slice(page.indexOf('for(let i=0;i<d.length;i+=4){const r0=lut1', start), page.indexOf('if(keyStrength>0){const hex=', start));
  assert2.ok(loop.length > 100, 'LUT pixel loop found');
  assert2.doesNotMatch(loop, /Math\.pow/, 'no Math.pow inside the per-pixel loop');
  console.log('2.4.47 release gate: OK');
}
