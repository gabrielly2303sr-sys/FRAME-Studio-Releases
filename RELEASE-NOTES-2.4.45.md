# FRAME Studio 2.4.45 — Inspector Hotfix

## Fixed
- Fixed the Inspector crash Uncaught TypeError: $(...).forEach is not a function.
- updateContextTabs() now uses the $$() helper for iterating the full set of Inspector tabs (.itab) and panels (.panel).
- Single-element lookups continue to use $(); collection iterations use $$().
- Added regression assertions to the workspace UI test.

## Retained from 2.4.44
- Realtime preview-canvas capture with project audio mixing.
- WebM output and MP4, MOV and MKV conversion.
- Frame-accurate MP4 fallback and Time Remap compatibility.
- Fullscreen viewer and wider playhead drag target.

## Validation
The 2.4.45 pull request must pass the Windows and Ubuntu regression workflows before the tag and release are created. See TEST-REPORT-2.4.45.md for the final CI result.