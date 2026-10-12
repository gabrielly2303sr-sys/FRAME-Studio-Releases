# FRAME Studio 2.4.27 — Seek & Audio Reliability Update

This source kit bumps the existing 2.4.26 downloaded-media seek/audio fixes to release version 2.4.27 and fixes cross-platform regression tests that blocked CI when the package version changed or when Windows checked out line endings differently.

## Included changes
- `package.json`, the visible application title/badge, and the Linux installer desktop entry fallback are updated to 2.4.27.
- The release-notes dialog and changelog include a 2.4.27 entry while preserving 2.4.26 as historical release notes.
- The Media/Saved library test extracts the three relevant function blocks using explicit neighboring markers instead of assuming a closing brace appears on a separate line. This supports the checked-in minified/multiline markup and cross-platform line endings.
- Previous downloaded-video seek, detached-audio, and bundled-media-tool verification code is retained.

## Tests
Run `npm install --no-audit --no-fund` and `npm test` from `frame-studio-linux/`. The final Windows installer and Linux packages must still be built and tested by GitHub Actions before distribution.

## Publish
Copy `.github/`, `frame-studio-linux/`, `README-SOURCE-KIT.md`, `RELEASE-NOTES-2.4.27.md`, and `RELEASE-VERIFICATION-2.4.27.md` to the repository. Commit and push to `main`, verify that `v2.4.27` does not already exist, and publish the GitHub Release using target `main`.
