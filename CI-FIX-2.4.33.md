# FRAME Studio 2.4.33 — CI fixes

## Windows: `tests/export-integration.js` falhava no teste de cancelamento
Causa: o teste criava um "ffmpeg falso" como script `#!/usr/bin/env node`. Linux executa shebang; Windows não. O `spawn` falhava e o app reportava "FFmpeg is not available in this development run", em vez de `EXPORT_CANCELED`.
Correção: no Windows o stand-in agora é `fake-ffmpeg.exe` (cópia do `node.exe`), encerrado pelo sinal de cancelamento logo após o spawn. Em Linux nada mudou.

## Linux: `curl: (28) Failed to connect to johnvansickle.com`
Causa: o servidor do johnvansickle.com ficou inacessível a partir dos runners do GitHub.
Correção: o workflow (e o `scripts/prepare-bundled-tools.cjs`) baixa primeiro do GitHub (BtbN/FFmpeg-Builds), depois usa o johnvansickle.com como alternativa, com `--retry`, `--connect-timeout` e `--max-time`.

Obs.: `npm test` foi executado localmente em Linux. Os jobs reais do GitHub Actions (Windows e Linux) só são confirmados depois de rodarem no GitHub.
