# FRAME Studio Changelog

## 2.4.30 — GPU export, responsive playhead and persistent groups

### [IMPROVED]
- MP4 export now detects supported FFmpeg hardware encoders and prefers GPU encoding when a compatible encoder/device is available: VAAPI on Linux, NVENC/Quick Sync/AMF on Windows, and VideoToolbox on macOS builds. Failed GPU attempts automatically fall back to `libx264` so exports still work on machines without a supported GPU path.
- The export status now reports the encoder actually used and whether it was hardware-accelerated.
- Timeline scrubbing batches media seeking and preview drawing to one animation frame, reducing repeated renderer work while dragging the playhead.
- Removed the recursive animation-frame redraw loop while videos are seeking; the decoder's `seeked`/data events drive the next refresh instead.

### [FIXED]
- Project loading, autosave restoration and undo snapshots no longer delete group membership, group transforms, masks, collapsed state or active group view. Older grouped projects missing the group table reconstruct a minimal group rather than losing the link.
- Added regressions for hardware encoder command construction, GPU upload filters, preview scrub coalescing and group persistence.

### [COMPATIBILITY]
- Preserved the existing project schema; projects from earlier 2.4.x versions do not require conversion.
- Windows NSIS and Linux AppImage remain the supported `electron-updater` channels. Older portable ZIP and DEB/RPM installs cannot be retroactively made auto-updating by a new release alone; they must first move to a supported installer channel.
- The CI workflow requires the release tag and `frame-studio-linux/package.json` to match exactly. Publish as `v2.4.30` only if that tag has not already been used for an existing public release; an already-published `2.4.30` must be followed by `2.4.31` for clients to recognize it as newer.

# FRAME Studio — Changelog

## 2.4.28 — Camera Pivot, Multi-select Resize, Accent Gradients & Audio Continuity

### [FIXED]
- Camera orbit now moves around the configured pivot and recomputes the camera look-at rotation, including when the pivot is offset from world origin.
- Added a small pivot marker to the Scene Editor preview overlay only. It is not composited into rendered/exported frames.
- Ctrl/Cmd-click multi-selection is handled before timeline clip nodes are rebuilt, fixing clicks being lost during re-render.
- Dragging a selected clip's timeline trim/duration edge applies the same delta to all selected clips and adjusts affected keyframes; undo restores the prior states.
- At adjacent split boundaries, preview/audio sync chooses the most recently started active clip for a shared media element instead of pausing on the outgoing clip. Video sound remains active when a photo or other visual layer covers it.

### [IMPROVED]
- Accent appearance now offers a custom three-stop gradient picker with angle control, solid color, animated RGB cycle, and background-adaptive RGB.
- Background-adaptive colors sample still images, animated GIFs, and video backgrounds periodically; saturation and lightness settings affect the adaptive gradient. Sampling failures fall back safely.
- Kept the existing project schema and updater configuration; the release tag and `package.json` version must both be `2.4.28`.

### [TESTING]
- Full automated suite passes, including export/ffprobe integration, media seeking, project compatibility assertions, customization, and updater configuration.
- Packaged Electron GUI testing and the actual release CI build remain necessary before broad distribution.

## 2.4.25 — Downloaded media seeking and updater reliability

### [FIXED]
- The `frame-media://` protocol now implements byte-range requests directly from the media file, returning valid `206 Partial Content`, `Content-Range`, `Accept-Ranges`, and exact `Content-Length` headers. This allows downloaded MP4/WebM/MOV videos and MP3/audio assets to seek without restarting from byte zero.
- Unsatisfiable byte ranges return `416 Range Not Satisfiable`; HEAD requests return the same range metadata without opening a file stream. Common audio/video/image MIME types are supplied explicitly.
- The media protocol no longer relies on forwarding a `Range` header through `net.fetch(file://...)`, which did not guarantee standards-compliant partial-content responses.

### [IMPROVED]
- Automatic update checks retry with exponential backoff when the GitHub release metadata or installer assets are not ready yet. A release published before CI finishes uploading `latest.yml` no longer makes the app wait up to six hours to retry.
- The release workflow now runs the complete regression suite on Windows and Linux before building release artifacts.
- The updater continues to use GitHub Releases and the existing Windows NSIS / Linux AppImage update channels; older project files and editing workflows are preserved.

### [TESTING]
- Added byte-range regression tests for full file reads, closed/open-ended ranges, suffix ranges, invalid ranges, HEAD requests, MIME type handling, and downloaded-video / MP3 payload bytes.
- Kept the existing timeline seek, media downloader, export, and editor regression tests in the package test command.
- A real packaged app still requires manual verification on Windows and Linux with downloaded MP4 and MP3 files; automated tests do not emulate the full Chromium media decoder.


## 2.4.24 — Critical video scrubbing fix

