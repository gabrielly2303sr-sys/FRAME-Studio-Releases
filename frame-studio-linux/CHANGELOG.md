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
