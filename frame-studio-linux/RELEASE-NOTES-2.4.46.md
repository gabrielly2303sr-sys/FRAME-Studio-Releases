# FRAME Studio 2.4.46

See CHANGELOG.md. Summary: streaming export (raw frames -> FFmpeg), audio fallback instead of failing,
never deleting a finished MP4, per-frame seek retries, all-intra preview/export proxies for instant seeking
and fast reverse, fixed workspace reset/swap bugs.

Run `npm test` (needs ffmpeg/ffprobe) before building. Build: `npm run build:linux:appimage`.