### [FIXED]
- Timeline scrubbing now pauses project playback so the playhead and video elements cannot compete for the timeline clock.
- Replaced approximate `fastSeek()` requests during dragging with coalesced `currentTime` seeks, keeping the latest requested playhead time.
- On pointer release, the active video is retargeted precisely and the preview is refreshed after the decoder settles.
- Video frame cache entries are invalidated for clips using the decoded asset so stale compositor textures cannot survive a completed seek.
- Video seek events now reconcile against the current playhead rather than completing against an outdated request.

### [TESTING]
- Added regression tests for latest-target seek coalescing, precise final seeks, seeks already in flight, and playback pausing when scrubbing.
- Packaged Electron GUI rendering must still be validated on a real install.
## 2.4.23
### [FIXED]
- The bundled media tools check no longer reports FFmpeg and ffprobe as failed when they are present and working. `videoDownloaderToolsStatus()` passed `--version` to every executable; FFmpeg and ffprobe require `-version` (FFmpeg 7 prints its banner for `--version` but exits nonzero). Each tool is now checked with its own argument: yt-dlp `--version`, FFmpeg `-version`, ffprobe `-version`.
- A tool is available only when its correct version command exits with status 0; stdout/stderr are preserved for diagnostics and stderr text alone never turns a successful exit into a failure.
- Packaged apps ignore `FRAME_FFMPEG_PATH`/`FRAME_FFPROBE_PATH` overrides, so the downloader, export and status check always use the same validated bundled executables.
### [IMPROVED]
- New shared helper `media-tools.cjs` is the single definition of version arguments, packaged path candidates and failure classification, used by the downloader status, export checks, the prepare script and the release verification script.
- Diagnostics distinguish: missing file, permission denied, incompatible executable, missing runtime library, invalid arguments, timeout, and a genuine nonzero exit.
- Release workflow runs the real bundled executables (correct per-tool arguments, exit codes enforced) inside the final Windows installer, AppImage, DEB and RPM before anything is published. Previously the Windows steps ignored native exit codes.
### [ADDED]
- `scripts/verify-bundled-tools.cjs` smoke test and `npm run verify:tools:linux` / `verify:tools:win`.
- Regression tests in `tests/2.4.23-media-tool-validation.test.js`.

## 2.4.22
### [FIXED]
- Linux now bundles standalone `yt-dlp_linux`, avoiding a hidden dependency on system Python.
- Packaged tool lookup is resilient to Electron/AppImage resource layout differences and missing Linux executable permissions.
- Downloader diagnostics show the actual tool path and execution failure reason.
### [IMPROVED]
- CI extracts the final AppImage and verifies yt-dlp, FFmpeg and ffprobe are present and executable before publishing.

## 2.4.21

### [FIXED]
- Packaged builds no longer silently fall back to globally installed FFmpeg/yt-dlp when bundled tools are missing; the UI now explains that the official package should include them.
- Local Linux source installs automatically prepare and copy the media tools instead of asking end users to install FFmpeg/yt-dlp manually.

### [ADDED]
- Automatic platform-specific yt-dlp, FFmpeg and ffprobe preparation before source startup and local builds.
- Validation of bundled tool execution and clearer packaged-build diagnostics.

### [COMPATIBILITY]
- Official NSIS/AppImage/DEB/RPM build workflows continue to package platform-matched binaries under `resources/downloader`.

## 2.4.20

### [FIXED]
- Double-clicking visible text in the preview prioritizes the selected active text layer and has a more forgiving nearest-layer fallback.
- Export and downloader tools are resolved from the packaged application resources before system fallbacks.

### [ADDED]
- Compact Undo and Redo buttons in the timeline toolbar.
- Hover tooltips with keyboard shortcut hints for timeline actions and commands; hints update when shortcuts are customized.

### [COMPATIBILITY]
- Official Windows and Linux release builds package yt-dlp, FFmpeg, and ffprobe into `resources/downloader` outside `app.asar`; end users do not need system package-manager installs when these bundled tools are present.
- Source development checkouts can use local `vendor/<platform>` tools or fall back to system tools.

---

# FRAME Studio Changelog

## 2.4.19

### [ADDED]
- Persistent Downloaded Media library under the OS-specific per-user application data directory, separate from project files.
- Nested media folders, folder navigation, folder creation, and a destination folder selector in the downloader.
- Drag downloaded media directly into the timeline or add it to the current project's Media bin.
- Bundled yt-dlp and FFmpeg for official Windows and Linux package builds.

### [IMPROVED]
- Downloader prefers the packaged platform executables, then falls back to system tools in developer builds.
- Downloads are saved directly into the selected library folder; intermediate download files use a temporary directory.

