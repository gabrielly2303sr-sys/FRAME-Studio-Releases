# FRAME Studio 2.4.43 — Test Report

## Regression checks added

- Rebuilt playhead nodes must receive the pointer-drag handler when created.
- The old one-time binding to the initial playhead DOM node is rejected.
- Video clips must expose the Audio inspector tab and enable the corresponding Audio panel.
- Application title, version badge and home footer must match the package version. The existing release-version test is now part of `npm test`.

## Validation status

- Source changes and regression assertions are committed to the hotfix branch.
- Automated cross-platform CI is pending the pull request.
- Manual verification in the packaged Electron application is still required for pointer dragging after several timeline redraws, video clip selection, volume changes, fades and audio playback.

Do not treat this report as proof that CI or manual packaged-app verification has passed. Publish only after the PR checks pass and all release assets and updater metadata are attached.
