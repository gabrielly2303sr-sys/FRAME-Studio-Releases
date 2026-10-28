# FRAME Studio 2.4.39 — Source kit

This archive contains the active Electron application in `frame-studio-linux/`. The top-level files are a historical source snapshot; make release changes and run tests from the nested active application.

## Test / run
1. `cd frame-studio-linux`
2. `npm install --no-audit --no-fund`
3. `npm test`
4. `npm start`

## Version 2.4.39 focus
- Fixes deterministic MP4 export when the same source file is used by multiple overlapping timeline clips.
- Ensures an exact cut activates only the intended clip during export and records decoded frames independently per clip.
- Adds frame/time context to rendering and PNG-transfer errors, and reuses per-clip snapshot canvases to reduce allocation pressure.
- Retains the previous 2.4.38 fixes for MP4/GIF backgrounds, groups, and multi-clip duration resizing.

The updater implementation/configuration and project format remain compatible. Source/development runs do not perform automatic in-place self-updates; end-to-end updater testing requires a packaged supported build (Windows NSIS or Linux AppImage). See `frame-studio-linux/RELEASE-NOTES-2.4.39.md`.
