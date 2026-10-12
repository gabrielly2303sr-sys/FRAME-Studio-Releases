# FRAME Studio 2.4.22 — Packaged Media Tools Reliability

This release fixes the repeat “missing bundled media tools” issue in Linux AppImages. The Linux package now bundles the standalone `yt-dlp_linux` ELF executable rather than the Python zipapp, and the runtime can repair missing executable permissions by copying the already bundled binary into FRAME's app-owned cache. No `pacman`, Python package, or system-level FFmpeg/yt-dlp install is intended for the official package.

The release workflow validates both `linux-unpacked/resources/downloader` and the final extracted AppImage, then runs `--version` against yt-dlp, FFmpeg, and ffprobe before publishing. It also verifies that `latest-linux.yml` (and the Windows `latest.yml`) is generated with the installer assets.

Use the official installer/AppImage. Source development runs prepare tools under `vendor/<platform>`; those downloaded files are not committed to this source package.
