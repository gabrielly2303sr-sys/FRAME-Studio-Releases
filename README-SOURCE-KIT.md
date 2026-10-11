# FRAME Studio 2.4.15 — Advanced Effects Source Kit

This source kit updates the existing FRAME Studio Electron application. It is not a prebuilt installer or a ready-to-install AppImage.

## Included in 2.4.15

- A searchable effect library with categories, favorites, and an applied-effects view.
- Canvas compositor effects: edge blur, inner glow, pixelate/mosaic, and directional blur, plus the existing effects.
- Camera preview overlay in Scene Editor and deterministic camera shake settings.
- Continuous camera navigation with WASD / QE and Shift speed control.
- GLB import with embedded materials/textures rendered into a layer using a Three.js runtime. The current Scene Editor projects layers as planes; GLB geometry is rendered as a textured/animated layer rather than inserted as native scene mesh geometry. OBJ/MTL is not included.
- Existing system font discovery was preserved.
- Linux build uses the locally installed Electron Builder 25.1.8 instead of letting `npx` fetch a newer incompatible major. Removed the obsolete `linux.desktop` config that caused schema validation errors.
- Release notes categories for Added, Fixed, Improved, Removed, and Compatibility.

## Build

Requires Node.js 22+ and npm, with internet access for dependencies. From `frame-studio-linux/` run:

```bash
npm install --no-audit --no-fund
npm test
npm run build:linux
```

For Windows, run `BUILD-WINDOWS.bat` in Windows after installing Node.js 22+. `npm install` runs the `prepare` script, which builds the Three.js model runtime bundle.

## Linux compatibility

The workflow builds Linux releases on Ubuntu 22.04 to improve compatibility with glibc-based distributions. AppImage is the broadest standalone option, but some systems still require FUSE 2 compatibility. For in-app AppImage updates, the published release must include electron-builder metadata such as `latest-linux.yml` alongside the AppImage. FFmpeg/ffprobe must be available for the editor's FFmpeg-based MP4 export. DEB is for Debian/Ubuntu-derived distributions; RPM is for Fedora/openSUSE-compatible systems.

## Important limitations

- This source ZIP has not been compiled into final signed/release binaries in this environment. Verify the GitHub Actions build and test packaged builds before publishing.
- GLB is rendered with its own Three.js scene into a canvas-backed layer, then composited by the existing 2.5D editor. It is not yet a native mesh that participates in the editor's global camera projection, gizmos, and depth sorting. OBJ/MTL is not implemented.
- Camera motion blur uses the current global composition smear approach; it is not true per-pixel velocity/motion-vector blur.
- The effects library can search, favorite, enable/disable, remove, and copy/paste supported effect settings. It does not provide arbitrary effect-stack reordering or unlimited duplicate instances, because the existing compositor stores most effects as clip properties.
- In-app update requires a correctly packaged AppImage or Windows NSIS installer and the generated release metadata files. A source/dev install does not auto-update.
