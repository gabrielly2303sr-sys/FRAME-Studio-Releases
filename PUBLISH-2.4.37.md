# Publish FRAME Studio 2.4.37

Run the following one-line Fish command **from your existing Git clone** after reviewing the diff and ensuring `npm test` passes. It commits the current changes, pushes the branch/tag, and publishes the GitHub Release that triggers the existing release workflow. A source ZIP itself has no `.git` history, so do not run it in the extracted ZIP.

```fish
git add -A; and git commit -m "Release FRAME Studio 2.4.37"; and git tag -a v2.4.37 -m "FRAME Studio 2.4.37"; and git push origin HEAD; and git push origin v2.4.37; and gh release create v2.4.37 --title "FRAME Studio 2.4.37" --notes-file frame-studio-linux/RELEASE-NOTES-2.4.37.md
```

This command assumes `gh auth login` has already been completed, and release tag `v2.4.37` does not already exist. If any command fails, Fish `and` prevents later publication commands from running.
