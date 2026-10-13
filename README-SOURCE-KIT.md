# FRAME Studio 2.4.32 — FRAME ID & Community Source Kit

Este pacote incrementa a base FRAME Studio 2.4.31 para 2.4.32, adicionando um sistema social opcional. O editor continua funcionando sem conta ou conexão.

## Recursos
- FRAME ID: cadastro, login, logout, recuperação de senha e sessão persistente.
- Perfil público: foto (PNG/JPEG/WebP/GIF, até 2 MB), nome, @usuário único, bio e pronomes.
- Comunidade paginada, busca, total real de membros e presença online por heartbeat.
- Pedidos de amizade, aceitar/recusar/cancelar, remover amizades, bloquear/desbloquear e denunciar perfis.
- Supabase Auth, Postgres, Storage e políticas RLS documentadas em `frame-studio-linux/SUPABASE_SETUP.sql`.
- Regressão para remoção de mídia da biblioteca e verificação da versão de release em CI.

## Preparação obrigatória do backend
Crie um projeto Supabase, execute o SQL fornecido e configure apenas URL HTTPS + publishable/anon key em `frame-studio-linux/community-config.js`. Nunca incorpore uma `service_role` key. Até essa configuração, as funções sociais aparecem como desativadas, sem contadores falsos.

## Testes
Na pasta `frame-studio-linux`: `npm install --no-audit --no-fund` e `npm test`. A suíte automatizada passou neste workspace. Os builds empacotados Windows/Linux e o fluxo real do Supabase ainda precisam de teste antes da release pública.

## Publicação
Siga `PUBLISH-2.4.32.md`. Este ZIP não cria uma release nem envia commits ao GitHub.
