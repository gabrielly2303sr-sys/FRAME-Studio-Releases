# FRAME Studio 2.4.34

FRAME Studio is a local-first video editor. This source package contains the Electron app, media pipeline and platform packaging scripts. The Community/Supabase tab has been removed.

## Development

```bash
npm install
npm test
npm start
```

## Automatic updates

Installed Windows and Linux releases use GitHub Releases metadata (`latest.yml` and `latest-linux.yml`) through `electron-updater`. Keep release assets and update metadata attached to each official release.

## Linux AppImage

```bash
npm install
npm run build:linux:appimage
```

The MP4 renderer prefers compatible hardware H.264 encoders when FFmpeg exposes them and falls back to `libx264` if a hardware attempt fails. Hardware acceleration depends on FFmpeg build, GPU driver, OS and device support.
