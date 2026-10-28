# FRAME Studio 2.4.40 — MP4 export reliability

This is a focused bug-fix release; it adds no editor features.

- Preserves lossless PNG frame intermediates when there is sufficient estimated disk headroom.
- Uses high-quality JPEG intermediates only when PNG staging is estimated to threaten disk headroom and the JPEG estimate fits. This reduces temporary disk use but can add a small amount of image loss before final H.264 encoding.
- Checks available space before frame rendering and monitors free space during staging; low-space cases return an explicit error instead of blindly continuing.
- Keeps 2.4.39 fixes for overlapping instances of the same source and exact edit boundaries.
- Repairs missing/invalid clip timing fields during legacy project migration without changing the project schema or rewriting valid timing ranges.
- Keeps hardware H.264 encoder attempts and CPU fallback.

## Validation status
Automated tests pass in the source environment, including a real FFmpeg H.264/AAC output tested by `ffprobe`. This does not prove success for every project, codec or GPU driver; testing with the affected user's project and packaged builds is still needed.
