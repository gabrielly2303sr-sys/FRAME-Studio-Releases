# FRAME Studio 2.4.27 — Release Verification

## Build and test
Linux x64:
```sh
cd frame-studio-linux
npm install --no-audit --no-fund
npm test
npm run build:linux
```

Windows x64 (PowerShell):
```powershell
cd frame-studio-linux
npm install --no-audit --no-fund
npm test
npm run build:win:installer
```

Publish the Release with tag `v2.4.27` and target `main` only if that tag does not already exist. The uploaded source ZIP does not contain repository Git metadata, so tag availability must be checked in the user's local clone.

## Validation checklist
- [ ] All `npm test` checks pass in both Windows and Linux CI.
- [ ] The visible application title, badge, home footer, and package version show 2.4.27.
- [ ] Play a downloaded video, move the timeline playhead forward/backward repeatedly, then resume playback.
- [ ] Extract audio, confirm preview and export contain the extracted audio once, and verify undo restores the original state.
- [ ] In the Downloader, confirm bundled yt-dlp, FFmpeg and ffprobe pass their correct version commands.
- [ ] Extract the final AppImage and verify the real bundled tools; test the Windows installer on a machine without system FFmpeg/yt-dlp.
- [ ] Confirm the final assets are attached only after all build/verification jobs pass.

The source/test changes do not prove the final GUI behaves correctly. Test the generated installer and AppImage before announcing the release.
