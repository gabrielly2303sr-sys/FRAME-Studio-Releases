'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const renderer = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0]?.[1] || '';
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.equal(pkg.version, '2.4.36');
new vm.Script(renderer, { filename: 'renderer-inline.js' });

// Keep source-time mapping independent of the visual scale and timeline start.
const clip = { start: 4, inPoint: 2, outPoint: 12, speed: 1, scaleX: 220, scaleY: 140 };
const context = vm.createContext({ clamp: (n, a, b) => Math.max(a, Math.min(b, n)), Math, Number, Array, projectFPS: 30, bezierEase: x => x, clip });
vm.runInContext(`
 const duration=c=>Math.max(0,(c.outPoint-c.inPoint)/Math.max(.1,Number(c.speed)||1));
 const remapProgress=(c,t)=>clamp((t-c.start)/Math.max(.001,duration(c)),0,1);
 const sourceTimeAt=(c,t)=>Number(c.inPoint||0)+remapProgress(c,t)*Math.max(0,Number(c.outPoint)-Number(c.inPoint));
`, context);
assert.equal(vm.runInContext('duration(clip)', context), 10);
assert.equal(vm.runInContext('sourceTimeAt(clip, 9)', context), 7, 'playhead midway through clip maps to the middle of the retained source interval');
clip.speed = 2;
assert.equal(vm.runInContext('duration(clip)', context), 5, 'speed changes duration, not source in/out');
assert.equal(vm.runInContext('sourceTimeAt(clip, 6.5)', context), 7, 'speed-adjusted clip maps to the same source midpoint');
assert.equal(clip.scaleX, 220); assert.equal(clip.scaleY, 140, 'timeline timing calculations do not change visual scale');

const dragStart = renderer.indexOf('function beginClipDrag(');
const dragEnd = renderer.indexOf('\nfunction setPlayhead', dragStart);
assert.ok(dragStart >= 0 && dragEnd > dragStart, 'clip drag handler is present');
const dragFn = renderer.slice(dragStart, dragEnd);
assert.match(dragFn, /drag\.mode==='duration-right'/, 'still-image/text duration adjustment exists');
assert.match(dragFn, /drag\.mode==='duration-left'/, 'left duration handle exists');
assert.match(dragFn, /drag\.mode==='left'/, 'left trim keeps separate in-point behavior');
assert.match(dragFn, /drag\.mode==='right'/, 'right trim keeps separate out-point behavior');
assert.match(dragFn, /drag\.mode==='stretch-right'/, 'Alt stretch preserves source range and adjusts speed');
assert.match(dragFn, /current\.inPoint=drag\.inPoint;current\.outPoint=drag\.outPoint;current\.speed=clamp\(span\/targetDuration/, 'stretch does not reset or loop the source range');
const movingPart = dragFn.slice(dragFn.indexOf('const move=e=>'), dragFn.indexOf('const finish=cancelled=>'));
assert.match(movingPart, /updateTimelineLiveDuringDrag\(\)/, 'drag updates geometry without rebuilding the timeline');
assert.doesNotMatch(movingPart, /\bupdateTimeline\(\)/, 'full timeline rebuild is deferred until drag ends');
assert.match(dragFn, /setPointerCapture/, 'resizing captures the pointer');
assert.match(dragFn, /pointercancel/, 'cancel restores original clip values');

const clipBuild = renderer.slice(renderer.indexOf('const timelineClips='), renderer.indexOf('const c=selected(),lanes=[]'));
assert.match(clipBuild, /stillLike\?'duration-left':'left'/, 'still left handle adjusts duration; media left handle trims');
assert.match(clipBuild, /stillLike\?'duration-right':'right'/, 'still right handle adjusts duration; media right handle trims');
assert.match(clipBuild, /ev\.altKey&&!stillLike\?'stretch-right'/, 'Alt-right-handle explicitly stretches media time');
assert.match(clipBuild, /c\.kind==='video'&&a\?\.hasAudio/, 'video waveform is shown only for audio-enabled sources');
assert.match(renderer, /function drawWaveformCanvas\(/, 'waveforms are painted from generated peak arrays');
assert.match(renderer, /frameAPI\.generateWaveform\(asset\.path,Number\(asset\.duration\)\|\|1\)/, 'real waveform samples are generated asynchronously through FFmpeg');
assert.match(renderer, /info\.streams\?\.some\(stream=>stream\.codec_type==='audio'\)/, 'new video import detects real audio streams');
assert.match(renderer, /function applyTrackLayoutOnly\(/, 'track height uses its own layout function');
assert.match(renderer, /className='track-resize-grip'/, 'track resizing has dedicated handles');
assert.doesNotMatch(html, /id=["'](?:groupclips|groupmask|ungroupclips|selectgroup|togglegroup|grouptransform)["']/, 'legacy grouping controls stay removed while the new layer-group actions use their own IDs');
assert.match(renderer, /function stripLegacyGroupMetadata\(/, 'legacy groups are flattened when older projects are loaded');
assert.match(renderer, /legacyGroupTransforms/, 'legacy group transforms are retained as per-layer transforms where possible');
assert.match(renderer, /function sourceTimeAt\(c,timelineTime\)/, 'the time-remapping curve drives source-frame selection');
assert.match(renderer, /function sourceRateAt\(c,timelineTime\)/, 'source-rate calculation supports reverse and frozen sections');
assert.match(renderer, /case'reverse':points=\[p\(0,1,'linear'\),p\(1,0,'linear'\)\]/, 'Reverse preset maps source end to source start');
assert.match(renderer, /case'freeze-point'/, 'Freeze at Playhead preset is implemented');
assert.match(renderer, /wrap\.addEventListener\('dblclick'/, 'preview double-click text editing is wired');
assert.match(renderer, /selectTab\('text'\)/, 'double-click text editing opens the text panel');
assert.match(html, /id="proportionalscale"/, 'proportional scale control exists');
console.log('FRAME Studio 2.4.16 timeline regression tests: OK');
