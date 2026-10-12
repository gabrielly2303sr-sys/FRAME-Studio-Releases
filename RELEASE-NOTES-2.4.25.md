# FRAME Studio 2.4.25 — Release Notes

## Fixed
- Seeking downloaded videos and their extracted audio no longer falls back to the first frame because of the media URL scheme. Path-based media is served through a private loopback HTTP server with byte-range support for accurate seeking.
- Extracting audio from a video detaches the new audio layer from the source clip: the video clip is muted in preview and excluded from the export audio mix, avoiding doubled sound. Undo restores the prior state.

## Added
- Regression coverage for HTTP byte-range seeking, request validation, and detached extracted audio (`tests/2.4.25-seek-http-and-detached-audio.test.js`).

## Verification status
- `npm test` passed in the source-kit check environment with Node.js 22.16.0.
- The official Linux and Windows packages still need to be built and verified by GitHub Actions. Test codec-specific seeking and extracted audio in the packaged Electron app before considering release validation complete.
