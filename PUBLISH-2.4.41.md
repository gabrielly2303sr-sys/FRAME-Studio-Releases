# Publish FRAME Studio 2.4.41

This is a release-candidate source kit. The public GitHub Release has **not** been published by preparing this ZIP.

## 1. Import the source into the repository

1. Download/extract this ZIP.
2. Clone `https://github.com/gabrielly2303sr-sys/FRAME-Studio-Releases` (or use a clean checkout of the repository).
3. Update the checkout with `git pull --ff-only` and create a review branch:

   ```bash
   git switch -c release/2.4.41-hotfix3-workspace
   ```

4. Copy the contents of the extracted `FRAME-Studio-2.4.41-Release-Candidate/` directory into the repository root, preserving `.github/` and `frame-studio-linux/`. Do not copy a `.git` directory from any source package.
5. Review the diff. Confirm `frame-studio-linux/package.json` says `2.4.41`, the release workflow is present, and no user project files or secrets were added.
6. From `frame-studio-linux/`, install clean dependencies and run the checks:

   ```bash
   npm ci --no-audit --no-fund
   npm test
   node --check main.cjs
   node --check preload.cjs
   node --check media-export.cjs
   node --check video-preview-seek.js
   ```

7. Commit and push the review branch, then open and review a pull request into `main`:

   ```bash
   git add .
   git commit -m "Prepare FRAME Studio 2.4.41 release candidate"
   git push -u origin release/2.4.41-hotfix3-workspace
   ```

## 2. Publish the release

After the pull request is merged:

1. Confirm that `v2.4.41` does not already exist.
2. Create a GitHub Release with tag `v2.4.41` targeting `main`.
3. Use `RELEASE-NOTES-2.4.41.md` as the release description.
4. Publish the release. The existing `.github/workflows/release.yml` listens for `release.published` and builds/attaches the platform packages.
5. Confirm the Actions workflow succeeds and attaches:
   - Windows NSIS: `FRAME-Studio-2.4.41-Setup-x64.exe`, `.blockmap`, and `latest.yml`.
   - Linux: `FRAME-Studio-2.4.41-x86_64.AppImage`, `.deb`, `.rpm`, and `latest-linux.yml`.
6. Test update detection from an installed supported Windows NSIS build and Linux AppImage before announcing the release.

Do not reuse `v2.4.40`; it is already published. The package version and release tag must both be `2.4.41` so `electron-updater` sees the release as newer.

## 3. Important limitations of this candidate

The source test suite passed, but this source kit was not packaged into an AppImage/DEB/RPM/EXE here. The Electron GUI was not manually launched for visual testing, and no GitHub Actions run or public Release was created during preparation. Treat this as a release candidate until the packaged GUI and generated update metadata are verified.
