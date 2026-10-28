# Publish FRAME Studio 2.4.40

This file gives safe release steps; the GitHub release has **not** been published by this source-package preparation.

1. Start from a clean checkout of `gabrielly2303sr-sys/FRAME-Studio-Releases` and inspect `git status`. Do not continue in a checkout with unresolved merge/rebase conflicts.
2. Copy the active-app changes from `frame-studio-linux/` and the root release notes/report into that checkout. `frame-studio-linux/` is the active source used by the release workflow; the top-level legacy app files are not the active build target.
3. Run:

   ```bash
   cd frame-studio-linux
   npm ci --no-audit --no-fund
   npm test
   node --check main.cjs
   node --check media-export.cjs
   node --check preload.cjs
   ```

4. Check that `frame-studio-linux/package.json` and its lockfile both say `2.4.40` and that the in-app title/version show `2.4.40`.
5. Review changes, commit them, and push the normal branch. Do not use `git push --force` to work around rejected pushes or conflicts.
6. Before tagging, verify that `v2.4.40` does not already exist. If it is unused and the commit is on the intended release branch, create/push the tag and publish a GitHub Release using the repo's existing release workflow.
7. Test the packaged output and the project that previously failed MP4 export before announcing the release broadly.

Automatic in-place update support remains limited to the existing packaged formats described in `frame-studio-linux/README.md`. Do not publish this source ZIP as an installer.
