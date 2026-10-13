# Publicar FRAME Studio 2.4.34 (CachyOS / Fish)

1. Extraia `FRAME-Studio-2.4.34-Source.zip` em `~/Downloads/FRAME-Studio-2.4.34-Source`.
2. Confira se seu clone está limpo antes de copiar os arquivos. Não descarte mudanças locais.

```fish
cd ~/Downloads/FRAME-Studio-Releases-auto
git status --short --branch
git switch main
git pull --ff-only origin main
set SRC "$HOME/Downloads/FRAME-Studio-2.4.34-Source"

cp -a "$SRC/frame-studio-linux/." frame-studio-linux/
cp -a "$SRC/.github/." .github/
cp "$SRC/README-SOURCE-KIT.md" "$SRC/PUBLISH-2.4.34.md" "$SRC/CI-FIX-2.4.34.md" .
git rm --ignore-unmatch frame-studio-linux/community.js frame-studio-linux/community.css frame-studio-linux/community-config.js frame-studio-linux/SUPABASE_SETUP.sql frame-studio-linux/tests/community.test.js README-COMMUNITY-2.4.33.md

cd frame-studio-linux
npm install --no-audit --no-fund
npm test
node -p "require('./package.json').version"
cd ..
```

A versão precisa imprimir `2.4.34` e os testes devem passar antes de publicar. Depois revise `git status --short` e o diff.

```fish
git add -A
git commit -m "FRAME Studio 2.4.34: remove community, fix RGB/camera preview, add voice effects and hardware export fallback"
git push origin main
```

Antes de criar release, confira se `v2.4.34` já existe. Nunca force nem reutilize uma tag publicada.

```fish
gh release view v2.4.34 --repo gabrielly2303sr-sys/FRAME-Studio-Releases
```

Somente se não existir e o push do `main` estiver correto, crie a release: `gh release create v2.4.34 --repo gabrielly2303sr-sys/FRAME-Studio-Releases --target main --title "FRAME Studio 2.4.34" --notes-file .github/RELEASE_TEMPLATE.md`. Depois acompanhe https://github.com/gabrielly2303sr-sys/FRAME-Studio-Releases/actions.

A release é finalizada quando os builds/testes de Linux e Windows ficam verdes e os artefatos esperados estão anexados. O ZIP fonte não é, por si só, um AppImage compilado.
