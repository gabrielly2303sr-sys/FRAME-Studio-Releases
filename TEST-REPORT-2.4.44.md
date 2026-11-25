# FRAME Studio 2.4.44 — Test Report

## Automated regression coverage added or updated

- Package, lockfile, HTML title, version badge, home footer and workspace test all target 2.4.44.
- Realtime export bridge is checked across renderer, preload, main process and media-export module.
- Viewer fullscreen and output format / render mode controls are checked.
- Export integration tests exercise native WebM validation/copy, MP4, MOV and MKV H.264/AAC conversions, existing silent/audio MP4 paths, deterministic frame-sequence encoding, ffprobe validation, missing-tool errors, corrupt input and cancellation.

## Validation still required

- Cross-platform GitHub Actions CI passed on Windows and Ubuntu in run [45663920878](https://github.com/gabrielly2303sr-sys/FRAME-Studio-Releases/actions/runs/45663920878). The full regression suite completed successfully, including FFmpeg/ffprobe integration for native WebM, MP4, MOV, MKV, audio/silent output, Time Remap fallback, cancellation and corrupt-input validation.
- Manual packaged-app checks must cover: realtime video playback capture, project audio mix, silent exports, long captures, cancel during capture/transcode, WebM/MP4/MOV/MKV playback in external players, fullscreen entry/exit, timeline redraw followed by playhead dragging, and Time Remap fallback.
- Realtime capture is playback-clock based and can drop frames under load. Frame-accurate mode remains available for MP4 and is used automatically for projects containing Time Remap.

This report records automated CI success only. It does not claim zero bugs or completed manual validation. Do not publish until the packaged Electron app has been smoke-tested and the release workflow has attached and verified all assets/updater metadata.