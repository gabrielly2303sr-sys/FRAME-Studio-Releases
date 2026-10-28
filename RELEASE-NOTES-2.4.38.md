# FRAME Studio 2.4.38 — Background media, groups, and timeline duration fixes

## Fixed
- Restored MP4/video and animated GIF background selection by inferring media kind from the file extension when saved settings contain an outdated kind. GIFs remain image elements; video backgrounds are muted, looping inline videos with a playback retry after media readiness. Temporary media existence checks no longer erase saved background paths.
- Fixed group migration so valid native layer groups survive project open and autosave restore even when optional `maskClipId` is absent. Versionless group data is preserved conservatively; older versioned transform-only group metadata is still migrated to per-clip legacy transforms.
- Resizing a clip edge while multiple clips are selected now applies the same timeline delta to every selected clip, calculating each clip's result from its own start/source range/duration. Keyframes are adjusted per clip and pointer-cancel restores the pre-drag state. Ctrl/Cmd on a collapsed group no longer collapses its selection to the representative clip.

## Quality and compatibility
- Added regression tests for video/GIF background detection, non-destructive path checks, group migration, and multi-clip duration/trim resizing.
- Project format and updater configuration remain unchanged.
- Update target is version `2.4.38`; run the full regression suite and packaged application smoke test before publishing.

## Notes
Hardware export speed and codec support remain dependent on the user's GPU, drivers, and encoder availability; this release does not promise a fixed speed increase on every PC.
