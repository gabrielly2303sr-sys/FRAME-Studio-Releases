# FRAME Studio 2.4.45

Hotfix for an Inspector crash caused by iterating a single DOM element as though it were a collection.

## Fixed
- Inspector context-tab visibility now uses the multi-element selector helper for all .itab elements.
- Inspector panel enable/disable state now uses the multi-element selector helper for all .panel elements.
- Added a regression assertion so both collection iterations must use $$(), while $() remains reserved for one-element lookups.

The 2.4.44 realtime export, MP4/WebM/MOV/MKV containers, fullscreen viewer and playhead improvements are retained.

## Build and test
Run npm ci --no-audit --no-fund and npm test from frame-studio-linux/.

See RELEASE-NOTES-2.4.45.md, TEST-REPORT-2.4.45.md and PUBLISH-2.4.45.md.

Do not publish until cross-platform CI passes and release assets and updater manifests are verified.