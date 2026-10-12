# FRAME Studio 2.4.21 — Automatic Bundled Tools

This source kit includes `frame-studio-linux/scripts/prepare-bundled-tools.cjs`. It automatically downloads and verifies platform-matched yt-dlp, FFmpeg and ffprobe for Windows x64 or Linux x64.

- `npm start`: attempts to prepare tools automatically; the editor still opens if a development download cannot complete.
- `npm run build:win:installer`, `npm run build:win:portable`, `npm run build:linux`, and `npm run build:linux:appimage`: prepare the tool bundle before packaging and fail rather than create a package without required tools.
- `install-linux.sh`: prepares/copies Linux tools into a source installation and retries automatically if they are missing.
- Official GitHub Actions builds download the platform binaries and explicitly verify they exist under `resources/downloader` before publishing the package artifacts.

The source ZIP intentionally contains only placeholders in `vendor/`. Binary files are not committed to Git; they are downloaded during startup/build and excluded by `frame-studio-linux/.gitignore`. The published installers/AppImage contain the actual executables.

Packaged builds do not fall back to globally installed FFmpeg/yt-dlp. If a package misses them, it shows a packaging error directing the user to reinstall the official build instead of asking them to install tools separately.

Before publishing `v2.4.21`, run `npm test`, push the source, then publish the matching GitHub Release. Confirm that Windows and Linux workflow jobs pass and inspect the output assets before distributing.
