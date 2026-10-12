# FRAME Studio 2.4.18 — Live Preview & Downloader Source Kit

This ZIP contains the complete source project and GitHub Actions workflow for Windows and Linux packages. It is not a prebuilt installer.

## Changes

- Keeps the most recently decoded frame visible during video seeks and uses a latest-wins seek strategy while scrubbing.
- Coalesces redraws while the playhead is dragged and asks for an accurate seek after release.
- Keeps a bounded, low-resolution last-frame snapshot per video asset to avoid blanking the preview when the browser video element is seeking.
- Keeps double-click text editing wired to the selected text layer.
- Bounds draggable Bounce, Elastic, and Steps easing controls.
- Adds an authorized-content video downloader with MP4/MP3, max resolution/FPS, progress and cancellation.

## Downloader requirements and restrictions

Install `yt-dlp` and `ffmpeg` on the system. On CachyOS/Arch: `sudo pacman -S yt-dlp ffmpeg`. The downloader requires an explicit rights/permission confirmation and does not include credentials, cookies, DRM bypass, or access-restriction circumvention. Only download content you own or are explicitly permitted/licensed to save.

## Build and test

```bash
cd frame-studio-linux
npm install --no-audit --no-fund
npm test
npm run build:linux
```

The workflow checks out `main` for the published release tag, validates that the tag version matches the package version, builds Windows NSIS and Linux AppImage/DEB/RPM, then attaches metadata and installers only when both platform builds succeed.

## Validation notes

Static/suite tests can verify wiring and deterministic export behavior, but a packaged Electron GUI must still be tested with different video codecs to validate seek responsiveness and the downloader on each OS.
