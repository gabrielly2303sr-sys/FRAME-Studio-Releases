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

const dispatchSource = functionSource(html, 'dispatchShortcutKeyDown', 'suppressNativeSpaceActivation');
const dispatchContext = {
  activeGroupViewId: null,
  camera3d: { enabled: false, viewMode: 'scene', cameraSelected: false },
  isButtonActivationTarget: target => !!target?.isButton,
  isSpaceEvent: event => event.code === 'Space' || event.key === ' ',
  isTypingTarget: () => false,
  stopKeyboardEvent: event => { event.prevented = true; },
  spaceShortcutKeyHandled: false,
  canonicalKey: () => { throw new Error('A focused button must not dispatch editor shortcuts.'); },
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
assert.match(cacheFunction, /1920\\//, 'decoded frame cache supports 1920px previews');
assert.doesNotMatch(cacheFunction, /960\\//, 'decoded frame cache no longer downsamples to 960px');
assert.match(main, /const maxWidth = kind === 'preview' \? 1920 : 0;/, 'preview proxy preserves 1080p width');
assert.match(main, /crf: kind === 'preview' \? 20 : 14/, 'preview proxy uses a less compressed quality setting');
assert.match(main, /'v3'/, 'old low-resolution cached proxies are invalidated');
assert.match(proxyBuilder, /flags=lanczos/, 'proxy downscaling uses a higher-quality resampler');

console.log('FRAME Studio 2.4.48 keyboard and video-preview regressions: OK');
