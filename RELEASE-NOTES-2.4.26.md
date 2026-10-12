# FRAME Studio 2.4.26 — Downloaded Media Seek & Audio Fix

### [FIXED]
- Downloaded videos and extracted audio no longer rely on the custom non-seekable `frame-media://` scheme; path-based media now uses a private loopback HTTP server with byte-range support.
- Extracted audio is detached from its source video in preview/export to avoid doubled audio; undo restores the source state.
- Made the Media/Saved delete regression test resilient to both LF and CRLF source checkouts.
- Removed hard-coded `2.4.23` package-version assertions from historical regression tests; added a focused release-version consistency test.

### [IMPROVED]
- Added `.gitattributes` so source files are checked out with consistent line endings across Windows and Linux.

### [COMPATIBILITY]
- Existing project serialization is retained; imported Blob media continues to use its existing path and is not changed by the loopback transport.
