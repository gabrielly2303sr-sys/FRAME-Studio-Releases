# FRAME Studio 2.4.36 — test checklist

- [ ] Top-bar version label and window title say `2.4.36`.
- [ ] Open Release Notes: it says version `2.4.36`.
- [ ] On a supported packaged build with `v2.4.36` published, open an older version, accept “Download update”, and check that the in-app progress panel appears.
- [ ] The percent changes during a real download and reaches 100% after `update-downloaded`.
- [ ] If download fails, the panel shows a failure message and the current version remains usable.
- [ ] Complete an ordinary edit/project save/reopen/export to ensure current workflows remain intact.
- [ ] Test RGB appearance and the experimental features separately; those are preserved from the previous source kit and still require manual GUI validation.

`npm test` validates syntax/regression logic and update UI wiring, but does not simulate an actual GitHub release download or verify every desktop compositor/driver.
