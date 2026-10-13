# FRAME Studio 2.4.30 — Release Compatibility

This is an incremental release of the existing FRAME Studio editor, not a rewrite. It retains the existing project format and code architecture. This workspace could not inspect the live GitHub repository, so it cannot verify that the ZIP includes every commit currently on the remote `main`. Compare/merge with the current branch before publishing; do not overwrite newer fixes with this archive alone.

## 2.4.30 focus fixes
- MP4 export prefers available GPU H.264 encoders (Linux VAAPI, Windows NVENC/Quick Sync/AMF, macOS VideoToolbox) and safely falls back to `libx264` when the local FFmpeg build or driver cannot use them. Export status identifies the actual encoder. GPU encoding is a runtime capability, so verify the reported `GPU` label on the target machine.
- Timeline playhead scrubbing now coalesces seek/render work to animation frames and avoids an endless RAF redraw loop during video seeks.
- Group membership, transforms, group masks and collapsed/active group state survive project open, autosave recovery and undo/redo. Older projects with group IDs but no group table reconstruct a minimal group.

## Carried-forward features
- Appearance accent modes: solid, a manually authored gradient with three color stops and angle, animated RGB cycle, and a background-adaptive gradient sampled from image/GIF/video with saturation and lightness controls.
- 3D camera pivot orbit keeps the camera aimed at the target. The pivot dot is an editor-only preview gizmo and is not drawn into exported frames.
- Ctrl/Cmd-click multi-selection, group/ungroup, and resize of all selected timeline clips using the same edge drag; multi-layer transform-handle scaling remains supported.
- Time Remap Freeze Frame · Split and End + join timeline actions.

## Compatibility and tests
No project schema migration is introduced. Camera pivot and appearance settings keep backward-compatible defaults, and the existing project/update configuration is retained. Automated compatibility and updater tests pass; packaged Windows/Linux auto-update still needs the actual release workflow and installed-app verification. Background sampling falls back safely if Chromium blocks pixel access to a selected media file.

Run from this directory:
```sh
npm install --no-audit --no-fund
npm test
```

Automated regression tests cover encoder command construction, fallback exports, group persistence and playhead coalescing. A packaged Electron GUI and GPU driver were not available in this workspace, so confirm the export status reports GPU on target hardware and test grouping/scrubbing in the installed app before distribution.

## Release
The package version is `2.4.30` and must be published with tag `v2.4.30`; keep the tag and `package.json` version identical for automatic updates. The GitHub Releases provider and updater metadata assets (`latest.yml` and `latest-linux.yml`) remain configured; they must be rebuilt through the real release workflow. Windows NSIS and Linux AppImage are the supported auto-update channels. Before publishing, compare against the live default branch and confirm `v2.4.30` is newer than the latest published GitHub Release. The current source snapshot could not be checked against the live repository from this workspace.