### [COMPATIBILITY]
- Windows NSIS and Linux AppImage/DEB/RPM builds prepare platform tools in CI before packaging.
- The library resides in Electron userData (AppData on Windows and app-specific user data on Linux), not Android's `/Android/data` location.
- Download only content you own or are explicitly allowed to save; no DRM/access-restriction bypass is provided.

---

## 2.4.18 — Live Preview & Downloader

## [FIXED]
- During timeline scrubbing, retain the last decoded video frame instead of leaving the viewer blank while a new seek is pending. Replace it with the latest decoded frame as soon as the media element is ready.
- Coalesce timeline preview redraws to a single requestAnimationFrame while dragging and retarget seeks to the latest playhead position.
- Keep an independent, bounded snapshot of the last decoded video frame so effects/transforms can still be composed during an in-flight seek.
- Text double-click in the preview selects the best matching active text layer and focuses its content field.
- Keep the easing graph controls inside the graph bounds and expose configurable controls for Bounce, Elastic, and Steps.

## [ADDED]
- YouTube downloader tab with MP4 or MP3 output, maximum resolution and FPS controls, progress, cancellation, and a save dialog.
- Explicit rights/permission confirmation before starting a download.

## [COMPATIBILITY]
- The downloader invokes system-installed `yt-dlp` and `ffmpeg`; it does not bundle those tools.
- The downloader does not add cookie, login, DRM bypass, or access-restriction circumvention options. Download only content you own or have explicit permission/a license to save.

## Notes
- Continuous video scrubbing uses the last decoded frame while the next seek is in flight; an exact frame appears when decoding completes. This is a responsive preview strategy, not a guarantee that every intermediate frame can be decoded at display refresh rate.
- Manual testing in a packaged Electron window remains required for codec-specific seeking, the downloader, and the full update flow.

## 2.4.16

### [FIXED]
- Animated GIFs are decoded into timed frames so playback, timeline preview, and frame rendering can use the correct animation frame.
- Corrected the Scene Editor camera basis used for projected scene coordinates.
- Selecting an effect now scrolls its property into view and briefly highlights the target control.

### [ADDED]
- Turbulent Displace and Crumpled Paper image effects.
- Overshoot, Bounce, Elastic, and configurable Steps interpolation curves.
- Step curve controls for the number of steps and jump position.

### [IMPROVED]
- Effect categories separate blur types and glow types; Pixelate Blur uses larger nearest-neighbor blocks, and Inner Glow boosts the source image's existing colors.
- GIF decoder now limits total decoded pixel storage to help prevent excessive memory usage.
- Updated app title/version and categorized changelog for this release.

### [REMOVED]
- Experimental GLB/glTF model-import UI and runtime were removed because the current Scene Editor cannot treat imported meshes as native shared-scene geometry. Legacy projects that reference those assets show missing/unsupported media instead of pretending the models are usable.

### [COMPATIBILITY]
- Existing project schema remains compatible; unknown/legacy effects and assets are not destructively rewritten.
- GIF decoding stores full composited frames; very large animations may be rejected with an explanatory message to protect memory.

## 2.4.15

### [ADDED]
- Searchable effect browser grouped by category, with favorites and applied-effect overview.
- Edge Blur, Inner Glow, Pixelate Blur, and Directional Blur in the Canvas compositor.
- Camera Preview overlay and deterministic camera shake controls.
- GLB asset import using Three.js, including embedded materials and textures; animation playback is rendered as a layer.

### [FIXED]
- Linux build uses the project-pinned Electron Builder version and removes the invalid `linux.desktop` option that caused schema validation to fail.

### [IMPROVED]
- Continuous frame-independent WASD/QE camera navigation with Shift speed modifier.
- Release workflow calls local npm scripts so it uses the installed builder version consistently.

### [COMPATIBILITY]
- Existing system font discovery and existing project properties are preserved.
- GLB import renders as a textured animated layer in the current 2.5D compositor; it is not native global-camera mesh geometry. OBJ/MTL and physically based material equivalence remain unsupported.
- Camera motion blur remains a screen-space temporal smear, not a velocity-buffer solution.

## 2.4.14

### 🐛 Corrigido
- Fixed a timeline drag-and-drop issue where media and text clips could remain attached to the pointer near the top edge of the timeline.

### ✨ Adicionado
- Discovery of system-installed fonts on supported desktop systems.
- WASD/QE camera movement shortcuts for the selected camera in Scene Editor.

### ⚡ Melhorado
- Timeline drag-and-drop handling and release-note categories.


### [FIXED]
- Linux now bundles standalone `yt-dlp_linux`, avoiding a hidden dependency on system Python.
- Tool lookup is more resilient to AppImage/resource layout differences and missing executable permissions.
- The downloader shows the specific tool path/reason when execution fails instead of only a generic missing-tools message.
### [IMPROVED]
- CI extracts and validates media tools inside the final AppImage before publishing.
