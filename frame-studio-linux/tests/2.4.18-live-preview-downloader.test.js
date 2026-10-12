'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const main = fs.readFileSync(path.join(root, 'main.cjs'), 'utf8');
const preload = fs.readFileSync(path.join(root, 'preload.cjs'), 'utf8');
assert.equal(pkg.version, '2.4.25');

assert.match(html, /function scheduleScrubPreviewDraw\(/, 'scrub redraw is coalesced per animation frame');
assert.match(html, /function rememberVideoPreviewFrame\(/, 'a decoded video frame is kept for seek gaps');
assert.match(html, /videoFramePending=!playing&&!offlineRendering&&previewMode==='timeline'&&hasUnsyncedActiveVideoFrame\(playhead\)/, 'the preview recognizes pending seeks without returning early');
assert.match(html, /staleVideoFrame=cachedVideoPreviewFrame\(a\.id\)/, 'renderer can compose the last decoded video frame while seeking');
assert.match(html, /function seekVideoPreviewTo\(/, 'scrub seeks have a latest-wins helper');
assert.doesNotMatch(html, /el\.fastSeek\(/, 'fastSeek snaps to distant keyframes and froze downloaded long-GOP videos; scrubbing uses accurate seeks');
assert.match(html, /syncMedia\(true\);previewQualityMode='full'/, 'release from scrubbing re-requests the exact target');
assert.match(html, /function attachPreviewTextEditing\(/, 'preview double-click text editor remains available');
assert.match(html, /addEventListener\('dblclick',onDoubleClick,true\)/, 'preview wrapper and canvas share a capture-phase text edit handler');
assert.match(html, /if\(ranked.length===1\|\|ranked\[0\]\?\.score<=9\)/, 'single visible text layer can be edited even if glyph hit testing misses the double-click');

assert.match(html, /id="ytAuthorized" type="checkbox"/, 'downloader requires visible authorization confirmation');
assert.match(html, /downloadYoutube\(\{url,authorized:true,format:format\.value/, 'renderer passes authorization and selected formats');
assert.match(main, /payload\?\.authorized !== true/, 'main process enforces authorization independently of UI');
assert.match(main, /function validateYouTubeURL\(/, 'URL validation exists in the main process');
assert.match(main, /shell: false/, 'downloader spawns without a shell');
assert.match(main, /'--no-playlist'/, 'downloader only processes a single URL, not playlists');
assert.match(main, /'--merge-output-format', 'mp4'/, 'MP4 option merges compatible output');
assert.match(main, /'--audio-format', 'mp3'/, 'MP3 option uses FFmpeg conversion');
assert.match(preload, /checkYoutubeTools:/, 'preload exposes tool checks');
assert.match(preload, /cancelYoutubeDownload:/, 'preload exposes cancellation');
assert.match(html, /maximum resolution|Maximum resolution/, 'resolution options exist');
assert.match(html, /Maximum FPS/, 'FPS options exist');
assert.match(html, /Do not use for DRM|Do not bypass DRM|Do not bypass DRM or access restrictions/i, 'UI warns against bypassing access restrictions');

// Exercise the real seek scheduler using a fake video element.
const helper = html.match(/function seekVideoPreviewTo\(el,target\)\{[\s\S]*?\nfunction attachTimelineVideoPreviewEvents/);
assert.ok(helper, 'seek helper source located');
const seekSource = helper[0].replace(/\nfunction attachTimelineVideoPreviewEvents[\s\S]*$/, '');
const context = vm.createContext({
  projectFPS: 30,
  playheadDrag: { startX: 0 },
  performance: { now: () => 1000 },
  console
});
new vm.Script(seekSource, { filename: 'seekVideoPreviewTo.js' }).runInContext(context);
let fastSeekCalled = false;
let dragAssigned = null;
const mkDrag = (seeking) => ({ seeking, __t: 1, get currentTime() { return this.__t; }, set currentTime(v) { dragAssigned = v; }, fastSeek() { fastSeekCalled = true; } });
// A seek already in flight during a drag is NOT retargeted (otherwise long-GOP seeks never finish and the frame freezes).
const inFlight = mkDrag(true);
inFlight.__frameSeekStartedAt = 900;
context.seekVideoPreviewTo(inFlight, 7.25);
assert.equal(inFlight.__framePendingSeek, 7.25, 'latest wanted time is remembered for the next seeked event');
assert.equal(dragAssigned, null, 'drag must not cancel the seek in flight');
assert.equal(fastSeekCalled, false, 'fastSeek must never be used');
// When idle during a drag, an accurate seek is issued.
const idle = mkDrag(false);
context.seekVideoPreviewTo(idle, 7.25);
assert.equal(dragAssigned, 7.25, 'idle element receives an accurate currentTime seek');
assert.equal(fastSeekCalled, false);
// Watchdog: a seek stuck for more than 1.5 s is retried.
dragAssigned = null;
const stuck = mkDrag(true);
stuck.__frameSeekStartedAt = -1000;
context.seekVideoPreviewTo(stuck, 9);
assert.equal(dragAssigned, 9, 'stuck seek is re-issued by the watchdog');
context.playheadDrag = null;
let assigned = null;
const afterDrag = { currentTime: 0, seeking: true, set currentTime(value) { assigned = value; }, get currentTime() { return 0; } };
context.seekVideoPreviewTo(afterDrag, 4.5);
assert.equal(assigned, 4.5, 'final/non-drag seek should request the accurate currentTime target');
assert.equal(afterDrag.__framePendingSeek, 4.5);

console.log('FRAME Studio 2.4.23 live preview/downloader checks: OK');
