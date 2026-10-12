# FRAME Studio 2.4.19 — Downloaded Media Library Source Kit

This ZIP contains the full Electron source project and the GitHub Actions workflow. It is not a prebuilt installer. The `vendor/linux` and `vendor/win` folders contain placeholders in the source archive; the release workflow downloads platform-specific `yt-dlp` and FFmpeg executables into those folders before packaging them into official builds.

## Changes

- Adds a persistent Downloaded Media library stored under Electron's per-user `userData` directory, independent of the current project.
- Adds nested folder creation, folder navigation, refresh/open-folder controls, and a destination-folder selector in the downloader.
- Saves MP4/MP3 downloads directly into the selected library folder instead of opening a save dialog.
- Lets users drag downloaded videos, audio, GIFs, and images directly into the timeline or add them to the current project's Media bin.
- Adds safe path validation and rejects traversal and symlink-based library entries.
- Prefers packaged yt-dlp/FFmpeg binaries, with PATH fallbacks for development builds.
- Updates the Windows and Linux release workflow to prepare bundled downloader executables before Electron Builder packages the application.

## Storage location

The library is stored in `app.getPath('userData')/Media Library/Downloaded Media`. This is per-user app data (for example, AppData on Windows or the Electron config/user-data folder on Linux), not Android's `/Android/data` directory. It persists across projects but is separate per operating-system user and per app data profile.

## Downloader and licensing notes

Only download media you own or are permitted/licensed to save. The app does not add login-cookie, DRM-bypass, or access-restriction-circumvention workflows. Official package builds bundle `yt-dlp` and FFmpeg; development runs can fall back to system-installed tools. See `frame-studio-linux/THIRD_PARTY_NOTICES.md` for upstream projects and applicable license notices. Release distributors must preserve upstream notices and satisfy the binary providers' license/source obligations.

## Build and test

```bash
cd frame-studio-linux
npm install --no-audit --no-fund
npm test
npm run build:linux
```

The release workflow prepares platform tools, validates that the published tag matches `package.json`, builds a Windows NSIS installer and Linux AppImage/DEB/RPM, verifies update metadata, and attaches the generated artifacts only after both platform jobs succeed.

## Validation notes

Automated tests check library path handling, IPC wiring, folder selection, drag-and-drop integration, and the release workflow's bundled-tool setup. Packaged Electron UI testing on Windows and Linux is still required before release.
