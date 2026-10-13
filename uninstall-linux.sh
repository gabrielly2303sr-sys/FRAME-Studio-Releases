#!/usr/bin/env bash
set -euo pipefail
rm -rf "$HOME/.local/opt/frame-studio"
rm -f "$HOME/.local/bin/frame-studio" "$HOME/.local/share/applications/frame-studio.desktop"
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$HOME/.local/share/applications" >/dev/null 2>&1 || true
fi
echo "FRAME Studio removido. Projetos e arquivos de mídia não foram apagados."
