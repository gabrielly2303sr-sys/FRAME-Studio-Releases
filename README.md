# FRAME Studio 2.4.41 — Release Candidate

This source package is based on the user-tested Hotfix 3 application tree, advanced to version 2.4.41, with opacity controls, categorized Effects folders, and draggable workspace panel ordering.

The active Electron application and release build are in `frame-studio-linux/`.

## Test locally

Requirements: Node.js 22+, npm, FFmpeg and ffprobe. From the app folder:

```bash
cd frame-studio-linux
npm install --no-audit --no-fund
npm test
npm start
```

## Build packages

```bash
cd frame-studio-linux
npm run build:linux
```

The official GitHub release workflow also builds Windows NSIS Setup EXE and Linux AppImage, DEB and RPM packages, then attaches the matching update metadata to a published `v2.4.41` release.

See `RELEASE-NOTES-2.4.41.md`, `TEST-REPORT-2.4.41.md`, and `PUBLISH-2.4.41.md` before publishing.
