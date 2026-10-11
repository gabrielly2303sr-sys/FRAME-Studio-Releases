# FRAME Studio Changelog

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
