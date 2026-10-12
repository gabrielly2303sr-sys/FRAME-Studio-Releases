# FRAME Studio 2.4.19 — Downloaded Media Library

This folder contains the Electron source code. It is not a prebuilt installer.

## 2.4.19

- Adds a persistent Downloaded Media library independent of the current project.
- Create nested folders and select a destination folder before downloading.
- Downloaded media are stored locally and can be dragged directly from the library to the timeline, or added to the project's Media bin.
- Official Windows and Linux releases bundle platform-specific `yt-dlp` and FFmpeg executables; development builds can use tools on `PATH`.
- Uses safe relative-path validation for library browsing and media resolution.

## Storage location

The desktop app stores downloads in `app.getPath('userData')/Media Library/Downloaded Media`. On Windows this resolves inside the user's AppData profile; on Linux it resolves inside Electron's app-specific user-data directory (normally under the user's config directory). This path persists across projects for the same user. `/Android/data` is an Android-specific location and is not used by this desktop Electron build.

## Downloader support

The release workflow downloads platform-specific binaries before packaging:
- Linux: standalone `yt-dlp` plus a static FFmpeg/ffprobe build.
- Windows: `yt-dlp.exe` plus FFmpeg/ffprobe and required DLLs.

Development checkouts first look for `vendor/<platform>` executables, then fall back to `PATH`. Official users do not need to run `sudo pacman -S yt-dlp ffmpeg` when the corresponding packaged tools are present. Only download content you own or are explicitly authorized/licensed to save; do not bypass DRM or access restrictions.

See `THIRD_PARTY_NOTICES.md` for upstream sources and licensing notes. Redistributors must preserve applicable notices and comply with the relevant binary licenses.

## Automatic updates

GitHub Releases publish platform-specific update metadata: `latest.yml` for the Windows NSIS installer and `latest-linux.yml` for Linux AppImage builds. These metadata files must be attached to the same published release as their matching installers. The release workflow verifies that the files are generated before uploading assets. Linux `.deb` and `.rpm` users should update through their package manager rather than the in-app AppImage updater.

## Build and test

Requires Node.js 22+ and npm. MP4 export integration tests may use FFmpeg/ffprobe from the host environment unless packaged tool paths are configured.

```bash
npm install --no-audit --no-fund
npm test
npm run build:linux
```

On Windows, run `BUILD-WINDOWS.bat`. Electron Builder is pinned to version 25.1.8. The GitHub Release workflow prepares the platform-specific downloader tools in `vendor/` before running the build.

## Notes

- The app remains an Electron/Chromium/V8 application; this change does not convert it to a native application.
- Linux AppImage is the recommended standalone Linux package; some distributions may still need FUSE compatibility support. `.deb` and `.rpm` should be updated through their package manager.
- A real packaged-UI test is still required on Windows and Linux before announcing the release.
