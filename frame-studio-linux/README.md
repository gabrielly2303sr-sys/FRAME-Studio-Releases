# FRAME Studio 2.4.28 — Camera Pivot, Multi-layer Resize & Accent Gradients

This is an incremental update to the existing FRAME Studio editor, not a rewrite. It retains the existing project format and code architecture. The uploaded ZIP was labelled 2.4.31 before these edits. This workspace cannot inspect the live GitHub repository, so it cannot verify that the ZIP includes every commit currently on the remote `main`. Compare/merge these changes with the current repository before publishing; do not overwrite newer fixes with this archive alone.

## Added
- Appearance accent modes: solid, a manually authored gradient with three color stops and angle, animated RGB cycle, and a background-adaptive gradient sampled from image/GIF/video with saturation and lightness controls.
- 3D camera pivot orbit now keeps the camera aimed at the target. The pivot dot is an editor-only preview gizmo and is not drawn into exported frames.
- Ctrl/Cmd-click multi-selection, group/ungroup, and resize of all selected timeline clips using the same edge drag; multi-layer transform-handle scaling remains supported.
- Time Remap Freeze Frame · Split: creates before, one-second frozen-frame, and after segments on the same track.
- End + join: trims a clip at the playhead and closes the following gap on that track.

## Compatibility and tests
No project schema migration is introduced. Camera pivot and appearance settings keep backward-compatible defaults, and the existing project/update configuration is retained. Automated compatibility and updater tests pass; packaged Windows/Linux auto-update still needs the actual release workflow and installed-app verification. Background sampling falls back safely if Chromium blocks pixel access to a selected media file.

Run from this directory:
```sh
npm install --no-audit --no-fund
npm test
```

Automated regression suite passes in this workspace. A packaged Electron GUI was not launched here, so verify the pivot, multiple-selection resize, appearance preview, and overlapping video audio in the actual app before distribution.

## Release
The package version is `2.4.28` and must be published with tag `v2.4.28`; keep the tag and `package.json` version identical for automatic updates. The GitHub Releases provider and updater metadata assets (`latest.yml` and `latest-linux.yml`) remain configured; they must be rebuilt through the real release workflow. Windows NSIS and Linux AppImage are the supported auto-update channels. Do not publish this archive over 2.4.30 without first merging any changes that exist only in that version.
