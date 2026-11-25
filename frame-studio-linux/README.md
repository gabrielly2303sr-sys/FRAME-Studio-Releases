# FRAME Studio 2.4.45

This hotfix resolves an Inspector initialization and interaction crash. updateContextTabs() now iterates the .itab and .panel collections using $$() (the querySelectorAll helper) rather than $() (the single-element querySelector helper).

## Retained features
- Realtime preview-canvas and project-audio capture.
- WebM output and H.264/AAC conversion to MP4, MOV and MKV.
- Frame-accurate MP4 fallback, including projects with Time Remap.
- Fullscreen viewer and improved playhead drag hit area.

## Build and test
Run npm ci --no-audit --no-fund and npm test from this directory.

## Release packaging and automatic updates
The GitHub Actions release workflow builds Windows NSIS/portable packages and Linux AppImage/DEB/RPM packages, then attaches latest.yml and latest-linux.yml. In-place automatic updates are supported for Windows NSIS and Linux AppImage installations; DEB/RPM packages update through their package managers.

See the root release notes, test report and publish checklist for 2.4.45.