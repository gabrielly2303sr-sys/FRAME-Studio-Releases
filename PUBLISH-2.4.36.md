# FRAME Studio 2.4.36 — publish checklist

1. Confirm `frame-studio-linux/package.json` reports `2.4.36`.
2. Run `npm install --no-audit --no-fund` and `npm test` from `frame-studio-linux/`.
3. Open the app with `npm start`; confirm title and top-bar label show `2.4.36`.
4. Confirm the progress panel is wired to the updater events. A real percentage requires a packaged build that finds a newer GitHub release.
5. Commit and push the source to `main`.
6. Create/publish GitHub Release `v2.4.36` only after the source is pushed; the workflow validates tag/package version equality and uploads installable artifacts plus update metadata.
7. Verify Actions produced Windows NSIS, Linux AppImage, DEB/RPM and their expected metadata before announcing the release.

## Important
- The source ZIP itself is not an AppImage or Windows installer.
- In-place auto-update testing requires Windows NSIS or Linux AppImage. Linux DEB/RPM and Windows portable builds use their package/manual update route.
- Avoid publishing a duplicate tag if `v2.4.36` already exists.
