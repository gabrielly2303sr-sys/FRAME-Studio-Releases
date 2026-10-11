# FRAME Studio 2.4.16 — Source Kit

This ZIP contains the existing Electron project plus `.github/workflows/release.yml` for building the Windows and Linux packages when a matching GitHub Release is published.

## Changes in 2.4.16

- Animated GIF frame decoding for timeline playback/rendering, with a memory limit for large animations.
- Separated blur/glow categories, improved pixelation, image-color-derived Inner Glow, Turbulent Displace, and Crumpled Paper.
- Real Overshoot, Bounce, Elastic, and configurable Steps easing modes.
- Effect-navigation highlighting and corrected Scene Editor projection basis.
- Removed the unfinished 3D model import UI/runtime for this release.
- Updated version, app title, and changelog.

## Build

From `frame-studio-linux/` run `npm install --no-audit --no-fund`, `npm test`, then use `npm run build:linux` on Linux or `BUILD-WINDOWS.bat` on Windows. The package is source code, not an APK/installer. Build artifacts and UI behavior still need verification in packaged Electron builds.

Linux packages are built on Ubuntu 22.04 in Actions for broader glibc compatibility. AppImage is the recommended single-file option but may require FUSE 2 compatibility on some distributions. `.deb` and `.rpm` installs follow their platform's package-management flow.
