# Publish FRAME Studio 2.4.43

1. Merge this branch into `main` only after pull-request CI passes on Windows and Ubuntu.
2. Confirm `frame-studio-linux/package.json` and both version fields in `package-lock.json` report `2.4.43`.
3. Confirm the UI title, visible version badge and home footer show `2.4.43`.
4. Confirm tag `v2.4.43` does not already exist.
5. Create and push annotated tag `v2.4.43` from the merged `main`.
6. Publish a GitHub Release using `RELEASE-NOTES-2.4.43.md`.
7. Verify the release workflow completes both platform jobs and the asset-attachment job.
8. Verify the expected Windows/Linux packages and updater metadata are attached before announcing availability.

Keep the existing 2.4.42 release and tag unchanged. Do not retag or overwrite a published release.
