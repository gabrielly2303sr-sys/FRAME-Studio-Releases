#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
APP="$ROOT/frame-studio-linux"
BUILD_ONLY=0
if [[ "${1:-}" == "--build-only" ]]; then BUILD_ONLY=1; fi

for tool in node npm; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "Falta $tool. No CachyOS, instale com: sudo pacman -S --needed nodejs npm"
    exit 1
  fi
done

if [[ ! -f "$APP/package.json" ]]; then
  echo "Não encontrei o código do FRAME Studio em: $APP"
  exit 1
fi

cd "$APP"
echo "== FRAME Studio 2.4.41 — build de teste =="
echo "1/3 — Instalando dependências do Electron..."
npm install --no-audit --no-fund

echo "2/3 — Executando testes de regressão..."
npm test

echo "3/3 — Gerando AppImage x86_64..."
npm run build:linux:appimage

APPIMAGE="$APP/dist/FRAME-Studio-$(node -p "require('./package.json').version")-x64.AppImage"
if [[ ! -f "$APPIMAGE" ]]; then
  APPIMAGE="$(find "$APP/dist" -maxdepth 1 -type f -name '*.AppImage' -printf '%T@ %p\n' | sort -nr | head -n1 | cut -d' ' -f2-)"
fi
if [[ -z "${APPIMAGE:-}" || ! -f "$APPIMAGE" ]]; then
  echo "O build terminou sem gerar um arquivo .AppImage em $APP/dist"
  exit 1
fi
chmod +x "$APPIMAGE"
echo
echo "AppImage gerado: $APPIMAGE"
echo "Para executar manualmente: APPIMAGE_EXTRACT_AND_RUN=1 '$APPIMAGE'"

if [[ "$BUILD_ONLY" -eq 1 ]]; then exit 0; fi

PROFILE="$HOME/.local/share/frame-studio-2.4.41-hotfix3-test"
mkdir -p "$PROFILE"
echo
echo "Abrindo em perfil isolado: $PROFILE"
echo "Atualizações automáticas desativadas nesta sessão de teste."
FRAME_STUDIO_TEST_PREVIEW=1 \
FRAME_STUDIO_DISABLE_UPDATES=1 \
FRAME_STUDIO_USER_DATA_DIR="$PROFILE" \
APPIMAGE_EXTRACT_AND_RUN=1 \
"$APPIMAGE"
