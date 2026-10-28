# FRAME Studio 2.4.40

FRAME Studio is a compact, Linux-first video editor built with Electron. **The active application source and release build are in `frame-studio-linux/`**. The other top-level application files are a historical source snapshot and are not used by the current GitHub release workflow.

## This update

- Timeline edge auto-scroll while dragging the playhead, preview-to-timeline clip selection, improved multi-selection resizing, and a unified End-at-Playhead trim mode.
- Audio controls visible for video clips, audio extraction without duplicated source sound, and an advanced 3D Y-rotation correction.
- Optional lightweight UI feedback effects and reduced-motion setting; removed new OBJ/R6 creation/import controls while retaining legacy project-reading paths.
- Preview scheduling/canvas hints optimized conservatively. MP4 export tries supported hardware H.264 encoders and falls back to CPU encoding.

See [`RELEASE-NOTES-2.4.40.md`](RELEASE-NOTES-2.4.40.md), [`TEST-REPORT-2.4.40.md`](TEST-REPORT-2.4.40.md), and [`PUBLISH-2.4.40.md`](PUBLISH-2.4.40.md).

## Test and run

```bash
cd frame-studio-linux
npm install --no-audit --no-fund
npm test
npm start
```

Requires Node.js 22+ for the release workflow. MP4 integration tests require FFmpeg and ffprobe; the GitHub release workflow prepares platform tools and packages the Windows NSIS installer plus Linux AppImage/DEB/RPM.

## Publishing

The existing `.github/workflows/release.yml` workflow builds release artifacts when a matching GitHub Release is published. Its tag version must match `frame-studio-linux/package.json` (`2.4.40`). Update-in-place automatic updates remain supported for installed Windows NSIS and Linux AppImage builds; development/source runs and DEB/RPM packages keep their existing update path.
