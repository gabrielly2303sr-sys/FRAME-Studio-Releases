## ✨ FRAME Studio ${VERSION}

### 🐛 Correções
- [FIX] Descreva os bugs corrigidos.

### ✨ Adicionado
- [ADDED] Liste recursos novos.

### ⚡ Melhorias
- [IMPROVED] Descreva melhorias de desempenho e UX.

### 🗑️ Removido
- [REMOVED] Liste recursos removidos ou descontinuados.

### 🧩 Compatibilidade
- [COMPATIBILITY] Informe plataformas, dependências e limitações.

### 📦 Downloads
Os instaladores e metadados desta versão são anexados pelo workflow do GitHub Actions após a compilação bem-sucedida.

## 2.4.24 draft notes — use only after manual verification
### [FIXED]
- Fixed video preview freezing or lagging behind the playhead while scrubbing the timeline.
- Scrubbing pauses playback, forwards the latest requested time to video decoders, and refines the final frame after release.

## FRAME Studio 2.4.24 — Critical Video Scrubbing Fix

### [FIXED]
- Scrubbing pauses active playback and continuously retargets video seeks to the current playhead.
- Removed keyframe-only fast seeking from interactive scrubbing; the final target frame is requested precisely on release.
- Invalidate cached compositor textures when new decoded video frames arrive.
