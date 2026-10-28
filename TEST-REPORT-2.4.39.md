# FRAME Studio 2.4.39 — Test report

- `npm test`: PASS for the complete configured suite.
- Inline renderer JavaScript syntax validation: PASS (covered by smoke and 2.4.39 regression test).
- `node --check main.cjs`, `preload.cjs`, `media-export.cjs`, `customization.js`: PASS.
- FFmpeg/ffprobe integration: PASS; tests generated H.264/AAC and silent H.264 output samples and verified codecs, duration, FPS, audio presence, missing/corrupt inputs, progress, and cancellation.
- New deterministic-renderer regression: PASS; exact cuts only activate the incoming clip and overlapping clips sharing one source receive separate decoded frame snapshots.

Limitations: No packaged Electron window was launched for manual visual QA. This confirms source-level and export-pipeline regression tests, not that every external media file/project or every GPU/driver configuration has been tested.
