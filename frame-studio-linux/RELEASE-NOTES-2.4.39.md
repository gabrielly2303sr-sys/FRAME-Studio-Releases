# FRAME Studio 2.4.39 — MP4 export stability

## Urgent export fixes

- Fixed a deterministic renderer failure when one source video appears in multiple overlapping timeline clips with different source in-points. Each clip instance is now decoded and snapshotted independently before compositing.
- During deterministic export, clip-active checks use strict edit boundaries. Adjacent clips no longer both appear active merely because the interactive playhead tolerance was applied at an exact cut.
- Reuse a snapshot canvas per timeline clip to avoid allocating a full-resolution canvas for each frame.
- Errors while preparing/rendering, encoding PNG frames, or transferring frames to FFmpeg include the frame index and timeline timestamp.
- Preserves the existing H.264 encoder strategy, hardware-encoder validation, CPU `libx264` fallback, audio mixing, and output validation.

## Validation status

`npm test` passed for the complete application test suite. The export integration tests generated real H.264/AAC MP4 samples and checked codecs, duration, FPS, audio streams, failure cases, and cancellation using `ffprobe`. A focused renderer regression test verifies exact cut boundaries and independent snapshots when overlapping clips reuse one asset.

A packaged Electron GUI/export run on the user's machine has not been performed, and no GitHub Release has been published by this artifact build. Verify a real project in the packaged application before relying on the release for production work.
