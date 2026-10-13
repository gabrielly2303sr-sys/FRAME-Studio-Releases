## ✨ FRAME Studio 2.4.34 — Preview, RGB, áudio e exportação

### 🐛 Corrigido
- A grade do editor de câmera 3D não aparece mais dentro da composição final da câmera.
- Gradientes RGB da interface voltam a animar, respeitando movimento reduzido.
- A aba Comunidade e sua integração externa foram removidas por completo do pacote executável.

### ✨ Adicionado
- Modificadores de voz não destrutivos na exportação: telefone, rádio, eco e robótico.
- Tentativa de codificação H.264 por hardware quando disponível, com fallback automático para `libx264`.
- Preset de codificação por software `veryfast` como padrão para novas instalações.

### 🧩 Compatibilidade
- Mantém o formato de projetos e o fluxo de edição existentes.
- Legendas por reconhecimento de fala, importação/modelagem 3D completa, luzes e posing R6 foram adiados para evitar recursos incompletos.

### 📦 Downloads
Os instaladores Windows/Linux e os metadados de atualização devem ser anexados pelo GitHub Actions após os builds e testes passarem.
