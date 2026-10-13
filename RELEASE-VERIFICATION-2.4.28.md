# FRAME Studio 2.4.28 — Verification checklist

## Automated validation
From `frame-studio-linux`, run `npm test`. The suite includes `2.4.23-seek-and-library-delete.test.js`, which covers safe removal from the project media bin.

The full test command passed in the editing workspace, including export/ffprobe integration, byte-range seeking, customization, project compatibility assertions, and updater configuration.

## Manual GUI verification still required
1. Set the camera pivot to a non-zero XYZ point, orbit in every direction, and verify the camera keeps looking at the pivot. Export a frame to confirm the pivot marker is absent from rendered output.
2. Ctrl/Cmd-click multiple timeline clips, group/ungroup, resize left and right edges, and verify each selected clip changes; test undo/redo.
3. Change the accent to each mode. Set all three custom gradient colors and angle; restart to confirm persistence. Test adaptive color against an image, an animated GIF, and a background video, including saturation/lightness changes.
4. Place a video clip below a photo on a higher track. Play through the overlap and confirm the video audio continues. Also test two adjacent clips that reference the same video and seek across the cut.
5. Remove media from the project bin and verify that linked timeline clips disappear while the original file on disk remains.
6. Open/save an existing project and verify the project format remains compatible.
7. Confirm the package version and release tag both equal `2.4.28` before publishing. Run the real GitHub Actions release workflow and test update detection/installation on Windows NSIS and Linux AppImage packages.

## Release safety
The uploaded source ZIP was labelled `2.4.31` before editing. This workspace cannot read the live GitHub repository and therefore cannot prove that no newer commits exist on `main`. Merge/review these changes against the actual current branch before pushing. Publish only if `package.json` is `2.4.28` and the tag is `v2.4.28`, and only if that is newer than the latest published release your users have installed.
