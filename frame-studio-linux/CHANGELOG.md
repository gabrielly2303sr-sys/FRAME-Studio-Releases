## 2.4.12 — 2026-10-11

- Added GitHub Releases update checks for installed Windows NSIS builds and Linux AppImage builds.
- Added background update downloads, progress reporting, restart/install prompts, quiet offline failure handling, and artifact hash verification through Electron Builder metadata.
- Added Linux AppImage, DEB, and RPM build targets; AppImage is the automatic-update channel.
- Added GitHub Actions workflow to build and attach platform packages when a Release is published.
- Preserved the portable Windows EXE as a manually updated option.

# FRAME Studio — Changelog

## 2.4.11 — 2026-10-11

- Added a dedicated Time Remap panel and moved the existing clip-speed controls into it.
- Added source-time keyframes, click-to-add and drag-to-edit interactions, plus Linear, Smooth/Bezier, and Hold interpolation.
- Added Slow In/Out, Speed Ramp, Fast Motion, Smooth Acceleration/Deceleration, Freeze Frame, Freeze at Playhead (one-second hold), Reverse, and Normal Speed presets.
- Added a duration override so a freeze at the playhead extends the timeline clip, and cleared that override when speed is edited or the curve is reset.
- Fixed source-rate handling for descending (reverse) and flat (freeze) curve sections. Live reverse/freeze preview uses frequent frame seeking; deterministic video export resolves source frames from the curve.
- Removed grouping controls and commands. When older projects are opened, group memberships are flattened into individual layers and legacy group transforms are retained as per-layer transform data where possible. Group alpha masks are not preserved by flattening.
- Set English as the default UI language and expanded English translations while retaining the option to switch back to Portuguese.
- Added an optional microphone noise-suppression toggle using WebRTC browser/OS audio-processing constraints when supported. This is platform-dependent and is not a reimplementation of Discord's proprietary noise suppression.
- Added Electron Builder configuration for Windows NSIS installer and portable EXE builds, plus Linux AppImage/deb targets.

### Known limitations

- Reverse/freeze scrubbing in the live preview is seek-based and may stutter depending on source codec and keyframe spacing.
- Exported source audio follows Time Remapping through segmented FFmpeg processing. Curved ramps are approximated with short segments; freeze holds output silence, reverse sections play audio backward, and pitch preservation during variable-speed retiming is not implemented yet.
- This package cannot include precompiled Windows EXEs from the current environment because the npm registry was unreachable. Run `BUILD-WINDOWS.bat` on a Windows PC with Node.js and internet access to generate the installer and portable EXE.
