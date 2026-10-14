# FRAME Studio 2.4.36 — Source kit

This is the source package for FRAME Studio 2.4.36 with improved in-app update download progress feedback and consistent version labeling. It keeps the 2.4.35 experimental features in place.

## Test
1. Open `frame-studio-linux/`.
2. Run `npm install --no-audit --no-fund`.
3. Run `npm test`.
4. Run `npm start` to inspect the editor.

A source run does not perform automatic in-place self-updates. The updater progress panel can only be tested end-to-end in a packaged supported build (Windows NSIS or Linux AppImage) when a newer release is available.
