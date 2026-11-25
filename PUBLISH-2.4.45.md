# Publish FRAME Studio 2.4.45

1. Wait for the Windows and Ubuntu checks on PR #6 to pass.
2. Review the PR and confirm package.json, package-lock.json and visible HTML version labels report 2.4.45.
3. Merge PR #6 into main.
4. Confirm tag v2.4.45 does not already exist.
5. Create and publish the GitHub Release for v2.4.45 from main, using RELEASE-NOTES-2.4.45.md.
6. Wait for the release workflow to finish Windows and Linux packaging and asset attachment.
7. Verify the AppImage, DEB, RPM, Windows installers and updater manifests latest-linux.yml / latest.yml.
8. Smoke-test the packaged Linux AppImage, especially Inspector initialization and changing tabs.

Keep v2.4.44 and its published assets unchanged. Never retag an existing release.