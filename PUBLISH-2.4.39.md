# Publish FRAME Studio 2.4.39

Active app source: `frame-studio-linux/`. This source package has not been published by this task. Before release, use an existing Git checkout that is synchronized with `origin/main`, review the diff, and verify that `v2.4.39` does not exist.

Run tests from `frame-studio-linux/`:

```fish
npm test
```

Then from the repository root, after checking `git status` and reviewing the staged changes, publish using your normal repository workflow. Do not force-push or overwrite an existing tag. GitHub Actions must finish successfully and the release must contain the built installers before telling users to update.

See `RELEASE-NOTES-2.4.39.md` and `TEST-REPORT-2.4.39.md` for changes and validation scope.
