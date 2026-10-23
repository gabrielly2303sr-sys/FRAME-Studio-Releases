# FRAME Studio 2.4.37 — Timeline, audio and workflow improvements

## Timeline and selection
- Playhead scrubbing now auto-scrolls the timeline when the pointer is held near either horizontal edge.
- Clicking a visible layer in the preview selects its clip; Ctrl/Cmd-click can add/remove layers from the selection.
- Existing multi-layer scaling is retained and the proportional Scale control and preview handles apply equal scale factors across the selection.
- Fixed a compatibility migration that had stripped current layer groups from saved projects, undo snapshots, and autosaves; only the older group schema is flattened.
- The end-trim workflow now lets users choose whether to keep the resulting gap or close it.

## Audio and 3D
- The Audio inspector is exposed for video clips.
- Extracting a video’s audio mutes the original source audio for that clip during playback and excludes it from MP4 audio mixing to avoid doubled sound.
- Corrected the Y-rotation sign in advanced 3D layer projection.
- Removed creation/import controls for OBJ models and R6 test rigs. Existing projects continue to use their stored model data and legacy renderer.

## UI, preview and export
- Added optional UI feedback animations, plus a reduced-motion switch in Preferences. Effects are UI-only and do not alter exports.
- Main preview/export canvases request low-overhead opaque/desynchronized 2D contexts where supported; Chromium may ignore unsupported hints.
- MP4 export continues trying platform-supported hardware H.264 encoders with validation and CPU `libx264` fallback. Actual speed depends on media, driver and hardware.

## Compatibility
- Project document format, application ID, updater implementation, platform update capability rules and GitHub publish configuration were preserved.
- Automatic in-place updates continue to require packaged Windows NSIS or Linux AppImage. DEB/RPM, portable Windows and development/source builds retain their existing update paths.

## Validation
Run `npm test` from `frame-studio-linux/`. End-to-end update and GPU throughput tests still require packaged builds and hardware-specific testing.
