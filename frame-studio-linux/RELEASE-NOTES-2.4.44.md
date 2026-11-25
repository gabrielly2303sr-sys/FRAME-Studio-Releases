# FRAME Studio 2.4.44 — Realtime Export & Viewer

## Export pipeline

- Realtime export captures the already-composited preview canvas and the project's Web Audio mix through MediaRecorder. It avoids seeking every source video, PNG-encoding every composition frame, transferring each PNG over IPC, and storing a numbered PNG sequence before encoding.
- WebM can be saved as a validated native capture (VP8/VP9/AV1 video where supported, Opus/Vorbis audio where present).
- MP4, MOV and MKV are converted from the capture to H.264 video with AAC audio when the capture contains audio. FFprobe validates the final file before it receives its final output name.
- The existing deterministic frame-by-frame MP4 renderer remains available as Frame accurate mode. Projects using Time Remap automatically use this path for MP4 so reverse/freeze behavior and existing FFmpeg audio remapping are not silently replaced by a less precise live capture.
- Realtime capture follows the editor playback clock. Heavy compositions can miss frames under CPU/GPU load; choose Frame accurate for precision-sensitive projects. Realtime mode is not advertised as a frame-perfect render.
- Export failures now write detailed console diagnostics, including selected format, capture/transcode phase, duration, chunk count and error details. The UI still shows a user-facing status and message.

## Viewer and timeline

- Added a fullscreen control to the preview viewer, with Escape / fullscreen-change handling.
- Widened the playhead pointer hit area while keeping its visible indicator thin.
- The playhead drag listener remains attached each time the timeline rebuilds its DOM.

## Preserved features

- Based on the Hotfix 3-derived 2.4.43 branch.
- Retains workspace docking, Effects folders, layer opacity, video Audio inspector, timeline multiselection, group persistence, export cancellation, and app updater configuration.
- No project file schema migration is required.

## Packaging and support

- Existing release workflow still builds Windows NSIS/portable and Linux AppImage/DEB/RPM packages.
- In-place auto-update support remains for Windows NSIS and Linux AppImage. DEB/RPM updates remain package-manager based.
- Do not announce this version until pull-request CI passes on Windows and Linux, the release workflow attaches all expected assets and updater metadata, and the packaged application has been manually smoke-tested.