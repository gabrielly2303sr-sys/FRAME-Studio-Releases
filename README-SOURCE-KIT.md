# FRAME Studio 2.4.35 Extras Test — Source kit

**Development/testing build only.** Do not publish this as a stable release until the added features have been tried inside Electron with real media.

## Included for testing
- Community tab and its Supabase integration removed from the app package.
- 3D scene editing grid stays in the scene editor instead of being drawn into the final camera render.
- RGB-adaptive accent color transitions smoothly when sampled colors from a video/image background change.
- Voice export effects: Telephone, Radio, Echo and Robot.
- Hardware H.264 encoder probing with an automatic software fallback; GPU support depends on the installed FFmpeg/driver/hardware.
- Beta OBJ import, manual texture assignment for UV-mapped OBJ, a built-in blocky R6 test rig, simple lighting and interpolated R6 pose keyframes.
- Optional local audio transcription via whisper.cpp, intended for English and Portuguese. The app and ZIP do **not** include `whisper-cli` or a speech model. Portuguese language detection does not distinguish Brazilian from European Portuguese dialects.

## Current limits
- OBJ support is a basic Canvas-rendered prototype, not a full 3D engine. GLB/GLTF/FBX, automatic MTL/material loading, Roblox `.rbxm`/`.rbxmx`, skeletal hierarchies, accessories, GPU 3D lighting and realistic shadows are not implemented.
- The OBJ model is rendered as a flat layer in the editor's camera composition. It supports position, scale and rotation using the existing timeline transform tools, but is not an editable native 3D scene object.
- Texture images and OBJ files are referenced by local paths. Keep those files in place when reopening a saved project.
- Whisper subtitles need a compatible local whisper.cpp executable, an English/Portuguese model and FFmpeg. Those components are not bundled.
- Voice effects are applied during export. Preview playback intentionally remains unchanged.

## Test on CachyOS / Linux
Inside `frame-studio-linux`, run:

```fish
npm install --no-audit --no-fund
npm test
npm start
```

To build an AppImage after interactive testing:

```fish
npm run build:linux:appimage
```

The archive is source code, not a precompiled AppImage.
