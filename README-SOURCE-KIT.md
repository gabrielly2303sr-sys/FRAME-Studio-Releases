# FRAME Studio 2.4.28 — Feature Update Source Kit

This archive updates the supplied FRAME Studio source in place; it is not a replacement editor or prototype. The release version, UI labels, automated version assertions, Linux installer fallback, and test entry point are aligned to `2.4.28`.

## Implemented fixes
- Camera orbit now rotates around the selected pivot and updates its look-at rotation; the pivot dot is an editor-only Scene Editor preview gizmo and is not part of rendered/exported frames.
- Ctrl/Cmd-click multi-selection is captured before timeline clip elements are recreated.
- Resizing a clip edge applies the same delta to all currently selected clips, with per-clip clamps and keyframe adjustment.
- Accent appearance supports a saved custom gradient, RGB cycle, and background-adaptive accent sampling from image/GIF/video backgrounds with saturation/lightness controls.
- Media synchronization chooses the most suitable active timeline clip if an asset is used by adjacent/overlapping clips and continues to sync any active video audio regardless of which visual layer is on top.
- Restored `removeAssetFromProject` and a visible media-bin removal action. It removes linked timeline clips, cleans media caches and temporary object URLs, persists autosave, and never deletes the original source file.

## Validation
Run `npm install --no-audit --no-fund` then `npm test` from `frame-studio-linux`. Automated checks cover syntax/logic/regressions; a full Electron GUI test and release CI build are still needed before publication.

## Release safety
Use tag `v2.4.28` only with package version `2.4.28`. This archive cannot inspect or merge commits that may exist on the remote repository; before pushing, compare it with the current `main` branch and keep any newer fixes. The GitHub release workflow builds the platform packages and upload metadata (`latest.yml` / `latest-linux.yml`) used by auto-update.
