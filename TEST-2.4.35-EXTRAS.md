# FRAME Studio 2.4.35 — Extras Test Kit

This is a beta test ZIP, not a production release. Test a duplicate project; do not overwrite your only copy of important work.

## 1. Smoke test the existing editor
1. Open the app and create a temporary project.
2. Import a normal video, an image, an audio file and text.
3. Scrub/play, change position/scale, save/reopen, and export a short MP4.
4. Check that the Community tab is gone and the camera preview/render does not include scene-editor grid or objects outside the camera frame.
5. Set appearance to RGB and then Background-adaptive RGB with a video/image background; check whether the accent transitions smoothly. Disable/enable Reduce motion to test preference behavior.

## 2. Test voice effects
Select an audio/video clip, open Audio properties, and choose Telephone, Radio, Echo or Robot under **Modificador de voz**. Export a short MP4 to check each effect. The effect is applied at export; preview playback remains original.

## 3. Test the OBJ/R6 workshop
1. Click **R6 de teste** in the left-side **Laboratório 3D · beta** panel.
2. Change the head/arm/leg sliders, move the playhead, and click **Keyframe pose R6 no cursor** at different times. Play/export a short sequence to check linear interpolation.
3. To test an OBJ, click **Importar OBJ** and choose `../examples/FRAME-OBJ-Test-Cube.obj` from the extracted archive. Select the model, click **Aplicar textura…** and choose `../examples/FRAME-OBJ-Test-Texture.png`.
4. Use the regular timeline transform controls to move, scale and rotate the model layer; use **Luz** in the workshop for basic face shading.

Supported: simple Wavefront OBJ vertices, face triangulation, negative vertex indices and UV (`vt`) coordinates. This prototype draws the mesh into a Canvas image layer; it is not a full 3D model editor. Keep OBJ/texture file paths stable when reopening projects.

## 4. Test audio-to-subtitles
This feature requires a **local compatible whisper.cpp `whisper-cli` executable**, a model file compatible with that build and FFmpeg. Neither the Whisper executable nor its model is included in the ZIP. In the subtitles panel choose the executable and model, select a local audio/video item and click **Gerar legendas da mídia selecionada**. The detected language must be English (`en`) or Portuguese (`pt`); Whisper generally does not identify country-level Portuguese dialect, so `pt` is not proof that the speaker is Brazilian.

Generated captions become regular text clips that can be edited and moved on the timeline. Longer audio may take some time to process.

## Current non-goals
GLB/GLTF/FBX, Roblox `.rbxm`/`.rbxmx`, automatic MTL parsing, full accessory/skeleton import, advanced PBR lighting, GPU 3D rendering and word-level karaoke subtitles are not included in this test package.

Run `npm test` before attempting a release build. Passing automated tests does not replace checking the interface, saving/reopening a project and exporting on your machine.
