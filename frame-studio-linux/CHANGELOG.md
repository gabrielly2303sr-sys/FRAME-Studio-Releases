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
