# FRAME Studio 2.4.30 — Verification checklist

## Automated validation
`npm test` passed in this workspace. It validates export and ffprobe integration, video FPS/duration/audio/cancellation, media-range seeking, preview scrub logic, group metadata persistence, version assertions, and updater configuration.

## Manual verification required before broad distribution
1. On a supported GPU/driver, export a short MP4 and verify that the final status reports `GPU` and an encoder such as `h264_vaapi`, `h264_nvenc`, `h264_qsv`, or `h264_amf`. On a machine with no supported GPU, verify it completes with `CPU libx264`.
2. Drag the timeline playhead quickly across regular videos and downloaded videos. Check that the preview advances and settles on the requested frame after releasing the mouse, with audio behavior unchanged.
3. Select at least two clips, group them, collapse/open the group, save and reopen the project, restart from autosave, then test undo/redo and ungroup. Confirm masks/transforms and nested group links remain.
4. Build and install the Windows NSIS installer and Linux AppImage. Publish through GitHub Actions and verify that the release receives the installer(s), `latest.yml`, and `latest-linux.yml`.
5. Test automatic update prompts from a previous supported NSIS/AppImage version. ZIP/portable, source runs, DEB and RPM are not the supported `electron-updater` replacement channels.

## Release safety
Confirm the remote's latest release and whether `v2.4.30` already exists before publishing. If the tag already exists or a newer release has been published, do not reuse it; use the next version (for example, `2.4.31`) and update the package version, release notes, and version-specific tests together. This workspace cannot verify the live remote release/tag or run GitHub Actions.
