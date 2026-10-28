# FRAME Studio 2.4.38 — Test record

Automated verification run from the active app directory `frame-studio-linux/` in the provided build container.

- `npm test`: passed, including smoke, UI interaction, customization, timeline, group persistence, time remapping, export integration, updater configuration, media tool, and 2.4.38 focused regression tests.
- Export integration created deterministic sample videos and verified their frame rate, duration, codecs, audio presence/absence, progress, missing-tool behavior, corrupt-input behavior, and cancellation via `ffprobe`.
- JavaScript syntax validation for the inline renderer and relevant CommonJS files passed through the smoke suite.
- Focused 2.4.38 checks passed for MP4/GIF background-kind inference, non-destructive saved path handling, current group preservation, legacy group transform migration, and applying one common timeline delta across selected clips with independent baselines.

This is automated source-level verification. It does not replace a graphical manual check of the packaged Electron app, nor prove hardware-specific export speed or end-to-end updater behavior.
