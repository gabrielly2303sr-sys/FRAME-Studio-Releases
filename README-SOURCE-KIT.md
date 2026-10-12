# FRAME Studio 2.4.24 — Critical Video Scrubbing Fix

This source kit is based on the existing FRAME Studio 2.4.23 media-tool verification fix. It addresses a race between timeline drag, the main playback loop, HTMLVideoElement seeks, and cached compositor textures.

## Key changes
- Scrubbing stops timeline playback and pauses media elements before moving the playhead.
- Shared `video-preview-seek.js` coalesces small seek requests but continues forwarding meaningful movement to the latest target.
- Exact `currentTime` seeks are used rather than `fastSeek()` during interactive scrubbing, avoiding approximate keyframe jumps.
- Release of the pointer forces a precise final target seek.
- `seeked`, `loadeddata`, `loadedmetadata`, `timeupdate`, and decoded-frame callbacks reconcile the active clip with the current playhead and invalidate its compositor texture cache.
- Regression coverage exercises the actual shared seek helper.

## Local validation
```sh
cd frame-studio-linux
npm install --no-audit --no-fund
npm test
```

The automated tests do not replace manual verification of a real packaged Electron build with a long GOP/H.264 video. Test by dragging the playhead slowly and quickly, releasing mid-seek, scrubbing while playback is running, and then pressing Play.
