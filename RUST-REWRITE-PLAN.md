# FRAME Studio Rust rewrite — parity-first plan

## Status

This branch starts from the existing Electron 2.4.46 main branch. The Electron application remains the behavioral reference and must not be removed or modified as part of the initial Rust migration.

The uploaded `FRAME-Studio-2.4.47-preview.zip` is only a renderer overlay: it contains `index.html`, two tests and preview/build scripts. It does not contain the Electron host/backend, media services, package lock, bundled tools or the full test suite. Therefore it is not sufficient by itself to port all existing behavior into Rust.

## Non-negotiable parity rules

1. Preserve the existing renderer markup, CSS, layout, icons, text, keyboard shortcuts and interaction flows. Do not substitute a generic egui editor UI.
2. Preserve the existing project file format. Add explicit, versioned migrations only when necessary; opening and saving a legacy project must round-trip without losing unknown fields or media references.
3. Keep the Electron application buildable and runnable until the Rust build passes the parity gates.
4. No feature may be marked complete because a button or menu exists. It must work end-to-end.
5. Keep CPU fallback for GPU rendering and unsupported hardware. Never make GPU availability a requirement to open/edit/export a project.
6. Do not publish, tag, merge to main or replace the official Electron release until parity, project compatibility, integration tests and manual GUI checks pass.

## Proposed architecture

- `frame-app`: Rust desktop host and lifecycle, IPC boundary, dialogs, settings and recovery.
- `frame-project`: versioned project schema, serialization, validation and migration; unknown fields must be preserved.
- `frame-timeline`: tracks, clips, keyframes, interpolation, selection, snapping, undo/redo and deterministic time mapping.
- `frame-media`: media probing, audio extraction, waveform generation, proxy lifecycle, thumbnail/cache management and streaming reads.
- `frame-render`: render graph, layer ordering, transforms, masks, blending, effects and color pipeline. Use `wgpu` with a tested CPU fallback.
- `frame-export`: deterministic frame scheduling, audio/video synchronization, cancellation, progress, temporary files and FFmpeg integration.
- `frame-compat`: compatibility bridge for the current `window.frameAPI` contract while the renderer is migrated away from Electron.

The current renderer's desktop bridge includes media selection/URL/probing, project open/save, proxy generation, waveform generation, audio extraction/recording, YouTube tools/library, font management, export lifecycle/progress, path reveal and media existence checks. These operations must be inventoried from the exact Electron `preload.cjs` and `main.cjs` before implementation.

## GPU strategy

Use `wgpu` for texture upload, compositing, transforms, masks, blending and supported effects. Keep decoding, audio processing and encoding in dedicated media workers. Avoid copying full-resolution frames between CPU and GPU repeatedly. Profile frame upload, render passes, readback and memory bandwidth separately. Where FFmpeg remains the encoder, compare end-to-end export times rather than assuming a Rust wrapper makes encoding faster.

## Compatibility and test gates

- Unit tests for project schema, timeline time math, keyframe interpolation, track geometry, undo/redo, media range handling and render graph planning.
- Integration tests for open/save round-trip of real legacy project fixtures, relinking media, audio extraction, waveform/proxy generation, export cancellation and progress.
- Golden-frame tests comparing deterministic renders against the Electron reference on the same fixtures.
- GPU tests plus CPU fallback tests.
- Benchmarks using identical project files, source media, resolution, frame rate and export settings.
- Manual checks for every panel, control, shortcut, drag/drop path and save/recovery flow.
- CI must build and test Linux and Windows. AppImage is for local Linux validation first.

## Required next input

To implement behavior-preserving Rust replacements, the migration workspace needs the complete source tree from the exact 2.4.46 main branch (or a complete source archive), not just the 2.4.47 renderer overlay. In particular, the host, preload, media/export modules, bundled-tool preparation scripts, fixtures and tests are required.
