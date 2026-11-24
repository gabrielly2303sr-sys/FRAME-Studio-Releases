# FRAME Studio 2.4.42

This release continues the Hotfix 3-based application source and includes the workspace, Effects and opacity improvements, plus cross-platform export/CI compatibility fixes.

## Build and test

```sh
npm ci --no-audit --no-fund
npm test
```

## Release packaging

The repository GitHub Actions release workflow builds Windows NSIS/portable packages and Linux AppImage, DEB and RPM packages. In-place automatic updates are supported for installed Windows NSIS and Linux AppImage builds; DEB/RPM packages are updated through the relevant package manager.

See the root `RELEASE-NOTES-2.4.42.md` and `TEST-REPORT-2.4.42.md` for details and validation status.