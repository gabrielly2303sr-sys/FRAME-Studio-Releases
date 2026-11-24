# Publish FRAME Studio 2.4.42

1. Merge this release branch into `main` only after the pull-request CI passes on Windows and Ubuntu.
2. Confirm `frame-studio-linux/package.json` and `package-lock.json` both report `2.4.42`.
3. Confirm `v2.4.42` does not already exist.
4. Create and push annotated tag `v2.4.42` from the merged `main`.
5. Create a GitHub Release using this tag and `RELEASE-NOTES-2.4.42.md`.
6. Wait for `.github/workflows/release.yml` to finish both platform build jobs and the `Attach installers to the GitHub Release` job.
7. Verify the release contains:
   - Windows NSIS Setup EXE, `.blockmap`, and `latest.yml`.
   - Linux `.AppImage`, `.deb`, `.rpm`, and `latest-linux.yml`.
8. Only after those assets exist should the release be announced as available for automatic update.

Supported in-place update targets are Windows NSIS installations and Linux AppImage installations. Portable Windows and DEB/RPM installations do not use the same in-place updater path.

Do not reuse the already-published `v2.4.41` tag.