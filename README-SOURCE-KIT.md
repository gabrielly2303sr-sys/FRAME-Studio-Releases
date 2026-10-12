# FRAME Studio 2.4.20 — Source Kit

Complete source tree for the existing Electron application; this is not a prebuilt installer.

## Included changes
- Bundle-aware FFmpeg, ffprobe, and yt-dlp resolution. Official builds download platform-matched binaries into `vendor/` before packaging and copy them into `resources/downloader`, outside `app.asar`.
- More reliable double-click text editing in the preview.
- Compact Undo/Redo buttons in the timeline toolbar.
- Shortcut tooltips on hover, including customized shortcuts.
- GitHub Actions build checks verify that the downloader and FFmpeg tools are actually present in the packaged app resources.

## Publish
1. Copy `.github/` and `frame-studio-linux/` into the repository root.
2. Run `npm install --no-audit --no-fund` and `npm test` inside `frame-studio-linux`.
3. Push the code to `main`.
4. Publish tag `v2.4.20` only after confirming it does not already exist and that `frame-studio-linux/package.json` is version `2.4.20`.
5. Wait for Windows, Linux, and Release-asset jobs to succeed before distributing the release.

The third-party tools are fetched by CI at build time rather than included in this source archive. See `frame-studio-linux/THIRD_PARTY_NOTICES.md` for upstreams and licensing notes.
