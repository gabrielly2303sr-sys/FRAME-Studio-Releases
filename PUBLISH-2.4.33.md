# Publicar FRAME Studio 2.4.33 pelo terminal (CachyOS / Fish)

Todos os comandos abaixo funcionam no **fish**. Ajuste o caminho do clone se for diferente de `~/Downloads/FRAME-Studio-Releases-auto`.
Pré-requisito: `gh auth status` mostrando que você está logada.

## 1. Extrair o ZIP e atualizar o clone

```fish
cd ~/Downloads
rm -rf FRAME-2.4.33-src
unzip -o FRAME-Studio-2_4_33-CI-Fixed.zip -d FRAME-2.4.33-src
set SRC ~/Downloads/FRAME-2.4.33-src/FRAME-Studio-2.4.33-Community-Source

cd ~/Downloads/FRAME-Studio-Releases-auto
git status --short
git switch main
git pull --ff-only origin main
```

Se o `git status --short` mostrar mudanças suas que você quer manter, faça commit ou `git stash` antes de continuar.

## 2. Copiar os arquivos novos para o repositório

```fish
cp -a $SRC/frame-studio-linux/. frame-studio-linux/
cp -a $SRC/.github/. .github/
cp $SRC/README-SOURCE-KIT.md $SRC/PUBLISH-2.4.33.md $SRC/CI-FIX-2.4.33.md .
git rm -q --ignore-unmatch PUBLISH-2.4.32.md RELEASE-VERIFICATION-2.4.32.md CI-FIX-2.4.32.md
```

## 3. Conferir a versão e testar

```fish
cd frame-studio-linux
npm install --no-audit --no-fund
npm test
node -p "require('./package.json').version"
cd ..
```

O comando de versão precisa imprimir exatamente `2.4.33`. (O `npm test` local usa o `ffmpeg`/`ffprobe` do sistema: `sudo pacman -S ffmpeg` se faltar.)

## 4. Commit e push no main

```fish
git add -A
git status --short
git commit -m "FRAME Studio 2.4.33: fix Windows export test and Linux FFmpeg download in CI"
git push origin main
```

## 5. Criar a release (isso dispara o GitHub Actions)

Confira que a release ainda não existe:

```fish
gh release view v2.4.33 --repo gabrielly2303sr-sys/FRAME-Studio-Releases
```

Se aparecer "release not found", crie. O `gh` cria a tag `v2.4.33` a partir do `main` que você acabou de enviar:

```fish
gh release create v2.4.33 --repo gabrielly2303sr-sys/FRAME-Studio-Releases --target main --title "FRAME Studio 2.4.33" --notes-file .github/RELEASE_TEMPLATE.md
```

Não use `--draft` nem `--prerelease`: o workflow só roda em release **publicada**, e o auto-update ignora pré-releases.

## 6. Acompanhar o build

```fish
gh run list --repo gabrielly2303sr-sys/FRAME-Studio-Releases --limit 3
gh run watch --repo gabrielly2303sr-sys/FRAME-Studio-Releases
```

Pronto quando os jobs Windows, Linux e "Attach installers" terminarem verdes. Depois confira os arquivos anexados:

```fish
gh release view v2.4.33 --repo gabrielly2303sr-sys/FRAME-Studio-Releases --json assets --jq '.assets[].name'
```

Devem aparecer: `latest.yml`, `latest-linux.yml`, `FRAME-Studio-2.4.33-Setup-x64.exe` (+ `.blockmap`), `FRAME-Studio-2.4.33-x86_64.AppImage`, `.deb` e `.rpm`.

## 7. Se algum job falhar

- Falha de rede passageira (download do FFmpeg, por exemplo): `gh run rerun <ID-da-execução> --failed --repo gabrielly2303sr-sys/FRAME-Studio-Releases`
- Falha que exige mudar código: corrija, faça commit/push no main e recrie a release **enquanto ninguém tiver baixado ela**:

```fish
gh release delete v2.4.33 --repo gabrielly2303sr-sys/FRAME-Studio-Releases --cleanup-tag --yes
git fetch --prune --prune-tags origin
gh release create v2.4.33 --repo gabrielly2303sr-sys/FRAME-Studio-Releases --target main --title "FRAME Studio 2.4.33" --notes-file .github/RELEASE_TEMPLATE.md
```

Depois que usuários já instalaram uma versão, nunca reutilize o número: publique 2.4.34.

## Como manter o auto-update funcionando

1. **Versão**: `package.json` e a tag precisam ser iguais (`2.4.33` ↔ `v2.4.33`; o workflow falha se divergirem) e sempre maiores que a anterior. Nunca republique um número já distribuído.
2. **Release publicada**, não rascunho nem pré-release (`allowPrerelease` está desligado).
3. **Arquivos obrigatórios na release**: `latest.yml` (Windows) e `latest-linux.yml` (AppImage), mais o instalador `*-Setup-x64.exe`, os `.blockmap` e o `.AppImage`. O job "Attach installers" já anexa tudo; não renomeie, apague ou substitua esses arquivos à mão.
4. **Não mude** em `package.json` os campos `build.publish` (owner `gabrielly2303sr-sys`, repo `FRAME-Studio-Releases`), `appId` (`com.frame.studio`) nem os `artifactName`. O repositório precisa ser público (repositório privado exigiria token embutido no app).
5. **Quem atualiza sozinho**: instalador Windows (NSIS) e AppImage no Linux. Portable, `.deb` e `.rpm` não atualizam automaticamente (por design em `main.cjs`).
6. **Como o usuário recebe**: o app checa ~9 s depois de abrir e a cada 6 h, pergunta se quer baixar e instala ao confirmar. Se a release existir antes dos arquivos (durante o build), o app tenta de novo com intervalo crescente.
