#!/usr/bin/env bash
set -euo pipefail

SRC_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
VERSION="$(sed -n 's/^[[:space:]]*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$SRC_DIR/package.json" | head -n1)"
VERSION="${VERSION:-2.4.33}"
INSTALL_DIR="$HOME/.local/opt/frame-studio"
APPS_DIR="$HOME/.local/share/applications"
BIN_DIR="$HOME/.local/bin"

mkdir -p "$INSTALL_DIR" "$APPS_DIR" "$BIN_DIR"

# Source/development installs prepare media tools automatically before copying the app.
# The official AppImage/DEB/RPM/NSIS packages receive the tools during CI packaging.
if command -v node >/dev/null 2>&1 && [[ -f "$SRC_DIR/scripts/prepare-bundled-tools.cjs" ]]; then
  if ! node "$SRC_DIR/scripts/prepare-bundled-tools.cjs" --quiet --allow-missing; then
    echo "Warning: media-tool bootstrap failed. The editor will still install; retry while connected to the internet."
  fi
fi

# Copy current application files.
cp "$SRC_DIR/package.json" "$SRC_DIR/main.cjs" "$SRC_DIR/preload.cjs" "$SRC_DIR/media-export.cjs" "$SRC_DIR/media-tools.cjs" "$SRC_DIR/media-range.cjs" "$SRC_DIR/video-preview-seek.js" "$SRC_DIR/index.html" "$SRC_DIR/customization.js" "$SRC_DIR/gif-decoder.js" "$INSTALL_DIR/"
rm -f "$INSTALL_DIR/model-runtime.js" "$INSTALL_DIR/frame-model-runtime.bundle.js"
if [[ -d "$SRC_DIR/scripts" ]]; then cp -a "$SRC_DIR/scripts" "$INSTALL_DIR/"; fi

# Copy bundled tools and nested license notices; preserve the executable modes.
if [[ -d "$SRC_DIR/vendor/linux" ]]; then
  mkdir -p "$INSTALL_DIR/vendor/linux"
  cp -a "$SRC_DIR/vendor/linux/." "$INSTALL_DIR/vendor/linux/"
  for tool in ffmpeg ffprobe yt-dlp; do
    [[ ! -f "$INSTALL_DIR/vendor/linux/$tool" ]] || chmod 755 "$INSTALL_DIR/vendor/linux/$tool"
  done
fi
if [[ -f "$SRC_DIR/THIRD_PARTY_NOTICES.md" ]]; then
  cp -f "$SRC_DIR/THIRD_PARTY_NOTICES.md" "$INSTALL_DIR/THIRD_PARTY_NOTICES.md"
fi

# Prefer the Electron package maintained by Arch/CachyOS. This avoids npm's
# install-script approval issue and uses a system-updated runtime.
if [[ -x /usr/bin/electron ]]; then
  RUNTIME='system'
else
  if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    echo "Install Node.js and npm to prepare the local Electron runtime."
    if command -v apt-get >/dev/null 2>&1; then
      echo "  sudo apt update && sudo apt install nodejs npm unzip"
    else
      echo "  sudo pacman -S --needed nodejs npm unzip"
    fi
    exit 1
  fi
  printf 'System Electron was not found; preparing a local runtime...\n'
  if ! npm install --prefix "$INSTALL_DIR" --include=dev; then
    echo "Dependency installation failed. On CachyOS, prefer: sudo pacman -S --needed electron"
    exit 1
  fi
  if [[ ! -x "$INSTALL_DIR/node_modules/electron/dist/electron" ]]; then
    npm install-scripts approve electron || true
    npm rebuild electron || true
  fi
  if [[ ! -x "$INSTALL_DIR/node_modules/electron/dist/electron" ]]; then
    echo "The local Electron runtime was not installed correctly. Install the system package:"
    echo "  sudo pacman -S --needed electron"
    exit 1
  fi
  RUNTIME='local'
fi

cat > "$INSTALL_DIR/launch.sh" <<'LAUNCH'
#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/.local/opt/frame-studio"
# Self-heal a source installation if tools are missing; official packages already include them.
if command -v node >/dev/null 2>&1 && [[ -f "$HOME/.local/opt/frame-studio/scripts/prepare-bundled-tools.cjs" ]]; then
  if [[ ! -x "$HOME/.local/opt/frame-studio/vendor/linux/yt-dlp" || ! -x "$HOME/.local/opt/frame-studio/vendor/linux/ffmpeg" || ! -x "$HOME/.local/opt/frame-studio/vendor/linux/ffprobe" ]]; then
    node "$HOME/.local/opt/frame-studio/scripts/prepare-bundled-tools.cjs" --quiet --allow-missing || true
  fi
fi
if [[ -x /usr/bin/electron ]]; then
  exec /usr/bin/electron . "$@"
fi
if [[ -x "$HOME/.local/opt/frame-studio/node_modules/electron/dist/electron" ]]; then
  exec "$HOME/.local/opt/frame-studio/node_modules/.bin/electron" . "$@"
fi
echo "Electron runtime is missing from this source installation." >&2
exit 1
LAUNCH
chmod +x "$INSTALL_DIR/launch.sh"

cat > "$BIN_DIR/frame-studio" <<'LAUNCH'
#!/usr/bin/env bash
exec "$HOME/.local/opt/frame-studio/launch.sh" "$@"
LAUNCH
chmod +x "$BIN_DIR/frame-studio"

cat > "$APPS_DIR/frame-studio.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=FRAME Studio $VERSION
GenericName=Video Editor
Comment=Local video and animation editor
Exec=$INSTALL_DIR/launch.sh
Icon=video-editor
Terminal=false
Categories=AudioVideo;Video;Editing;
StartupNotify=true
DESKTOP
chmod 644 "$APPS_DIR/frame-studio.desktop"
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$APPS_DIR" >/dev/null 2>&1 || true
fi

echo
echo "FRAME Studio $VERSION installed/updated. Runtime: $RUNTIME"
if [[ ! -x "$INSTALL_DIR/vendor/linux/ffmpeg" || ! -x "$INSTALL_DIR/vendor/linux/ffprobe" || ! -x "$INSTALL_DIR/vendor/linux/yt-dlp" ]]; then
  echo "Warning: bundled media tools could not be prepared automatically. No separate install is needed for official release packages; retry this source install with an internet connection."
fi
if ! command -v unzip >/dev/null 2>&1; then
  echo "Warning: unzip was not found; importing fonts from ZIP will be unavailable."
  if command -v apt-get >/dev/null 2>&1; then echo "Install with: sudo apt install unzip"; else echo "Install with: sudo pacman -S --needed unzip"; fi
fi
echo "Open from the KDE app menu or run: ~/.local/bin/frame-studio"
read -r -p "Open FRAME Studio now? [Y/n] " answer
if [[ ! "$answer" =~ ^[Nn]$ ]]; then
  "$INSTALL_DIR/launch.sh" || true
fi
