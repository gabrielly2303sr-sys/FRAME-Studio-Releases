# FRAME Studio 2.4.33 — FRAME ID & Community

This source kit adds an optional social system to the existing Electron editor. It does not replace project storage or require signing in to edit/export.

## Features

- Supabase Auth e-mail sign-up/sign-in, email-confirmation-aware onboarding, a password-recovery email request, persistent session refresh, and logout.
- Public profile: avatar (PNG/JPEG/WebP/GIF, maximum 2 MB), display name, unique `@username`, bio (160 characters), and optional pronouns.
- Community directory with member count, recent profile pagination, name/username search, online counter and 45-second last-seen heartbeat. A profile is marked offline after 2 minutes without a heartbeat.
- Friend requests, accepting/declining, friends list, removing friends, blocks/unblocks, and profile reports.
- User e-mail is not returned by the public profile queries or rendered in public cards.

## Configure the community backend

1. Create a Supabase project.
2. In the Supabase SQL Editor, run `frame-studio-linux/SUPABASE_SETUP.sql` in its entirety.
3. Open `frame-studio-linux/community-config.js` and fill in `supabaseUrl` and `supabaseAnonKey` with your project's HTTPS URL and publishable/anon client key.
4. Never use or commit a Supabase `service_role` key. Client keys are public by design; row-level security (RLS) is what protects the data.
5. Confirm email settings, recovery templates, redirect allow-list and SMTP behavior in Supabase Auth before opening public registration. Use a verified sender address in production.
6. Build both platforms after the configuration is filled in. Everyone using the same build will connect to the same community project.

If configuration is left blank, Community explains how to set it up and shows no fake member counts. The editor, projects, preview, timeline, export and update system remain usable offline.

## Security and operational notes

- Profiles are public by design; tell users that names, avatar, bio and pronouns can be seen by other members. Email/password are not displayed publicly.
- SQL RLS policies limit profile writes to their owner, friend-request listing to participants, blocks to involved users and avatar uploads to the user's own folder.
- Reports are stored in `profile_reports` for review through the Supabase dashboard. This source kit does not include an admin/moderation dashboard; the project owner must review reports.
- Password recovery currently requests a recovery email; the desktop app does not yet register a custom URL scheme to receive a reset callback. Test/configure the redirect path before advertising complete in-app password reset.
- The first implementation uses heartbeat polling rather than Supabase Realtime WebSockets. Online counts may lag by up to about a minute and stale profiles turn offline after two minutes.
- Set Supabase Auth rate limits, enable email confirmation, provide an accurate privacy policy and support contact before promoting the public account system.

## Test

```bash
cd frame-studio-linux
npm install --no-audit --no-fund
npm test
node -p "require('./package.json').version" # must print 2.4.33
```

See `PUBLISH-2.4.33.md` for terminal release instructions.
