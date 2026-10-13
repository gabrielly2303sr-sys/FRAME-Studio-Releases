# Test package only — FRAME Studio 2.4.35 Extras

**Do not publish yet.** This build contains beta features that must be interactively validated first.

1. Enter `frame-studio-linux`.
2. Run `npm install --no-audit --no-fund`.
3. Run `npm test` and stop if any test fails.
4. Run `npm start` and follow `TEST-2.4.35-EXTRAS.md`.
5. Only after visual testing, rebuild with `npm run build:linux:appimage`.

The `examples` folder in the parent source-kit directory contains a UV-mapped OBJ test cube and a texture image.
