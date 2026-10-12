# FRAME Studio 2.4.23 — Release verification

## Build commands
Linux (AppImage, DEB, RPM) — run on Linux x64:
    cd frame-studio-linux
    npm install --no-audit --no-fund
    npm run prepare:tools          # downloads yt-dlp_linux (ELF), static FFmpeg/ffprobe into vendor/linux
    npm run verify:tools:linux     # runs the REAL tools with their own version flags
    npm test
    npm run build:linux            # or: npm run build:linux:appimage

Windows (NSIS installer + portable) — run on Windows x64:
    cd frame-studio-linux
    npm install --no-audit --no-fund
    npm run prepare:tools          # yt-dlp.exe, ffmpeg.exe, ffprobe.exe and DLLs into vendor\win
    npm run verify:tools:win
    node tests/2.4.23-media-tool-validation.test.js
    npm run build:win:installer    # or: npm run build:win

Official release: tag `v2.4.23` and publish a GitHub Release; `.github/workflows/release.yml` builds and verifies.
(The tag must not already exist. This could not be checked from the uploaded ZIP, which has no git metadata.)

## Final AppImage checklist
1. `chmod +x FRAME-Studio-2.4.23-x64.AppImage && ./FRAME-Studio-2.4.23-x64.AppImage`
2. Version tag in the UI header / release notes shows 2.4.23.
3. Open the Downloader panel: it must say yt-dlp, FFmpeg and ffprobe are available, "Bundled in official application resources", and must NOT show "Bundled media tools could not start".
4. On a machine WITHOUT system ffmpeg/yt-dlp (`which ffmpeg yt-dlp` prints nothing; or a clean container/VM): repeat step 3.
5. `./FRAME-Studio-2.4.23-x64.AppImage --appimage-extract` then
   `node scripts/verify-bundled-tools.cjs squashfs-root/resources/downloader --platform linux` exits 0.
6. Download one short permitted clip as MP4 and as MP3; export a short project to MP4. Both use the bundled FFmpeg.
7. Rename/hide `resources/downloader/ffprobe` in the extracted tree and launch it: the panel must report `missing-file` for ffprobe, not a generic failure.

## Final Windows installer checklist
1. Run `FRAME-Studio-2.4.23-Setup-x64.exe`, install, launch.
2. Header shows 2.4.23; Downloader panel reports all three tools available (no "could not start").
3. `node scripts/verify-bundled-tools.cjs "<install dir>\resources\downloader" --platform win32` exits 0.
4. `<install dir>\resources\downloader` contains yt-dlp.exe, ffmpeg.exe, ffprobe.exe and any FFmpeg DLLs.
5. Test on a Windows machine without FFmpeg/yt-dlp installed or on PATH.
6. Download a clip and export a project.
7. Check the Portable build the same way.
