# Publicar FRAME Studio 2.4.32 pelo terminal (CachyOS / Fish ou Bash)

Este guia usa o clone conhecido `~/Downloads/FRAME-Studio-Releases-auto`. Troque o caminho se o seu clone estiver em outro local. Os comandos evitam construções exclusivas do Bash, exceto quando você optar por executá-los explicitamente em Bash.

## 1. Extrair o pacote e conferir suas alterações locais

```sh
cd ~/Downloads
unzip -o FRAME-Studio-2.4.32-Community-Source.zip -d FRAME-Studio-2.4.32-Community-Source
cd ~/Downloads/FRAME-Studio-Releases-auto
git status --short
```

Salve as mudanças locais que você precisa manter antes de continuar. Atualize e crie uma branch para que você possa revisar tudo antes de integrar ao `main`:

```sh
git switch main
git pull --ff-only origin main
git switch -c feature/frame-community-2.4.32
cp -a ~/Downloads/FRAME-Studio-2.4.32-Community-Source/frame-studio-linux/. frame-studio-linux/
cp -a ~/Downloads/FRAME-Studio-2.4.32-Community-Source/.github/. .github/
cp ~/Downloads/FRAME-Studio-2.4.32-Community-Source/README-COMMUNITY-2.4.32.md .
cp ~/Downloads/FRAME-Studio-2.4.32-Community-Source/PROMPT-FRAME-COMMUNITY-2.4.32.md .
cp ~/Downloads/FRAME-Studio-2.4.32-Community-Source/PUBLISH-2.4.32.md .
cp ~/Downloads/FRAME-Studio-2.4.32-Community-Source/RELEASE-VERIFICATION-2.4.32.md .
cp ~/Downloads/FRAME-Studio-2.4.32-Community-Source/README-SOURCE-KIT.md .
```

## 2. Configurar o backend da comunidade

Antes de oferecer contas públicas de verdade, crie um projeto Supabase, execute `frame-studio-linux/SUPABASE_SETUP.sql` no SQL Editor e preencha `supabaseUrl` e `supabaseAnonKey` em `frame-studio-linux/community-config.js` com a URL HTTPS e a chave publicável/anon do projeto. **Nunca** coloque `service_role` ou outro segredo no aplicativo. Até o backend ser configurado, o editor continua funcionando, mas o sistema social fica desativado e não exibe estatísticas inventadas.

Confira também a confirmação de e-mail, os templates de e-mail, o endereço remetente e a URL de redirecionamento em Auth no Supabase. O botão de recuperação solicita o envio de e-mail; o redirecionamento final de redefinição de senha precisa ser validado para seu projeto antes de anunciar o fluxo como concluído.

## 3. Testar e conferir a versão

```sh
cd frame-studio-linux
npm install --no-audit --no-fund
npm test
node -p "require('./package.json').version"
cd ..
git diff --check
git diff --stat
```

O comando de versão precisa imprimir exatamente `2.4.32`. Revise `git status --short` e `git diff` antes de enviar. `npm install` pode criar um `package-lock.json` porque o pacote-fonte de entrada não possui lockfile; inclua-o apenas se você quiser manter o lockfile como parte do projeto.

## 4. Commit e push da branch

```sh
git add frame-studio-linux .github README-COMMUNITY-2.4.32.md PROMPT-FRAME-COMMUNITY-2.4.32.md PUBLISH-2.4.32.md RELEASE-VERIFICATION-2.4.32.md README-SOURCE-KIT.md
git commit -m "Add FRAME ID and community for 2.4.32"
git push -u origin feature/frame-community-2.4.32
```

Revise a branch no GitHub e faça merge para `main`. Não crie a tag até que o `main` integrado esteja na versão `2.4.32` e os testes passem.

## 5. Publicar a release depois do merge

```sh
cd ~/Downloads/FRAME-Studio-Releases-auto
git switch main
git pull --ff-only origin main
node -e "const v=require('./frame-studio-linux/package.json').version; console.log('package.json version:',v); if(v!=='2.4.32') process.exit(1)"
```

Confira se a release ainda não existe:

```sh
gh release view v2.4.32 --repo gabrielly2303sr-sys/FRAME-Studio-Releases
```

Se `v2.4.32` já existir, pare e confira seus assets; não a apague nem force a tag automaticamente. Se o GitHub informar que essa release não existe, prossiga:

```sh
git tag -a v2.4.32 -m "FRAME Studio v2.4.32"
git push origin v2.4.32
gh release create v2.4.32 --repo gabrielly2303sr-sys/FRAME-Studio-Releases --target main --title "FRAME Studio 2.4.32" --notes-file .github/RELEASE_TEMPLATE.md
```

A publicação dispara o GitHub Actions, que confere a tag contra o `package.json`, roda os testes e empacota os artefatos. Só considere a release pronta depois que os jobs de Windows e Linux terminarem com sucesso e anexarem seus arquivos. A criação do ZIP não publica a release nem valida os builds reais.
