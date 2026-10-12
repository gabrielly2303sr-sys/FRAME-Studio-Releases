# FRAME Studio 2.4.24 — Critical Video Scrubbing Fix

This release addresses a critical preview bug where video frames could remain frozen or lag behind the playhead while scrubbing. Grabbing the playhead now pauses active playback, seek requests are coalesced to keep up with the newest timeline time, interactive scrubbing uses exact `currentTime` requests instead of coarse `fastSeek()` keyframe jumps, and releasing the pointer requests the final frame precisely. Decoded-frame updates invalidate compositor textures for clips using that video asset.

## Validation
Run `npm install --no-audit --no-fund` and `npm test` from this directory. The new `tests/2.4.24-playhead-video-scrub.test.js` tests the shared `video-preview-seek.js` helper used by the renderer and checks the integration for playback cancellation, seek finalization, active clip target reconciliation, and cache invalidation.

For final manual validation, use a long-GOP H.264/H.265 video and drag the playhead slowly and rapidly, scrub backward and across clip boundaries, scrub while playback is running, release while a seek is still pending, then press Play again. Repeat with split clips and Time Remapping. This source kit has not been run in a real Electron GUI in this environment.

## Previous release: 2.4.23 — Bundled Media Tools Verification Fix

The previous release fixed the repeat “missing bundled media tools” issue in Linux AppImages. The Linux package bundles the standalone `yt-dlp_linux` ELF executable rather than the Python zipapp, and the runtime can repair missing executable permissions by copying the already bundled binary into FRAME's app-owned cache. No `pacman`, Python package, or system-level FFmpeg/yt-dlp install is intended for the official package.

The release workflow validates both `linux-unpacked/resources/downloader` and the final extracted AppImage, then runs the correct version checks for yt-dlp, FFmpeg, and ffprobe before publishing. It also verifies that `latest-linux.yml` (and the Windows `latest.yml`) is generated with the installer assets.

Use the official installer/AppImage. Source development runs prepare tools under `vendor/<platform>`; those downloaded files are not committed to this source package. See `THIRD_PARTY_NOTICES.md` for bundled tool licensing and attribution.
