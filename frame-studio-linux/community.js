(function frameCommunityModule(root) {
  'use strict';

  const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,24}$/;
  const NAME_MAX = 40;
  const BIO_MAX = 160;
  const PRONOUNS_MAX = 40;
  const ONLINE_WINDOW_MS = 120000;
  const PROFILE_FIELDS = 'id,username,display_name,bio,pronouns,avatar_url,last_seen_at,created_at';
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  function isValidUsername(value) { return USERNAME_RE.test(String(value || '').trim()); }
  function isOnline(lastSeen, now = Date.now()) {
    const stamp = Date.parse(lastSeen || '');
    return Number.isFinite(stamp) && stamp <= now + 30000 && stamp >= now - ONLINE_WINDOW_MS;
  }
  function normalizeText(value, max = 500) { return String(value ?? '').trim().slice(0, max); }
  function isSafeAvatarUrl(raw, supabaseUrl) {
    try {
      const candidate = new URL(String(raw || ''));
      const base = new URL(String(supabaseUrl || ''));
      return candidate.protocol === 'https:' && candidate.hostname === base.hostname && candidate.pathname.includes('/storage/v1/object/public/profile-avatars/');
    } catch { return false; }
  }
  function safeProfile(profile) {
    if (!profile || typeof profile !== 'object') return null;
    return {
      id: String(profile.id || ''),
      username: normalizeText(profile.username, 24),
      display_name: normalizeText(profile.display_name, NAME_MAX),
      bio: normalizeText(profile.bio, BIO_MAX),
      pronouns: normalizeText(profile.pronouns, PRONOUNS_MAX),
      avatar_url: typeof profile.avatar_url === 'string' ? profile.avatar_url : null,
      last_seen_at: profile.last_seen_at || null,
      created_at: profile.created_at || null
    };
  }
  const pure = { isValidUsername, isOnline, normalizeText, safeProfile, isSafeAvatarUrl, ONLINE_WINDOW_MS };
  if (typeof module !== 'undefined' && module.exports) module.exports = pure;
  if (!root || !root.document) return;

  const doc = root.document;
  const $ = (selector, parent = doc) => parent.querySelector(selector);
  const $$ = (selector, parent = doc) => Array.from(parent.querySelectorAll(selector));
  const config = root.FRAME_COMMUNITY_CONFIG || {};
  const state = {
    session: null,
    profile: null,
    profiles: [],
    profileById: new Map(),
    requests: [],
    blocks: [],
    searchResults: null,
    searchCount: null,
    memberCount: null,
    onlineCount: null,
    offset: 0,
    pageSize: 50,
    loading: false,
    tab: 'community',
    authMode: 'login',
    avatarFile: null,
    presenceTimer: null,
    refreshTimer: null,
    searchTimer: null,
    statusTimer: null,
    lastPresenceAt: 0
  };

  function getConfig() {
    const url = String(config.supabaseUrl || '').trim().replace(/\/$/, '');
    const key = String(config.supabaseAnonKey || '').trim();
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) return null;
    if (!key || /YOUR_|REPLACE_ME|SERVICE_ROLE/i.test(key)) return null;
    return { url, key };
  }
  function getSession() {
    if (state.session) return state.session;
    try { state.session = JSON.parse(root.localStorage.getItem('frame-community-session') || 'null'); }
    catch { state.session = null; }
    if (!state.session || !state.session.access_token || !state.session.user?.id) state.session = null;
    return state.session;
  }
  function setSession(session) {
    state.session = session && session.access_token && session.user?.id ? session : null;
    try {
      if (state.session) root.localStorage.setItem('frame-community-session', JSON.stringify(state.session));
      else root.localStorage.removeItem('frame-community-session');
    } catch {}
  }
  function setStatus(message, kind = '') {
    const el = $('#fcStatus');
    if (!el) return;
    el.textContent = message;
    el.className = `community-status${kind ? ` ${kind}` : ''}`;
    el.classList.toggle('hidden', !message);
  }
  function configMessage() {
    return 'A Comunidade ainda não está conectada. Configure a URL e a chave publicável do seu projeto Supabase em frame-studio-linux/community-config.js e execute SUPABASE_SETUP.sql no SQL Editor do Supabase. O editor e os projetos locais continuam funcionando normalmente.';
  }
  function requireConfig() {
    const cfg = getConfig();
    if (!cfg) throw new Error('Comunidade sem configuração. Preencha community-config.js com a URL e a chave publicável do Supabase. Nunca use a service_role key.');
    return cfg;
  }
  function apiHeaders(extra = {}, authenticated = true) {
    const cfg = requireConfig();
    const headers = { apikey: cfg.key, ...extra };
    const session = authenticated ? getSession() : null;
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    else if (/^eyJ[A-Za-z0-9_-]+\./.test(cfg.key)) headers.Authorization = `Bearer ${cfg.key}`;
    else delete headers.Authorization; // New Supabase publishable keys belong in apikey, not as JWTs.
    return headers;
  }
  async function authRequest(path, body, authenticated = false) {
    const cfg = requireConfig();
    const res = await root.fetch(`${cfg.url}/auth/v1/${path}`, {
      method: 'POST', headers: apiHeaders({ 'Content-Type': 'application/json' }, authenticated), body: JSON.stringify(body)
    });
    const data = await parseResponse(res);
    if (!res.ok) throw new Error(authError(data, res.status));
    return data;
  }
  async function parseResponse(res) {
    const text = await res.text();
    if (!text) return null;
    try { return JSON.parse(text); } catch { return { message: text.slice(0, 300) }; }
  }
  function authError(data, status) {
    const msg = data?.msg || data?.message || data?.error_description || data?.error || `Solicitação recusada (${status})`;
    const lower = String(msg).toLowerCase();
    if (lower.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
    if (lower.includes('user already registered')) return 'Já existe uma conta com esse e-mail.';
    if (lower.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
    if (lower.includes('password should be at least')) return 'A senha precisa ter pelo menos 8 caracteres.';
    return String(msg).slice(0, 240);
  }
  async function refreshSessionIfNeeded(force = false) {
    const session = getSession();
    if (!session?.refresh_token) return session;
    const expiresAt = Number(session.expires_at || 0) * 1000;
    if (!force && (!expiresAt || expiresAt > Date.now() + 60000)) return session;
    try {
      const refreshed = await authRequest('token?grant_type=refresh_token', { refresh_token: session.refresh_token }, false);
      setSession({ ...refreshed, expires_at: Date.now() / 1000 + Number(refreshed.expires_in || 3600) });
      return state.session;
    } catch {
      setSession(null);
      state.profile = null;
      return null;
    }
  }
  async function rest(path, options = {}) {
    const cfg = requireConfig();
    await refreshSessionIfNeeded();
    const headers = apiHeaders({ Accept: 'application/json', ...(options.headers || {}) }, options.authenticated !== false);
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    const res = await root.fetch(`${cfg.url}/rest/v1/${path}`, {
      method: options.method || 'GET', headers, body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
    const data = await parseResponse(res);
    if (!res.ok) {
      const message = data?.message || data?.details || data?.hint || data?.error || `Banco recusou a solicitação (${res.status})`;
      if (res.status === 401) setSession(null);
      if (String(message).toLowerCase().includes('duplicate key')) throw new Error('Esse nome de usuário já está em uso. Escolha outro @usuário.');
      throw new Error(String(message).slice(0, 260));
    }
    return options.withResponse ? { data, headers: res.headers, status: res.status } : data;
  }
  async function rpc(name, args = {}) {
    return rest(`rpc/${encodeURIComponent(name)}`, { method: 'POST', body: args });
  }
  function requireUser() {
    const session = getSession();
    if (!session?.user?.id) throw new Error('Entre na sua conta para usar esse recurso.');
    return session.user;
  }
  function qs(obj) {
    const p = new URLSearchParams();
    Object.entries(obj).forEach(([key, value]) => { if (value !== undefined && value !== null) p.set(key, String(value)); });
    return p.toString();
  }
  function countFromHeaders(headers) {
    const range = headers?.get?.('content-range') || '';
    const total = range.includes('/') ? Number(range.split('/').pop()) : NaN;
    return Number.isFinite(total) ? total : null;
  }
  function avatarUrl(profile) {
    const raw = profile?.avatar_url;
    const cfg = getConfig();
    if (!raw || !cfg) return '';
    if (!isSafeAvatarUrl(raw, cfg.url)) return '';
    try { return new URL(raw).href; } catch { return ''; }
  }
  function initials(profile) {
    const s = normalizeText(profile?.display_name || profile?.username || '?', 48);
    const words = s.split(/[\s._-]+/).filter(Boolean);
    return (words.length > 1 ? words[0][0] + words[1][0] : s.slice(0, 2)).toUpperCase();
  }
  function makeAvatar(profile, sizeClass = '') {
    const box = doc.createElement('div');
    box.className = `community-avatar${sizeClass ? ` ${sizeClass}` : ''}`;
    const src = avatarUrl(profile);
    if (src) {
      const img = doc.createElement('img'); img.alt = ''; img.src = src;
      img.addEventListener('error', () => { img.remove(); box.textContent = initials(profile); }, { once: true });
      box.appendChild(img);
    } else box.textContent = initials(profile);
    return box;
  }
  function makeButton(label, action, options = {}) {
    const b = doc.createElement('button');
    b.type = 'button'; b.textContent = label; b.className = `community-btn${options.primary ? ' primary' : ''}${options.danger ? ' danger' : ''}`;
    b.dataset.action = action;
    if (options.userId) b.dataset.userId = options.userId;
    if (options.requestId !== undefined) b.dataset.requestId = String(options.requestId);
    if (options.disabled) b.disabled = true;
    return b;
  }
  function buttonStatusFor(profile) {
    if (!getSession()) return { text: 'Entre para adicionar', disabled: true };
    if (profile.id === getSession().user.id) return { text: 'Seu perfil', disabled: true };
    if (!state.profile) return { text: 'Complete seu perfil', disabled: true };
    if (state.blocks.some(b => b.blocker_id === profile.id || b.blocked_id === profile.id)) return { text: 'Bloqueado', disabled: true };
    const found = state.requests.find(r => r.status === 'accepted' && [r.sender_id, r.receiver_id].includes(profile.id));
    if (found) return { text: 'Amigos', disabled: true };
    const incoming = state.requests.find(r => r.status === 'pending' && r.sender_id === profile.id && r.receiver_id === getSession().user.id);
    if (incoming) return { text: 'Aceitar pedido', action: 'friend-accept', requestId: incoming.id };
    const outgoing = state.requests.find(r => r.status === 'pending' && r.sender_id === getSession().user.id && r.receiver_id === profile.id);
    if (outgoing) return { text: 'Pedido enviado', disabled: true };
    return { text: 'Adicionar amigo', action: 'friend-add' };
  }
  function appendMeta(card, profile) {
    const meta = doc.createElement('div'); meta.className = 'community-card-meta';
    const status = doc.createElement('span'); status.className = `community-badge${isOnline(profile.last_seen_at) ? ' online' : ''}`;
    status.textContent = isOnline(profile.last_seen_at) ? '● Online' : 'Offline'; meta.appendChild(status);
    if (profile.pronouns) { const p = doc.createElement('span'); p.className = 'community-badge'; p.textContent = profile.pronouns; meta.appendChild(p); }
    card.appendChild(meta);
  }
  function renderProfileCard(profile, container) {
    if (!profile || !UUID_RE.test(profile.id)) return;
    const current = getSession()?.user?.id;
    if (state.blocks.some(b => b.blocker_id === profile.id || b.blocked_id === profile.id)) return;
    const card = doc.createElement('article'); card.className = 'community-card';
    card.appendChild(makeAvatar(profile));
    const main = doc.createElement('div'); main.className = 'community-card-main';
    const name = doc.createElement('div'); name.className = 'community-card-name'; name.textContent = profile.display_name || profile.username;
    const handle = doc.createElement('div'); handle.className = 'community-card-handle'; handle.textContent = `@${profile.username}`;
    main.append(name, handle);
    if (profile.bio) { const bio = doc.createElement('div'); bio.className = 'community-card-bio'; bio.textContent = profile.bio; main.appendChild(bio); }
    appendMeta(main, profile);
    const actions = doc.createElement('div'); actions.className = 'community-card-actions';
    const button = buttonStatusFor(profile);
    if (button.action) actions.appendChild(makeButton(button.text, button.action, { userId: profile.id, requestId: button.requestId, primary: button.action === 'friend-add' || button.action === 'friend-accept' }));
    else actions.appendChild(makeButton(button.text, 'noop', { userId: profile.id, disabled: button.disabled }));
    if (current && state.profile && profile.id !== current) {
      actions.appendChild(makeButton('Bloquear', 'block-user', { userId: profile.id, danger: true }));
      actions.appendChild(makeButton('Denunciar', 'report-user', { userId: profile.id }));
    }
    main.appendChild(actions); card.appendChild(main); container.appendChild(card);
  }
  function setCount(id, value) { const el = $(`#${id}`); if (el) el.textContent = value === null || value === undefined ? '—' : Number(value).toLocaleString('pt-BR'); }
  async function loadProfiles({ append = false, search = '' } = {}) {
    const query = String(search || '').trim();
    const safeQuery = query.replace(/[(),.%_*\\]/g, '').slice(0, 48);
    const params = { select: PROFILE_FIELDS, order: 'created_at.desc', limit: query ? 100 : state.pageSize };
    let range;
    if (safeQuery) params.or = `(username.ilike.%${safeQuery}%,display_name.ilike.%${safeQuery}%)`;
    else {
      const start = append ? state.profiles.length : 0;
      range = `${start}-${start + state.pageSize - 1}`;
    }
    const loaded = await rest(`profiles?${qs(params)}`, {
      headers: { Prefer: 'count=exact', ...(range ? { Range: range } : {}) }, withResponse: true
    });
    const rows = (Array.isArray(loaded.data) ? loaded.data : []).map(safeProfile).filter(p => p && UUID_RE.test(p.id));
    if (safeQuery) {
      state.searchResults = rows;
      state.searchCount = countFromHeaders(loaded.headers);
    } else {
      if (!append) state.profiles = [];
      const ids = new Set(state.profiles.map(p => p.id));
      rows.forEach(p => { if (ids.has(p.id)) state.profiles = state.profiles.map(old => old.id === p.id ? p : old); else state.profiles.push(p); });
      state.searchResults = null;
      state.memberCount = countFromHeaders(loaded.headers);
      state.offset = state.profiles.length;
    }
    const total = state.memberCount;
    setCount('fcMemberCount', total);
    const onlineQuery = qs({ select: 'id', last_seen_at: `gte.${new Date(Date.now() - ONLINE_WINDOW_MS).toISOString()}`, limit: 1 });
    try {
      const online = await rest(`profiles?${onlineQuery}`, { headers: { Prefer: 'count=exact', Range: '0-0' }, withResponse: true });
      state.onlineCount = countFromHeaders(online.headers);
      setCount('fcOnlineCount', state.onlineCount);
    } catch { setCount('fcOnlineCount', null); }
    const knownProfiles = new Map(state.profileById);
    [...state.profiles, ...(state.searchResults || [])].forEach(p => knownProfiles.set(p.id, p));
    if (state.profile) knownProfiles.set(state.profile.id, state.profile);
    state.profileById = knownProfiles;
    renderMembers();
  }
  async function loadOwnProfile() {
    const user = requireUser();
    const data = await rest(`profiles?${qs({ select: PROFILE_FIELDS, id: `eq.${user.id}`, limit: 1 })}`);
    state.profile = Array.isArray(data) && data.length ? safeProfile(data[0]) : null;
    if (state.profile) state.profileById.set(state.profile.id, state.profile);
    renderOwnProfile();
  }
  async function loadFriends() {
    if (!getSession()) { state.requests = []; state.blocks = []; renderFriends(); return; }
    const id = getSession().user.id;
    const requests = await rest(`friend_requests?${qs({ select: 'id,sender_id,receiver_id,status,created_at', or: `(sender_id.eq.${id},receiver_id.eq.${id})`, order: 'created_at.desc', limit: 400 })}`);
    state.requests = Array.isArray(requests) ? requests : [];
    const blocks = await rest(`user_blocks?${qs({ select: 'blocker_id,blocked_id', or: `(blocker_id.eq.${id},blocked_id.eq.${id})`, limit: 400 })}`);
    state.blocks = Array.isArray(blocks) ? blocks : [];
    const needed = new Set();
    state.requests.forEach(r => { if (r.sender_id !== id) needed.add(r.sender_id); if (r.receiver_id !== id) needed.add(r.receiver_id); });
    state.blocks.forEach(b => { if (b.blocker_id !== id) needed.add(b.blocker_id); if (b.blocked_id !== id) needed.add(b.blocked_id); });
    const missing = [...needed].filter(uid => UUID_RE.test(uid) && !state.profileById.has(uid));
    if (missing.length) {
      const rows = await rest(`profiles?${qs({ select: PROFILE_FIELDS, id: `in.(${missing.join(',')})`, limit: missing.length })}`);
      (Array.isArray(rows) ? rows : []).map(safeProfile).filter(Boolean).forEach(p => state.profileById.set(p.id, p));
    }
    renderFriends(); renderMembers(); renderBlockedUsers();
  }
  function renderMembers() {
    const list = $('#fcMembers'); if (!list) return;
    list.innerHTML = '';
    const profiles = state.searchResults || state.profiles;
    let visible = profiles.filter(p => !state.blocks.some(b => b.blocker_id === p.id || b.blocked_id === p.id));
    if (getSession()) visible = visible.filter(p => p.id !== getSession().user.id || !state.profile);
    visible.forEach(p => renderProfileCard(p, list));
    const empty = $('#fcMembersEmpty');
    if (empty) empty.classList.toggle('hidden', visible.length > 0);
    const more = $('#fcLoadMore');
    if (more) more.classList.toggle('hidden', !!state.searchResults || (state.memberCount !== null && state.profiles.length >= state.memberCount));
  }
  function renderOwnProfile() {
    const form = $('#fcProfileForm'); if (!form) return;
    const user = getSession()?.user;
    const prompt = $('#fcProfileSignIn');
    if (!user) { form.classList.add('hidden'); prompt?.classList.remove('hidden'); return; }
    prompt?.classList.add('hidden'); form.classList.remove('hidden');
    const p = state.profile || {};
    $('#fcProfileName').value = p.display_name || user.user_metadata?.display_name || '';
    $('#fcProfileUsername').value = p.username || user.user_metadata?.username || '';
    $('#fcProfileBio').value = p.bio || '';
    $('#fcProfilePronouns').value = p.pronouns || '';
    $('#fcProfileBioCount').textContent = `${$('#fcProfileBio').value.length}/${BIO_MAX}`;
    $('#fcProfileNamePreview').textContent = p.display_name || user.user_metadata?.display_name || 'Seu perfil';
    $('#fcProfileHandlePreview').textContent = `@${p.username || user.user_metadata?.username || 'usuario'}`;
    const preview = $('#fcProfileAvatar');
    preview.innerHTML = '';
    preview.appendChild(makeAvatar(p.id ? p : { ...p, username: $('#fcProfileUsername').value, display_name: $('#fcProfileName').value }));
    const saved = $('#fcProfileSaved'); if (saved) saved.textContent = p.id ? 'Perfil público ativo' : 'Conclua seu perfil para aparecer na comunidade';
    renderBlockedUsers();
  }
  function renderBlockedUsers() {
    const box = $('#fcBlockedUsers'); if (!box) return;
    box.innerHTML = '';
    const id = getSession()?.user?.id;
    const blocked = state.blocks.filter(b => b.blocker_id === id);
    if (!blocked.length) { const s = doc.createElement('p'); s.className = 'community-muted'; s.textContent = 'Você não bloqueou ninguém.'; box.appendChild(s); return; }
    blocked.forEach(b => {
      const profile = state.profileById.get(b.blocked_id);
      const row = doc.createElement('div'); row.className = 'community-request';
      row.appendChild(makeAvatar(profile || { display_name: 'Usuário' }));
      const text = doc.createElement('div'); text.className = 'community-request-main'; text.textContent = profile ? `${profile.display_name} · @${profile.username}` : 'Perfil bloqueado';
      row.appendChild(text); row.appendChild(makeButton('Desbloquear', 'unblock-user', { userId: b.blocked_id })); box.appendChild(row);
    });
  }
  function appendRequestRow(container, request, otherId, label, actions = []) {
    const profile = state.profileById.get(otherId) || { id: otherId, username: 'usuario', display_name: 'Perfil não encontrado' };
    const row = doc.createElement('div'); row.className = 'community-request';
    row.appendChild(makeAvatar(profile));
    const main = doc.createElement('div'); main.className = 'community-request-main';
    const name = doc.createElement('strong'); name.style.fontSize = '11px'; name.textContent = profile.display_name || profile.username;
    const sub = doc.createElement('div'); sub.className = 'community-muted'; sub.textContent = `@${profile.username} · ${label}`;
    main.append(name, sub); row.appendChild(main);
    const btns = doc.createElement('div'); btns.className = 'community-request-actions';
    actions.forEach(a => btns.appendChild(makeButton(a.label, a.action, { userId: otherId, requestId: request.id, primary: !!a.primary, danger: !!a.danger })));
    row.appendChild(btns); container.appendChild(row);
  }
  function renderFriends() {
    const incoming = $('#fcIncoming'); const outgoing = $('#fcOutgoing'); const friends = $('#fcFriends');
    if (!incoming || !outgoing || !friends) return;
    incoming.innerHTML = ''; outgoing.innerHTML = ''; friends.innerHTML = '';
    if (!getSession()) {
      for (const box of [incoming, outgoing, friends]) { const p = doc.createElement('div'); p.className = 'community-empty'; p.textContent = 'Entre na sua conta para ver amigos e solicitações.'; box.appendChild(p); }
      return;
    }
    const id = getSession().user.id;
    const inbound = state.requests.filter(r => r.status === 'pending' && r.receiver_id === id);
    const outbound = state.requests.filter(r => r.status === 'pending' && r.sender_id === id);
    const accepted = state.requests.filter(r => r.status === 'accepted');
    inbound.forEach(r => appendRequestRow(incoming, r, r.sender_id, 'Quer ser seu amigo', [{ label: 'Aceitar', action: 'friend-accept', primary: true }, { label: 'Recusar', action: 'friend-decline', danger: true }]));
    outbound.forEach(r => appendRequestRow(outgoing, r, r.receiver_id, 'Solicitação enviada', [{ label: 'Cancelar', action: 'friend-decline', danger: true }]));
    const friendIds = new Set();
    accepted.forEach(r => { const uid = r.sender_id === id ? r.receiver_id : r.sender_id; if (!friendIds.has(uid)) { friendIds.add(uid); appendRequestRow(friends, r, uid, 'Amigo', [{ label: 'Remover', action: 'friend-remove', danger: true }]); } });
    if (!incoming.children.length) incoming.innerHTML = '<div class="community-empty">Nenhuma solicitação recebida.</div>';
    if (!outgoing.children.length) outgoing.innerHTML = '<div class="community-empty">Você não tem solicitações enviadas.</div>';
    if (!friends.children.length) friends.innerHTML = '<div class="community-empty">Sua lista de amigos está vazia. Encontre pessoas na aba Comunidade.</div>';
  }
  function updateSessionUi() {
    const signed = !!getSession();
    $('#fcAuthBox')?.classList.toggle('hidden', signed);
    $('#fcSessionBox')?.classList.toggle('hidden', !signed);
    $('#fcSessionName') && ($('#fcSessionName').textContent = state.profile?.display_name || getSession()?.user?.user_metadata?.display_name || getSession()?.user?.email || 'Conta conectada');
    $('#fcSessionHandle') && ($('#fcSessionHandle').textContent = state.profile?.username ? `@${state.profile.username}` : 'Perfil em configuração');
    $('#fcLogout')?.classList.toggle('hidden', !signed);
    renderOwnProfile(); renderFriends();
  }
  function selectTab(tab) {
    state.tab = tab;
    $$('.community-nav [data-community-tab]').forEach(b => { const active = b.dataset.communityTab === tab; b.classList.toggle('active', active); b.setAttribute('aria-selected', String(active)); });
    $$('.community-page').forEach(p => p.classList.toggle('active', p.dataset.communityPage === tab));
    if (tab === 'profile') renderOwnProfile();
    if (tab === 'friends') loadFriends().catch(err => setStatus(err.message, 'error'));
  }
  function renderSetupState() {
    if (getConfig()) return;
    setStatus(configMessage(), 'error');
    $('#fcAuthBox')?.classList.add('hidden');
    $('#fcSessionBox')?.classList.add('hidden');
    const list = $('#fcMembers'); if (list) list.innerHTML = '';
    $('#fcMembersEmpty')?.classList.remove('hidden');
    $('#fcMembersEmpty').textContent = 'Configure o backend para ativar contas, comunidade, amizades e contadores globais. Nenhuma conta é criada localmente ou simulada.';
    setCount('fcMemberCount', null); setCount('fcOnlineCount', null);
    $('#fcConfigInstructions')?.classList.remove('hidden');
  }
  async function loadAll({ reset = true } = {}) {
    if (!getConfig()) { renderSetupState(); return; }
    if (state.loading) return;
    state.loading = true;
    try {
      await refreshSessionIfNeeded();
      if (getSession()) {
        await loadOwnProfile().catch(err => { state.profile = null; if (!String(err.message).includes('JWT')) throw err; });
        if (state.profile) await pingPresence();
        await loadFriends();
      } else { state.profile = null; state.requests = []; state.blocks = []; }
      await loadProfiles({ append: !reset });
      updateSessionUi(); setStatus('');
    } catch (err) {
      setStatus(err?.message || 'Não foi possível carregar a comunidade.', 'error');
    } finally { state.loading = false; }
  }
  async function pingPresence() {
    if (!getSession() || !state.profile) return;
    const now = Date.now(); if (now - state.lastPresenceAt < 15000) return;
    state.lastPresenceAt = now;
    try {
      await rest(`profiles?id=eq.${getSession().user.id}`, { method: 'PATCH', body: { last_seen_at: new Date().toISOString() }, headers: { Prefer: 'return=minimal' } });
      state.profile.last_seen_at = new Date().toISOString();
    } catch (err) { console.warn('FRAME Community: presença não atualizada:', err.message); }
  }
  async function doLogin(form) {
    const email = normalizeText($('#fcLoginEmail').value, 254).toLowerCase(); const password = $('#fcLoginPassword').value;
    if (!email || !password) throw new Error('Preencha o e-mail e a senha.');
    const result = await authRequest('token?grant_type=password', { email, password });
    setSession({ ...result, expires_at: Date.now() / 1000 + Number(result.expires_in || 3600) });
    state.profile = null; state.profileById.clear(); state.profiles = []; state.requests = []; state.blocks = [];
    await loadAll();
    if (state.profile) selectTab('community'); else { selectTab('profile'); if (!$('#fcStatus')?.classList.contains('error')) setStatus('Conta conectada. Complete o perfil e escolha um @usuário disponível.', 'success'); }
    form?.reset();
  }
  async function doSignup(form) {
    const name = normalizeText($('#fcSignupName').value, NAME_MAX);
    const username = normalizeText($('#fcSignupUsername').value, 24).toLowerCase();
    const email = normalizeText($('#fcSignupEmail').value, 254).toLowerCase(); const password = $('#fcSignupPassword').value;
    if (!name) throw new Error('Escolha um nome de exibição.');
    if (!isValidUsername(username)) throw new Error('O @usuário precisa ter de 3 a 24 caracteres: letras, números, ponto, traço ou _.');
    if (!email.includes('@') || email.length > 254) throw new Error('Digite um e-mail válido.');
    if (password.length < 8) throw new Error('Use uma senha com pelo menos 8 caracteres.');
    const result = await authRequest('signup', { email, password, data: { display_name: name, username } });
    if (result?.access_token && result?.user?.id) {
      setSession({ ...result, expires_at: Date.now() / 1000 + Number(result.expires_in || 3600) });
      state.profile = null; await loadAll();
      selectTab('profile'); if (!$('#fcStatus')?.classList.contains('error')) setStatus('Conta criada. Salve seu perfil para aparecer publicamente na comunidade.', 'success');
    } else {
      setStatus('Cadastro recebido. Confira seu e-mail para confirmar a conta; depois volte aqui e entre.', 'success');
      state.authMode = 'login'; renderAuthMode();
    }
    form?.reset();
  }
  async function doRecover() {
    const email = normalizeText($('#fcLoginEmail').value, 254).toLowerCase();
    if (!email.includes('@')) throw new Error('Digite seu e-mail no campo de login primeiro.');
    await authRequest('recover', { email }, false);
    setStatus('Se esse e-mail estiver cadastrado, você receberá instruções para recuperar a senha.', 'success');
  }
  async function saveProfile() {
    const user = requireUser();
    const display_name = normalizeText($('#fcProfileName').value, NAME_MAX);
    const username = normalizeText($('#fcProfileUsername').value, 24).toLowerCase();
    const bio = normalizeText($('#fcProfileBio').value, BIO_MAX);
    const pronouns = normalizeText($('#fcProfilePronouns').value, PRONOUNS_MAX);
    if (!display_name) throw new Error('O nome de exibição não pode ficar vazio.');
    if (!isValidUsername(username)) throw new Error('O @usuário precisa ter de 3 a 24 caracteres: letras, números, ponto, traço ou _.');
    let avatar_url = state.profile?.avatar_url || null;
    if (state.avatarFile) {
      const file = state.avatarFile;
      if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) throw new Error('Use uma imagem PNG, JPEG, WebP ou GIF.');
      if (file.size > 2 * 1024 * 1024) throw new Error('A foto de perfil deve ter no máximo 2 MB.');
      const cfg = requireConfig();
      const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' })[file.type];
      const path = `${user.id}/${root.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}.${ext}`;
      const upload = await root.fetch(`${cfg.url}/storage/v1/object/profile-avatars/${path.split('/').map(encodeURIComponent).join('/')}`, {
        method: 'POST', headers: apiHeaders({ 'Content-Type': file.type, 'x-upsert': 'false' }, true), body: file
      });
      const uploaded = await parseResponse(upload);
      if (!upload.ok) throw new Error(uploaded?.message || 'Não foi possível enviar a foto. Verifique o bucket e as políticas do Supabase.');
      avatar_url = `${cfg.url}/storage/v1/object/public/profile-avatars/${path.split('/').map(encodeURIComponent).join('/')}`;
      state.avatarFile = null;
    }
    const values = { id: user.id, username, display_name, bio, pronouns, avatar_url, last_seen_at: new Date().toISOString() };
    if (state.profile) await rest(`profiles?id=eq.${user.id}`, { method: 'PATCH', body: values, headers: { Prefer: 'return=representation' } });
    else await rest('profiles', { method: 'POST', body: values, headers: { Prefer: 'return=representation' } });
    await loadOwnProfile(); updateSessionUi();
    state.profileById.set(user.id, state.profile);
    await loadProfiles();
    setStatus('Perfil salvo e disponível na comunidade.', 'success');
  }
  async function doLogout() {
    try { if (getSession()) await authRequest('logout', {}, true); } catch {}
    setSession(null); state.profile = null; state.profileById.clear(); state.profiles = []; state.requests = []; state.blocks = [];
    updateSessionUi(); await loadAll(); selectTab('community'); setStatus('Você saiu da conta.', 'success');
  }
  async function addFriend(userId) {
    const user = requireUser();
    if (!state.profile) throw new Error('Salve seu perfil antes de usar a Comunidade.');
    if (!UUID_RE.test(userId) || userId === user.id) throw new Error('Perfil inválido.');
    await rpc('send_friend_request', { target_user_id: userId });
    await loadFriends(); await loadProfiles(); setStatus('Solicitação de amizade enviada.', 'success');
  }
  async function respondFriend(requestId, decision) {
    const n = Number(requestId); if (!Number.isSafeInteger(n) || n <= 0) throw new Error('Solicitação inválida.');
    await rpc('respond_friend_request', { p_request_id: n, p_decision: decision });
    await loadFriends(); await loadProfiles(); setStatus(decision === 'accept' ? 'Amizade aceita.' : 'Solicitação atualizada.', 'success');
  }
  async function removeFriend(userId) {
    if (!UUID_RE.test(userId)) throw new Error('Perfil inválido.');
    if (!root.confirm('Remover essa amizade?')) return;
    await rpc('remove_friend', { friend_user_id: userId });
    await loadFriends(); await loadProfiles(); setStatus('Amizade removida.', 'success');
  }
  async function blockUser(userId) {
    requireUser();
    if (!state.profile) throw new Error('Salve seu perfil antes de usar a Comunidade.');
    if (!UUID_RE.test(userId) || !root.confirm('Bloquear este perfil? Ele deixará de aparecer na sua comunidade e não poderá enviar solicitações de amizade.')) return;
    await rpc('block_user', { target_user_id: userId });
    await loadFriends(); await loadProfiles(); setStatus('Perfil bloqueado.', 'success');
  }
  async function unblockUser(userId) {
    if (!UUID_RE.test(userId)) throw new Error('Perfil inválido.');
    await rpc('unblock_user', { target_user_id: userId }); await loadFriends(); await loadProfiles(); setStatus('Perfil desbloqueado.', 'success');
  }
  async function reportUser(userId) {
    requireUser();
    if (!state.profile) throw new Error('Salve seu perfil antes de usar a Comunidade.');
    if (!UUID_RE.test(userId)) throw new Error('Perfil inválido.');
    const reason = root.prompt('Por que você deseja denunciar este perfil? (spam, assédio, impersonação ou outro)');
    if (reason === null) return;
    const cleanReason = normalizeText(reason, 80);
    if (!cleanReason) throw new Error('Informe o motivo da denúncia.');
    await rest('profile_reports', { method: 'POST', body: { reporter_id: requireUser().id, reported_id: userId, reason: cleanReason }, headers: { Prefer: 'return=minimal' } });
    setStatus('Denúncia enviada para análise pelos responsáveis da comunidade.', 'success');
  }
  function renderAuthMode() {
    $('#fcLoginForm')?.classList.toggle('hidden', state.authMode !== 'login');
    $('#fcSignupForm')?.classList.toggle('hidden', state.authMode !== 'signup');
    $$('.community-auth-tabs [data-auth-mode]').forEach(b => b.classList.toggle('active', b.dataset.authMode === state.authMode));
  }
  function buildDialog() {
    if ($('#frameCommunityDialog')) return;
    const link = doc.createElement('link'); link.rel = 'stylesheet'; link.href = './community.css'; doc.head.appendChild(link);
    doc.body.insertAdjacentHTML('beforeend', `
      <dialog class="dialog community-dialog" id="frameCommunityDialog" aria-labelledby="fcDialogTitle">
        <div class="dialog-head"><div><strong id="fcDialogTitle">FRAME Community</strong><div class="community-muted">FRAME ID · criadores conectados</div></div><button class="pill" type="button" data-fc-close>Fechar</button></div>
        <div class="community-shell">
          <nav class="community-nav" role="tablist" aria-label="FRAME Community">
            <button type="button" class="active" data-community-tab="community" role="tab" aria-selected="true">◉ Comunidade</button>
            <button type="button" data-community-tab="profile" role="tab" aria-selected="false">♙ Seu perfil</button>
            <button type="button" data-community-tab="friends" role="tab" aria-selected="false">♡ Amigos</button>
          </nav>
          <div class="community-main">
            <div id="fcStatus" class="community-status hidden" role="status" aria-live="polite"></div>
            <div id="fcConfigInstructions" class="community-status hidden">Configure o backend para usar a comunidade.</div>
            <section class="community-page active" data-community-page="community">
              <div class="community-heading"><div><h3>Encontre outros criadores</h3><div class="community-subtitle">Perfis públicos do FRAME Studio</div></div><button type="button" class="community-btn" data-action="refresh">↻ Atualizar</button></div>
              <div id="fcAuthBox" class="community-auth">
                <div class="community-auth-head"><strong>Entre na comunidade</strong><div class="community-auth-tabs"><button type="button" class="active" data-auth-mode="login">Entrar</button><button type="button" data-auth-mode="signup">Criar conta</button></div></div>
                <form id="fcLoginForm"><div class="community-form-grid"><div class="community-field"><label for="fcLoginEmail">E-mail</label><input class="community-input" id="fcLoginEmail" type="email" maxlength="254" autocomplete="email" required></div><div class="community-field"><label for="fcLoginPassword">Senha</label><input class="community-input" id="fcLoginPassword" type="password" minlength="8" autocomplete="current-password" required></div></div><div class="community-actions"><button class="community-btn primary" type="submit">Entrar</button><button class="community-btn" type="button" data-action="recover">Esqueci minha senha</button></div></form>
                <form id="fcSignupForm" class="hidden"><div class="community-form-grid"><div class="community-field"><label for="fcSignupName">Nome de exibição</label><input class="community-input" id="fcSignupName" maxlength="40" autocomplete="nickname" required></div><div class="community-field"><label for="fcSignupUsername">@Usuário</label><input class="community-input" id="fcSignupUsername" maxlength="24" pattern="[A-Za-z0-9_.-]{3,24}" autocomplete="username" required></div><div class="community-field"><label for="fcSignupEmail">E-mail</label><input class="community-input" id="fcSignupEmail" type="email" maxlength="254" autocomplete="email" required></div><div class="community-field"><label for="fcSignupPassword">Senha (mínimo 8 caracteres)</label><input class="community-input" id="fcSignupPassword" type="password" minlength="8" autocomplete="new-password" required></div></div><div class="community-actions"><button class="community-btn primary" type="submit">Criar conta</button><span class="community-muted">Seu e-mail nunca aparece no perfil público.</span></div></form>
              </div>
              <div id="fcSessionBox" class="community-auth hidden"><div class="community-auth-head"><div><strong id="fcSessionName">Conta conectada</strong><div class="community-muted" id="fcSessionHandle">@usuario</div></div><button class="community-btn" type="button" data-community-tab="profile">Editar perfil</button></div><div class="community-muted">Você está usando o FRAME ID. Seu perfil público pode ser editado a qualquer momento.</div></div>
              <div class="community-stats"><div class="community-stat"><strong id="fcMemberCount">—</strong><span>criadores cadastrados</span></div><div class="community-stat"><strong id="fcOnlineCount">—</strong><span>online agora · atualização periódica</span></div></div>
              <input class="community-input community-search" id="fcSearch" type="search" maxlength="48" placeholder="Buscar por nome ou @usuário…" aria-label="Buscar membros">
              <div class="community-cards" id="fcMembers"></div><div id="fcMembersEmpty" class="community-empty hidden">Nenhum perfil encontrado.</div><button type="button" id="fcLoadMore" class="community-btn community-loadmore hidden" data-action="load-more">Carregar mais membros</button>
            </section>
            <section class="community-page" data-community-page="profile">
              <div class="community-heading"><div><h3>Seu FRAME ID</h3><div class="community-subtitle">Nome, avatar, bio e pronomes do seu perfil público.</div></div></div>
              <div id="fcProfileSignIn" class="community-empty">Entre ou crie uma conta na aba Comunidade para configurar seu perfil.</div>
              <form id="fcProfileForm" class="hidden">
                <div class="community-profile-layout"><div class="community-profile-preview" id="fcProfilePreview"><div id="fcProfileAvatar"></div><strong id="fcProfileNamePreview">Seu perfil</strong><small id="fcProfileHandlePreview">@usuario</small><p class="community-muted" id="fcProfileSaved">Perfil público</p><label class="community-btn" for="fcAvatarFile">Escolher foto</label><input class="hidden" id="fcAvatarFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif"><p class="community-muted">PNG, JPEG, WebP ou GIF · até 2 MB</p></div>
                  <div class="community-form-grid"><div class="community-field"><label for="fcProfileName">Nome de exibição</label><input class="community-input" id="fcProfileName" maxlength="40" required></div><div class="community-field"><label for="fcProfileUsername">@Usuário único</label><input class="community-input" id="fcProfileUsername" maxlength="24" pattern="[A-Za-z0-9_.-]{3,24}" required></div><div class="community-field full"><label for="fcProfileBio">Bio <span id="fcProfileBioCount">0/160</span></label><textarea class="community-textarea" id="fcProfileBio" maxlength="160" placeholder="O que você gosta de criar?"></textarea></div><div class="community-field full"><label for="fcProfilePronouns">Pronomes (opcional)</label><input class="community-input" id="fcProfilePronouns" maxlength="40" placeholder="ex.: ela/dela, ele/dele, elu/delu"></div><div class="community-field full"><div class="community-muted">Nome, @usuário, bio, pronomes e foto são visíveis na Comunidade. O e-mail não é exibido publicamente. Não inclua dados pessoais sensíveis na bio.</div></div><div class="community-field full"><button class="community-btn primary" type="submit">Salvar perfil</button></div></div>
                </div>
              </form>
              <div class="community-heading" style="margin-top:20px"><div><h3>Perfis bloqueados</h3><div class="community-subtitle">Você pode desbloquear pessoas a qualquer momento.</div></div></div><div id="fcBlockedUsers"></div>
            </section>
            <section class="community-page" data-community-page="friends">
              <div class="community-heading"><div><h3>Seus amigos</h3><div class="community-subtitle">Solicitações de amizade e conexões.</div></div><button type="button" class="community-btn" data-action="refresh-friends">↻ Atualizar</button></div>
              <h4>Solicitações recebidas</h4><div id="fcIncoming"></div><h4>Solicitações enviadas</h4><div id="fcOutgoing"></div><h4>Amigos</h4><div id="fcFriends"></div>
            </section>
          </div>
        </div>
        <div class="community-bottom"><span class="community-muted">FRAME ID · contas opcionais · o editor continua disponível offline</span><div class="community-actions" style="margin:0"><button type="button" id="fcLogout" class="community-btn danger hidden" data-action="logout">Sair da conta</button><button type="button" class="community-btn" data-fc-close>Fechar</button></div></div>
      </dialog>`);
    const menu = $('#menupop');
    if (menu && !$('#communityOpenMenu')) {
      const group = doc.createElement('div'); group.className = 'menu-group'; group.textContent = 'Comunidade';
      const button = doc.createElement('button'); button.id = 'communityOpenMenu'; button.type = 'button'; button.innerHTML = '♧ FRAME Community <kbd>FRAME ID</kbd>';
      button.addEventListener('click', openDialog); menu.append(group, button);
    }
    $('#fcLoginForm').addEventListener('submit', async e => { e.preventDefault(); setStatus('Entrando…'); try { await doLogin(e.currentTarget); } catch (err) { setStatus(err.message, 'error'); } });
    $('#fcSignupForm').addEventListener('submit', async e => { e.preventDefault(); setStatus('Criando conta…'); try { await doSignup(e.currentTarget); } catch (err) { setStatus(err.message, 'error'); } });
    $('#fcProfileForm').addEventListener('submit', async e => { e.preventDefault(); setStatus('Salvando perfil…'); try { await saveProfile(); } catch (err) { setStatus(err.message, 'error'); } });
    $('#fcProfileBio').addEventListener('input', () => { $('#fcProfileBioCount').textContent = `${$('#fcProfileBio').value.length}/${BIO_MAX}`; });
    $('#fcAvatarFile').addEventListener('change', e => {
      const file = e.target.files?.[0]; if (!file) return;
      if (file.size > 2 * 1024 * 1024 || !/^image\/(png|jpeg|webp|gif)$/.test(file.type)) { setStatus('Escolha PNG, JPEG, WebP ou GIF de até 2 MB.', 'error'); e.target.value = ''; return; }
      state.avatarFile = file;
      const preview = $('#fcProfileAvatar'); preview.innerHTML = '';
      const url = URL.createObjectURL(file); const wrap = doc.createElement('div'); wrap.className = 'community-avatar';
      const img = doc.createElement('img'); img.alt = 'Prévia da foto de perfil'; img.src = url; img.onload = () => URL.revokeObjectURL(url); wrap.appendChild(img); preview.appendChild(wrap);
    });
    $('#fcSearch').addEventListener('input', () => {
      clearTimeout(state.searchTimer);
      state.searchTimer = setTimeout(async () => {
        const q = $('#fcSearch').value.trim();
        try {
          if (q) await loadProfiles({ search: q }); else { state.searchResults = null; await loadProfiles(); }
        } catch (err) { setStatus(err.message, 'error'); }
      }, 280);
    });
    $('#frameCommunityDialog').addEventListener('click', async e => {
      if (e.target?.matches?.('[data-fc-close]')) { $('#frameCommunityDialog').close(); return; }
      const tabButton = e.target.closest?.('[data-community-tab]');
      if (tabButton) { selectTab(tabButton.dataset.communityTab); return; }
      const authButton = e.target.closest?.('[data-auth-mode]');
      if (authButton) { state.authMode = authButton.dataset.authMode; renderAuthMode(); return; }
      const button = e.target.closest?.('[data-action]'); if (!button) return;
      const action = button.dataset.action; const userId = button.dataset.userId;
      try {
        button.disabled = true;
        if (action === 'refresh') await loadAll();
        else if (action === 'refresh-friends') await loadFriends();
        else if (action === 'load-more') await loadProfiles({ append: true });
        else if (action === 'recover') await doRecover();
        else if (action === 'logout') await doLogout();
        else if (action === 'friend-add') await addFriend(userId);
        else if (action === 'friend-accept') await respondFriend(button.dataset.requestId, 'accept');
        else if (action === 'friend-decline') await respondFriend(button.dataset.requestId, 'decline');
        else if (action === 'friend-remove') await removeFriend(userId);
        else if (action === 'block-user') await blockUser(userId);
        else if (action === 'unblock-user') await unblockUser(userId);
        else if (action === 'report-user') await reportUser(userId);
      } catch (err) { setStatus(err?.message || 'Ação não concluída.', 'error'); }
      finally { if (button.isConnected) button.disabled = false; }
    });
    $('#frameCommunityDialog').addEventListener('close', () => { setStatus(''); });
    renderAuthMode(); updateSessionUi();
  }
  async function openDialog() {
    buildDialog();
    if (!$('#frameCommunityDialog').open) $('#frameCommunityDialog').showModal();
    selectTab(state.tab || 'community');
    renderSetupState();
    if (getConfig()) await loadAll();
  }
  function init() {
    buildDialog();
    if (!getConfig()) renderSetupState();
    if (getSession()) {
      refreshSessionIfNeeded().then(() => { if (getSession()) loadAll().catch(() => {}); else updateSessionUi(); });
    }
    state.presenceTimer = root.setInterval(async () => {
      if (doc.visibilityState === 'hidden' || !getSession() || !state.profile || !getConfig()) return;
      await pingPresence();
    }, 45000);
    state.refreshTimer = root.setInterval(async () => {
      if ($('#frameCommunityDialog')?.open && getConfig()) await loadAll();
    }, 30000);
    doc.addEventListener('visibilitychange', () => { if (doc.visibilityState === 'visible' && getSession() && state.profile) pingPresence(); });
    root.addEventListener('beforeunload', () => {
      if (!getSession() || !state.profile || !getConfig()) return;
      const cfg = getConfig(); const url = `${cfg.url}/rest/v1/profiles?id=eq.${getSession().user.id}`;
      try { root.fetch(url, { method: 'PATCH', keepalive: true, headers: apiHeaders({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }, true), body: JSON.stringify({ last_seen_at: new Date(Date.now() - ONLINE_WINDOW_MS - 1000).toISOString() }) }); } catch {}
    });
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})(typeof window !== 'undefined' ? window : globalThis);
