# FRAME Studio 2.4.37

Compact video editor with a multi-track timeline, keyframes, visual effects, advanced 3D layer transforms, audio tools, and MP4 export.

## Run and test

Requires Node.js 22+.

```bash
npm install --no-audit --no-fund
npm test
npm start
```

The full suite includes renderer syntax/regression checks, timeline and audio tests, project/update configuration checks, and FFmpeg/ffprobe export integration tests. A passing test suite does not replace visual QA inside a packaged Electron build.

## Release builds

- Windows installer with automatic in-place updates: `npm run build:win:installer`
- Windows portable: `npm run build:win:portable`
- Linux packages: `npm run build:linux` (AppImage, DEB, RPM)

The GitHub release workflow downloads platform-specific FFmpeg/ffprobe and yt-dlp into `vendor/` before building, so those large generated binaries do not need to be committed. Release metadata includes `latest.yml` for Windows and `latest-linux.yml` for Linux AppImage updates. Publish a GitHub Release tagged `v2.4.37` only after the package version and tag match. Linux AppImage and installed Windows NSIS are the supported automatic in-place update formats; DEB/RPM and portable builds keep their existing distribution update paths.

## Export performance notes

The exporter tries compatible hardware H.264 encoders exposed by the bundled FFmpeg, validates the output, then falls back to CPU `libx264`. Encoder availability and speed vary by OS, GPU, driver, codec settings, and source media. The preview also uses the existing fast-seek/cached-frame paths; timeline auto-scroll avoids re-seeking when the playhead time has not changed. No hardware throughput benchmark or packaged installer build is claimed from this source-only update.

See [RELEASE-NOTES-2.4.37.md](RELEASE-NOTES-2.4.37.md) and the repository's [publish command](../PUBLISH-2.4.37.md).
