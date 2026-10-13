# FRAME Studio 2.4.30 — Release Source Kit

Este arquivo é um pacote de código-fonte para aplicar ao repositório existente do FRAME Studio; não é um instalador nem um editor independente. Compare/mescle com o branch remoto atual antes de sobrescrever arquivos, para preservar commits mais recentes.

## Foco desta versão
- Exportação H.264 tenta os encoders de hardware disponíveis (VAAPI em Linux com GPU compatível, NVENC/Quick Sync/AMF no Windows e VideoToolbox no macOS) e recorre ao próximo encoder ou `libx264` se o hardware/driver não funcionar. O status do render informa o encoder usado.
- Preview ao arrastar o playhead agrupa sincronização e desenho por frame de animação e elimina o ciclo de redesenho contínuo durante seeks pendentes.
- Agrupamento preserva IDs dos clipes, transformações, máscaras, subgrupos e estado recolhido/ativo ao abrir projetos, restaurar autosaves e executar undo/redo; projetos antigos com group IDs sem uma tabela de grupos recuperam um grupo mínimo.
- Mantém as correções anteriores de órbita/pivot da câmera, multi-seleção, redimensionamento em conjunto, cores adaptativas, biblioteca de mídia e ferramentas empacotadas.

## Validação
`npm test` passou no workspace de edição, incluindo exportação de MP4 verificada com ffprobe, cancelamento, regressões de timeline, seeking, persistência de grupos e configuração do atualizador. O ambiente não expôs uma GPU, portanto o caminho de fallback foi exercitado, mas o encoding físico por GPU ainda precisa ser confirmado num computador com driver compatível. Também falta a build final do Electron e o teste visual no app empacotado.

Execute a partir de `frame-studio-linux`:
```sh
npm install --no-audit --no-fund
npm test
```

## Publicação e auto-update
- A versão no `frame-studio-linux/package.json` e a tag da release precisam coincidir exatamente (`2.4.30` / `v2.4.30`). Só publique `v2.4.30` se ela ainda não tiver sido usada e se for superior à release estável mais recente.
- A workflow executa quando a release no GitHub é publicada e constrói/associa instaladores e metadados (`latest.yml` para Windows NSIS e `latest-linux.yml` para Linux AppImage).
- Instalações Windows via NSIS e Linux via AppImage são os canais com atualização automática. ZIP/portátil e instalações Linux por DEB/RPM precisam de um caminho de atualização manual; um novo release não pode adicionar retroativamente um atualizador a binários antigos que nunca tiveram esse código.
