# FRAME Studio 2.4.41 — Test Report

## Automated checks passed

Executed from `frame-studio-linux/` on Node.js 22.16.0, using the environment's FFmpeg and ffprobe:

- `npm test` — all configured tests passed.
- Smoke and customization tests.
- Editor interaction and timeline regressions.
- Legacy group migration and group persistence/rigid movement.
- Time Remap tests.
- Real FFmpeg export integration tests, with H.264/AAC outputs checked by ffprobe.
- Automatic updater configuration checks.
- Downloaded Media, bundled media tools, and byte-range seek tests.
- Marquee selection and export-reveal tests.
- Electron toast, text-dialog, and export-profile regression tests.
- New 2.4.41 workspace/effects/opacity UI tests.
- `node --check` for `main.cjs`, `preload.cjs`, `media-export.cjs`, and `video-preview-seek.js`.
- Inline renderer JavaScript syntax check using Node's `vm.Script`.

## Not claimed as tested

- The Electron GUI was not launched for manual visual testing in this environment.
- Linux AppImage/DEB/RPM packages and Windows NSIS installer were not built here.
- GitHub Actions release workflow was not run from this environment.
- Hardware-encoder performance and driver-specific behavior were not measured.
- Docking interactions are covered by source-level tests; manual drag-and-drop across real Electron panels is still required.

## Release recommendation

Treat this package as a Release Candidate until the packaged Electron application is launched and the new opacity and panel-docking interactions are manually checked. The full automated source test suite passed; that is not a substitute for packaged GUI verification.
