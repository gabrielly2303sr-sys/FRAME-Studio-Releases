# FRAME Studio 2.4.27 — Seek & Audio Reliability Update

### [FIXED]
- Updated release regression tests to follow the current semantic package version rather than expect 2.4.24.
- Made Media/Saved deletion regression test robust to Windows and Linux line endings and changes in function formatting.
- Retained the 2.4.26 fix for downloaded-video seeking and extracted-audio synchronization.

### [IMPROVED]
- Improved reliability of the Windows/Linux CI validation path without removing regression tests.
