# FRAME Studio 2.4.24 — Release verification

## Build/test
```sh
cd frame-studio-linux
npm install --no-audit --no-fund
npm test
npm run build:linux:appimage
```
On Windows x64, run `npm install --no-audit --no-fund`, `npm test`, and `npm run build:win:installer`.

## Manual critical regression test
1. Import a long H.264 video that has keyframes several seconds apart.
2. Put it on the timeline and wait for the preview to show a frame.
3. Drag the playhead slowly forward, quickly forward, backwards, and across a clip boundary.
4. While playback is running, grab the playhead; playback should pause and the scrub should own the time position.
5. Release while a seek is still in progress; the final visible frame must settle to the release time.
6. Press Play; video and playhead must continue moving from the selected position.
7. Repeat with multiple video clips, split clips and time-remapped clips.

## Qualification
This source kit includes automated regression tests for the shared seek helper and verifies JavaScript syntax. A final Electron window / packaged AppImage has not been executed in this build environment; do not mark the release fully verified until the manual steps pass.
