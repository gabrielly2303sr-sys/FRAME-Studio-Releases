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
assert.equal(pkg.version, '2.4.19');

assert.match(html, /function scheduleScrubPreviewDraw\(/, 'scrub redraw is coalesced per animation frame');
assert.match(html, /function rememberVideoPreviewFrame\(/, 'a decoded video frame is kept for seek gaps');
assert.match(html, /videoFramePending=!playing&&!offlineRendering&&previewMode==='timeline'&&hasUnsyncedActiveVideoFrame\(playhead\)/, 'the preview recognizes pending seeks without returning early');
assert.match(html, /staleVideoFrame=cachedVideoPreviewFrame\(a\.id\)/, 'renderer can compose the last decoded video frame while seeking');
assert.match(html, /function seekVideoPreviewTo\(/, 'scrub seeks have a latest-wins helper');
assert.match(html, /typeof el\.fastSeek==='function'/, 'fast seeks are used during scrubbing when supported');
assert.match(html, /syncMedia\(true\);previewQualityMode='full'/, 'release from scrubbing re-requests the exact target');
assert.match(html, /function attachPreviewTextEditing\(/, 'preview double-click text editor remains available');
assert.match(html, /addEventListener\('dblclick',ev=>\{if\(previewMode!=='timeline'/, 'text edit uses preview double-click');

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
let fastSeekTarget = null;
const duringDrag = { currentTime: 1, seeking: true, fastSeek(target) { fastSeekTarget = target; } };
context.seekVideoPreviewTo(duringDrag, 7.25);
assert.equal(duringDrag.__framePendingSeek, 7.25);
assert.equal(fastSeekTarget, 7.25, 'drag should request the latest fast-seek target');
context.playheadDrag = null;
let assigned = null;
const afterDrag = { currentTime: 0, seeking: true, set currentTime(value) { assigned = value; }, get currentTime() { return 0; } };
context.seekVideoPreviewTo(afterDrag, 4.5);
assert.equal(assigned, 4.5, 'final/non-drag seek should request the accurate currentTime target');
assert.equal(afterDrag.__framePendingSeek, 4.5);

console.log('FRAME Studio 2.4.19 live preview/downloader checks: OK');
