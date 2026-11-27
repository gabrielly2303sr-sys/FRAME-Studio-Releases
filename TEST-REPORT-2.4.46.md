# FRAME Studio 2.4.46 — test report

Verified here (Node 22 + real FFmpeg/ffprobe):
- Full `npm test` suite passes, including the new `tests/2.4.46-streaming-export.test.js`:
  raw-frame streaming to H.264/AAC, bad/missing/relative audio clips only produce warnings,
  reversed (time-remap) audio, `.part` file cleanup on abort/incomplete render, wrong-size frame rejected
  immediately, all-intra proxy (every packet a keyframe, scaled, offset by -ss).
- 1080p benchmark of the encoder alone on a 1-core sandbox: ~44 fps (veryfast), ~64 fps (ultrafast).
  Real speed depends on your CPU and on how fast the editor composites frames.
- JavaScript syntax of main/preload/stream-export and the inline renderer script.

NOT verified here (no display / Electron GUI in the build sandbox):
- The editor UI itself: proxy swap during playback, drag-swap of panels, a real project export.
- Please test before publishing: import a long-GOP video, scrub and play it reversed, swap Library/Inspector and
  click "Restore layout", then export a multi-clip project with audio and open the MP4.
- Diagnostics: after an export, DevTools -> `copy(JSON.stringify(window.lastExportProfile,null,2))`.
