# FRAME Studio 2.4.25 — Seekable Downloaded Media & Detached Extracted Audio

- Fixes the frozen first frame when seeking downloaded videos/extracted audio (loopback HTTP media server) and detaches extracted audio from the source video clip. Tests: `tests/2.4.25-seek-http-and-detached-audio.test.js`. Automated tests pass; real Electron-window and final-installer testing still need to be done.

## Previous: 2.4.23 — Bundled Media Tools Verification Fix

The 2.4.22 AppImage found yt-dlp, FFmpeg and ffprobe inside its mounted resources but still reported "Bundled media tools could not start".

### Root cause
`videoDownloaderToolsStatus()` in `main.cjs` ran every tool with `--version`. FFmpeg and ffprobe use `-version`; with `--version` they print their banner and exit nonzero, so the check marked working binaries as failed. `media-export.cjs` already used `-version`, so the two checks disagreed.

### 2.4.23 fixes
- New shared helper `media-tools.cjs`: one definition of per-tool version arguments (yt-dlp `--version`, ffmpeg/ffprobe `-version`), packaged path resolution and failure classification.
- `main.cjs`, `media-export.cjs` and `scripts/prepare-bundled-tools.cjs` use it.
- `scripts/verify-bundled-tools.cjs` runs the real executables; the release workflow runs it on the unpacked app, the final AppImage, DEB, RPM and the installed Windows app.
- Regression tests: `tests/2.4.23-media-tool-validation.test.js`.

The source ZIP has no native binaries; the release workflow fetches platform artifacts and packs them. A packaged AppImage/Windows installer has NOT been built or executed in the environment that prepared this kit; do not publish until the release workflow passes and the final packages are checked with the checklist in RELEASE-VERIFICATION-2.4.23.md.
