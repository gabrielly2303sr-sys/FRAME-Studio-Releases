# FRAME Studio 2.4.40 — MP4 export stability and backwards compatibility

## Focus of this release
This is a bug-fix-only release. It adds no editor features.

### MP4 export
- Retains lossless PNG frame staging when the available-space estimate leaves a safety reserve.
- When PNG staging is estimated to consume too much of the available disk space, uses high-quality JPEG intermediates if that estimated footprint fits the reserve. The final file is still encoded by the existing H.264 MP4 pipeline; the intermediate JPEG path is a storage fallback and can introduce a small amount of additional image loss.
- Checks disk headroom before starting a frame export and monitors temporary storage while frames are written. When the safety reserve is exhausted, export fails with an explicit message and the normal cancellation/cleanup path can remove temporary frames.
- Keeps the 2.4.39 fixes for separate snapshots of overlapping instances of the same source, deterministic cut boundaries, and frame/timestamp error messages.
- Preserves supported hardware H.264 encoder attempts and CPU `libx264` fallback. Encoder availability remains dependent on the packaged FFmpeg build, operating system, GPU and driver.

### Older project compatibility
- Adds a conservative migration for clips with missing/invalid `start`, `inPoint`, `outPoint`, or `speed` values.
- Does not change the saved project schema or rewrite valid timing ranges.
- Does not remove existing assets, groups, effects or legacy 3D data as part of this fix.

### Validation and limitations
- `npm test` passes in the source environment, including the FFmpeg/ffprobe MP4 integration suite and the new 2.4.40 regression tests.
- JavaScript syntax checks pass for the edited main-process files.
- This source-only validation is not a guarantee that every media file/project/encoder combination will export successfully. Packaged Electron testing on target hardware and testing the user's failing project are still required.
