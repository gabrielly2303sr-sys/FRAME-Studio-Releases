'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const main = fs.readFileSync(path.join(root, 'main.cjs'), 'utf8');
const proxyBuilder = fs.readFileSync(path.join(root, 'stream-export.cjs'), 'utf8');

function functionSource(source, name, nextName) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} exists`);
  const end = nextName ? source.indexOf(`function ${nextName}(`, start + 1) : -1;
  return end > start ? source.slice(start, end) : source.slice(start);
}

const buttonTargetSource = functionSource(html, 'isButtonActivationTarget', 'isSpaceEvent');
const isButtonActivationTarget = vm.runInNewContext(`${buttonTargetSource};isButtonActivationTarget`);
assert.equal(isButtonActivationTarget({ closest: selector => selector.includes('button') ? {} : null }), true);
assert.equal(isButtonActivationTarget({ closest: () => null }), false);
assert.ok(buttonTargetSource.includes("input[type='button']"), 'button inputs are guarded');
assert.ok(!buttonTargetSource.includes(',input,'), 'plain text inputs remain editable with Space');

const dispatchSource = functionSource(html, 'dispatchShortcutKeyDown', 'suppressNativeSpaceActivation');
const dispatchContext = {
  activeGroupViewId: null,
  camera3d: { enabled: false, viewMode: 'scene', cameraSelected: false },
  isButtonActivationTarget: target => !!target?.isButton,
  isSpaceEvent: event => event.code === 'Space' || event.key === ' ',
  isTypingTarget: () => false,
  stopKeyboardEvent: event => { event.prevented = true; },
  spaceShortcutKeyHandled: false,
  canonicalKey: event => event.key === ' ' ? 'Space' : event.key,
  normalizeHotkey: value => value,
  shortcuts: { play: 'Space' },
  runShortcut: () => {},
  hasOpenDialog: () => false
};
const dispatchShortcutKeyDown = vm.runInNewContext(`(${dispatchSource})`, dispatchContext);
const focusedButton = { isButton: true };
const spaceEvent = { key: ' ', code: 'Space', target: focusedButton };
dispatchShortcutKeyDown(spaceEvent);
assert.equal(spaceEvent.prevented, true, 'Space is suppressed on focused buttons');
assert.equal(dispatchContext.spaceShortcutKeyHandled, true, 'the matching keyup is suppressed');
const enterEvent = { key: 'Enter', code: 'Enter', target: focusedButton };
dispatchShortcutKeyDown(enterEvent);
assert.equal(enterEvent.prevented, undefined, 'Enter remains native button activation');

const scaleStart = html.indexOf('function effectPreviewScale(');
const scaleEnd = html.indexOf('function scrubFrameKey(', scaleStart);
assert.ok(scaleStart >= 0 && scaleEnd > scaleStart, 'video preview scale helper exists');
const scaleContext = { offlineRendering: false, playing: true, previewQualityMode: 'full' };
vm.runInNewContext(`${html.slice(scaleStart, scaleEnd)}`, scaleContext);
const props = { blur: 0, glow: 0, exposure: 0, gamma: 1, brightness: 100, contrast: 100, saturation: 100 };
assert.equal(scaleContext.effectPreviewScale(props, 1920, 1080, 'text'), 1);
assert.equal(scaleContext.effectPreviewScale(props, 1920, 1080, 'video'), 1, 'normal video preview retains full texture resolution');
scaleContext.previewQualityMode = 'fast';
assert.ok(scaleContext.effectPreviewScale(props, 1920, 1080, 'video') < 1, 'fast scrubbing may use its temporary lower-resolution path');

const cacheFunction = functionSource(html, 'rememberVideoPreviewFrame', 'cachedVideoPreviewFrame');
assert.ok(cacheFunction.includes('1920/'), 'decoded frame cache supports 1920px previews');
assert.ok(!cacheFunction.includes('960/'), 'decoded frame cache no longer downsamples to 960px');
assert.match(main, /const maxWidth = kind === 'preview' \? 1920 : 0;/, 'preview proxy preserves 1080p width');
assert.match(main, /crf: kind === 'preview' \? 20 : 14/, 'preview proxy uses a less compressed quality setting');
assert.match(main, /'v3'/, 'old low-resolution cached proxies are invalidated');
assert.match(proxyBuilder, /flags=lanczos/, 'proxy downscaling uses a higher-quality resampler');


const timelineRenderer = functionSource(html, 'updateTimeline', 'updateTimelineLiveDuringDrag');
assert.match(timelineRenderer, /zone\.addEventListener\('click'/, 'clip click handling is delegated to the timeline zone');
assert.match(timelineRenderer, /zone\.addEventListener\('pointerdown'/, 'clip drag handling is delegated to the timeline zone');
assert.match(timelineRenderer, /document\.createDocumentFragment\(\)/, 'clip elements are inserted as a batch');
assert.match(html, /\.clip:not\(\.group-summary\)::before/, 'clip trim grips use CSS instead of extra DOM nodes');
assert.match(timelineRenderer, /const rect=el\.getBoundingClientRect\(\),edge=/, 'trim hit testing uses clip edges');
assert.match(timelineRenderer, /groupDisclosuresByClip\.get\(c\.id\)/, 'group disclosure controls are precomputed once per timeline refresh');
assert.doesNotMatch(timelineRenderer, /el\.addEventListener\('click',ev=>\{ev\.stopPropagation\(\);if\(suppressClipClickId/, 'clip nodes do not own individual click handlers');
assert.doesNotMatch(timelineRenderer, /el\.addEventListener\('pointerdown',ev=>beginClipDrag/, 'clip nodes do not own individual drag handlers');

const liveTimeline = functionSource(html, 'updateTimelineLiveDuringDrag', 'beginPlayheadDrag');
assert.match(liveTimeline, /drag\?\.ids/, 'live drag updates only the moved clip ids');
assert.match(liveTimeline, /getElementById\(\`timeline-clip-/, 'moved clip elements are fetched directly');
assert.doesNotMatch(liveTimeline, /querySelectorAll\('\.clip:not\(\.group-summary\)'\)/, 'live drag does not walk every clip in the timeline');

const clipDrag = functionSource(html, 'beginClipDrag', 'updateTimelineLiveDuringDrag');
assert.match(clipDrag, /snapCandidates:/, 'snap candidates are cached at drag start');
assert.match(clipDrag, /candidates=drag\.snapCandidates/, 'pointer moves do not rebuild the snap list');

assert.match(html, /if\(camera3d\.enabled&&camera3d\.viewMode==='scene'\)\{const p=currentLayerProps\(c,playhead\),d=transformDimensions\(c,p\);/, '3D handles are limited to Scene Editor');
assert.match(html, /if\(camera3d\.enabled&&camera3d\.viewMode==='scene'\)\{const center=cameraProject/, '3D transform interaction is limited to Scene Editor');
assert.match(html, /camera3d\.viewMode!=='scene'\|\|!camera3d\.orbitPivotEnabled/, 'Camera View does not show the Scene Editor pivot marker');
assert.match(html, /function drawSceneEditorViewport\(\)[\s\S]*?renderSceneCameraGizmo\(svg,camCenter/, 'Scene Editor keeps its 3D camera gizmo');

console.log('Ua holo pono nā hoʻāʻo keyboard, video preview, timeline, a me nā mana kamera.');
