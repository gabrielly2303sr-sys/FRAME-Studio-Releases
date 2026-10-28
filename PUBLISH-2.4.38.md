# Publish FRAME Studio 2.4.38

The active application is `frame-studio-linux/`. Confirm that the source archive was extracted into your existing Git checkout, inspect `git diff`, and run `npm test` from that directory before tagging. Do not run this in a standalone ZIP extraction, and do not force-push.

From the Git checkout root, after confirming the remote is `gabrielly2303sr-sys/FRAME-Studio-Releases`, the branch is synchronized with `origin/main`, the working changes are only those intended for 2.4.38, and the tag does not exist, publish with:

```fish
git add frame-studio-linux; and git commit -m "Release FRAME Studio 2.4.38"; and git push origin main; and git tag -a v2.4.38 -m "FRAME Studio 2.4.38"; and git push origin v2.4.38; and gh release create v2.4.38 --repo gabrielly2303sr-sys/FRAME-Studio-Releases --title "FRAME Studio 2.4.38" --notes-file frame-studio-linux/RELEASE-NOTES-2.4.38.md
```

This requires authenticated `gh`, a clean/synchronized Git history, and no existing `v2.4.38` tag or release. Any failed command prevents the subsequent command after `and` from running. The release workflow is responsible for compiling and attaching Linux/Windows installers; successful source tests alone do not publish those artifacts.
