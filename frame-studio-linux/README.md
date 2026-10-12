# FRAME Studio 2.4.25 — Downloaded Media Seek Fix

This is an incremental fix to the existing FRAME Studio application. Existing project files, editing features, and prior-release behavior are kept.

Downloaded library assets are served using the `frame-media://` protocol. This release adds standards-compliant byte-range responses directly from disk (`206 Partial Content`, `Content-Range`, `Accept-Ranges`, and exact lengths), allowing video and MP3 playback to seek without snapping back to the first frame or losing audio.

Automatic update checks retry with increasing delays after a temporary release-feed or asset-upload error. The existing GitHub Releases configuration and auto-updatable formats are preserved: Windows NSIS and Linux AppImage. Windows portable EXEs, Linux DEB/RPM installs, and unpackaged source runs do not support this same self-replacement mechanism.

## Tests
Run `npm install --no-audit --no-fund` and `npm test` from this directory. The byte-range tests cover full reads, partial reads, open-ended and suffix ranges, invalid ranges, HEAD requests, and the media protocol integration. The existing editor, timeline, export, downloader, and updater regression tests remain included.

The full app still needs a manual smoke test in a packaged Electron build with downloaded MP4 and MP3 media. Automated tests do not replace testing the actual Chromium video/audio decoder.

## Release
The package version is `2.4.25`, which must match the GitHub release tag (`v2.4.25`). The release workflow verifies the version match and publishes `latest.yml` and `latest-linux.yml` with each release's updater-supported assets.
