const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const seek = require('../video-preview-seek.js');

function fakeVideo({ currentTime = 0, seeking = false, readyState = 2 } = {}) {
  return {
    _currentTime: currentTime,
    seeking,
    readyState,
    calls: [],
    fastSeekCalls: 0,
    get currentTime() { return this._currentTime; },
    set currentTime(value) { this.calls.push(value); this._currentTime = value; this.seeking = true; },
    fastSeek() { this.fastSeekCalls++; }
  };
}

// A seeking video must be retargeted to the latest playhead, not left waiting for an old target.
{
  const video = fakeVideo({ currentTime: 1, seeking: true });
  video.__frameLastSeekRequestAt = 100;
  video.__frameLastSeekRequestTime = 1;
  const result = seek.requestSeek(video, 5.2, { scrubbing: true, fps: 30, now: 110 });
  assert.equal(result.issued, true);
  assert.equal(video.currentTime, 5.2);
  assert.equal(video.__framePendingSeek, 5.2);
  assert.equal(video.fastSeekCalls, 0, 'scrubbing must not use coarse keyframe-only fastSeek');
}

// Fine movement can be coalesced to avoid flooding the decoder, but latest target is retained.
{
  const video = fakeVideo({ currentTime: 1, seeking: true });
  video.__frameLastSeekRequestAt = 100;
  video.__frameLastSeekRequestTime = 1;
  const result = seek.requestSeek(video, 1.013, { scrubbing: true, fps: 30, now: 110 });
  assert.equal(result.issued, false);
  assert.equal(result.reason, 'coalesced-small-move');
  assert.equal(video.__framePendingSeek, 1.013);
}

// Pointer release uses a precise request and is not throttled by scrubbing state.
{
  const video = fakeVideo({ currentTime: 1, seeking: true });
  video.__frameLastSeekRequestAt = 100;
  video.__frameLastSeekRequestTime = 1;
  const result = seek.requestSeek(video, 7.125, { scrubbing: false, precise: true, fps: 30, now: 101 });
  assert.equal(result.issued, true);
  assert.equal(video.currentTime, 7.125);
  assert.equal(result.method, 'currentTime');
}

// If the element already has the decoded target, don't issue redundant seeks.
{
  const video = fakeVideo({ currentTime: 2.001, seeking: false, readyState: 4 });
  const result = seek.requestSeek(video, 2, { scrubbing: false, fps: 30, now: 200 });
  assert.equal(result.issued, false);
  assert.equal(result.reason, 'already-at-target');
  assert.equal(video.calls.length, 0);
}

// The real renderer must use the helper and pause playback when the user grabs the playhead.
{
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /<script src="\.\/video-preview-seek\.js"><\/script>/);
  assert.match(html, /helper\.requestSeek\(el,wanted/);
  const begin = html.match(/function beginPlayheadDrag\(ev\)\{([^\n]+)/)?.[1] || '';
  assert.match(begin, /playing=false;playStarting=false;playbackEpoch\+\+;lastFrame=0/);
  assert.match(begin, /settleTimelineVideoSeeksAtPlayhead\(\)/);
  const attach = html.match(/function attachTimelineVideoPreviewEvents\(asset,el\)\{([^\n]+)/)?.[1] || '';
  assert.match(attach, /activeAt\(playhead\)/);
  assert.match(attach, /invalidateVideoPreviewTexture\(asset\.id\)/);
}

console.log('FRAME Studio 2.4.24 playhead video scrubbing tests: OK');
