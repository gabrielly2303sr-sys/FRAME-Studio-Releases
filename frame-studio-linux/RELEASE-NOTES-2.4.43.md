# FRAME Studio 2.4.43 — Timeline & Audio Hotfix

## Fixes

- **Timeline playhead dragging:** the red playhead is rebuilt whenever the timeline is redrawn. Its pointer handler is now attached at creation time, so dragging continues to work after redraws instead of only working on the original DOM element.
- **Audio inspector on video clips:** video clips now expose the Audio tab and enable its panel, making clip volume, fade-in, fade-out and volume keyframes selectable for videos with audio.
- **Version labels:** the application title, visible version badge and home footer now match the package version.
- **Version regression coverage:** the release-version consistency test is included in the standard `npm test` command.

## Preserved behavior

This release is based on the existing Hotfix 3-derived 2.4.42 source. It retains workspace docking, Effects folders, opacity controls, timeline selection and group persistence fixes.

## Packaging

The release workflow is expected to generate Windows NSIS/portable packages and Linux AppImage, DEB and RPM packages, along with the updater metadata supported by the existing workflow. Do not announce the release as ready until CI and the release asset-attachment job have succeeded.
