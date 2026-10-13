'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const app = path.resolve(__dirname, '..');
const { isValidUsername, isOnline, normalizeText, safeProfile, isSafeAvatarUrl, ONLINE_WINDOW_MS } = require('../community.js');
const pkg = JSON.parse(fs.readFileSync(path.join(app, 'package.json'), 'utf8'));
const html = fs.readFileSync(path.join(app, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(app, 'community.css'), 'utf8');
const community = fs.readFileSync(path.join(app, 'community.js'), 'utf8');
const config = fs.readFileSync(path.join(app, 'community-config.js'), 'utf8');
const sql = fs.readFileSync(path.join(app, 'SUPABASE_SETUP.sql'), 'utf8');

assert.equal(pkg.version, '2.4.33', 'package version must match release tag');
for (const file of ['community.js', 'community.css', 'community-config.js']) {
  assert.ok(pkg.build.files.includes(file), `${file} must be packaged in Windows and Linux builds`);
}
assert.ok(pkg.scripts.test.includes('tests/community.test.js'), 'community regression suite must run under npm test');
assert.match(html, /FRAME Studio 2\.4\.33/, 'document title has the release version');
assert.match(community, /data-community-tab="community"/, 'community tab is present in the runtime dialog');
assert.match(html, /\./, 'index page is readable');
assert.match(html, /https:\/\/\*\.supabase\.co/, 'CSP allows Supabase HTTPS endpoints');
assert.match(html, /community-config\.js/);
assert.match(html, /community\.js/);
assert.match(community, /data-action="friend-add"|friend-add/);
assert.match(community, /headers\.Authorization = `Bearer \${session\.access_token}`/, 'authenticated requests use the Supabase access token');
assert.match(community, /publishable keys belong in apikey/, 'publishable keys are not misused as JWT bearer tokens');
assert.match(css, /community-cards/);
assert.match(config, /supabaseUrl: ''/);
assert.match(config, /supabaseAnonKey: ''/);
assert.match(sql, /enable row level security/i);
assert.match(sql, /Users can update their own profile/i);
assert.match(sql, /profiles_username_lower_unique on public\.profiles \(lower\(username\)\)/i, 'username uniqueness is case-insensitive server-side');
assert.match(sql, /Users can view their own friend requests/i);
assert.match(sql, /Users upload avatars to their own folder/i);
for (const fn of ['send_friend_request', 'respond_friend_request', 'remove_friend', 'block_user', 'unblock_user']) {
  assert.match(sql, new RegExp(`function public\\.${fn}`, 'i'), `${fn} database RPC exists`);
  assert.match(sql, new RegExp(`revoke all on function public\\.${fn}`, 'i'), `${fn} is not executable by PUBLIC`);
}
assert.ok(!/service_role\s*[:=]\s*['"][^'"]+/i.test(config), 'no service role credential is bundled');

assert.equal(isValidUsername('gabi.works'), true);
assert.equal(isValidUsername('frame_user-23'), true);
assert.equal(isValidUsername('ab'), false, 'username minimum length is enforced');
assert.equal(isValidUsername('name with spaces'), false);
assert.equal(isValidUsername('name/../../x'), false);
assert.equal(normalizeText('  hello  ', 5), 'hello');
assert.equal(normalizeText('abcdef', 3), 'abc');
const now = Date.now();
assert.equal(isOnline(new Date(now - 15000).toISOString(), now), true);
assert.equal(isOnline(new Date(now - ONLINE_WINDOW_MS - 1000).toISOString(), now), false);
assert.equal(isOnline('not-a-date', now), false);
assert.equal(isOnline(new Date(now + 180000).toISOString(), now), false, 'future presence timestamps do not count online');
const p = safeProfile({ id: 'x', username: 'abc', display_name: 'A'.repeat(80), bio: 'B'.repeat(300), pronouns: 'C'.repeat(80), avatar_url: 'javascript:alert(1)', secret: 'email@example.com' });
assert.equal(p.display_name.length, 40);
assert.equal(p.bio.length, 160);
assert.equal(p.pronouns.length, 40);
assert.equal(p.avatar_url, 'javascript:alert(1)', 'profile normalizer preserves source for URL gate');
assert.equal(isSafeAvatarUrl('javascript:alert(1)', 'https://myproject.supabase.co'), false);
assert.equal(isSafeAvatarUrl('https://attacker.example/storage/v1/object/public/profile-avatars/x.png', 'https://myproject.supabase.co'), false);
assert.equal(isSafeAvatarUrl('https://myproject.supabase.co/storage/v1/object/public/profile-avatars/u/x.png', 'https://myproject.supabase.co'), true);
assert.equal(Object.hasOwn(p, 'secret'), false, 'public profile projection discards unexpected/private fields');

console.log('FRAME Studio 2.4.33 community regression tests: OK');
