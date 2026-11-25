# FRAME Studio 2.4.43

This release retains the Hotfix 3-based source and fixes timeline playhead dragging after redraws, exposes the Audio inspector for video clips, and aligns the visible app version with package metadata.

## Build and test

```sh
npm ci --no-audit --no-fund
npm test
```

## Release packaging and automatic updates

The repository GitHub Actions release workflow builds Windows NSIS/portable packages and Linux AppImage, DEB and RPM packages. It also generates and attaches the Windows updater metadata `latest.yml` and Linux AppImage updater metadata `latest-linux.yml`.

In-place automatic updates are supported for installed Windows NSIS and Linux AppImage builds. The updater uses the GitHub Releases provider configured in `package.json`; it checks after startup and periodically, and offers the update after a newer published release and its assets/metadata are available. DEB/RPM packages are updated through the relevant package manager, and portable Windows builds do not use the NSIS in-place updater.

See the root `RELEASE-NOTES-2.4.43.md` and `TEST-REPORT-2.4.43.md` for details and validation status.