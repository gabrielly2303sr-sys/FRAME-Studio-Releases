# FRAME Studio 2.4.17 — Performance & Export

## [IMPROVED]
- Timeline scrubbing enters a temporary low-resolution preview mode and re-renders the paused frame at full quality after releasing the playhead.
- Texture caching now has a byte-based memory cap and recency eviction.
- Turbulent Displace and Crumpled Paper use precomputed noise fields to cut redundant fractal-noise computation.
- Softened outer glow compositing and expanded glow padding to reduce hard cut-off edges.

## [FIXED]
- Scene Editor layer imagery now compensates for local texture Y orientation so clips are not rendered upside-down.

## [ADDED]
- MP4 export settings: 480p through 4K, 24–60 FPS presets, CRF or target bitrate, H.264 encoder speed, and AAC audio bitrate.
- Quick export profiles for draft, social, high quality, and 4K.

## Notes
- Electron remains Chromium/V8-based; TypeScript alone does not create a native executable or remove renderer cost.
- Automated tests pass after implementation; manual Electron GUI and final build validation remain required.

# FRAME Studio Changelog

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
