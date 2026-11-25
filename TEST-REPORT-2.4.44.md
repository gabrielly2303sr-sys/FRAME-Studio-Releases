# FRAME Studio 2.4.44 — Test Report

## Automated regression coverage added or updated

- Package, lockfile, HTML title, version badge, home footer and workspace test all target 2.4.44.
- Realtime export bridge is checked across renderer, preload, main process and media-export module.
- Viewer fullscreen and output format / render mode controls are checked.
- Export integration tests exercise native WebM validation/copy, MP4, MOV and MKV H.264/AAC conversions, existing silent/audio MP4 paths, deterministic frame-sequence encoding, ffprobe validation, missing-tool errors, corrupt input and cancellation.

## Validation still required

- Cross-platform GitHub Actions CI on Windows and Ubuntu must pass.
- Manual packaged-app checks must cover: realtime video playback capture, project audio mix, silent exports, long captures, cancel during capture/transcode, WebM/MP4/MOV/MKV playback in external players, fullscreen entry/exit, timeline redraw followed by playhead dragging, and Time Remap fallback.
- Realtime capture is playback-clock based and can drop frames under load. Frame-accurate mode remains available for MP4 and is used automatically for projects containing Time Remap.

This report describes test coverage, not a claim of zero bugs or a completed manual validation. Do not publish until CI and release asset verification succeed.