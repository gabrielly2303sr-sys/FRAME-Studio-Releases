## 2.4.27 — Seek & Audio Reliability Update

### [FIXED]
- Updated version regression coverage to validate semantic-version consistency instead of hard-coding an older release number.
- Made the Media/Saved library removal test independent of LF/CRLF line endings and more resilient to single-line or multi-line function formatting.
- Preserved the 2.4.26 downloaded-media seeking and extracted-audio synchronization fixes.

### [IMPROVED]
- Release validation tests can now be run against the bumped package version on both Windows and Linux without changing historical feature assertions.

## 2.4.26 — Downloaded Media Seek & Audio Fix
### [FIXED]
- Downloaded videos and extracted audio no longer jump back to the first frame (frozen, silent) when you seek or drag the playhead. Root cause: media loaded from a path was served through the custom `frame-media://` scheme, which Chromium does not treat as seekable (the 2.4.23 Range-header fix could not help, because the media stack never issued usable range seeks on that scheme). Path-based media now loads from a private loopback HTTP server (127.0.0.1, random port, per-session token, Host check, full 206/Content-Range support), the same transport Chromium seeks natively. Imported (blob) videos were not affected and are unchanged.
- Extracting audio from a video now detaches it: the video clip is silenced in preview, excluded from the exported audio mix and its waveform is hidden, so the sound lives only on the extracted audio layer (no doubled audio). Ctrl+Z restores the original state; extracting twice from the same clip is blocked.
### [ADDED]
- `media-server.cjs` and `tests/2.4.24-seek-http-and-detached-audio.test.js` (real HTTP Range, auth and detached-audio checks).

## 2.4.23
### [FIXED]
- The bundled media tools check no longer reports FFmpeg and ffprobe as failed when they are present and working. `videoDownloaderToolsStatus()` passed `--version` to every executable; FFmpeg and ffprobe require `-version` (FFmpeg 7 prints its banner for `--version` but exits nonzero). Each tool is now checked with its own argument: yt-dlp `--version`, FFmpeg `-version`, ffprobe `-version`.
- A tool is available only when its correct version command exits with status 0; stdout/stderr are preserved for diagnostics and stderr text alone never turns a successful exit into a failure.
- Packaged apps ignore `FRAME_FFMPEG_PATH`/`FRAME_FFPROBE_PATH` overrides, so the downloader, export and status check always use the same validated bundled executables.
### [IMPROVED]
- New shared helper `media-tools.cjs` is the single definition of version arguments, packaged path candidates and failure classification, used by the downloader status, export checks, the prepare script and the release verification script.
- Diagnostics distinguish: missing file, permission denied, incompatible executable, missing runtime library, invalid arguments, timeout, and a genuine nonzero exit.
- Release workflow runs the real bundled executables (correct per-tool arguments, exit codes enforced) inside the final Windows installer, AppImage, DEB and RPM before anything is published. Previously the Windows steps ignored native exit codes.
- Scrubbing the timeline playhead no longer leaves downloaded videos on a frozen frame. Seeks during a playhead drag are now serialized (a seek in flight is not cancelled by the next pointer move) and use accurate seeks instead of `fastSeek`, which snapped to distant keyframes of long-GOP downloads. Downloaded media are served by the `frame-media://` protocol with proper HTTP range support (206/Content-Range/Accept-Ranges/Content-Length/Content-Type) via the new `media-protocol.cjs`.
### [ADDED]
- Right-click a clip in the Media tab to delete it from the project (clips using it are removed too; Ctrl+Z restores it; the original file is untouched).
- Right-click a file in the Saved tab to delete it from the Downloaded Media library (confirmation, moved to the trash; project media that used it is flagged as missing).
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
