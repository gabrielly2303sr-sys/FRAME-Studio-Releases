# FRAME Studio 2.4.44

This release introduces realtime preview-canvas capture with project audio mixing, validated WebM output and H.264/AAC conversion to MP4, MOV and MKV. The frame-accurate MP4 renderer remains available as a fallback, including for projects using Time Remap.

It also adds fullscreen viewer playback, improves the playhead drag hit area, and reports export failures to the DevTools console with capture/transcode diagnostics.

## Build and test

Run npm ci --no-audit --no-fund and npm test from this directory.

## Release packaging and automatic updates

The GitHub Actions release workflow builds Windows NSIS/portable packages and Linux AppImage, DEB and RPM packages, and attaches the updater metadata. It generates and publishes the Windows updater manifest `latest.yml` and the Linux AppImage manifest `latest-linux.yml`. In-place automatic updates remain supported for installed Windows NSIS and Linux AppImage builds; DEB/RPM packages update through their package managers.

Realtime capture follows playback and may drop frames under heavy system load. Use the frame-accurate MP4 mode for precision-sensitive exports; projects containing Time Remap automatically use that path.

See the root release notes and test report before treating the release as ready.