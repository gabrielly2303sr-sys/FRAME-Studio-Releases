# FRAME Studio 2.4.42 — Test Report

## Confirmed before publication

- GitHub Actions cross-platform CI passed on `windows-latest` and `ubuntu-22.04`.
- Full `npm test` regression suite passed on both runners.
- FFmpeg process cancellation test uses an injected Node child process, avoiding POSIX-only shebang fixtures.
- FFmpeg frame-rate arguments do not require `-fps_mode`, preserving compatibility with FFmpeg 4.4 and newer.
- Linux CI uses a static FFmpeg build aligned with the release packaging workflow.
- Existing regression tests verify H.264/AAC export, frame rate, duration, audio presence/absence, cancellation, workspace UI, opacity, group persistence and timeline behavior.

## Still required from the release workflow

- Windows NSIS installer build and bundled-tool verification.
- Linux AppImage, DEB and RPM builds and bundled-tool verification.
- Confirm `latest.yml` and `latest-linux.yml` are generated.
- Confirm all installer files and updater metadata are attached to GitHub Release `v2.4.42`.

## Scope note

Automated source tests do not replace visual testing in packaged Electron on Windows and Linux.