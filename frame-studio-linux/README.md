# FRAME Studio 2.4.36

FRAME Studio is a Linux-first video editor with a dark, compact interface, multi-track timeline, keyframes, camera tools, media import, local project files and MP4 export.

## 2.4.36 update behavior
- The app identifies itself as version 2.4.36 throughout the window and in-app release notes.
- Accepting an automatic update displays a visible progress panel connected to the real `electron-updater` download events.
- The panel shows percentage, initial preparation, completion, and download failure states.
- Automatic replacement supports packaged Windows NSIS builds and Linux AppImage builds. Portable Windows, DEB/RPM, and source/development installs use separate update paths.

## Experimental 2.4.35 features retained
- Hardware H.264 encoding is attempted when the bundled FFmpeg supports it; CPU `libx264` remains the fallback.
- Voice modifications are applied during export; preview playback may remain unprocessed.
- OBJ textured model and R6 posing tools are prototypes rather than a full 3D engine.
- Speech-to-text requires a locally selected `whisper-cli`, model and FFmpeg. These dependencies are not bundled with source packages.

## Development
- Node.js 22 is used by the GitHub release workflow.
- `npm install --no-audit --no-fund`
- `npm test`
- `npm start`

Release artifacts are built by `.github/workflows/release.yml` after publishing the matching GitHub Release tag. The release tag must match `frame-studio-linux/package.json` exactly. The updater relies on `latest.yml` for Windows and `latest-linux.yml` for Linux AppImage builds.
