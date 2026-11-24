# FRAME Studio 2.4.41 — Workspace & Editor Polish

## Based on the user-tested Hotfix 3 source

This release candidate uses the Hotfix 3 application source as its foundation. It does not replace that base with the 2.4.40 application tree. The package version advances to 2.4.41 so supported packaged installations can detect it as a newer update than 2.4.40.

## Added

- A visible opacity control for image, video, and text layers: slider, numeric value, and the existing opacity keyframe control.
- Drag-to-reorder workspace regions using the header grip on Library, Viewer, and Inspector. The arrangement is saved locally between sessions.
- A workspace reset control to restore the default panel order and sizes.

## Improved

- The Effects library is grouped into five top-level folders: Blur & Distortion, Light & Glow, Color & Correction, Texture & Style, and Motion & Camera.
- Effect search, favorites, applied-effects mode, effect identifiers, and effect parameter mappings are preserved.
- The existing Hotfix 3 fixes remain included: marquee selection, multi-clip movement constraints, group metadata schema protection, Electron-safe text dialogs, toast notification element, export profile publication, and automatic file reveal after a successful export.

## Workspace behavior

- Library, Viewer, and Inspector can be swapped by dragging their header grip onto another region.
- The Timeline remains in its established bottom dock and remains independently resizable. This keeps the tested timeline geometry stable in this release; full free-floating/detachable panels are not included yet.
- Workspace arrangement is stored locally and does not modify project files.

## Automatic updates and packages

The existing GitHub release workflow builds and attaches Windows NSIS Setup EXE, Linux AppImage, DEB and RPM packages, plus updater metadata. In-place automatic updates remain supported for the packaged Windows NSIS installer and Linux AppImage. Portable Windows, DEB/RPM, and source runs retain their existing update behavior.

A published GitHub Release with tag `v2.4.41` is required to trigger the repository's existing build-and-attach workflow.
