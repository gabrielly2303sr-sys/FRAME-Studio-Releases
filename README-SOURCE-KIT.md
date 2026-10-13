# FRAME Studio 2.4.34 — Source kit

Esta atualização prioriza compatibilidade e estabilidade em relação a recursos grandes que ainda precisariam de um motor 3D e reconhecimento de fala.

## Alterações desta versão
- Remove totalmente a aba Comunidade, seus scripts de runtime, configuração, SQL e teste dedicado.
- Evita desenhar a grade do editor de cena dentro da composição final da câmera.
- Anima os gradientes RGB da interface novamente e mantém o respeito à configuração de movimento reduzido.
- Adiciona modificadores não destrutivos na exportação de áudio: telefone, rádio, eco e robótico.
- Tenta encoders H.264 por hardware disponíveis no FFmpeg; se falharem, usa `libx264`. O resultado depende do sistema, do driver e do FFmpeg.
- Usa `veryfast` como preset de codificação por software padrão em novas instalações.

## Recursos deliberadamente adiados
Legendas automáticas com detecção de inglês e português brasileiro exigem um mecanismo de fala e um modelo de reconhecimento que não estão incluídos. A importação de modelos 3D texturizados, iluminação de cena e rig/posing R6 precisam de um sistema de renderização 3D real; para evitar interfaces incompletas e regressões, essas ideias não foram simuladas nesta versão.

## Testar e compilar
Na pasta `frame-studio-linux`:

```bash
npm install
npm test
npm run build:linux:appimage
```

O ZIP é código-fonte, não um AppImage já compilado.
