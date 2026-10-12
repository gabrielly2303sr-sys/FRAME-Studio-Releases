# FRAME Studio 2.4.22 — Packaged Media Tools Fix

This corrective source kit addresses the recurring “official package is missing its bundled media tools” message reported from published AppImages.

### Why 2.4.21 was insufficient
- The Linux URL used the `yt-dlp` Python zipapp, which can fail on machines without a compatible Python runtime even though the file exists.
- CI verified the intermediate `linux-unpacked/resources/downloader` folder, but did not inspect and execute tools inside the final generated AppImage.
- The runtime showed only a generic error, hiding whether the file was absent or failed to execute.

### 2.4.22 fixes
- Linux CI and local preparation download the standalone `yt-dlp_linux` ELF asset.
- Runtime lookup searches supported Electron resource layouts.
- If a bundled Linux executable is present but loses its executable bit, FRAME copies that already-bundled file into its own user-data `runtime-tools` directory, sets the executable bit, and runs that copy. No system package manager is required.
- The Downloader panel surfaces actual tool path/reason diagnostics.
- GitHub Actions extracts the final AppImage, verifies the three tools exist and are executable inside it, and runs `--version` checks before uploading release artifacts.

The source ZIP has no native binaries; the release workflow fetches the platform artifacts and packs them into official installers/AppImages. Do not distribute a release until all build/publish jobs pass and the published AppImage has the expected version.
