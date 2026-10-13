# FRAME Studio 2.4.34 — CI e regressões

O workflow existente continua responsável por baixar/preparar ferramentas de mídia e compilar os pacotes oficiais. Esta versão foi validada com `npm test`; os testes de exportação produziram MP4s H.264/AAC válidos usando FFmpeg no ambiente de teste.

A exportação tenta encoders H.264 por hardware expostos por `ffmpeg -encoders` e valida o MP4 gerado. Se um encoder não inicializar ou gerar saída incompatível, remove a saída parcial e segue para outra opção; `libx264` permanece como fallback. A disponibilidade real de GPU precisa ser confirmada no sistema e na build de FFmpeg do usuário.
