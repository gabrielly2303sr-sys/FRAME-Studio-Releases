# FRAME Studio 2.4.33

FRAME ID & Community is optional and requires configuring `community-config.js` and running `SUPABASE_SETUP.sql`. See `../README-COMMUNITY-2.4.33.md`. The app remains usable offline without an account.

# FRAME Studio 2.4.31 — Appearance, Camera Pivot & Timeline Workflow

This is an incremental update to the existing FRAME Studio editor, not a rewrite. It retains the existing project format and code architecture. The source archive available for this update was based on the 2.4.25 source kit; changes that may exist only in remote releases 2.4.26–2.4.30 were not available in this workspace and should be merged from the actual 2.4.30 source before replacing the latest release.

## Added
- Appearance accent modes: solid color, animated RGB gradient, and background-adaptive RGB gradient, with saturation, lightness, and speed controls. Background palette sampling falls back safely when an image/video cannot be sampled by the browser.
- Optional 3D camera look-at pivot, numeric XYZ controls, pivot-at-selected-layer, and orbit navigation around the pivot.
- Group/ungroup and enter/exit group controls; effect-library selections apply to selected layers, and transform-handle resizing scales multiple selected layers together.
- Time Remap Freeze Frame · Split: creates before, one-second frozen-frame, and after segments on the same track.
- End + join: trims a clip at the playhead and closes the following gap on that track.

## Compatibility and tests
Older project files remain readable. The added camera pivot fields default when absent. Background-adaptive accent color depends on whether the Electron/Chromium canvas can sample the selected background media.

Run from this directory:
```sh
npm install --no-audit --no-fund
npm test
```

Automated regression tests pass in this source workspace. A packaged Electron GUI was not launched here, so verify the appearance controls, camera pivot/orbit, multi-layer effects/resizing, freeze split, and end-and-join operation in the actual app before treating the update as fully validated.

## Release
The package version is `2.4.31` and should be published with tag `v2.4.31`. The GitHub Releases provider and updater metadata assets (`latest.yml` and `latest-linux.yml`) remain configured; they must be rebuilt through the real release workflow. Windows NSIS and Linux AppImage are the supported auto-update channels. Do not publish this archive over 2.4.30 without first merging any changes that exist only in that version.
