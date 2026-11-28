# FRAME Studio 2.4.47 — Release overlay

This ZIP is an **overlay for the exact `main` branch at 2.4.46**, not a complete source archive and not a Rust migration build. Apply it only to a clean clone of `gabrielly2303sr-sys/FRAME-Studio-Releases` whose `frame-studio-linux/package.json` is 2.4.46 and whose `frame-studio-linux/index.html` matches the SHA checked by `apply-release-2.4.47.sh`.

The overlay updates the renderer, package version/lockfile, release documentation and regression tests. It deliberately does **not** replace the Electron main process, preload, streaming exporter, media protocol/range handler, media tools, bundled-tool scripts, updater workflow, or platform build configuration. Those remain from the validated 2.4.46 repository base.

## Included editor features

- Direct playhead dragging, optional nearest-clip-edge cursor behavior, 12 available audio lanes, and extracted-audio mute state.
- Hue adjustment for images, videos and animated GIFs; keyframe copy/paste; keyframable Chroma Key/Colorize/text values; Chroma Key eyedropper.
- Text entrance presets, fullscreen preview, faster color-correction LUT path, improved video preload/seek presentation, recovery snapshots, and expanded Turbulent Displace bounds.
- Existing editor workflow features are retained in the renderer: RGB/background-adaptive/custom-gradient accent modes, numeric 3D camera orbit pivot, layer groups, Time Remap Freeze Frame split, and End + join.
- The 2.4.46 streaming-export implementation and 2.4.30 media byte-range backend remain supplied by the target repository base, because this overlay does not overwrite those files.

The regression audit compared renderer element IDs and named JavaScript functions against the available 2.4.27 preview and 2.4.30 source kits: none of those IDs or named functions are missing from this renderer. The new feature test and the 2.4.46 workspace UI regression test also pass in this audit environment.

## Apply and test

Extract this ZIP, then run the included script against a clean 2.4.46 clone:

```sh
bash /path/to/FRAME-Studio-2.4.47-release/apply-release-2.4.47.sh /path/to/FRAME-Studio-Releases
cd /path/to/FRAME-Studio-Releases/frame-studio-linux
npm ci
npm test
```

This ZIP is a **source patch**, not an AppImage or installer. Do not upload this ZIP as the auto-update asset. The GitHub Release workflow must build the Windows NSIS and Linux AppImage/DEB/RPM packages from the merged `v2.4.47` tag and attach the updater metadata.

## Validation limits

Automated source tests do not replace launching the packaged Electron app. Verify drag feel, audio playback/routing, eyedropper sampling, fullscreen, text animation, GIF/video scrubbing, and final MP4 output on real projects. Motion Blur remains a transform trail rather than true temporal frame blending. The reported inverted-shadow/missing-layer issue is not claimed fixed without the affected project and source media.

## Update metadata

Windows releases use the `latest.yml` metadata file generated alongside the release artifacts to support the updater. This metadata is produced by the release packaging workflow.

Linux releases use `latest-linux.yml` as updater metadata generated alongside the release artifacts.
