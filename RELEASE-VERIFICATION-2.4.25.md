# FRAME Studio 2.4.25 — Release Verification

## Source checks completed
- `npm test` passed in the source-kit check environment on Node.js 22.16.0, including the 2.4.25 HTTP-range and detached-audio regression test.
- These are automated source tests. A graphical Electron session and final Windows/Linux packages have not been manually tested here.

## Expected release build
The GitHub Actions workflow builds and checks the Windows NSIS installer and Linux AppImage, DEB, and RPM, with platform-specific yt-dlp/FFmpeg/ffprobe binaries bundled into application resources.

## Rebuilding an existing v2.4.25 tag
This repository previously used the `v2.4.25` tag. Do not try to create another release with the same tag. After merging these source changes into `main`, the tag must point at the corrected commit, then the workflow can be run manually:

```bash
# From the repository root, after committing and pushing the corrected source:
git tag -f v2.4.25 main
git push --force origin refs/tags/v2.4.25
gh workflow run release.yml --ref v2.4.25
```

The workflow now accepts `workflow_dispatch` and resolves the release tag from the selected ref. Force-pushing a tag changes which commit that tag identifies; only do this intentionally for the existing failed/incomplete 2.4.25 release. The manual workflow run must finish successfully before distributing the generated assets.

To update the existing release title and notes after the workflow is configured:

```bash
gh release edit v2.4.25 --title "FRAME Studio 2.4.25 — Video Seek & Extracted Audio Fix" --notes-file RELEASE-NOTES-2.4.25.md
```

## Final package smoke test

### Linux
1. Install/run the generated AppImage (or install the DEB/RPM on a compatible distro).
2. In the downloader, download a permitted short video; add it to the timeline.
3. Play from the start, drag the playhead well past the first frame, and verify the image and audio continue from the sought position.
4. Extract audio from that video. Confirm the video clip is silent, the audio layer plays once, and export contains no duplicated source audio.
5. Reopen the app and a saved project to check for regressions.

### Windows
1. Install the generated NSIS installer and launch FRAME Studio.
2. Repeat the download, timeline-seeking, extracted-audio, and export checks above.
3. Confirm the app version reads 2.4.25 and auto-update metadata (`latest.yml`) is present in the release assets.

Do not mark the release fully verified until both GitHub Actions jobs pass and the packaged-app checks are complete.
