# Prompt — FRAME Studio 2.4.32: FRAME ID & Community

Analise o repositório atual do FRAME Studio e implemente a versão **2.4.32**, adicionando uma comunidade social opcional sem quebrar funcionalidades já existentes. Use o código e o fluxo de build presentes no repositório; não reescreva o editor e não faça grandes refatorações da timeline, do preview, da exportação ou do auto-update.

## Funcionalidades necessárias

1. **FRAME ID / contas**: cadastro por e-mail e senha, login, logout, recuperação de senha, confirmação de e-mail quando habilitada pelo backend e sessão persistente com refresh seguro. O editor precisa continuar funcionando offline sem login.
2. **Perfil**: avatar PNG/JPEG/WebP/GIF com limite de 2 MB, nome de exibição, @usuário único (3–24 caracteres alfanuméricos, ponto, hífen ou underscore), bio com limite de 160 caracteres e pronomes opcionais com limite de 40 caracteres. O e-mail nunca pode aparecer em consultas/listagens públicas.
3. **Menu Comunidade**: modal/página integrada ao menu do app e compatível com o tema escuro e accent/gradient do FRAME. Mostrar todos os perfis paginados, busca por nome/@usuário, total real de cadastros e total online real.
4. **Presença**: heartbeat de última atividade, atualização após retomar foco e status online com prazo de expiração. Não inventar números quando backend estiver fora do ar; apresentar mensagens de erro úteis sem bloquear edição.
5. **Amizades**: enviar, aceitar, recusar e cancelar pedidos, lista de amigos, remover amizade, estado visual do pedido e atualizar os dados após as ações.
6. **Segurança social**: bloquear/desbloquear usuários e denunciar perfil. Armazenar denúncias para revisão do proprietário do backend. Evitar injeção de HTML: inserir dados de perfil via textContent/DOM seguro, validar URLs de avatar, validar tamanhos/tipos de upload e aplicar limites server-side.
7. **Backend**: preferir Supabase Auth + Postgres + Storage; incluir SQL reproduzível com RLS, funções RPC para operações de amizade e bloqueio, políticas de avatar, índices e documentação. A configuração client-side pode conter apenas URL HTTPS e publishable/anon key. Nunca incorporar `service_role`, segredos ou senhas no app.

## Requisitos de compatibilidade

- Definir `package.json.version`, título, badge da UI, changelog, release notes e metadados coerentemente como `2.4.32`.
- Atualizar explicitamente `build.files` para incluir todos os scripts, estilos e config usados em runtime.
- Respeitar a Content Security Policy: permitir somente os endpoints necessários de Supabase, mantendo `script-src 'self'` e sem `eval`/scripts remotos.
- Não modificar o formato dos projetos nem exigir conta para abrir, editar, salvar, visualizar ou exportar projeto.
- Não alterar a lógica de release/auto-update além do necessário. A tag `v2.4.32` deve corresponder exatamente ao `package.json`.
- Atualizar `npm test` com testes de regressão para validação de username, status online, sanitização de perfil, presença dos arquivos em build.files, CSP, scripts, SQL/RLS e versionamento. Não remover ou enfraquecer testes existentes.
- Não afirmar que os builds do Windows/Linux ou a configuração Supabase foram testados caso isso não tenha sido executado realmente.

## Critérios de aceitação

- `npm test` passa sem remover os testes anteriores.
- O projeto inicia mesmo com `community-config.js` vazio; o app mostra configuração pendente, não falha e não exibe estatísticas falsas.
- Com Supabase corretamente configurado e SQL aplicado, cadastro/login, perfil, avatar, listagem/contadores, presença, amigos, bloqueios e denúncias funcionam.
- Builds Windows e Linux contêm os novos arquivos e a verificação de release não aceita tag incompatível.
- Entregar ZIP de código-fonte, arquivo SQL, documentação de configuração e comandos de terminal para testar, commitar, taggear e publicar a release.
