## ✨ FRAME Studio 2.4.33 — Estabilidade do pipeline de release

### 🐛 Correções e compatibilidade
- [FIX] Build Windows: o teste de cancelamento de exportação não usa mais script com shebang (que o Windows não executa).
- [FIX] Build Linux: download do FFmpeg agora usa builds hospedados no GitHub, com fallback e novas tentativas.
- [COMPATIBILITY] Auto-update, formato de projetos e FRAME ID/Comunidade permanecem inalterados (herdados da 2.4.32).
- [FIX] O sistema social é opcional e isolado do mecanismo de edição local.
- [COMPATIBILITY] Formato dos projetos, timeline, preview, exportação e canal de auto-update permanecem inalterados.

### ✨ Adicionado
- [ADDED] FRAME ID: cadastro, login, solicitação de recuperação por e-mail e sessão persistente por Supabase Auth.
- [ADDED] Perfil público com foto, nome, @usuário, bio e pronomes opcionais.
- [ADDED] Comunidade com pesquisa, total de membros, contador online, atualização periódica e paginação.
- [ADDED] Pedidos de amizade, aceitar/recusar, lista de amigos, remover amizade, bloquear/desbloquear e denunciar perfil.
- [ADDED] `SUPABASE_SETUP.sql` com schema e políticas RLS para perfis, amizades, bloqueios, denúncias e upload de avatares.

### 🧩 Configuração necessária
- Preencher `frame-studio-linux/community-config.js` com a URL HTTPS e a chave publishable/anon do projeto Supabase.
- Executar `frame-studio-linux/SUPABASE_SETUP.sql` no SQL Editor do Supabase.
- Nunca usar a chave `service_role` no app cliente. Sem backend configurado, a edição offline continua funcionando e a comunidade não exibe dados falsos. O redirecionamento final de redefinição de senha precisa ser validado na configuração Auth do Supabase.

### 📦 Downloads
Os instaladores Windows e Linux e os metadados de atualização devem ser anexados pelo workflow do GitHub Actions após todos os builds e testes passarem.
