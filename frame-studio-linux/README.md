# FRAME Studio 2.4.21 — Bundled Tools & Automatic Setup

This directory contains the Electron source code, not a prebuilt installer.

## 2.4.21

- Source startup/build scripts prepare yt-dlp, FFmpeg and ffprobe automatically when they are missing.
- Official packages fail clearly if bundled resources are absent rather than asking users to install separate tools.
- Linux source install copies the prepared tool binaries and their notices.

## 2.4.20

- Official Windows and Linux builds include yt-dlp and FFmpeg/ffprobe under the app resources directory.
- Runtime tool discovery prioritizes app-bundled executables, then uses a system fallback for development checkouts.
- Fixed preview double-click editing by prioritizing the selected active text layer and using a safer text hit-test fallback.
- Added compact Undo and Redo buttons to the timeline toolbar.
- Timeline and command buttons show keyboard shortcuts on hover and refresh those hints after customized shortcuts are saved.

## Bundled downloader and FFmpeg

Release builds download platform-specific executables into `vendor/win` or `vendor/linux` during GitHub Actions. Electron Builder places them in `resources/downloader`, outside `app.asar`, and the main process resolves them using `process.resourcesPath`. In packaged builds, media export and the downloader use these binaries without requiring users to install `yt-dlp` or FFmpeg separately. Developer checkouts may use `vendor/<platform>` binaries or fall back to tools installed on `PATH`.

The published Release also includes the update metadata required by Electron Updater: `latest.yml` for the Windows NSIS installer and `latest-linux.yml` for AppImage. `.deb` and `.rpm` installations should be updated through the package manager rather than the AppImage updater.

Third-party binaries are retrieved at build time and are not stored in this source ZIP. See `THIRD_PARTY_NOTICES.md` for upstream source URLs and licensing notices; redistributors must preserve applicable notices and meet the licences of the actual binary builds.

## Build and test

Requires Node.js 22+ and npm.

```bash
npm install --no-audit --no-fund
npm test
npm run build:linux
```

On Windows, run `BUILD-WINDOWS.bat`. The release workflow downloads the matching tools, checks they run, packages them with the app, and verifies the files under the unpacked Electron resources directory.

## Notes

- The app remains Electron/Chromium/V8; this update does not turn it into a native application.
- Manual testing of the packed UI remains required for text double-click editing and packaged FFmpeg/downloader execution.
