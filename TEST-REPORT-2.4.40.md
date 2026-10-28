# FRAME Studio 2.4.40 — test report

## Passed in the available source environment
- `npm test` from `frame-studio-linux/` — full configured suite passed.
- MP4 export integration tests invoke FFmpeg and validate H.264/AAC output with `ffprobe`.
- New regression tests cover the disk-space/format decision, disk-space failure handling wiring, legacy clip timing migration, and a JPEG-frame-to-H.264 MP4 smoke export.
- `node --check main.cjs`, `node --check media-export.cjs`, and `node --check preload.cjs` passed.

## Not claimed as tested
- No packaged Electron installer/AppImage was launched for manual GUI testing in this run.
- The user's actual failing project/media files were not available for reproduction.
- Hardware-encoder behavior varies with the packaged FFmpeg, GPU, operating system and driver; all platform/driver combinations were not tested.
- The available-space check uses estimates. It is intended to catch foreseeable disk-space failures and reduce temporary storage, not guarantee that storage cannot fill for all media.

## Result
Automated source tests pass. Treat 2.4.40 as ready for broader user-project and packaged-build validation, not as a guarantee that no MP4 export can ever fail.
