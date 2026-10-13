# FRAME Studio 2.4.30 — GPU Export, Faster Preview & Grouping Fixes

### 🐛 Correções
- O agrupamento mantém os IDs dos clipes, transformações, máscaras, subgrupos e estado recolhido ao abrir projetos, restaurar autosaves e desfazer/refazer ações.
- O scrubbing da timeline deixa de disparar seeks e redesenhos redundantes em cada evento do mouse; os frames são agrupados por frame de animação.
- Foi removido o ciclo de redraw contínuo enquanto um vídeo aguarda o seek.

### ⚡ Melhorias
- A exportação MP4 tenta usar codificação por hardware quando o FFmpeg e o dispositivo oferecem suporte: VAAPI no Linux, NVENC/Quick Sync/AMF no Windows e VideoToolbox no macOS.
- Se o driver, encoder ou hardware não aceitar a exportação, o FRAME Studio tenta o próximo encoder e por fim usa `libx264` por CPU para não bloquear a exportação.
- O status do render mostra qual encoder foi realmente usado e se houve aceleração por GPU.

### 🧩 Compatibilidade e atualização
- O formato dos projetos continua compatível com projetos 2.4.x; projetos existentes não exigem conversão.
- `frame-studio-linux/package.json` deve ter versão `2.4.30`, e a release no GitHub deve usar a tag `v2.4.30`.
- As atualizações automáticas são suportadas pelo instalador NSIS do Windows e AppImage do Linux. Instalações portáteis/ZIP, DEB e RPM não usam o mesmo fluxo de substituição automática.
- Testes automatizados passaram neste workspace. A compilação real do GitHub Actions e a confirmação de encoding na GPU precisam ser verificadas no release e no hardware de destino.
