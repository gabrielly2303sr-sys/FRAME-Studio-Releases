# FRAME Studio 2.4.27 preview verification

## Scope
- Local-only preview build; not released or signed.
- Version metadata changed to 2.4.27; update-provider and workflow configuration preserved.
- Camera pivot is rendered as SVG editor overlay only, not painted onto the export canvas.
- Video audio uses a dedicated audio element and is synchronized with sourceTimeAt / Time Remap in timeline playback.
- Multi-selection and multi-resize codepaths include per-clip undo/keyframe handling.
- Appearance gradient settings are stored in user preferences and are not inserted into project render properties.

## Validation to run locally
`npm test`

Then run `npm start` and manually verify: orbit around an object/target; Ctrl-click multiple clips; drag a resize handle on one selected clip and verify all selected clips change duration; switch accent modes and open the gradient picker; play a video with images/other videos layered on top and verify audio continues.

A GUI/Electron end-to-end run was not possible in the file-editing environment, so the visual playback test should be performed before the actual release.
