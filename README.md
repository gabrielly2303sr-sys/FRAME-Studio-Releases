# FRAME Studio 2.4.18 — Live Preview & Downloader

This folder contains the Electron source code. It is not a prebuilt installer.

## 2.4.18

- Live timeline scrubbing: retains the last decoded video frame while a seek is pending, coalesces redraws to animation frames, uses `fastSeek` during drag when available, and requests a final accurate seek on release.
- Fixes preview rendering paths that otherwise returned before composing the current timeline frame while a video was seeking.
- Double-click text editing remains wired to selection and the text content field.
- Easing controls support bounded draggable handles for Bounce, Elastic, and Steps.
- Adds a YouTube downloader pane for authorized public content, with MP4/MP3 output and resolution/FPS options.

## Downloader requirements

The downloader requires system-installed `yt-dlp` and `ffmpeg`. On CachyOS/Arch: `sudo pacman -S yt-dlp ffmpeg`. The app requires a rights/permission confirmation and does not provide DRM or access-restriction bypass functionality. Only save content you own or have explicit permission/a license to download. Availability and format selection depend on the source video and the installed yt-dlp version.

## Build and test

Requires Node.js 22+ and npm. MP4 export integration tests require FFmpeg and ffprobe.

```bash
npm install --no-audit --no-fund
npm test
npm run build:linux
```

On Windows, run `BUILD-WINDOWS.bat`. Electron Builder is pinned to version 25.1.8.

## Notes and limitations

- This remains an Electron/Chromium/V8 application; JavaScript is interpreted/JIT-compiled by V8. The update improves scheduling and decoded-frame reuse rather than changing the runtime architecture.
- The timeline preview may show the last decoded frame briefly while seeking. Intermediate frames can still be skipped by long-GOP or slow-to-seek codecs.
- The downloader UI and IPC require a real GUI test on Linux/Windows.
- AppImage is the recommended standalone Linux package; some distributions need FUSE 2 compatibility. `.deb` and `.rpm` packages should be updated through their package manager.

## GitHub Release and auto-update metadata

The `.github/workflows/release.yml` workflow builds when a Release is published. Verify `latest.yml`, `.blockmap`, `latest-linux.yml`, and both platform jobs before announcing automatic updates.
