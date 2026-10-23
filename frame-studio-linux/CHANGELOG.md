# FRAME Studio 2.4.37 — Timeline, audio and workflow improvements

## Timeline and selection
- Playhead scrubbing now auto-scrolls the timeline when the pointer is held near either horizontal edge.
- Clicking a visible layer in the preview selects its clip; Ctrl/Cmd-click can add/remove layers from the selection.
- Existing multi-layer scaling is retained and the proportional Scale control and preview handles apply equal scale factors across the selection.
- The end-trim workflow now lets users choose whether to keep the resulting gap or close it.
- Fixed current layer groups being removed by the legacy compatibility migration during project open, undo, and autosave restore.

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

---

# FRAME Studio 2.4.36 — Update progress and version consistency

### [FIXED]
- Updated the application package version, window title, top-bar version label, home footer, in-app release notes and Linux installer fallback to 2.4.36.
- The automatic updater now presents a visible in-app progress panel when the user accepts an update download.
- The panel reflects real `electron-updater` progress events, shows a percentage when available, indicates the initial preparation phase, and shows completion or failure states.
- Update target version is forwarded to the renderer so the progress panel can name the downloaded release.

### [PRESERVED]
- Existing project format, timeline and media workflows remain unchanged.
- Existing customization/RGB, export pipeline, voice-effect options, OBJ/R6 prototype and optional local Whisper transcription are retained from the 2.4.35 source kit.
- Automatic in-place updates remain limited to packaged Windows NSIS and Linux AppImage builds. Portable Windows and DEB/RPM packages do not support the same replacement flow.

### [VALIDATION]
- Test assertions were aligned with package version 2.4.36.
- Automated tests can verify event wiring and markup, but must be supplemented with a packaged-app test where a newer GitHub Release is available. The progress bar shows real events; it does not simulate network progress.

## 2.4.35 — Extras Test Kit (beta)
- Removed the Community/Supabase integration from the test package.
- Kept the camera editor grid separate from camera output.
- Includes adaptive RGB accent transitions, export-time voice effects, best-effort hardware H.264 encoding, a beta OBJ/R6 workflow, and optional local Whisper transcription.
- These tools remain experimental and hardware/Whisper dependencies vary by system.

## 2.4.34 — Stability, RGB and export fallback
- Removed the Community tab and Supabase runtime assets.
- Separated scene editor grid from final camera render path.
- Added RGB accent animation, hardware H.264 encoder attempt with `libx264` fallback, and export-time voice effects.

## 2.4.33 — Release pipeline reliability
- Fixed Windows export cancellation test compatibility and improved Linux FFmpeg download fallbacks in CI.
