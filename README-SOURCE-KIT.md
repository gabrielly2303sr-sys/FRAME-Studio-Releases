# FRAME Studio 2.4.17 — Performance & Export Source Kit

This is the complete source project and GitHub Actions workflow for Windows and Linux packages. It is **not** a prebuilt installer.

## 2.4.17 changes

- **Fast timeline scrubbing:** a temporary low-resolution preview and up to 20 cached snapshots are used while dragging the playhead. When scrubbing stops, the current frame is redrawn at full preview quality. Final export always uses the normal offline render path.
- **Bounded texture cache:** up to 36 entries and a target budget of 128 MiB estimated RGBA data, with least-recently-used eviction.
- **Faster procedural effects:** Turbulent Displace and Crumpled Paper use precomputed, bilinearly sampled noise fields instead of recomputing multi-octave fractal noise for every output pixel.
- **Softer glow:** extended offscreen padding, screen blending for outer glow, and a softened source-alpha response for Inner Glow.
- **Scene Editor Y correction:** local top-down image coordinates are converted to world-up coordinates so clips are not upside down.
- **Expanded MP4 export:** resolution (480p–4K), FPS, CRF quality or target bitrate, H.264 encoder preset, and AAC bitrate with quick profiles.

## What this does not change

Electron still runs Chromium/V8. TypeScript is transpiled to JavaScript and does not turn the app into native code by itself. This version optimizes CPU-heavy rendering paths and caching without migrating the runtime. The app still needs a real packaged GUI run and manual scrubbing/4K export validation before release.

## Build and test

Requirements: Node.js 22+, npm, network access for packages, and FFmpeg/ffprobe for the export integration tests and video export.

```bash
cd frame-studio-linux
npm install --no-audit --no-fund
npm test
npm run build:linux
```

On Windows, run `BUILD-WINDOWS.bat` in the project folder. The workflow builds Windows NSIS installer and Linux AppImage/DEB/RPM on GitHub Actions. It only attaches package files when both platform jobs succeed.

## Linux compatibility

AppImage is the recommended standalone Linux package for many modern x86-64 distributions; some may require FUSE 2 compatibility. `.deb` and `.rpm` packages should be updated through their platform's package workflow. Export requires FFmpeg/ffprobe on the system unless configured to use bundled tools.

## Release checklist

1. Confirm `frame-studio-linux/package.json` is version `2.4.17`.
2. Run `npm test`.
3. Commit `.github` and `frame-studio-linux` to `main`.
4. Publish a GitHub Release tagged `v2.4.17` only if that tag does not already exist.
5. Verify that Windows NSIS, Linux AppImage/DEB/RPM, and release-asset jobs finish successfully.
6. Open the packaged app and manually test scrubbing, glow edges, Scene Editor orientation, MP4 export settings, and update detection.
