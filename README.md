# FRAME Studio 2.4.44

Hotfix 3-derived maintenance release focused on faster realtime capture export, additional output containers, better export diagnostics, viewer fullscreen and timeline playhead usability.

Export formats: MP4, WebM, MOV and MKV. Realtime capture is the default; MP4 retains a frame-accurate mode for projects requiring deterministic rendering and Time Remap fidelity.

The GitHub Release workflow builds Windows NSIS/portable packages and Linux AppImage/DEB/RPM packages, then attaches updater metadata. Automatic in-place updates remain supported for Windows NSIS and Linux AppImage installations.

See:
- RELEASE-NOTES-2.4.44.md
- TEST-REPORT-2.4.44.md
- PUBLISH-2.4.44.md

A release is not considered published until CI passes and GitHub Actions attaches the installers and updater metadata.