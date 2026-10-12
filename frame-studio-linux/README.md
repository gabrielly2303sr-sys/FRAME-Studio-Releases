# FRAME Studio 2.4.17 — Performance & Export Update

FRAME Studio is a local Electron video and motion-graphics editor. This folder contains source code, not a prebuilt installer.

## 2.4.17

- Fast, low-resolution timeline scrubbing with a bounded, short-lived frame cache and full-resolution redraw after the playhead is released or held still.
- A 128 MiB estimated RGBA texture-cache budget with LRU eviction.
- Precomputed noise fields for Turbulent Displace and Crumpled Paper.
- Softer outer-glow edges and a more gradual source-color Inner Glow.
- Scene Editor Y coordinate correction to stop layer contents rendering upside down.
- MP4 export settings for 480p through 4K, FPS, CRF or target bitrate, H.264 encoder speed, and AAC audio bitrate.

## Build and test

Requires Node.js 22+ and npm. MP4 export integration tests require FFmpeg and ffprobe.

```bash
npm install --no-audit --no-fund
npm test
npm run build:linux
```

For Windows, run `BUILD-WINDOWS.bat`. The package pins Electron Builder 25.1.8.

## Notes and limitations

- Electron remains Chromium/V8-based. TypeScript improves typing and maintenance but does not turn this project into a native runtime. This release focuses on the current hot paths.
- Automated tests cover deterministic MP4 encoding and new export options, but the full GUI, scrubbing smoothness, and high-resolution performance still require manual testing in packaged builds.
- 4K resolution and slower encoding presets need substantially more time and memory.
- AppImage is the recommended standalone Linux download; some distributions need FUSE 2 compatibility. `.deb` and `.rpm` should follow their package manager's update flow.
- System fonts, supported effects, and external media still depend on what is installed and readable on the host computer.

## GitHub Release and automatic-update metadata

The `.github/workflows/release.yml` workflow builds packages when a Release is published. The published Windows installer needs `latest.yml` and its `.blockmap`; the Linux AppImage update path needs `latest-linux.yml`. Check the Assets section and confirm both platform builds before announcing automatic updates.
