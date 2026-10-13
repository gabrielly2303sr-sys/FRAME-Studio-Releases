# FRAME Studio 2.4.32 — CI regression fix

The release workflow now adds the downloaded platform-specific FFmpeg/ffprobe folder to PATH and sets FRAME_FFMPEG_PATH and FRAME_FFPROBE_PATH before the regression suite runs. This matters because tests such as `audio-tools.test.js` and `export-integration.js` invoke `ffmpeg`/`ffprobe` directly, while the workflow downloads those tools into `vendor/win` or `vendor/linux`.

The workflow also uses `actions/checkout@v5` and `actions/setup-node@v5` to avoid the Node 20 runtime deprecation warnings shown by the v4 actions. The warning itself was not an npm test failure.

Validation in this environment: `npm test` passed on the packaged source tree. The GitHub-hosted Windows and Linux jobs still need to be rerun to verify runner-specific behavior.
