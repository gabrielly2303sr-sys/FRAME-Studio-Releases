# Publish FRAME Studio 2.4.44

1. Wait for pull-request CI on Windows and Ubuntu to pass.
2. Review the full PR diff and verify package.json, package-lock.json, the HTML title, version badge and home footer all report 2.4.44.
3. Merge into main only after the checks pass.
4. Confirm tag v2.4.44 does not already exist.
5. Create and push an annotated v2.4.44 tag from the merged main.
6. Publish a GitHub Release using RELEASE-NOTES-2.4.44.md.
7. Verify the release workflow completes Windows and Linux packaging and the asset-attachment job.
8. Check the release contains Windows NSIS setup, portable package and updater metadata, plus Linux AppImage, DEB, RPM and latest-linux.yml.
9. Manually smoke-test the packaged Linux AppImage and Windows NSIS build before announcing the release.

Keep the published 2.4.42 tag and assets unchanged. Do not retag an existing release.