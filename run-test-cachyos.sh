#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
APP="$ROOT/frame-studio-linux"
PROFILE="${XDG_DATA_HOME:-$HOME/.local/share}/frame-studio-2.4.41-preview"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Node.js e npm não estão instalados. No CachyOS, rode: sudo pacman -S --needed nodejs npm"
  exit 1
fi

if [[ ! -f "$APP/package.json" ]]; then
  echo "Não encontrei frame-studio-linux/package.json dentro de: $ROOT"
  exit 1
fi

VERSION="$(node -p "require('$APP/package.json').version")"
if [[ "$VERSION" != "2.4.41" ]]; then
  echo "Versão inesperada: $VERSION (esperado: 2.4.41). Abortando para evitar abrir o pacote errado."
  exit 1
fi

cd "$APP"
if [[ ! -x node_modules/.bin/electron ]]; then
  echo "Instalando dependências locais do preview..."
  npm install --no-audit --no-fund
fi

mkdir -p "$PROFILE"
echo "Perfil isolado de teste: $PROFILE"
echo "Versão: FRAME Studio $VERSION (preview local; não publicada)"
echo "Executando a suíte de regressão..."
if npm test; then
  echo "Testes automatizados: OK"
else
  echo "AVISO: houve falha em um ou mais testes no seu ambiente. Vou abrir o preview para inspeção manual; isso não significa que o build passou."
fi

echo "Abrindo FRAME Studio 2.4.41 em perfil separado. Para fechar, use Alt+F4 ou feche a janela."
FRAME_STUDIO_USER_DATA_DIR="$PROFILE" npm start
