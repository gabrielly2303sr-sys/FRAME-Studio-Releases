/* FRAME Studio application chrome customization. Backgrounds never enter project renders. */
(function (root) {
  'use strict';
  const DEFAULTS = Object.freeze({
    language: 'en-US', accent: '#b5f36c', accentMode: 'solid', accentSaturation: 82, accentLightness: 58, accentSpeed: 5, accentGradient: { angle: 110, stops: [{ position: 0, color: '#00e5ff' }, { position: 50, color: '#af52ff' }, { position: 100, color: '#ff3264' }] }, backgroundPath: '', backgroundName: '', backgroundKind: 'image',
    bgFit: 'cover', tint: '#101013', blur: 8, overlay: 48, brightness: 85, saturation: 100,
    bgX: 50, bgY: 50, uiOpacity: 92, glass: 8, aura: true, reduceMotion: false, compact: false
  });
  const TRANSLATIONS = {
    'FRAME Studio': 'FRAME Studio', '⌂ Início': '⌂ Home', 'Início': 'Home', '☰ Menu': '☰ Menu', '⚙ Aparência': '⚙ Appearance',
    'Personalizar aparência e idioma': 'Customize appearance and language',
    'Modo da cor de destaque': 'Accent color mode', 'Cor sólida': 'Solid color', 'RGB dinâmico': 'RGB cycle', 'RGB adaptativo ao fundo': 'Background-adaptive RGB', 'Gradiente personalizado': 'Custom gradient', 'Escolher gradiente…': 'Choose gradient…', 'Editor do gradiente de acento': 'Accent gradient editor', 'Ângulo do gradiente': 'Gradient angle', 'Ponto 1': 'Stop 1', 'Ponto 2': 'Stop 2', 'Ponto 3': 'Stop 3', 'Aplicar gradiente': 'Apply gradient', 'Saturação do acento': 'Accent saturation', 'Luminosidade do acento': 'Accent lightness', 'Velocidade do RGB': 'RGB speed', 'Página inicial': 'Home page', 'Nome do projeto': 'Project name', 'Novo projeto': 'New project',
    'Cancelar exportação': 'Cancel export', '↗ Exportar MP4': '↗ Export MP4', 'Exportar MP4': 'Export MP4',
    'LOCAL PROJECT': 'LOCAL PROJECT', 'MÍDIA': 'MEDIA', 'Importar arquivos': 'Import files',
    'Vídeo, imagem e áudio': 'Video, image, and audio', 'Clique para importar; depois arraste para a timeline': 'Click to import, then drag to the timeline',
    'Nenhuma mídia importada': 'No media imported', 'TIMELINE': 'TIMELINE', '＋ Faixa': '＋ Track',
    'Dividir': 'Split', 'Início até cursor': 'Start to playhead', 'Fim no cursor': 'End at playhead',
    'Excluir': 'Delete', 'Duplicar': 'Duplicate', 'Snap': 'Snap', 'Keyframes': 'Keyframes',
    'Arquivo': 'File', 'Início / projetos recentes': 'Home / recent projects', 'Abrir projeto…': 'Open project…',
    'Salvar projeto': 'Save project', 'Relincar mídia ausente…': 'Relink missing media…', 'Exportar vídeo…': 'Export video…',
    'Editar': 'Edit', 'Desfazer': 'Undo', 'Refazer': 'Redo', 'Preferências e atalhos…': 'Preferences and shortcuts…',
    'Paleta de comandos': 'Command palette', 'Exibir': 'View', 'Alternar snapping': 'Toggle snapping',
    '⚙ Personalização do app…': '⚙ App customization…', 'Ajuda / atalhos': 'Help / shortcuts',
    'Página inicial': 'Home page', 'Mudar mídia': 'Replace media', 'Presets personalizados': 'Custom presets',
    'Preferências · Projeto e renderização': 'Preferences · Project and rendering', 'Fechar': 'Close',
    'Preferências salvas': 'Preferences saved', 'Salvar preferências': 'Save preferences', 'Restaurar padrões': 'Restore defaults',
    'Personalização do FRAME Studio': 'FRAME Studio customization', 'Deixe o editor com a sua cara.': 'Make the editor feel like yours.',
    'As preferências ficam neste computador e não alteram seus projetos nem o vídeo exportado.': 'These preferences stay on this computer and do not change your projects or exported videos.',
    'Idioma e identidade': 'Language and identity', 'Idioma da interface e cor de destaque': 'Interface language and accent color',
    'Idioma': 'Language', 'Português (Brasil)': 'Portuguese (Brazil)', 'Cor principal': 'Accent color',
    'Paletas rápidas': 'Quick palettes', 'Verde lima': 'Lime green', 'Azul suave': 'Soft blue', 'Violeta': 'Violet',
    'Rosa': 'Pink', 'Âmbar': 'Amber', 'Turquesa': 'Turquoise', 'Branco': 'White',
    'Fundo personalizado': 'Custom background', 'Imagem, GIF animado ou vídeo local': 'Image, animated GIF, or local video',
    'Nenhum fundo selecionado': 'No background selected', '＋ Escolher imagem, GIF ou vídeo': '＋ Choose image, GIF, or video',
    'Remover fundo': 'Remove background', 'Ajuste do fundo': 'Background fit', 'Preencher': 'Cover',
    'Conter (sem cortar)': 'Contain (no crop)', 'Cor da sobreposição': 'Overlay tint', 'Desfoque (blur)': 'Blur',
    'Escurecimento': 'Dark overlay', 'Brilho do fundo': 'Background brightness', 'Saturação': 'Saturation',
    'Posição horizontal': 'Horizontal position', 'Posição vertical': 'Vertical position',
    'GIFs e vídeos ficam atrás da interface. O arquivo continua no caminho original; não mova nem exclua se quiser manter o fundo salvo. Vídeos em alta resolução podem pesar no preview; 1080p é recomendado.': 'GIFs and videos appear behind the interface. The file stays at its original path; do not move or delete it if you want to keep this background. High-resolution videos may affect preview performance; 1080p is recommended.',
    'Interface e efeitos': 'Interface and effects', 'Transparência, vidro fosco e efeitos ambientes': 'Transparency, frosted glass, and ambient effects',
    'Transparência da interface': 'Interface opacity', 'Opacidade da interface': 'Interface opacity', 'Blur do vidro da interface': 'Interface glass blur',
    'Aura ambiente': 'Ambient aura', 'Brilho sutil que acompanha a cor principal': 'A subtle glow that follows your accent color',
    'Reduzir movimento': 'Reduce motion', 'Pausa vídeo de fundo e reduz animações decorativas': 'Pauses background video and reduces decorative motion',
    'Interface compacta': 'Compact interface', 'Mais espaço para a timeline e painéis': 'More room for the timeline and panels',
    'Salvo automaticamente': 'Saved automatically', 'Concluído': 'Done', 'Restaurar padrão': 'Reset appearance',
    'Preset personalizado': 'Custom preset', 'Salvar': 'Save', 'Aplicar': 'Apply', 'Renomear': 'Rename', 'Excluir': 'Delete',
    'Tudo': 'Everything', 'Propriedades e keyframes': 'Properties and keyframes', 'Volume e keyframes de volume': 'Volume and volume keyframes',
    'Nome do projeto': 'Project name', 'Projeto sem título': 'Untitled project', 'Nenhum projeto recente. Crie um projeto ou abra um arquivo .frameproj.': 'No recent projects. Create a project or open a .frameproj file.',
    'Seus projetos.': 'Your projects.', 'Seu próximo corte.': 'Your next cut.', 'Abrir projeto': 'Open project',
    'Registro de atualizações': 'Release notes', 'Limpar lista': 'Clear list', 'PROJETOS RECENTES': 'RECENT PROJECTS',
    'Preferências e atalhos': 'Preferences and shortcuts', 'Qual.': 'Quality', 'Alta · 18': 'High · 18', 'Média · 23': 'Medium · 23', 'Compacta · 28': 'Compact · 28',
    'Propriedades': 'Properties', 'Transformar': 'Transform', 'Mover': 'Move', 'Efeitos': 'Effects', 'Áudio': 'Audio', 'Animação': 'Animation',
    'CAMADA SELECIONADA': 'SELECTED LAYER', 'Posição': 'Position', 'Escala': 'Scale', 'Rotação': 'Rotation', 'Opacidade': 'Opacity',
    'Texto': 'Text', 'Adicionar texto': 'Add text', 'Cor': 'Color', 'Fonte': 'Font', 'Tamanho': 'Size',
    'Dividir clipe': 'Split clip', 'Substituir mídia': 'Replace media', 'Relincar mídia ausente': 'Relink missing media',
    'Criar keyframe': 'Add keyframe', 'Nenhum keyframe neste clipe.': 'No keyframes on this clip.', 'Reproduzir/pausar': 'Play/pause',
    'Velocidade': 'Speed', 'Volume': 'Volume', 'Time Remap': 'Time Remap', 'Curva de interpolação': 'Interpolation curve',
    'Tempo do clipe (%)': 'Clip time (%)', 'Origem da mídia (%)': 'Source media (%)', 'Definir ponto': 'Set point',
    'Linear': 'Linear', 'Suave': 'Smooth', 'Acelerada': 'Fast', 'Nenhum preset salvo ainda.': 'No saved presets yet.',
    'Presets salvos': 'Saved presets', 'Categoria': 'Category', 'Todas as categorias': 'All categories',
    'Geral': 'General', 'Movimento': 'Motion', 'Efeitos': 'Effects', 'Transições': 'Transitions', 'Outros': 'Other',
    'Salvar projeto': 'Save project', 'Novo projeto': 'New project', 'Salvar como': 'Save as', 'Cancelar': 'Cancel',
    'Preview': 'Preview', 'Visualizador': 'Viewer', 'Fonte': 'Source', 'Timeline': 'Timeline', 'Camada': 'Layer',
    'Máscara': 'Mask', 'Luz e imagem': 'Light and image', 'Glow / Bloom': 'Glow / Bloom', 'Gaussian Blur': 'Gaussian Blur',
    'Vinheta': 'Vignette', 'COR AVANÇADA': 'ADVANCED COLOR', 'MOVIMENTO E DISTORÇÃO': 'MOTION AND DISTORTION',
    'SHAKE / IMPACTO': 'SHAKE / IMPACT', 'CHROMA KEY': 'CHROMA KEY', 'Biblioteca': 'Library', 'MÍDIA': 'MEDIA'
  };

  Object.assign(TRANSLATIONS, {
    'Biblioteca': 'Library', 'Seus arquivos aparecem aqui depois da importação.': 'Your files will appear here after import.',
    '＋ Adicionar selecionado à timeline': '＋ Add selected to timeline', 'Adicionar à composição': 'Add to composition',
    '＋ Texto': '＋ Text', '◇ Marcador': '◇ Marker', 'Fluxo de trabalho': 'Workflow',
    'Clique uma vez para ver o preview da origem. Dê duplo clique ou use “Adicionar à timeline” para inserir. Também é possível arrastar a mídia diretamente para uma faixa.': 'Click once to preview the source. Double-click or use “Add to timeline” to insert it. You can also drag media directly onto a track.',
    'VISUALIZADOR': 'VIEWER', 'Composição': 'Composition', 'Origem': 'Source',
    'Seu próximo corte começa aqui.': 'Your next cut starts here.', 'Importe uma mídia ou adicione um texto.': 'Import media or add a text layer.',
    'PROPRIEDADES': 'PROPERTIES', 'Máscaras': 'Masks', 'Selecione um clipe na timeline para acessar os controles de edição.': 'Select a timeline clip to access its editing controls.',
    'Posição': 'Position', 'Tamanho': 'Size', 'Escala X': 'Scale X', 'Escala Y': 'Scale Y', 'Rotação': 'Rotation', 'Opacidade': 'Opacity',
    'Transformação 3D': '3D transform', 'XYZ · °': 'XYZ · °', 'Profundidade Z': 'Depth Z', 'Rotação X': 'Rotation X', 'Rotação Y': 'Rotation Y',
    'Ative a câmera em perspectiva na aba Câmera 3D para usar profundidade e rotação espacial. Sem a câmera, Z/X/Y ficam guardados no projeto.': 'Enable the perspective camera in the 3D Camera tab to use depth and spatial rotation. Without the camera, Z/X/Y values remain stored in the project.',
    'Velocidade do clipe': 'Clip speed', 'Personalizada…': 'Custom…', 'A duração e a reprodução seguem a velocidade do clipe. Confirme a sincronização do áudio após alterações.': 'Duration and playback follow the clip speed. Check audio synchronization after making changes.',
    'Ajuste rápido': 'Quick adjust', 'Ajustar': 'Fit', 'Resetar': 'Reset', 'Arraste a mídia no preview ou use os valores numéricos.': 'Drag media in the preview or use the numeric values.',
    'Correção básica': 'Basic correction', 'Brilho': 'Brightness', 'Contraste': 'Contrast', 'Desfoque': 'Blur', 'Ajustes não destrutivos: o arquivo original não é modificado.': 'Non-destructive adjustments: the original file is not modified.',
    'Conteúdo do texto': 'Text content', 'Fonte': 'Font', 'Peso': 'Weight', 'Regular': 'Regular', 'Semibold': 'Semibold', 'Bold': 'Bold', 'Black': 'Black',
    'Adicione um título pelo botão “+ Texto”. Transformação, cor e animação também funcionam em títulos.': 'Add a title using the “+ Text” button. Transform, color, and animation controls also work on titles.',
    'Máscara da camada': 'Layer mask', 'ALPHA': 'ALPHA', 'Forma': 'Shape', 'Sem máscara': 'No mask', 'Retângulo': 'Rectangle', 'Elipse / círculo': 'Ellipse / circle', 'Losango': 'Diamond',
    'Área (%)': 'Area (%)', 'Suavidade (px)': 'Feather (px)', 'Inverter máscara': 'Invert mask',
    'A máscara recorta a transparência da camada e funciona com imagens, vídeos e textos. Ajuste a área e a suavidade sem alterar o arquivo original.': 'The mask clips layer transparency and works with images, videos, and text. Adjust its area and feathering without changing the original file.',
    'LUZ E IMAGEM': 'LIGHT AND IMAGE', 'Raio do glow': 'Glow radius', 'Vinheta': 'Vignette', 'COR AVANÇADA': 'ADVANCED COLOR', 'Exposição (EV)': 'Exposure (EV)', 'Gama': 'Gamma',
    'MOVIMENTO E DISTORÇÃO': 'MOTION AND DISTORTION', 'Wave Warp · amplitude': 'Wave Warp · amplitude', 'Frequência': 'Frequency', 'Velocidade': 'Speed', 'Tiles / repetição': 'Tiles / repetition',
    'Oscillate · X amplitude': 'Oscillate · X amplitude', 'Y amplitude': 'Y amplitude', 'Rotação ±°': 'Rotation ±°', 'Frequência (Hz)': 'Frequency (Hz)', 'Motion Blur / eco': 'Motion Blur / echo',
    'SHAKE / IMPACTO': 'SHAKE / IMPACT', 'Intensidade': 'Intensity', 'Aplicar preset de impacto': 'Apply impact preset', 'Zerar shake': 'Reset shake', 'Remover cor (intensidade)': 'Remove color (strength)', 'Cor-chave': 'Key color', 'Tolerância': 'Tolerance',
    'Efeitos disponíveis: Glow/Bloom, Gaussian Blur, Exposure/Gamma, RGB Split, Wave Warp, Tiles, Oscillate, Motion Blur/Eco e Chroma Key. Os efeitos são processados no compositor Canvas e aparecem na exportação da composição. Camadas muito grandes com pixel effects podem reduzir a taxa de preview.': 'Available effects: Glow/Bloom, Gaussian Blur, Exposure/Gamma, RGB Split, Wave Warp, Tiles, Oscillate, Motion Blur/Echo, and Chroma Key. Effects are processed by the Canvas compositor and appear in exports. Very large layers with pixel effects may reduce preview performance.',
    'Volume do clipe': 'Clip volume', 'O ganho é aplicado na reprodução e na exportação do MP4. Clipes de áudio podem tocar em paralelo quando ocupam trechos sobrepostos na timeline.': 'Gain is applied during playback and MP4 export. Audio clips can play in parallel when they overlap on the timeline.',
    'CURVA DA FONTE': 'SOURCE CURVE', 'Tempo do clipe (%)': 'Clip time (%)', 'Origem da mídia (%)': 'Source media (%)', '◇ Definir ponto': '◇ Set point',
    'Sem pontos personalizados; remapeamento linear.': 'No custom points; using linear remapping.', 'Adicione pontos para mapear o tempo do clipe para outra posição da mídia. O valor define a posição da fonte; o easing de cada ponto molda a curva. O remapeamento é normalizado entre o início e o fim aparados.': 'Add points to map clip time to another position in the media. The value defines the source position; each point’s easing shapes the curve. Remapping is normalized between the trimmed start and end.',
    'Curva de interpolação': 'Interpolation curve', 'BEZIER': 'BEZIER', 'Aplicar easing somente a': 'Apply easing only to', 'Selecione uma propriedade animada': 'Select an animated property', 'A curva pertence à propriedade e ao keyframe selecionados. Escala, posição e rotação podem usar curvas diferentes.': 'The curve belongs to the selected property and keyframe. Scale, position, and rotation can each use different curves.',
    'Ease in': 'Ease in', 'Ease out': 'Ease out', 'Ease in-out': 'Ease in-out', 'Posicione o cursor e altere uma propriedade. Crie outro keyframe em outro momento para animar.': 'Move the playhead and change a property. Add another keyframe at a different time to animate it.',
    'CÂMERA DE PERSPECTIVA': 'PERSPECTIVE CAMERA', 'Ativa': 'Enabled', '◇ Keyframe de câmera (todas as propriedades)': '◇ Camera keyframe (all properties)', 'EASING DA CÂMERA': 'CAMERA EASING', 'POR PROPRIEDADE': 'PER PROPERTY',
    'Propriedade animada': 'Animated property', 'Posição X': 'Position X', 'Posição Y': 'Position Y', 'Posição Z': 'Position Z', 'Distância focal': 'Focal length', 'Distância de foco': 'Focus distance', 'Profundidade de campo': 'Depth of field', 'Abertura': 'Aperture', 'Impacto': 'Impact',
    'A curva controla o movimento que sai do keyframe anterior em direção ao próximo. Selecione um keyframe de câmera na timeline para ajustar esse trecho.': 'The curve controls motion from the previous keyframe toward the next. Select a camera keyframe on the timeline to adjust that segment.',
    'Editar curva Bézier personalizada ↗': 'Edit custom Bézier curve ↗', 'Rotação X°': 'Rotation X°', 'Rotação Y°': 'Rotation Y°', 'Rotação Z°': 'Rotation Z°', 'Distância focal (mm)': 'Focal length (mm)', 'Foco (distância)': 'Focus (distance)',
    '↶ Órbita': '↶ Orbit', '↑ Órbita': '↑ Orbit', 'Órbita ↷': 'Orbit ↷', '↓ Órbita': '↓ Orbit', '＋ Aproximar': '＋ Zoom in', '− Afastar': '− Zoom out', '⟲ Restaurar câmera': '⟲ Reset camera',
    'horizontal': 'horizontal', 'vertical': 'vertical', 'profundidade': 'depth',
    'Navegação: arraste com botão do meio (ou Alt + botão esquerdo) para orbitar; Shift + arrasto para mover a câmera; Alt + roda para aproximar/afastar. A câmera usa projeção perspectiva com distância focal configurável. O centro da composição é a origem do mundo; a câmera padrão fica em Z = −1800 olhando para +Z. Rotacione as camadas no painel Mover para criar planos 3D, parallax e profundidade.': 'Navigation: drag with the middle mouse button (or Alt + left button) to orbit; Shift-drag to move the camera; Alt + mouse wheel to zoom. The camera uses perspective projection with configurable focal length. The composition center is the world origin; the default camera sits at Z = −1800 looking toward +Z. Rotate layers in the Move panel to create 3D planes, parallax, and depth.',
    'CAMADA SELECIONADA · XYZ': 'SELECTED LAYER · XYZ', 'Z, rotação X e rotação Y aceitam keyframes. Combine a profundidade das camadas com as órbitas da câmera para criar movimento 3D. A geometria usa planos 2D em espaço 3D; não é um modelador de malhas 3D como o Blender.': 'Z, rotation X, and rotation Y support keyframes. Combine layer depth with camera orbits to create 3D motion. This uses 2D planes in 3D space; it is not a 3D mesh modeller like Blender.',
    'Ripple': 'Ripple delete', 'SPACE': 'SPACE', 'reproduzir': 'play', 'dividir': 'split', 'excluir': 'delete', 'Pronto para editar': 'Ready to edit',
    'Clique em um atalho e pressione a combinação desejada. Conflitos são detectados e você pode restaurar os padrões.': 'Click a shortcut and press the desired combination. Conflicts are detected, and you can restore defaults.',
    'Ativar guias magnéticas e alinhamento (snap)': 'Enable magnetic guides and snapping', 'FPS do projeto e do MP4': 'Project and MP4 frame rate', 'Resolução': 'Resolution', 'HD · 1280/720': 'HD · 1280/720', 'Full HD · 1920/1080': 'Full HD · 1920/1080', 'QHD · 2560/1440': 'QHD · 2560/1440', '4K · 3840/2160': '4K · 3840/2160',
    'Qualidade do MP4 (CRF menor = melhor)': 'MP4 quality (lower CRF = better)', 'Alta · CRF 18': 'High · CRF 18', 'Média · CRF 23': 'Medium · CRF 23', 'Baixa · CRF 28': 'Low · CRF 28', 'Os atalhos são salvos neste usuário. Teclas não são capturadas enquanto você escreve em um campo.': 'Shortcuts are saved for this user. Keys are not captured while typing in a field.',
    'Use Ctrl+K para abrir a paleta de qualquer lugar.': 'Use Ctrl+K to open the palette from anywhere.',
    'Os presets ficam salvos neste usuário e podem ser reutilizados em outros projetos. “Tudo” inclui propriedades, keyframes, volume, velocidade e a curva Time Remap.': 'Presets are saved for this user and can be reused in other projects. “Everything” includes properties, keyframes, volume, speed, and the Time Remap curve.',
    'Todas as categorias': 'All categories', 'PRESETS SALVOS': 'SAVED PRESETS', 'Nenhum preset salvo ainda.': 'No saved presets yet.', 'Nome do preset': 'Preset name', 'Escopo ao salvar': 'Scope to save', '＋ Salvar novo preset': '＋ Save new preset', 'Usar escopo salvo': 'Use saved scope', 'Selecione um clipe para salvar ou aplicar um preset.': 'Select a clip to save or apply a preset.',
    'FRAME STUDIO · WORKSPACE': 'FRAME STUDIO · WORKSPACE', 'Seus projetos.': 'Your projects.', 'Um espaço para começar rápido, continuar de onde parou e acompanhar o que mudou no editor.': 'A place to start quickly, pick up where you left off, and track what has changed in the editor.', '＋ Novo projeto': '＋ New project', 'Registro de atualizações': 'Release notes', 'Dica: salve como': 'Tip: save as', 'para abrir depois com as mídias vinculadas ao caminho original. Mantenha os arquivos de mídia no mesmo local.': 'to reopen later with media linked to the original path. Keep media files in the same location.', 'PROJETOS RECENTES': 'RECENT PROJECTS', 'Limpar lista': 'Clear list', 'Nenhum projeto recente. Crie um projeto ou abra um arquivo .frameproj.': 'No recent projects. Create a project or open a .frameproj file.',
    'Customização do editor': 'Editor customization', 'Interface em português (Brasil) e inglês, com preferência salva entre sessões.': 'Portuguese (Brazil) and English interface, with the preference saved between sessions.', 'Fundos locais com imagem, GIF animado ou vídeo; controles para enquadramento, posição, blur, brilho, saturação e cor/força da sobreposição.': 'Local image, animated GIF, or video backgrounds, with fit, position, blur, brightness, saturation, and tint/overlay controls.', 'Paletas de cor principal, opacidade da interface e blur tipo vidro, aura ambiente, interface compacta e redução de movimento.': 'Accent color palettes, interface opacity and glass blur, ambient aura, compact interface, and reduced motion.', 'As configurações visuais são locais e não alteram a composição nem são incluídas no vídeo exportado.': 'Visual settings are local and do not change the composition or appear in the exported video.',
    'VERSÃO 2.4.4 · ANTERIOR': 'VERSION 2.4.4 · PREVIOUS', 'Presets, edição não destrutiva e Time Remap': 'Presets, non-destructive editing, and Time Remap', 'OBSERVAÇÕES': 'NOTES', 'O copiar/colar mantém a referência ao arquivo de origem, não duplica o arquivo físico. O Time Remap opera dentro do intervalo aparado do clipe; como em qualquer edição, confira o preview antes de exportar.': 'Copy/paste keeps a reference to the source file and does not duplicate the physical file. Time Remap operates within the clip’s trimmed range; as with any edit, check the preview before exporting.', 'Entendi': 'Got it',
    'Projeto sem título': 'Untitled project', 'Qualidade do MP4 (CRF menor = maior qualidade)': 'MP4 quality (lower CRF = higher quality)', 'Taxa de quadros do projeto e do MP4': 'Project and MP4 frame rate', 'Nome do projeto': 'Project name', 'FPS do projeto e do MP4': 'Project and MP4 frame rate', 'Abrir projeto': 'Open project', 'Salvar': 'Save', 'Limpar lista': 'Clear list',
    'Adicionar uma faixa de vídeo acima': 'Add a video track above', 'Dividir clipe (S)': 'Split clip (S)', 'Aparar início até o cursor': 'Trim start to playhead', 'Aparar fim no cursor': 'Trim end at playhead', 'Excluir e fechar espaço': 'Delete and close gap', 'Adicionar keyframes de transformação': 'Add transform keyframes', 'Excluir clipe (Delete)': 'Delete clip (Delete)', 'Duplicar clipe': 'Duplicate clip', 'Zoom da timeline': 'Timeline zoom', 'Adicionar uma faixa de vídeo acima': 'Add a video track above',
    'Personalização do app': 'App customization', 'Nome do preset': 'Preset name', 'Salvar preferências': 'Save preferences', 'Atalhos restaurados; clique em Salvar preferências': 'Shortcuts restored; click Save preferences', 'Há atalhos em conflito': 'Shortcut conflicts detected',
    'O fundo precisa ter menos de 1 GiB.': 'The background must be smaller than 1 GiB.', 'O arquivo selecionado não está disponível.': 'The selected file is unavailable.'
  });


  Object.assign(TRANSLATIONS, {
    'Tipografia': 'Typography', '＋ Importar fontes de ZIP': '＋ Import fonts from ZIP', 'TTF, OTF e WOFF2. As fontes instaladas ficam disponíveis nos projetos locais.': 'TTF, OTF, and WOFF2. Imported fonts are available in local projects.',
    'Câmera 3D': '3D Camera', 'Espaço entre letras (px)': 'Letter spacing (px)', 'A tipografia atualiza o preview sem substituir a fonte original do projeto. Use quebras de linha para criar texto em várias linhas. Opacidade e transformações ficam na aba Mover.': 'Typography updates the preview without replacing the project’s original font. Use line breaks for multiple lines. Opacity and transforms are in the Move tab.',
    'Transformar máscara': 'Transform Mask', 'Rotação (°)': 'Rotation (°)', 'Pivô X (%)': 'Pivot X (%)', 'Pivô Y (%)': 'Pivot Y (%)',
    'COLORIZE / COR SÓLIDA': 'COLORIZE / SOLID COLOR', 'Aplicar cor sólida preservando transparência': 'Apply a solid color while preserving transparency', 'Efeito reversível; a mídia original permanece intacta.': 'This effect is reversible; the original media remains unchanged.',
    'Ângulo (°)': 'Angle (°)', 'O gradiente é um preenchimento não destrutivo aplicado sobre a alfa da camada e fica salvo no projeto.': 'The gradient is a non-destructive fill applied to the layer alpha and is saved with the project.',
    'Os modos suportados usam operações de composição do Canvas e são aplicados à camada inteira, em ordem de renderização.': 'Supported modes use Canvas compositing operations and apply to the entire layer in render order.',
    'Fade de saída (s)': 'Fade-out (s)', 'O ganho e os fades são não destrutivos e também são incluídos na exportação MP4. Os clipes de áudio podem tocar simultaneamente em faixas independentes.': 'Gain and fades are non-destructive and are included in MP4 exports. Audio clips can play simultaneously on independent tracks.',
    'Sombra projetada': 'Drop Shadow', 'Ângulo': 'Angle', 'Distância': 'Distance', 'A sombra segue a transparência da imagem, do vídeo ou do texto. Ela é renderizada no preview e na exportação, sem alterar o arquivo original.': 'The shadow follows image, video, or text transparency. It is rendered in the preview and export without modifying the original file.',
    'Camera View · câmera ativa': 'Camera View · active camera', 'DINÂMICO': 'DYNAMIC', 'Rápida': 'Fast', 'No Scene Editor, selecione a câmera clicando no corpo dela e use W/A/S/D para mover nos eixos locais (Q/E para descer/subir; Shift acelera). Arraste os eixos para ajustes precisos; botão do meio/direito e roda navegam na viewport.': 'In Scene Editor, click the camera body to select it, then use W/A/S/D to move along its local axes (Q/E move down/up; Shift moves faster). Drag the gizmo axes for precise adjustments; the middle/right mouse buttons and wheel navigate the viewport.',
    'Rotação Z': 'Rotation Z', '● Gravar áudio': '● Record Audio', '♫ Extrair áudio': '♫ Extract Audio', 'Restaurar layout padrão': 'Restore Default Layout',
    'Gravar áudio': 'Record Audio', 'Gravação real do microfone. O áudio só é salvo quando você confirma Inserir no projeto.': 'Records audio from your microphone. Audio is saved only when you choose Insert into Project.',
    'Dispositivo padrão': 'Default Device', 'Nome da gravação': 'Recording Name', 'Pronto para gravar': 'Ready to record', '● Gravar': '● Record', 'Inserir na timeline': 'Insert into Timeline', '♫ Extrair áudio do vídeo': '♫ Extract Audio from Video',
    'Edição local': 'Local editing', 'Máscaras · Shake · Faixas · Gizmos 3D · Snap magnético': 'Masks · Shake · Tracks · 3D Gizmos · Magnetic Snap',
    'Seus projetos.': 'Your projects.', 'Seu próximo corte.': 'Your next cut.', 'Um espaço para começar rápido, continuar de onde parou e acompanhar o que mudou no editor.': 'A place to start quickly, pick up where you left off, and see what has changed in the editor.',
    'Dica: salve como': 'Tip: save as', 'para abrir depois com as mídias vinculadas ao caminho original. Mantenha os arquivos de mídia no mesmo local.': 'to reopen later with media linked to the original paths. Keep media files in the same location.',
    'TIMELINE': 'TIMELINE', '＋ Faixa': '＋ Track', 'Início até cursor': 'Start to Playhead', 'Fim no cursor': 'End at Playhead', '◇ Keyframes': '◇ Keyframes', 'Pronto para editar': 'Ready to edit',
    'Espaço entre letras (px)': 'Letter spacing (px)', 'Opacidade stop 1': 'Stop 1 opacity', 'Opacidade stop 2': 'Stop 2 opacity', 'Opacidade stop 3': 'Stop 3 opacity',
    'Os presets ficam salvos neste usuário e podem ser reutilizados em outros projetos. “Tudo” inclui propriedades, keyframes, volume, velocidade e a curva Time Remap.': 'Presets are saved for this user and can be reused in other projects. “Everything” includes properties, keyframes, volume, speed, and the Time Remap curve.',
    'Selecione um clipe na timeline para acessar os controles de edição.': 'Select a timeline clip to access editing controls.', 'Nenhum projeto recente. Crie um projeto ou abra um arquivo .frameproj.': 'No recent projects. Create a project or open a .frameproj file.',
    'A gravação ficou vazia. Tente novamente.': 'The recording is empty. Please try again.', 'A gravação de microfone não é suportada neste ambiente Electron.': 'Microphone recording is not supported in this Electron environment.',
    'Nenhuma mídia ausente': 'No missing media', 'Nenhuma mídia importada': 'No media imported', 'Importar arquivos': 'Import Files', 'Arraste arquivos para importar': 'Drop files to import',
    'Selecione um clipe de vídeo para editar Time Remap': 'Select a video clip to edit Time Remap', 'O clipe selecionado não é um vídeo.': 'The selected clip is not a video.',
    'Velocidade do clipe': 'Clip Speed', 'Personalizada…': 'Custom…', '1× · Normal': '1× · Normal', 'A duração e a reprodução seguem a velocidade do clipe. Confirme a sincronização do áudio após alterações.': 'Clip duration and playback follow the selected speed. Check audio synchronization after making changes.',
    'Curva da fonte': 'SOURCE CURVE', 'Curva que relaciona o tempo do clipe com a posição da mídia': 'Curve mapping clip time to source-media position', 'Adicione pontos para mapear o tempo do clipe para outra posição da mídia. O valor define a posição da fonte; o easing de cada ponto molda a curva. O remapeamento é normalizado entre o início e o fim aparados.': 'Add keyframes to map clip time to another source position. The value sets source position; each keyframe’s interpolation shapes the curve. Mapping is normalized between the trimmed in and out points.',
    'Nenhum keyframe neste clipe.': 'No keyframes on this clip.', 'Selecione uma propriedade animada': 'Select an animated property', 'Aplicar easing somente a': 'Apply easing only to',
    'CÂMERA DE PERSPECTIVA': 'PERSPECTIVE CAMERA', 'Ativa': 'Enabled', 'Balanceada': 'Balanced', 'Muito alta': 'Very High', 'Alta': 'High', 'Suave': 'Smooth', 'Acelerada': 'Fast',
    'VIEWPORT': 'VIEWPORT', 'Nome do projeto': 'Project Name', 'Salvar preferências': 'Save Preferences', 'Fechar': 'Close', 'Cancelar': 'Cancel', 'Salvar': 'Save', 'Abrir projeto…': 'Open Project…',
    'Personalização do app…': 'App Customization…', 'Personalização do FRAME Studio': 'FRAME Studio customization', 'Deixe o editor com a sua cara.': 'Make the editor your own.', 'As preferências ficam neste computador e não alteram seus projetos nem o vídeo exportado.': 'Preferences are stored on this computer and do not change your projects or exported videos.',
    'Idioma e identidade': 'Language and Identity', 'Idioma da interface e cor de destaque': 'Interface language and accent color', 'Idioma': 'Language', 'Cor principal': 'Accent Color', 'Paletas rápidas': 'Quick Palettes',
    'Preferências · Projeto e renderização': 'Preferences · Project and Rendering', 'Clique em um atalho e pressione a combinação desejada. Conflitos são detectados e você pode restaurar os padrões.': 'Click a shortcut and press the desired combination. Conflicts are detected, and you can restore defaults.',
    'Clique em um atalho e pressione a combinação desejada.': 'Click a shortcut and press the desired combination.', 'Ativar guias magnéticas e alinhamento (snap)': 'Enable magnetic guides and snapping', 'Restaurar padrões': 'Restore Defaults', 'Salvar preferências': 'Save Preferences',
    'Paleta de comandos': 'Command Palette', 'Buscar comando…': 'Search commands…', 'Use Ctrl+K para abrir a paleta de qualquer lugar.': 'Use Ctrl+K to open the palette from anywhere.',
    'Time Remap': 'Time Remap', 'Tempo do clipe (%)': 'Clip Time (%)', 'Origem da mídia (%)': 'Source Media (%)', '◇ Definir ponto': '◇ Set Keyframe', 'Sem pontos personalizados; remapeamento linear.': 'No custom keyframes; using linear remapping.',
    'Suave / Bezier': 'Smooth / Bezier', 'Selecionado keyframe interpolation': 'Selected keyframe interpolation', 'Desfazer': 'Undo', 'Refazer': 'Redo', 'Preferências e atalhos…': 'Preferences and Shortcuts…', 'Restaurar layout padrão': 'Restore Default Layout',
    'Movimento': 'Motion', 'Cor': 'Color', 'Texto': 'Text', 'Áudio': 'Audio', 'Máscaras': 'Masks', 'Efeitos': 'Effects', 'Sombra': 'Shadow', 'Keyframes': 'Keyframes', 'Transformar': 'Transform',
    'Modo de mesclagem': 'Blend Mode', 'Aplicar gradiente à silhueta da camada': 'Apply gradient to the layer silhouette', 'Aplicar cor sólida preservando transparência': 'Apply solid color while preserving transparency',
    'Visão da câmera': 'Camera View', 'Curva de interpolação': 'Interpolation Curve', 'Criar keyframe': 'Add Keyframe', 'Adicionar keyframes de transformação': 'Add transform keyframes',
  });


  Object.assign(TRANSLATIONS, {
    "Projeto sem título": "Untitled Project",
    "Nenhum fundo selecionado": "No background selected",
    "Nenhum projeto recente. Crie um projeto ou abra um arquivo .frameproj.": "No recent projects. Create a project or open a .frameproj file.",
    "Adicionar uma faixa de vídeo acima": "Add a video track above",
    "Gravar áudio do microfone": "Record microphone audio",
    "Extrair áudio do clipe de vídeo selecionado": "Extract audio from the selected video clip",
    "Dividir clipe (S)": "Split Clip (S)",
    "Aparar início até o cursor": "Trim Start to Playhead",
    "Aparar fim no cursor": "Trim End at Playhead",
    "Excluir clipe (Delete)": "Delete Clip (Delete)",
    "Duplicar clipe": "Duplicate Clip",
    "Selecionar uma propriedade animada": "Select an animated property",
    "Desfoque direcional temporal de tela, ativado pela velocidade da câmera e renderizado também em frames sequenciais de exportação. Ele zera quando a câmera para; não é um filtro permanente.": "Screen-space temporal directional blur, driven by camera velocity and rendered into sequential export frames. It returns to zero when the camera stops; it is not a permanent filter.",
    "Motion Blur da câmera": "Camera Motion Blur",
    "FRAME Studio 2.4.12 · Edição local": "FRAME Studio 2.4.12 · Local Editing",
    "Nenhum keyframe neste clipe.": "No keyframes on this clip.",
    "Editar": "Edit",
    "Automático": "Automatic",
    "Sem pontos personalizados; remapeamento linear.": "No custom keyframes; using linear remapping.",
    "Velocidade do clipe": "Clip Speed",
    "A duração e a reprodução seguem a velocidade do clipe. Confirme a sincronização do áudio após alterações.": "Clip duration and playback follow the selected speed. Check audio synchronization after changes.",
    "Curva da fonte": "SOURCE CURVE",
    "Tempo do clipe (%)": "Clip Time (%)",
    "Origem da mídia (%)": "Source Media (%)",
    "◇ Definir ponto": "◇ Set Keyframe",
    "Sem máscara": "No Mask",
    "Elipse / círculo": "Ellipse / Circle",
    "Suavidade (px)": "Feather (px)",
    "Inverter máscara": "Invert Mask",
    "Forma": "Shape",
    "Área (%)": "Area (%)",
    "Posição": "Position",
    "Rotação (°)": "Rotation (°)",
    "Pivô X (%)": "Pivot X (%)",
    "Pivô Y (%)": "Pivot Y (%)",
    "Ativa": "Enabled",
    "Balanceada": "Balanced",
    "Muito alta": "Very High",
    "Alta": "High",
    "Suave": "Smooth",
    "Acelerada": "Fast",
    "Rápida": "Fast",
    "Nome do projeto": "Project Name",
    "Cor principal": "Accent Color",
    "Cor": "Color",
    "Máscaras": "Masks",
    "Sombra projetada": "Drop Shadow",
    "Ângulo": "Angle",
    "Distância": "Distance",
    "Movimento": "Motion",
    "Texto": "Text",
    "Áudio": "Audio",
    "Efeitos": "Effects",
    "Sombra": "Shadow",
    "Mover": "Move",
    "Girar": "Rotate",
    "Ajustar": "Fit",
    "Importar arquivos": "Import Files",
    "＋ Adicionar selecionado à timeline": "＋ Add Selected to Timeline",
    "＋ Texto": "＋ Text",
    "◇ Marcador": "◇ Marker",
    "Biblioteca": "Library",
    "Adicionar à composição": "Add to Composition",
    "Fluxo de trabalho": "Workflow",
    "Visualizador": "Preview",
    "Câmera de perspectiva": "Perspective Camera",
    "Câmera 3D": "3D Camera",
    "Aparar início (Alt+arrastar para esticar duração)": "Trim start (Alt+drag to extend duration)",
    "Aparar fim (Alt+arrastar para esticar duração)": "Trim end (Alt+drag to extend duration)",
    "Gravação real do microfone. O áudio só é salvo quando você confirma Inserir no projeto.": "Records audio from your microphone. Audio is saved only when you choose Insert into Project.",
    "Dispositivo de entrada": "Input Device",
    "Dispositivo padrão": "Default Device",
    "Nome da gravação": "Recording Name",
    "Pronto para gravar": "Ready to record",
    "● Gravar": "● Record",
    "Inserir na timeline": "Insert into Timeline",
    "Fechar": "Close",
    "Cancelar": "Cancel",
    "Salvar": "Save",
    "Abrir projeto…": "Open Project…",
    "Personalização do FRAME Studio": "FRAME Studio customization",
    "Deixe o editor com a sua cara.": "Make the editor your own.",
    "As preferências ficam neste computador e não alteram seus projetos nem o vídeo exportado.": "Preferences are stored on this computer and do not change your projects or exported videos.",
    "Idioma e identidade": "Language and Identity",
    "Idioma da interface e cor de destaque": "Interface language and accent color",
    "Idioma": "Language",
    "Paletas rápidas": "Quick Palettes",
    "Preferências · Projeto e renderização": "Preferences · Project and Rendering",
    "Clique em um atalho e pressione a combinação desejada. Conflitos são detectados e você pode restaurar os padrões.": "Click a shortcut and press the desired combination. Conflicts are detected, and you can restore defaults.",
    "Restaurar padrões": "Restore Defaults",
    "Paleta de comandos": "Command Palette",
    "Buscar comando…": "Search commands…",
    "Use Ctrl+K para abrir a paleta de qualquer lugar.": "Use Ctrl+K to open the palette from anywhere.",
    "Selecione um clipe na timeline para acessar os controles de edição.": "Select a timeline clip to access editing controls.",
    "Não foi possível abrir esta imagem/GIF.": "Could not decode this image/GIF.",
    "Não foi possível reproduzir este formato de vídeo.": "Could not play this video format.",
    "Nenhuma mídia ausente": "No missing media",
    "Nenhuma mídia importada": "No media imported",
    "Selecione um clipe de vídeo para editar Time Remap": "Select a video clip to edit Time Remap",
    "O clipe selecionado não é um vídeo.": "The selected clip is not a video.",
    "A gravação ficou vazia. Tente novamente.": "The recording is empty. Please try again.",
    "A gravação de microfone não é suportada neste ambiente Electron.": "Microphone recording is not supported in this Electron environment.",
    "Curva que relaciona o tempo do clipe com a posição da mídia": "Curve mapping clip time to source-media position",
    "Adicione pontos para mapear o tempo do clipe para outra posição da mídia. O valor define a posição da fonte; o easing de cada ponto molda a curva. O remapeamento é normalizado entre o início e o fim aparados.": "Add keyframes to map clip time to another source position. The value sets source position; each keyframe’s interpolation shapes the curve. Mapping is normalized between the trimmed in and out points.",
    "No Scene Editor, selecione a câmera clicando no corpo dela e use W/A/S/D para mover nos eixos locais (Q/E para descer/subir; Shift acelera). Arraste os eixos para ajustes precisos; botão do meio/direito e roda navegam na viewport.": "In Scene Editor, click the camera body to select it, then use W/A/S/D to move along its local axes (Q/E move down/up; Shift moves faster). Drag the gizmo axes for precise adjustments; the middle/right mouse buttons and wheel navigate the viewport.",
    "Escala proporcional · arraste horizontalmente": "Proportional Scale · drag horizontally",
    "Rotação Z": "Rotation Z",
    "Profundidade Z": "Depth Z",
    "Distância focal": "Focal Length",
    "Distância de foco": "Focus Distance",
    "Profundidade de campo": "Depth of Field",
    "Abertura": "Aperture",
    "Suave / Bezier": "Smooth / Bezier",
    "Curva de interpolação": "Interpolation Curve",
    "Criar keyframe": "Add Keyframe",
    "Aplicar easing somente a": "Apply easing only to",
    "Rotação": "Rotation",
    "Opacidade": "Opacity",
    "Contorno": "Stroke",
    "Espessura do contorno (px)": "Stroke Width (px)",
    "Espaço entre letras (px)": "Letter Spacing (px)",
    "Entre linhas (×)": "Line Spacing (×)",
    "Alinhamento": "Alignment",
    "Tamanho (px)": "Size (px)",
    "Peso": "Weight",
    "Esquerda": "Left",
    "Centro": "Center",
    "Direita": "Right",
    "Regular": "Regular",
    "Preto": "Black",
    "Negrito": "Bold",
    "Tipografia": "Typography",
    "Importar fontes de ZIP": "Import Fonts from ZIP",
    "Versão 2.4.12 · Atualizações automáticas": "Version 2.4.12 · Automatic updates",
    "Grupo + Máscara": "Group + Mask",
  });
  function clamp(value, min, max) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : min;
  }
  function validHex(value, fallback) {
    return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value).toLowerCase() : fallback;
  }
  function normalizeSettings(value) {
    const input = value && typeof value === 'object' ? value : {};
    return {
      language: input.language === 'pt-BR' ? 'pt-BR' : 'en-US',
      accent: validHex(input.accent, DEFAULTS.accent),
      accentMode: ['solid', 'rgb', 'background-rgb', 'custom-gradient'].includes(input.accentMode) ? input.accentMode : DEFAULTS.accentMode,
      accentGradient: (() => { const raw=input.accentGradient&&typeof input.accentGradient==='object'?input.accentGradient:DEFAULTS.accentGradient; const def=DEFAULTS.accentGradient; const stops=Array.isArray(raw.stops)?raw.stops.slice(0,8).map((stop,i)=>({position:clamp(stop?.position??def.stops[Math.min(i,2)].position,0,100),color:validHex(stop?.color,def.stops[Math.min(i,2)].color)})):def.stops; return {angle:clamp(raw.angle??def.angle,0,360),stops:stops.length>=2?stops.sort((a,b)=>a.position-b.position):def.stops.map(x=>({...x}))}; })(),
      accentSaturation: clamp(input.accentSaturation ?? DEFAULTS.accentSaturation, 15, 100),
      accentLightness: clamp(input.accentLightness ?? DEFAULTS.accentLightness, 25, 82),
      accentSpeed: clamp(input.accentSpeed ?? DEFAULTS.accentSpeed, 1, 20),
      backgroundPath: typeof input.backgroundPath === 'string' ? input.backgroundPath.slice(0, 4096) : '',
      backgroundName: typeof input.backgroundName === 'string' ? input.backgroundName.slice(0, 300) : '',
      backgroundKind: input.backgroundKind === 'video' ? 'video' : 'image',
      bgFit: input.bgFit === 'contain' ? 'contain' : 'cover',
      tint: validHex(input.tint, DEFAULTS.tint),
      blur: clamp(input.blur ?? DEFAULTS.blur, 0, 32), overlay: clamp(input.overlay ?? DEFAULTS.overlay, 0, 90),
      brightness: clamp(input.brightness ?? DEFAULTS.brightness, 25, 150), saturation: clamp(input.saturation ?? DEFAULTS.saturation, 0, 200),
      bgX: clamp(input.bgX ?? DEFAULTS.bgX, 0, 100), bgY: clamp(input.bgY ?? DEFAULTS.bgY, 0, 100),
      uiOpacity: clamp(input.uiOpacity ?? DEFAULTS.uiOpacity, 50, 100), glass: clamp(input.glass ?? DEFAULTS.glass, 0, 20),
      aura: input.aura !== false, reduceMotion: input.reduceMotion === true, compact: input.compact === true
    };
  }
  function hexLuminance(hex) {
    const color = validHex(hex, '#b5f36c').slice(1);
    const rgb = [0, 2, 4].map(start => parseInt(color.slice(start, start + 2), 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
  }
  function accentTextColor(hex) { return hexLuminance(hex) > .44 ? '#141418' : '#f5f5f7'; }
  Object.assign(TRANSLATIONS, {
    'Curva de Time Remap': 'Time Remap Curve',
    'Restaurar órbita do viewport · MMB orbita, Shift+MMB move, RMB olha, roda aproxima/afasta': 'Reset viewport orbit · MMB orbits, Shift+MMB pans, RMB looks, wheel zooms',
    'Proporção do projeto': 'Project Aspect Ratio',
    'Controles de transformação no preview': 'Preview Transform Controls',
    'Gizmos de objetos e câmera 3D': '3D Object and Camera Gizmos',
    'Percorrer vídeo': 'Scrub Video',
    'Ir ao início': 'Go to Start',
    'Próximo quadro': 'Next Frame',
    'Substituir a mídia do clipe selecionado': 'Replace Selected Clip Media',
    'Editor de curva de animação': 'Animation Curve Editor',
    'W: mover câmera': 'W: Move Camera',
    'E: girar câmera': 'E: Rotate Camera',
    'Keyframe da câmera X': 'Camera X Keyframe',
    'Keyframe da câmera Y': 'Camera Y Keyframe',
    'Keyframe da câmera Z': 'Camera Z Keyframe',
    'Keyframe de rotação X': 'Rotation X Keyframe',
    'Keyframe de rotação Y': 'Rotation Y Keyframe',
    'Keyframe de rotação Z': 'Rotation Z Keyframe',
    'Keyframe de distância focal': 'Focal Length Keyframe',
    'Início do FRAME Studio': 'FRAME Studio Home',
    'W Mover': 'W Move',
    'E Girar': 'E Rotate',
    'W · Mover': 'W · Move',
    'Ativar desfoque durante o movimento': 'Enable Motion Blur',
    'Qualidade': 'Quality',
    '◇ Criar keyframe': '◇ Add Keyframe'
  });

  Object.assign(TRANSLATIONS, {
    'Ative a câmera 3D para animá-la': 'Enable the 3D camera to animate it',
    'Keyframes de câmera criados': 'Camera keyframes created',
    'Essa mídia está ausente': 'This media is missing',
    'Clipe não adicionado; a faixa de destino não está disponível.': 'Clip was not added; the target track is unavailable.',
    'Texto não adicionado; a faixa de destino não está disponível.': 'Text was not added; the target track is unavailable.',
    'A importação de fontes exige o aplicativo desktop atualizado.': 'Font importing requires an updated desktop app.',
    'Nenhuma fonte TTF, OTF ou WOFF2 válida foi encontrada no ZIP.': 'No valid TTF, OTF, or WOFF2 fonts were found in the ZIP.',
    'Layout padrão restaurado': 'Default layout restored',
    'Esta faixa está bloqueada': 'This track is locked',
    'Aguarde o vídeo carregar os metadados antes de redimensioná-lo.': 'Wait for the video metadata to load before resizing it.',
    'A seleção contém uma faixa bloqueada': 'The selection contains a locked track',
    'Movimento cancelado: não há faixa disponível para evitar sobreposição.': 'Move canceled: no available track can prevent an overlap.',
    'Selecione um vídeo ou áudio para reproduzir a origem': 'Select a video or audio clip to play its source',
    'Mídia ainda está carregando': 'Media is still loading',
    'Crie ao menos um keyframe para esta propriedade da câmera': 'Create at least one keyframe for this camera property',
    'Easing da câmera atualizado': 'Camera easing updated',
    'Crie um keyframe para esta propriedade da câmera antes de editar a curva': 'Create a keyframe for this camera property before editing the curve',
    'Arquivos adicionados à biblioteca': 'Files added to the library',
    'Clipe removido e espaço fechado': 'Clip removed and gap closed',
    'Selecione um clipe de vídeo ou áudio': 'Select a video or audio clip',
    'Não foi possível salvar os presets: armazenamento local cheio': 'Could not save presets: local storage is full',
    'O nome não pode ficar vazio': 'The name cannot be empty',
    'Preset excluído': 'Preset deleted',
    'Este preset de volume precisa de um clipe de vídeo ou áudio': 'This volume preset requires a video or audio clip',
    'Este preset de velocidade precisa de um clipe de vídeo ou áudio': 'This speed preset requires a video or audio clip',
    'Time Remap só pode ser aplicado a clipes de vídeo': 'Time Remap can only be applied to video clips',
    'Selecione um clipe para substituir a mídia': 'Select a clip to replace its media',
    'Clipes de texto não têm mídia externa para substituir': 'Text clips have no external media to replace',
    'Para substituir a mídia, selecione apenas um clipe': 'Select a single clip to replace its media',
    'A seleção de mídia não está disponível nesta versão': 'Media selection is unavailable in this version',
    'Formato de mídia não reconhecido': 'Unrecognized media format',
    'Não foi possível carregar a mídia escolhida; o clipe original foi mantido': 'Could not load the selected media; the original clip was preserved',
    'A API de projetos não está disponível. Atualize o app.': 'The project API is unavailable. Update the app.',
    'Projeto aberto, mas há mídias ausentes. Use Relincar mídia no menu.': 'Project opened, but some media is missing. Use Relink Media in the menu.',
    'Atualize o app para relincar mídia': 'Update the app to relink media',
    'Grave e pare o áudio antes de inserir.': 'Record and stop the audio before inserting it.',
    'O salvamento de gravações exige uma versão desktop atualizada.': 'Saving recordings requires an updated desktop version.',
    'Áudio gravado e inserido na faixa de áudio': 'Audio recorded and inserted on the audio track',
    'Selecione um clipe de vídeo.': 'Select a video clip.',
    'Extração exige mídia local e o aplicativo desktop atualizado.': 'Extraction requires local media and an updated desktop app.',
    'Áudio extraído e sincronizado à posição do vídeo': 'Audio extracted and synchronized to the video position',
    'Texto selecionado para edição': 'Text selected for editing',
    'A renderização determinística requer o FRAME Studio desktop atualizado.': 'Deterministic rendering requires the updated FRAME Studio desktop app.',
    'Exportação cancelada': 'Export canceled',
    'Seleção limpa': 'Selection cleared',
    'Autosave indisponível: armazenamento local cheio': 'Autosave unavailable: local storage is full',
    'Keyframe de câmera atualizado': 'Camera keyframe updated',
    'Transformação da máscara atualizada': 'Mask transform updated',
    'Transformação 3D atualizada': '3D transform updated',
    'Transformação atualizada': 'Transform updated',
    'Extração de áudio falhou': 'Audio extraction failed',
    'Validando codecs e duração com ffprobe…': 'Validating codecs and duration with ffprobe…',
    'Exportação cancelada pelo usuário': 'Export canceled by the user',
    'Frames concluídos; codificando MP4 com H.264/AAC…': 'Frames completed; encoding MP4 with H.264/AAC…',
    'Falha na exportação MP4': 'MP4 export failed',
    'Cancelando exportação…': 'Canceling export…',
    'Criar um projeto vazio? Os clipes da timeline serão removidos; arquivos importados ficam na biblioteca.': 'Create an empty project? Timeline clips will be removed; imported files will remain in the library.'
  });

  Object.assign(TRANSLATIONS, {
    'Adicionar/remover keyframe': 'Add/remove keyframe',
    'Adicionar/remover keyframe de volume': 'Add/remove volume keyframe',
    'Digite seu texto...': 'Enter your text...',
    'Fade de entrada (s)': 'Fade In (s)',
    'Ferramentas do viewport 3D': '3D viewport tools',
    'GRADIENTE DE PREENCHIMENTO': 'FILL GRADIENT',
    'Ir ao fim': 'Go to End',
    'Keyframe de abertura': 'Aperture Keyframe',
    'Keyframe de foco': 'Focus Keyframe',
    'Keyframe de profundidade de campo': 'Depth of Field Keyframe',
    'Modo de preview': 'Preview Mode',
    'Qualidade do MP4': 'MP4 Quality',
    'Qualidade visual do MP4 (CRF menor = maior qualidade)': 'MP4 visual quality (lower CRF = higher quality)',
    'Redimensionar altura da timeline': 'Resize timeline height',
    'Salvar e aplicar presets personalizados': 'Save and apply custom presets',
    'Velocidade personalizada': 'Custom Speed',
    'W · Mover objeto': 'W · Move Object',
    'Zoom horizontal da timeline': 'Timeline horizontal zoom',
    '✂ Dividir': '✂ Split',
    'Não foi possível detectar o áudio do vídeo:': 'Could not detect video audio:',
    'não foi possível ler a mídia': 'could not read media',
    'arquivo muito grande para gerar waveform em memória': 'file is too large to generate a waveform in memory',
    'Web Audio indisponível': 'Web Audio is unavailable',
    'o decodificador não retornou amostras de áudio': 'the decoder returned no audio samples',
    'Waveform não disponível:': 'Waveform unavailable:',
    'Não foi possível carregar a biblioteca de fontes': 'Could not load the font library',
    'Faixa de áudio': 'Audio Track',
    'Faixa de vídeo ': 'Video Track ',
    'Ajustar duração pelo início': 'Adjust duration from start',
    'Ajustar duração': 'Adjust duration',
    'Aparar membros não disponível no resumo de grupo': 'Trimming individual group members is unavailable in the group summary',
    'Câm. ': 'Cam. ',
    'Câmera 3D · sem keyframes': '3D Camera · no keyframes',
    '} como destino de inserção': '} as the insertion target',
    'Canal de câmera: ': 'Camera channel: ',
    'Mídia ausente': 'Media missing',
    'Selecione uma mídia': 'Select media',
    'FRAME Studio: imagem ainda não pode ser desenhada': 'FRAME Studio: image cannot be drawn yet',
    'mídia ausente; camada não foi renderizada': 'media missing; layer was not rendered',
    'o compositor não conseguiu produzir uma imagem para esta camada': 'the compositor could not produce an image for this layer',
    'FRAME Studio: falha ao compor Grupo e Máscara': 'FRAME Studio: group mask compositing failed',
    'Ajuste a câmera e a profundidade na aba Câmera 3D.': 'Adjust the camera and depth in the 3D Camera tab.',
    'FRAME Studio: erro durante a atualização do preview': 'FRAME Studio: preview update failed',
    'Desativar máscara': 'Disable mask',
    'Usar camada superior como máscara': 'Use top layer as mask',
    'Agrupe camadas para editá-las como uma unidade. Ative Grupo e Máscara para que a camada visual superior recorte as camadas abaixo.': 'Group layers to edit them as one unit. Enable Group and Mask so the top visual layer clips the layers below.',
    ' cópia': ' copy',
    'Vista 3D restaurada': '3D view restored',
    'Câmera 3D ativada': '3D Camera enabled',
    'Câmera 3D desativada': '3D Camera disabled',
    'Keyframe da câmera removido': 'Camera keyframe removed',
    'Keyframe da câmera criado': 'Camera keyframe added',
    'Autosave restaurado': 'Autosave restored',
    'Projeto restaurado': 'Project restored',
    'O nome não pode ficar vazio': 'The name cannot be empty',
    'Novo nome do preset:': 'New preset name:',
    'Mídia indisponível': 'Media unavailable',
    'Título': 'Title',
    'Seu texto': 'Your text'
  });

  Object.assign(TRANSLATIONS, {
    'Reproduzir': 'Play', 'Carregando': 'Loading', 'Seu texto aqui': 'Your text here',
    'Nada para desfazer': 'Nothing to undo', 'Nada para refazer': 'Nothing to redo',
    'Selecione um clipe primeiro': 'Select a clip first', 'Selecione o clipe que deseja dividir': 'Select the clip you want to split',
    'O cursor precisa estar dentro do clipe': 'The playhead must be inside the clip', 'Clipe dividido no cursor': 'Clip split at playhead',
    'Selecione um clipe': 'Select a clip', 'Selecione uma camada visual': 'Select a visual layer',
    'Preset de impacto aplicado': 'Impact preset applied', 'Excluir keyframe': 'Delete keyframe', 'Keyframe excluído': 'Keyframe deleted',
    'Redimensionar altura da faixa': 'Resize track height', 'Timeline atualizada': 'Timeline updated',
    'Redimensionamento cancelado': 'Resize canceled', 'Grupo de clipes atualizado': 'Group clips updated',
    'FRAME Studio: falha ao desenhar rastro': 'FRAME Studio: trail rendering failed',
    'FRAME Studio: falha no fallback de imagem': 'FRAME Studio: image fallback failed',
    'Ajustar duração pelo início': 'Adjust duration from start', 'Ajustar duração': 'Adjust duration',
    'Escalar': 'Scale', 'Rotacionar no eixo X': 'Rotate on X axis', 'Rotacionar no eixo Y': 'Rotate on Y axis',
    'Rotacionar no eixo Z': 'Rotate on Z axis', 'Arraste para mudar o ponto de âncora': 'Drag to move the anchor point',
    'Girar máscara': 'Rotate mask', 'Mover âncora da máscara': 'Move mask anchor', 'MÁSCARA': 'MASK',
    'Modo de preview': 'Preview Mode', 'Ajustar': 'Fit', 'Adicionar/remover keyframe': 'Add/remove keyframe',
    'Adicionar/remover keyframe de volume': 'Add/remove volume keyframe', 'Fade de entrada (s)': 'Fade In (s)',
    'Ferramentas do viewport 3D': '3D viewport tools', 'Ir ao fim': 'Go to End', 'Velocidade personalizada': 'Custom Speed'
  });

  const core = { DEFAULTS, TRANSLATIONS, clamp, validHex, normalizeSettings, hexLuminance, accentTextColor };
  if (typeof module !== 'undefined' && module.exports) module.exports = core;
  if (typeof document === 'undefined' || !root) return;

  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));
  const STORAGE_KEY = 'frame-customization-v1';
  let settings = { ...DEFAULTS };
  let previewTimer = null;
  let backgroundLoadEpoch = 0;
  const baseText = new WeakMap();
  const baseAttributes = new WeakMap();
  let mutationLock = false;

  try { settings = normalizeSettings(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')); }
  catch { settings = { ...DEFAULTS }; }
  try { if (!localStorage.getItem('frame-studio-2.4.11-language-migrated')) { settings.language = 'en-US'; localStorage.setItem('frame-studio-2.4.11-language-migrated', '1'); localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } } catch { settings.language = 'en-US'; }

  function originalAttribute(element, name) {
    let values = baseAttributes.get(element);
    if (!values) { values = new Map(); baseAttributes.set(element, values); }
    if (!values.has(name)) values.set(name, element.getAttribute(name));
    return values.get(name);
  }
  function translatedPhrase(original) {
    const trimmed = String(original || '').trim();
    return settings.language === 'en-US' ? (TRANSLATIONS[trimmed] || trimmed) : trimmed;
  }
  function translateTree(subtree) {
    if (mutationLock || !subtree) return;
    mutationLock = true;
    try {
      const walker = document.createTreeWalker(subtree, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          const parent = node.parentElement;
          if (!parent || parent.closest('script,style,textarea,[contenteditable="true"],.clipname,.asset-name,.projectname,.home-project-name,.selected-title,.custom-bg-preview-file')) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      for (const node of nodes) {
        if (!baseText.has(node)) baseText.set(node, node.nodeValue.trim());
        const original = baseText.get(node);
        const translated = translatedPhrase(original);
        const raw = node.nodeValue;
        const lead = raw.match(/^\s*/)?.[0] || '';
        const trail = raw.match(/\s*$/)?.[0] || '';
        const next = lead + translated + trail;
        if (node.nodeValue !== next) node.nodeValue = next;
      }
      const elements = [];
      if (subtree.nodeType === Node.ELEMENT_NODE && subtree.matches('[title],[aria-label],[placeholder]')) elements.push(subtree);
      if (subtree.querySelectorAll) elements.push(...subtree.querySelectorAll('[title],[aria-label],[placeholder]'));
      for (const element of elements) {
        for (const attr of ['title', 'aria-label', 'placeholder']) {
          const current = element.getAttribute(attr);
          if (current === null) continue;
          const original = originalAttribute(element, attr);
          if (original !== null && original !== undefined) {
            const translated = translatedPhrase(original);
            if (element.getAttribute(attr) !== translated) element.setAttribute(attr, translated);
          }
        }
      }
    } finally { mutationLock = false; }
  }

  function safePersist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* Storage can be unavailable in restricted profiles. */ }
    const status = $('#customSavedStatus');
    if (status) status.textContent = settings.language === 'en-US' ? 'Saved automatically' : 'Salvo automaticamente';
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      const label = $('#customSavedStatus');
      if (label) label.textContent = settings.language === 'en-US' ? 'All changes saved' : 'Todas as alterações salvas';
    }, 450);
  }
  function updateControlValues() {
    const values = {
      customLanguage: settings.language, customAccent: settings.accent, customAccentMode: settings.accentMode, customAccentSaturation: settings.accentSaturation, customAccentLightness: settings.accentLightness, customAccentSpeed: settings.accentSpeed, customBgFit: settings.bgFit, customTint: settings.tint,
      customBlur: settings.blur, customOverlay: settings.overlay, customBrightness: settings.brightness,
      customSaturation: settings.saturation, customBgX: settings.bgX, customBgY: settings.bgY,
      customUiOpacity: settings.uiOpacity, customGlass: settings.glass,
      customAura: settings.aura, customReduceMotion: settings.reduceMotion, customCompact: settings.compact
    };
    for (const [id, value] of Object.entries(values)) {
      const element = document.getElementById(id);
      if (!element) continue;
      if (element.type === 'checkbox') element.checked = Boolean(value);
      else element.value = String(value);
    }
    $('#customAccentValue').textContent = settings.accent.toUpperCase();
    const gradientCss = accentGradientPickerCSS(settings.accentGradient);
    for (const id of ['customAccentGradientPreview', 'accentGradientDialogPreview']) { const node = $('#'+id); if(node) node.style.background = gradientCss; }
    const modeHint=$('#customAccentGradientHint'); if(modeHint) modeHint.textContent = settings.accentMode==='background-rgb' ? (settings.language==='en-US'?'Sampling the selected background':'Amostrando o fundo selecionado') : settings.accentMode==='custom-gradient' ? (settings.language==='en-US'?'Using your selected gradient':'Usando o gradiente escolhido') : settings.accentMode==='rgb' ? (settings.language==='en-US'?'Animated RGB cycle':'Ciclo RGB animado') : (settings.language==='en-US'?'Choose a color mode':'Escolha um modo de cor');
    $('#customAccentSaturationValue').textContent = `${settings.accentSaturation}%`;
    $('#customAccentLightnessValue').textContent = `${settings.accentLightness}%`;
    $('#customAccentSpeedValue').textContent = `${settings.accentSpeed.toFixed(1)}×`;
    $('#customTintValue').textContent = settings.tint.toUpperCase();
    $('#customBlurValue').textContent = `${settings.blur} px`;
    $('#customOverlayValue').textContent = `${settings.overlay}%`;
    $('#customBrightnessValue').textContent = `${settings.brightness}%`;
    $('#customSaturationValue').textContent = `${settings.saturation}%`;
    $('#customBgXValue').textContent = `${settings.bgX}%`;
    $('#customBgYValue').textContent = `${settings.bgY}%`;
    $('#customUiOpacityValue').textContent = `${settings.uiOpacity}%`;
    $('#customGlassValue').textContent = `${settings.glass} px`;
    const filename = $('#customBackgroundFilename');
    if (filename) filename.textContent = settings.backgroundName || (settings.language === 'en-US' ? 'No background selected' : 'Nenhum fundo selecionado');
    const preview = $('#customBgPreview');
    if (preview) preview.classList.toggle('has-background', Boolean(settings.backgroundPath));
    $$('[data-accent-preset]').forEach(button => button.classList.toggle('active', button.dataset.accentPreset.toLowerCase() === settings.accent.toLowerCase()));
  }
  let sampledBackgroundRGB = null;
  let lastBackgroundSampleAt = 0;
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
    let h = 0, l = (max + min) / 2, sat = 0;
    if (delta) {
      sat = delta / (1 - Math.abs(2 * l - 1));
      if (max === r) h = ((g - b) / delta) % 6;
      else if (max === g) h = (b - r) / delta + 2;
      else h = (r - g) / delta + 4;
      h = (h * 60 + 360) % 360;
    }
    return { h, s: sat * 100, l: l * 100 };
  }
  function sampleBackgroundPalette(force = false) {
    const now = Date.now();
    if (!force && now - lastBackgroundSampleAt < 850) return;
    lastBackgroundSampleAt = now;
    const source = settings.backgroundKind === 'video' ? $('#customBackgroundVideo') : $('#customBackgroundImage');
    if (!source || source.hidden || !settings.backgroundPath) return;
    const width = source.videoWidth || source.naturalWidth || 0, height = source.videoHeight || source.naturalHeight || 0;
    if (!width || !height) return;
    try {
      const sample = document.createElement('canvas'); sample.width = 32; sample.height = 32;
      const ctx = sample.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(source, 0, 0, 32, 32);
      const pixels = ctx.getImageData(0, 0, 32, 32).data;
      let r = 0, g = 0, b = 0, weightTotal = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const alpha = pixels[i + 3] / 255;
        if (alpha < .05) continue;
        const red=pixels[i],green=pixels[i+1],blue=pixels[i+2];
        const max=Math.max(red,green,blue),min=Math.min(red,green,blue);
        const weight=alpha*(.55+((max-min)/255)*.9);
        r += red*weight; g += green*weight; b += blue*weight; weightTotal += weight;
      }
      if (weightTotal > 0) sampledBackgroundRGB = { r:r/weightTotal, g:g/weightTotal, b:b/weightTotal };
      if (settings.accentMode === 'background-rgb') applyAppearance();
    } catch {
      // Local file protocols can reject canvas sampling. Retain the last successful color or chosen accent.
      if (settings.accentMode === 'background-rgb' && !sampledBackgroundRGB) sampledBackgroundRGB = hexToRgb(settings.accent);
      if (settings.accentMode === 'background-rgb') applyAppearance();
    }
  }
  function hexToRgb(hex) { const value=validHex(hex,DEFAULTS.accent).slice(1);return {r:parseInt(value.slice(0,2),16),g:parseInt(value.slice(2,4),16),b:parseInt(value.slice(4,6),16)}; }
  function accentGradientPickerCSS(gradient) { const model=gradient&&typeof gradient==='object'?gradient:DEFAULTS.accentGradient;const stops=(Array.isArray(model.stops)?model.stops:DEFAULTS.accentGradient.stops).map(s=>({position:clamp(s.position,0,100),color:validHex(s.color,'#ffffff')})).sort((a,b)=>a.position-b.position);return `linear-gradient(${clamp(model.angle??110,0,360)}deg, ${stops.map(s=>`${s.color} ${s.position}%`).join(', ')})`; }
  function generatedAccentGradient() {
    const sat = clamp(settings.accentSaturation, 15, 100), light = clamp(settings.accentLightness, 25, 82);
    let hue = rgbToHsl(...[1, 3, 5].map((offset) => parseInt(settings.accent.slice(offset, offset + 2), 16))).h;
    if (settings.accentMode === 'background-rgb' && sampledBackgroundRGB) hue = rgbToHsl(sampledBackgroundRGB.r, sampledBackgroundRGB.g, sampledBackgroundRGB.b).h;
    if (settings.accentMode === 'custom-gradient') return accentGradientPickerCSS(settings.accentGradient);
    if (settings.accentMode === 'rgb') return `linear-gradient(110deg, hsl(0 ${sat}% ${light}%), hsl(60 ${sat}% ${light}%), hsl(120 ${sat}% ${light}%), hsl(180 ${sat}% ${light}%), hsl(240 ${sat}% ${light}%), hsl(300 ${sat}% ${light}%), hsl(360 ${sat}% ${light}%))`;
    const hues = [hue - 34, hue, hue + 38, hue + 120].map(v => (v + 360) % 360);
    return `linear-gradient(110deg, ${hues.map(h => `hsl(${h} ${sat}% ${light}%)`).join(', ')})`;
  }
  function applyAppearance() {
    const style = document.documentElement.style;
    const gradientMode = settings.accentMode === 'rgb' || settings.accentMode === 'background-rgb';
    const customGradient = settings.accentMode === 'custom-gradient';
    const adaptive = settings.accentMode === 'background-rgb' && sampledBackgroundRGB;
    const accentHex = adaptive ? `#${[adaptive.r,adaptive.g,adaptive.b].map(v=>Math.round(clamp(v,0,255)).toString(16).padStart(2,'0')).join('')}` : customGradient ? (settings.accentGradient.stops[Math.floor(settings.accentGradient.stops.length/2)]?.color||settings.accent) : settings.accent;
    style.setProperty('--accent', accentHex);
    style.setProperty('--accent-ink', accentTextColor(accentHex));
    style.setProperty('--accent-fill', gradientMode || customGradient ? generatedAccentGradient() : settings.accent);
    style.setProperty('--accent-speed', `${Math.max(1, 21 - settings.accentSpeed)}s`);
    document.documentElement.classList.toggle('accent-gradient-active', (gradientMode || customGradient) && !settings.reduceMotion);
    document.documentElement.classList.toggle('accent-gradient-static', customGradient);
    style.setProperty('--ui-opacity', String(settings.uiOpacity / 100));
    style.setProperty('--ui-glass-blur', `${settings.glass}px`);
    style.setProperty('--bg-blur', `${settings.blur}px`);
    style.setProperty('--bg-brightness', String(settings.brightness / 100));
    style.setProperty('--bg-saturation', String(settings.saturation / 100));
    style.setProperty('--bg-overlay', String(settings.overlay / 100));
    style.setProperty('--bg-tint-color', settings.tint);
    style.setProperty('--bg-pos-x', `${settings.bgX}%`);
    style.setProperty('--bg-pos-y', `${settings.bgY}%`);
    style.setProperty('--bg-fit', settings.bgFit);
    document.documentElement.classList.toggle('compact-ui', settings.compact);
    document.documentElement.classList.toggle('reduce-motion', settings.reduceMotion);
    $('#customBackground')?.classList.toggle('aura-on', settings.aura && !settings.reduceMotion);
    updateControlValues();
  }
  async function applyBackground() {
    const loadEpoch = ++backgroundLoadEpoch;
    const targetPath = settings.backgroundPath;
    const targetKind = settings.backgroundKind;
    const layer = $('#customBackground');
    const image = $('#customBackgroundImage');
    const video = $('#customBackgroundVideo');
    if (!layer || !image || !video) return;
    image.hidden = true;
    image.removeAttribute('src');
    video.pause();
    video.hidden = true;
    video.removeAttribute('src');
    if (!targetPath) { sampledBackgroundRGB = hexToRgb(settings.accent); if (settings.accentMode === 'background-rgb') applyAppearance(); return; }
    if (root.frameAPI?.mediaExists) {
      try {
        const exists = await root.frameAPI.mediaExists(targetPath);
        if (loadEpoch !== backgroundLoadEpoch) return;
        if (!exists) {
          settings.backgroundPath = '';
          settings.backgroundName = '';
          safePersist();
          updateControlValues();
          return;
        }
      } catch { /* The custom protocol remains the final availability check. */ }
    }
    if (loadEpoch !== backgroundLoadEpoch) return;
    const url = root.frameAPI?.mediaURL ? root.frameAPI.mediaURL(targetPath) : '';
    if (!url) return;
    if (targetKind === 'video') {
      video.crossOrigin = 'anonymous';
      video.src = url;
      video.hidden = false;
      video.load();
      if (!settings.reduceMotion) video.play().catch(() => { });
    } else {
      image.crossOrigin = 'anonymous';
      image.src = url;
      image.hidden = false;
    }
  }
  function setValue(key, value) {
    settings = normalizeSettings({ ...settings, [key]: value });
    applyAppearance();
    if (key === 'backgroundPath' || key === 'backgroundKind') applyBackground();
    safePersist();
  }
  function openCustomization() {
    const dialog = $('#customizationdialog');
    if (!dialog) return;
    updateControlValues();
    if (!dialog.open) dialog.showModal();
    $('#customLanguage')?.focus();
  }
  function applyLanguage() {
    document.documentElement.lang = settings.language;
    translateTree(document.body);
    updateControlValues();
    safePersist();
  }
  async function chooseBackground() {
    try {
      if (root.frameAPI?.selectCustomizationBackground) {
        const result = await root.frameAPI.selectCustomizationBackground();
        if (result?.canceled || !result?.filePath) return;
        settings = normalizeSettings({ ...settings, backgroundPath: result.filePath, backgroundName: result.name || result.filePath.split(/[\\/]/).pop(), backgroundKind: result.kind === 'video' ? 'video' : 'image' });
        applyAppearance(); applyBackground(); safePersist();
        const filename = $('#customBackgroundFilename');
        if (filename) filename.textContent = settings.backgroundName;
        return;
      }
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*,video/*,.gif';
      input.addEventListener('change', () => {
        const file = input.files?.[0];
        const path = root.frameAPI?.getPathForFile?.(file);
        if (!file || !path || !root.frameAPI?.mediaURL) return;
        const isVideo = file.type.startsWith('video/');
        settings = normalizeSettings({ ...settings, backgroundPath: path, backgroundName: file.name, backgroundKind: isVideo ? 'video' : 'image' });
        applyAppearance(); applyBackground(); safePersist();
      }, { once: true });
      input.click();
    } catch (error) {
      const status = $('#customSavedStatus');
      if (status) status.textContent = (settings.language === 'en-US' ? 'Could not select background: ' : 'Falha ao escolher o fundo: ') + (error?.message || String(error));
    }
  }
  function resetCustomization() {
    settings = { ...DEFAULTS };
    applyAppearance(); applyBackground(); applyLanguage(); safePersist();
  }
  function bindRange(id, key, parse = Number) {
    const element = $('#' + id);
    if (!element) return;
    element.addEventListener('input', () => setValue(key, parse(element.value)));
    element.addEventListener('change', () => setValue(key, parse(element.value)));
  }
  function bindEvents() {
    $('#customizebtn')?.addEventListener('click', openCustomization);
    $('#customizeMenuBtn')?.addEventListener('click', () => { $('#menupop')?.classList.remove('open'); openCustomization(); });
    $('#customLanguage')?.addEventListener('change', event => { setValue('language', event.target.value); applyLanguage(); });
    $('#customAccent')?.addEventListener('input', event => setValue('accent', event.target.value));
    $('#customAccentMode')?.addEventListener('change', event => { setValue('accentMode', event.target.value); sampleBackgroundPalette(true); });
    bindRange('customAccentSaturation', 'accentSaturation'); bindRange('customAccentLightness', 'accentLightness'); bindRange('customAccentSpeed', 'accentSpeed');
    const gradientDialog=$('#accentGradientDialog');
    const readGradientControls=()=>({angle:clamp($('#accentGradientAngle')?.value??settings.accentGradient.angle,0,360),stops:[1,2,3].map(i=>({position:clamp($(`#accentGradientPos${i}`)?.value??([0,50,100][i-1]),0,100),color:validHex($(`#accentGradientColor${i}`)?.value,DEFAULTS.accentGradient.stops[i-1].color)})).sort((a,b)=>a.position-b.position)});
    const refreshGradientControls=()=>{const gradient=readGradientControls();const prev=$('#accentGradientDialogPreview');if(prev)prev.style.background=accentGradientPickerCSS(gradient);};
    const openGradientDialog=()=>{const gradient=settings.accentGradient||DEFAULTS.accentGradient;if($('#accentGradientAngle'))$('#accentGradientAngle').value=String(gradient.angle);[1,2,3].forEach(i=>{const stop=gradient.stops[Math.min(i-1,gradient.stops.length-1)]||DEFAULTS.accentGradient.stops[i-1];if($(`#accentGradientColor${i}`))$(`#accentGradientColor${i}`).value=stop.color;if($(`#accentGradientPos${i}`))$(`#accentGradientPos${i}`).value=String(stop.position)});refreshGradientControls();gradientDialog?.showModal();};
    $('#customAccentEditGradient')?.addEventListener('click',openGradientDialog);
    ['accentGradientAngle','accentGradientColor1','accentGradientColor2','accentGradientColor3','accentGradientPos1','accentGradientPos2','accentGradientPos3'].forEach(id=>{$('#'+id)?.addEventListener('input',refreshGradientControls)});
    $('#accentGradientApply')?.addEventListener('click',()=>{setValue('accentGradient',readGradientControls());setValue('accentMode','custom-gradient');gradientDialog?.close();});
    $('#accentGradientCycle')?.addEventListener('click',()=>{setValue('accentMode','rgb');gradientDialog?.close();});
    $('#customTint')?.addEventListener('input', event => setValue('tint', event.target.value));
    $('#customBgFit')?.addEventListener('change', event => setValue('bgFit', event.target.value));
    for (const button of $$('[data-accent-preset]')) button.addEventListener('click', () => setValue('accent', button.dataset.accentPreset));
    bindRange('customBlur', 'blur'); bindRange('customOverlay', 'overlay'); bindRange('customBrightness', 'brightness');
    bindRange('customSaturation', 'saturation'); bindRange('customBgX', 'bgX'); bindRange('customBgY', 'bgY');
    bindRange('customUiOpacity', 'uiOpacity'); bindRange('customGlass', 'glass');
    $('#customAura')?.addEventListener('change', event => setValue('aura', event.target.checked));
    $('#customReduceMotion')?.addEventListener('change', event => {
      setValue('reduceMotion', event.target.checked);
      const video = $('#customBackgroundVideo');
      if (video) { if (settings.reduceMotion) video.pause(); else if (!video.hidden) video.play().catch(() => { }); }
    });
    $('#customCompact')?.addEventListener('change', event => setValue('compact', event.target.checked));
    $('#chooseBackgroundBtn')?.addEventListener('click', chooseBackground);
    $('#customBackgroundImage')?.addEventListener('load', () => sampleBackgroundPalette(true));
    $('#customBackgroundVideo')?.addEventListener('loadeddata', () => sampleBackgroundPalette(true));
    $('#customBackgroundVideo')?.addEventListener('timeupdate', () => sampleBackgroundPalette(false));
    setInterval(() => { if (settings.accentMode==='background-rgb' && settings.backgroundPath && ((settings.backgroundKind==='image' && /\.gif$/i.test(settings.backgroundName)) || settings.backgroundKind==='video')) sampleBackgroundPalette(false); }, 1000);
    $('#customBackgroundImage')?.addEventListener('error', () => {
      if ($('#customBackgroundImage').hidden || !settings.backgroundPath) return;
      $('#customBackgroundImage').hidden = true;
      const status = $('#customSavedStatus');
      if (status) status.textContent = settings.language === 'en-US' ? 'Could not decode this image/GIF.' : 'Não foi possível abrir esta imagem/GIF.';
    });
    $('#customBackgroundVideo')?.addEventListener('error', () => {
      if ($('#customBackgroundVideo').hidden || !settings.backgroundPath) return;
      $('#customBackgroundVideo').hidden = true;
      const status = $('#customSavedStatus');
      if (status) status.textContent = settings.language === 'en-US' ? 'Could not play this video format.' : 'Não foi possível reproduzir este formato de vídeo.';
    });
    $('#clearBackgroundBtn')?.addEventListener('click', () => {
      settings = normalizeSettings({ ...settings, backgroundPath: '', backgroundName: '', backgroundKind: 'image' });
      applyAppearance(); applyBackground(); safePersist();
    });
    $('#resetCustomizationBtn')?.addEventListener('click', () => {
      const accepted = root.confirm(settings.language === 'en-US' ? 'Reset all appearance settings?' : 'Restaurar todas as configurações visuais?');
      if (accepted) resetCustomization();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && $('#customizationdialog')?.open) $('#customizationdialog').close();
    });
  }

  // First apply styles before waiting for the main editor initialization to finish.
  document.documentElement.lang = settings.language;
  applyAppearance();
  applyBackground();
  translateTree(document.body);
  bindEvents();
  const observer = new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes || []) {
        if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) translateTree(node);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  root.frameStudioCustomization = { open: openCustomization, getSettings: () => ({ ...settings }), reset: resetCustomization, translate: applyLanguage, translateText: translatedPhrase };
})(typeof window !== 'undefined' ? window : globalThis);
