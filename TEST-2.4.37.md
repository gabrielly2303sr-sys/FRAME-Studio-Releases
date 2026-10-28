# FRAME Studio 2.4.37 test checklist

Run `npm test` from `frame-studio-linux/`. In the app, verify the playhead auto-scrolls at either timeline edge, click a preview layer to select it, Ctrl/Cmd-select layers and scale together, trim end with both dropdown modes, inspect video audio controls, extract audio and confirm original audio is muted, rotate Y in the advanced 3D camera, open a grouped project, toggle Preferences > UI feedback/reduced motion, and export an MP4.

The new model import/R6 creation UI is intentionally absent. Check that a project containing older model data still opens correctly. Actual GPU encoding and automatic updates must be tested in packaged builds on the target hardware/platform.
