# FRAME Studio 2.4.28

### 🐛 Correções
- A órbita da câmera respeita o pivot configurado e mantém a câmera apontada para ele. O ponto do pivot aparece apenas no preview do Scene Editor e não é exportado.
- Ctrl/Cmd-clique funciona para selecionar múltiplos clipes; redimensionar a borda de um clipe selecionado redimensiona todos os selecionados.
- Na troca entre clipes adjacentes do mesmo arquivo, o sincronizador escolhe o clipe ativo mais recente, evitando que o clipe anterior pause o vídeo/áudio no corte. O som do vídeo continua quando uma foto ou outra camada visual cobre a imagem.

### ✨ Adicionado / Melhorado
- Seletor de gradiente do acento com três cores e ângulo; modos Cor sólida, Gradiente personalizado, RGB cycle e RGB adaptativo ao fundo.
- Amostragem adaptativa da cor para imagem estática, GIF animado e vídeo de fundo, com controles de saturação e luminosidade.
- Formato dos projetos e configuração do atualizador preservados.
- A biblioteca de mídia agora permite remover um item do projeto e os clipes ligados a ele sem excluir o arquivo original do disco.

### 🧩 Compatibilidade
- `package.json` version e tag GitHub devem corresponder exatamente: `2.4.28` / `v2.4.28`.
- O workflow do GitHub Actions deve gerar os pacotes e metadados de atualização. Auto-update deve ser validado nos instaladores suportados Windows NSIS e Linux AppImage.
- Testes automatizados passaram; teste manual com o app empacotado continua necessário.
