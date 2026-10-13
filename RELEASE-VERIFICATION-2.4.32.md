# Release verification — FRAME Studio 2.4.32

## Automated checks performed in the source workspace

- `community.js` parses in Node and exports pure helper functions for testing.
- Preserved the 2.4.23 media-library removal regression test and its implementation so the previously reported Linux CI failure does not return.
- `package.json` version, app title, brand badge and update notes use 2.4.32.
- `build.files` includes `community.js`, `community.css`, and `community-config.js`.
- CSP permits HTTPS requests and avatar images only from standard `*.supabase.co` endpoints; scripts remain self-hosted.
- SQL defines RLS policies for profiles, friend requests, blocks, reports and avatar objects, plus RPC functions for friendship and block operations.
- The community works in a disabled/configuration-pending state when Supabase URL/key are blank; no fake global counts are shown.

## Must still be verified by the maintainer

1. Create/configure Supabase, run `frame-studio-linux/SUPABASE_SETUP.sql`, and place project URL plus publishable/anon key in `community-config.js`.
2. Run `npm install --no-audit --no-fund` and `npm test` from `frame-studio-linux`.
3. Test sign-up/email confirmation/login and recovery-email redirects, username uniqueness, avatar upload, member count, online heartbeat, friend requests, block/unblock and report submission with two independent accounts. A custom desktop deep-link callback for completing password reset is not implemented in this source kit.
4. Build Windows NSIS/portable and Linux AppImage/DEB/RPM via GitHub Actions; verify output bundles all community files.
5. Confirm tag `v2.4.32` matches `frame-studio-linux/package.json` before release. No GitHub release has been created by this source-kit generation.
