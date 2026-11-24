# FRAME Studio 2.4.42 — Hotfix 3 Evolution

## Release status

This release is based on the user-tested Hotfix 3 application source, with the workspace, Effects and opacity improvements from the 2.4.41 release candidate and the cross-platform CI/export compatibility fixes verified during PR #2. Version 2.4.41 was not fully distributed because its Windows build failed before installer upload; 2.4.42 is the first release intended to carry the complete installer set.

## Editor improvements

- Visible opacity slider and numeric control for image, video, and text layers, using existing opacity properties and keyframe support.
- Effects library reorganized into five top-level folders: Blur & Distortion, Light & Glow, Color & Correction, Texture & Style, and Motion & Camera.
- Draggable workspace region ordering for Library, Viewer, and Inspector, with locally saved layout and a reset-to-default action.
- Timeline remains in its existing bottom dock to preserve the tested editing layout.

## Stability and regression fixes retained

- Marquee selection and Ctrl/Cmd-add / Alt-remove selection modes.
- Multi-clip movement constrained as a rigid set at timeline and track boundaries.
- Group metadata protected across save, restore, autosave, and undo/redo.
- Electron-safe in-app text dialogs and toast notifications.
- Export profile available in DevTools, including failure/cancel diagnostics.
- Successful exports reveal the generated file in the system file manager.
- Export cancellation and process-launch tests made cross-platform.
- Constant-frame-rate output remains compatible with FFmpeg 4.4 and newer; output FPS is checked with ffprobe.

## Automatic updates and packages

The GitHub Release workflow is configured to build:
- Windows NSIS installer, with `latest.yml` and blockmap metadata.
- Linux AppImage, DEB and RPM, with `latest-linux.yml`.

In-place automatic updates are supported for the packaged Windows NSIS installer and Linux AppImage. Portable Windows, DEB/RPM installations, and development runs do not use the same in-place updater flow.

The application checks for updates shortly after startup and periodically thereafter. An update prompt can only appear after the release assets and updater metadata have been attached successfully.

## Validation

The cross-platform GitHub Actions regression suite passed on Windows and Ubuntu 22.04 for the release-candidate branch before integration. The release workflow must still complete both packaging jobs and the asset-attachment job before this release is considered fully published.