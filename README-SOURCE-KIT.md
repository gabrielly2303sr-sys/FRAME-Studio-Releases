# FRAME Studio 2.4.26 — Downloaded Media Seek & Audio Fix

This source kit is based on the supplied `FrameStudio-fix-seek-audio.zip` and prepares its downloaded-media seek/audio fixes as release `2.4.26`.

## Changes included
- Path-based videos and extracted audio are served through a private loopback HTTP server with byte-range support so Chromium can seek non-sequentially instead of freezing at frame 0.
- Extracted audio is detached from the source video's preview/export audio and waveform; undo restores the original state.
- The Media/Saved delete regression test now tolerates LF and CRLF checkouts instead of depending on one exact newline convention.
- Older tests validate semantic-version syntax instead of pinning their assertions to `2.4.23`; a dedicated release-version test ensures the package version matches the visible title, badge and home footer.
- Added `.gitattributes` to keep source/test line endings stable across Windows and Linux checkouts.

## Packaging notes
- The source ZIP does not contain native platform binaries. `.github/workflows/release.yml` downloads platform-specific yt-dlp/FFmpeg/ffprobe, builds packages and verifies the bundled tools.
- This source kit's `npm test` suite passed in the preparation environment. The final Windows installer, AppImage, DEB and RPM have not been built or GUI-tested here; do not distribute until GitHub Actions passes and the final packages are checked with `RELEASE-VERIFICATION-2.4.26.md`.

## Publish
1. Copy `.github/`, `frame-studio-linux/`, `README-SOURCE-KIT.md`, and `RELEASE-VERIFICATION-2.4.26.md` into the repository.
2. Run `npm install --no-audit --no-fund` and `npm test` in `frame-studio-linux/`.
3. Push the commit to `main`.
4. Confirm `v2.4.26` does not already exist, then publish the GitHub Release with target `main`.
5. Wait for Windows and Linux builds and the release-asset job to pass.
