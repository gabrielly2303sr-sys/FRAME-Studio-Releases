# Third-party downloader tools

FRAME Studio packages platform-specific `yt-dlp` and FFmpeg executables inside Windows and Linux builds when the release workflow prepares these assets under `vendor/`.

- yt-dlp: https://github.com/yt-dlp/yt-dlp — project license and source are available from the upstream repository. Build workflow downloads the upstream standalone executable.
- FFmpeg: https://ffmpeg.org/ — FFmpeg is free software; the applicable license depends on the build configuration and linked components. Linux release workflow currently uses an upstream static build from https://johnvansickle.com/ffmpeg/; Windows workflow downloads an essentials build from https://www.gyan.dev/ffmpeg/builds/.

Downstream distributors should preserve this notice, the upstream license notices delivered by the respective binary providers, and any applicable source-code offer/license obligations. The binaries are retrieved at build time and are not committed to this source archive.
