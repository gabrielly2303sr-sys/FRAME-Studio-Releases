# FRAME Studio 2.4.16 — Animated GIFs & Effects Update

FRAME Studio is an Electron-based local video and motion-graphics editor. This is the complete source kit, not a prebuilt installer. It includes the 2.4.16 GIF playback fix, a searchable effects browser, and additional image/easing effects.

## 2.4.16 changes

- Animated GIFs are decoded into timed full-composited frames for timeline preview and rendered frame selection.
- Blur categories and glow categories are separated in the Effects library; Pixelate Blur has larger nearest-neighbor pixel blocks, and Inner Glow uses the source image's colors.
- Added Turbulent Displace and Crumpled Paper effects.
- Added real Overshoot, Bounce, Elastic, and adjustable Steps interpolation modes.
- Improved effect navigation highlighting and adjusted the Scene Editor projection basis.
- Removed the unfinished model import entry points; this release does not advertise GLB/glTF/OBJ/BLEND import.

## Build and test

Requires Node.js 22+ and npm, with internet access for dependencies. From `frame-studio-linux/`:

```bash
npm install --no-audit --no-fund
npm test
npm run build:linux
```

On Windows, run `BUILD-WINDOWS.bat` with Node.js 22+ and internet access. The build uses Electron Builder 25.1.8 from this package configuration.

## Linux distribution

The GitHub workflow builds on Ubuntu 22.04 to improve compatibility with glibc-based distributions. AppImage is the recommended standalone package for CachyOS/Arch, Ubuntu, Linux Mint, Fedora and many other x86-64 distributions; systems may need FUSE 2 compatibility. `.deb` targets Debian/Ubuntu derivatives and `.rpm` targets Fedora/openSUSE-compatible systems. The host needs FFmpeg/ffprobe for the editor's MP4 export.

The legacy source installer uses system Electron where available and does not support in-app self-updating. Automatic updates apply to properly packaged NSIS installers on Windows and AppImage builds on Linux, with metadata generated for the corresponding published Release. Test the update flow with packaged binaries before announcing it as stable.

## Known limitations

- This source kit has not been compiled into final packaged Windows/Linux releases in this environment; the GitHub Actions run must confirm build success.
- GIFs are decoded into full frames and capped at 40 million stored pixels to avoid excessive memory use. Extremely large GIFs may be rejected.
- 3D model import is intentionally removed in 2.4.16. Legacy 3D model references are treated as unsupported/missing media.
- Motion blur remains a screen-space temporal smear, not a per-pixel velocity-buffer solution.
- The Effects library exposes supported current compositor features; arbitrary effect-stack reordering and unlimited duplicate instances are not implemented.

## Release workflow

The `.github/workflows/release.yml` workflow runs after a Release is published. Commit source and workflow to `main`, keep the `package.json` version aligned with the release tag (for example, `2.4.16` with `v2.4.16`), publish the Release, then inspect Actions. The workflow expects `Windows NSIS installer`, `Linux AppImage, DEB, and RPM`, and `Attach installers to the GitHub Release` to succeed. The Release must include `latest.yml` plus the NSIS installer and blockmap for Windows, and `latest-linux.yml` plus the AppImage for Linux updates.

## Release notes format

Use categories `[ADDED]`, `[FIXED]`, `[IMPROVED]`, `[REMOVED]`, and `[COMPATIBILITY]`. GitHub-generated categories depend on pull-request labels; direct commits can be summarized manually using `.github/RELEASE_TEMPLATE.md`.
