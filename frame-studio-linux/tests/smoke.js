'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const main = fs.readFileSync(path.join(root, 'main.cjs'), 'utf8');
const preload = fs.readFileSync(path.join(root, 'preload.cjs'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length, 1, 'deve haver um script principal do renderer');
const renderer = scripts[0][1];
new vm.Script(renderer, { filename: 'renderer-inline.js' });
new vm.Script(main, { filename: 'main.cjs' });
new vm.Script(preload, { filename: 'preload.cjs' });
assert.equal(pkg.version, '2.4.33', 'package version');

for (const required of [
  'id="previewmode"', 'id="addselected"', 'id="trackzone"', 'function makeFallbackImageTexture(c,a)',
  'data-panel="effects"', 'data-panel="anim"', 'data-panel="3d"',
  'id="cam3denabled"', 'id="camkeyall"', 'id="masktype"', 'id="maskFeather"', 'id="shakepreset"', 'id="easingprop"', 'id="homeScreen"', 'id="updatedialog"', 'id="addtrack"', 'data-camkey="lens"',
  'id="opencustompresets"', 'id="replacemedia"', 'id="presetdialog"', 'id="presetFilter"', 'id="presetCategory"', 'id="presetScope"', 'id="timeremapsection"', 'id="timeremapkey"', 'id="timeremapgraph"', 'id="remappreset-freeze"', 'id="remappreset-reverse"', 'id="remappreset-freeze-point"', 'id="timeremapinterpolation"', 'function drawTimeRemapGraph(c,points)', 'function saveCustomPreset()', 'function applyCustomPreset()', 'function renameCustomPreset()', 'function deleteCustomPreset()', 'function copySelectedClips()', 'function pasteClips()', 'function replaceSelectedMedia()', 'function sourceTimeAt(c,', 'function sourceRateAt(c,', 'timeRemap:[]', 'copy:copySelectedClips,paste:pasteClips',
  'selectedIds=new Set()', 'suppressClipClickId', 'function effectPreviewScale', 'volumeKeyframes:clip.keyframes?.volume||[]', 'What should the TOTAL maximum number of video tracks be?',
  'data-handle=\"rotateX3d\"', 'data-handle=\"rotateY3d\"', 'data-handle=\"rotateZ3d\"', 'timeline-snap-indicator', 'frame-recent-projects',
  'data-prop="rgbSplit"', 'data-prop="waveAmp"', 'data-prop="oscX"',
  'data-prop="exposure"', 'data-prop="gamma"', 'data-prop="chromaKey"',
  'id="cameaseprop"', 'data-camera-ease="smooth"', 'camera-tween-segment', 'getTweenSegments', 'migrateLegacyLayerTracks', 'findEmptyVideoTrack', 'timelineTargetTrack', 'camera-keylane-empty', 'target-track', 'version:9', 'migrateLegacyLayerTracks', 'id="camedetailcurve"', 'function updateCameraEaseUI()', 'function applyCameraEase(name)', 'function writeCameraPoseAtPlayhead(pose)', 'visible.left+1,visible.right-1', 'lockedScrollLeft', 'blankClickSelection', 'Seleção limpa', 'trackrow-video-even', 'TRACK_ROW_HEIGHT=36', 'videoTrackCount=6', "target.closest('#app')", 'Crie um keyframe para esta propriedade da câmera',
  'data-camera-action="orbit-left"', 'function drawLayer3D', 'function drawTexturedTriangle',
  'id="importfonts"', 'data-panel="shadow"', 'function drawWaveformCanvas', 'function requestWaveform', 'function withDropShadow', 'function initWorkspaceResizers', 'function resetWorkspaceLayout', 'function groupSelectedClips', 'function toggleGroupCollapse', 'group-collapse-toggle', 'function importCustomFonts', 'fadeIn:clip.fadeIn||0',
  'application/x-frame-asset', 'frameAPI.checkExportTools', 'frameAPI.beginFrameExport', 'frameAPI.writeExportFrame', 'frameAPI.finishFrameExport', 'onExportProgress'
 ]) assert.ok(html.includes(required) || preload.includes(required), `recurso ausente: ${required}`);

// Feature wiring checks for the 2.4.16 editor update. These verify that the
// controls and the renderer/persistence entry points are present; they do not
// replace a manual GUI interaction test in a real Electron window.
for (const required of [
  'id="textcontent"', 'id="font"', 'id="fontweight"', 'id="textalign"',
  'id="textlinespacing"', 'id="textspacing"', 'id="textstrokewidth"',
  'function normalizeLayerGroups(', 'function groupDescendantClips(', 'function toggleGroupCollapse(',
  'function drawSceneEditorViewport(', 'function updateCameraGizmoOverlay(', 'function applyCameraMotionBlur(',
  'id="cameraviewmode"', 'id="camerablurenabled"', 'id="camerablurintensity"',
  'id="colorizeenabled"', 'id="gradientenabled"', 'id="blendmode"',
  'function updateLayerFill(', 'function maskGeometryForClip(', 'function updateMaskTransformOverlay(',
  'groups:layerGroups', 'version:9', '.tl-scroll{overflow:auto', '.timeline{overscroll-behavior:contain', 'function zoomTimelineAtPointer(', 'function timelineTrackGeometry(', 'function applyTrackLayoutOnly(', 'function sceneCameraBasis(', 'function sceneProjectPoint(', 'function attachSceneViewportNavigation(', 'function renderSceneCameraGizmo(', 'id="recordaudio"', 'id="extractaudio"', 'frameAPI.generateWaveform', 'frameAPI.saveAudioRecording', 'frameAPI.extractAudio'
]) assert.ok(html.includes(required), `integração 2.4.16 ausente: ${required}`);
assert.doesNotMatch(renderer, /if\(track>0\)timelineTargetTrack=track/, 'arrastar mídia não pode prender o destino nas próximas inserções');
assert.match(renderer, /const timelineDrop=async\(e\)=>\{[\s\S]*?addClip\(a,\{start:x,\.\.\.\(track===null\?\{\}:\{track\}\)\}\);/, 'drop de mídia normal ou da biblioteca persistente deve passar a faixa como destino só desta inserção');
assert.match(preload, /saveVideo:\s*\(name, buffer/, 'a API legada deve continuar explícita sem ser usada pelo novo renderer');
assert.match(main, /transcodeWebmToMp4/, 'o processo principal mantém o caminho de transcodificação legado validado');
assert.match(main, /renderFrameSequenceToMp4/, 'a exportação principal deve codificar uma sequência determinística de frames');
assert.match(html, /id="exportquality"/, 'as preferências devem oferecer opções de CRF');
assert.match(html, /id="renderquality"/, 'a barra superior deve oferecer qualidade do MP4');
assert.match(html, /id="renderfps"/, 'a barra superior deve oferecer FPS do MP4');
for (const crf of ['18','23','28']) assert.match(html, new RegExp(`<option value=\"${crf}\"`), `opção CRF ${crf} deve existir`);
assert.match(html, /id="projectfps"/, 'as configurações devem expor FPS do projeto');
const fpsOptions = html.match(/<select id="projectfps">([\s\S]*?)<\/select>/)?.[1] || '';
for (const fps of ['24','25','30','50','60']) assert.ok(fpsOptions.includes(`<option>${fps}</option>`) || fpsOptions.includes(`<option selected>${fps}</option>`) || fpsOptions.includes(`<option selected="">${fps}</option>`), `opção ${fps} FPS deve existir`);
assert.match(fs.readFileSync(path.join(root, 'media-export.cjs'), 'utf8'), /function volumeAutomationExpression/, 'keyframes de volume têm uma expressão dedicada no FFmpeg');
assert.match(fs.readFileSync(path.join(root, 'media-export.cjs'), 'utf8'), /'-crf', String\(safeCrf\)/, 'a qualidade selecionada deve chegar ao FFmpeg');
assert.match(fs.readFileSync(path.join(root, 'media-export.cjs'), 'utf8'), /'-r', String\(safeFps\)/, 'FPS dinâmico deve chegar ao FFmpeg');
assert.match(main, /frame:write-export-frame/, 'cada frame é enviado por uma rota IPC explícita');
assert.match(renderer, /function prepareVideoFramesAt\(t\)/, 'cada timestamp deve aguardar as fontes de vídeo ativas');
assert.match(renderer, /document\.createElement\('canvas'\)/, 'a renderização deve usar um canvas não ligado ao preview visível');
assert.match(renderer, /new MediaRecorder/, 'gravação de microfone deve usar MediaRecorder real');
assert.match(renderer, /function insertRecordedAudio/, 'workflow de gravação deve inserir o asset real');
assert.match(renderer, /function extractAudioFromVideo/, 'extração deve estar conectada à timeline');
assert.match(fs.readFileSync(path.join(root, 'media-export.cjs'), 'utf8'), /spawn\(binary, args/, 'FFmpeg/ffprobe devem iniciar com spawn e argumentos separados');
assert.match(main, /contextIsolation: true/);
assert.match(main, /nodeIntegration: false/);
assert.match(main, /assertTrustedSender/);

assert.match(renderer, /window\.addEventListener\('keydown',dispatchShortcutKeyDown,true\)/, 'atalhos globais devem ser processados na fase de captura');
assert.match(renderer, /window\.addEventListener\('keyup',suppressNativeSpaceActivation,true\)/, 'key-up de Espaço deve impedir ativação de botões focados');
assert.match(renderer, /\.shortcut-button\.listening/, 'remapeamento de atalhos deve continuar recebendo a tecla escolhida');

// Exercise the real media synchronization function at a source clip boundary.
const syncBlock = renderer.match(/function syncMedia\(force=false\)\{[\s\S]*?\n\}\nfunction frame/)?.[0].replace(/\nfunction frame$/, '');
assert.ok(syncBlock, 'função syncMedia encontrada');
const playbackClip = { id: 'clip1', assetId: 'asset1', kind: 'video', track: 1, start: 0, inPoint: 0, outPoint: 1, speed: 1 };
const makeMedia = (currentTime, ended) => ({
  duration: 1, currentTime, ended, paused: true, playbackRate: 1, playCalls: 0, pauseCalls: 0,
  pause() { this.paused = true; this.pauseCalls++; },
  play() { this.playCalls++; this.paused = false; this.ended = false; return { catch() {} }; }
});
const playbackContext = vm.createContext({
  activeAt: () => [playbackClip], assets: [], trackSettings: {}, playhead: .999,
  projectFPS: 30, playing: true, playStarting: false, playbackEpoch: 1, mediaPlayErrors: new Set(), clamp: (n,a,b)=>Math.max(a,Math.min(b,n)), sourceRateAt: c=>Number(c.speed)||1, sourceTimeAt: (c,t)=>Number(c.inPoint)+(t-Number(c.start))*(Number(c.speed)||1), Number, Math,
  setStatus: text => playbackContext.statuses.push(text), statuses: [], $: () => ({textContent:''})
});
vm.runInContext(syncBlock, playbackContext);
const endedMedia = makeMedia(1, true);
playbackContext.assets = [{ id: 'asset1', name: 'sample.mp4', kind: 'video', duration: 1, el: endedMedia }];
vm.runInContext('syncMedia(false)', playbackContext);
assert.equal(endedMedia.playCalls, 0, 'um source no fim do clipe não deve ser reiniciado repetidamente');
assert.equal(endedMedia.paused, true, 'o source deve manter-se parado enquanto a timeline continua');
assert.ok(Math.abs(endedMedia.currentTime - (1 - 0.25/30)) < 0.002, 'o source deve ficar no último frame seguro');

// A real HTMLMediaElement `ended` event must not turn off the project clock.
const endedHandlerBlock = renderer.match(/function handleMediaEnded\(asset\)\{[\s\S]*?\n\}\nfunction seekVideoPreviewTo/)?.[0].replace(/\nfunction seekVideoPreviewTo$/, '');
assert.ok(endedHandlerBlock, 'função handleMediaEnded encontrada');
const endedHandlerContext = vm.createContext({
  offlineRendering:false, previewMode:'timeline', sourcePreviewId:null, sourcePlaybackEpoch:7, sourcePlaying:false,
  playbackEpoch:14, playing:true, playhead:.999, trackSettings:{}, assets:[], clips:[playbackClip],
  activeAt:()=>[playbackClip], clamp:(n,a,b)=>Math.max(a,Math.min(b,n)), sourceTimeAt:(c,t)=>Number(c.inPoint)+(t-Number(c.start))*(Number(c.speed)||1), Number, Math,
  $:()=>({textContent:''}), drawPreview(){endedHandlerContext.draws++}, draws:0
});
vm.runInContext(endedHandlerBlock, endedHandlerContext);
vm.runInContext('handleMediaEnded({id:"asset1",duration:1,el:{duration:1,currentTime:1,seeking:false}})', endedHandlerContext);
assert.equal(endedHandlerContext.playing, true, '`ended` de uma fonte não pode interromper a timeline');
assert.equal(endedHandlerContext.playbackEpoch, 14, '`ended` não deve invalidar a sessão global de reprodução');
const unexpectedlyEnded = makeMedia(1, true);
playbackContext.assets = [{ id: 'asset1', name: 'sample.mp4', kind: 'video', duration: 1, el: unexpectedlyEnded }];
playbackContext.playhead = .5;
vm.runInContext('syncMedia(true)', playbackContext);
assert.equal(unexpectedlyEnded.playCalls, 1, 'se o source terminar antes do tempo de timeline, deve ser reposicionado e retomado');

// A pending media play can reject after a pause/seek race. AbortError is expected
// in that case and must not pause the project timeline.
const makePendingMedia = (currentTime=0.5) => ({
  duration: 1, currentTime, ended: false, paused: true, playbackRate: 1, pauseCalls: 0,
  pause() { this.paused=true; this.pauseCalls++; },
  play() { this.rejectPlay=null; return { catch: fn => { this.rejectPlay=fn; } }; }
});
const pendingAbort = makePendingMedia(.5);
playbackContext.assets=[{id:'asset1',name:'sample.mp4',kind:'video',duration:1,el:pendingAbort}];
playbackContext.playhead=.5;playbackContext.playbackEpoch=9;playbackContext.playing=true;playbackContext.mediaPlayErrors.clear();
vm.runInContext('syncMedia(false)', playbackContext);
assert.equal(typeof pendingAbort.rejectPlay, 'function', 'a rejeição assíncrona deve ter tratamento');
pendingAbort.rejectPlay({name:'AbortError',message:'The play() request was interrupted by a call to pause()'});
assert.equal(playbackContext.playing, true, 'AbortError de seek/pausa concorrente não pode travar o play');

// A media rejection must be reported without stopping the timeline clock; a stale
// rejection from an older play request must not affect a newer session.
const blockedMedia=makePendingMedia(.5);
playbackContext.assets=[{id:'asset1',name:'sample.mp4',kind:'video',duration:1,el:blockedMedia}];
playbackContext.playhead=.5;playbackContext.playbackEpoch=10;playbackContext.playing=true;playbackContext.mediaPlayErrors.clear();
vm.runInContext('syncMedia(false)', playbackContext);
blockedMedia.rejectPlay({name:'NotAllowedError',message:'playback denied'});
assert.equal(playbackContext.playing, true, 'a falha de uma mídia não deve parar a timeline inteira');
assert.ok(playbackContext.mediaPlayErrors.has('asset1'), 'a mídia com falha deve ser marcada para evitar repetição do erro');
assert.ok(playbackContext.statuses.some(text=>text.includes('playback denied')), 'a falha de reprodução deve ser comunicada');
const staleMedia=makePendingMedia(.5);
playbackContext.assets=[{id:'asset1',name:'sample.mp4',kind:'video',duration:1,el:staleMedia}];
playbackContext.playhead=.5;playbackContext.playbackEpoch=11;playbackContext.playing=true;playbackContext.mediaPlayErrors.clear();
vm.runInContext('syncMedia(false)', playbackContext);
playbackContext.playbackEpoch=12;
staleMedia.rejectPlay({name:'NotAllowedError',message:'late rejection from old playback'});
assert.equal(playbackContext.playing, true, 'uma rejeição atrasada não pode parar uma sessão mais recente');

// Exercise the real toggle handler: playback must start synchronously even if
// AudioContext.resume() never resolves, and pressing Play at the project end restarts at zero.
const toggleBlock = renderer.match(/function togglePlay\(\)\{[\s\S]*?\n\}\n(?:const frameEffectCatalog|function updateInspector)/)?.[0].replace(/\n(?:const frameEffectCatalog|function updateInspector)$/, '');
assert.ok(toggleBlock, 'função togglePlay encontrada');
const toggleContext = vm.createContext({
  offlineRendering:false, exportStarting:false, previewMode:'timeline', sourcePlaying:false, playing:false, playStarting:false,
  playbackEpoch:3, sourcePlaybackEpoch:0, lastFrame:800, playhead:5, projectFPS:30, mediaPlayErrors:new Set(), assets:[],
  endTime:()=>5, setPlayhead(t){toggleContext.playhead=t}, ensureAudio:()=>new Promise(()=>{}), syncMedia(){toggleContext.syncCalls++}, syncCalls:0,
  $:()=>({textContent:''}), setStatus:()=>{}, Promise, Number, Math, message:()=>{}
});
vm.runInContext(toggleBlock, toggleContext);
vm.runInContext('togglePlay()', toggleContext);
assert.equal(toggleContext.playing, true, 'Play deve iniciar sem esperar pelo AudioContext');
assert.equal(toggleContext.playhead, 0, 'Play no fim do projeto deve reiniciar do início');
assert.equal(toggleContext.syncCalls, 1, 'o sincronizador de mídia deve ser chamado imediatamente');
vm.runInContext('togglePlay()', toggleContext);
assert.equal(toggleContext.playing, false, 'o segundo clique deve pausar normalmente');
toggleContext.playhead=1;vm.runInContext('togglePlay()', toggleContext);
assert.equal(toggleContext.playing, true, 'Play deve voltar a funcionar após uma pausa ou fim de mídia');

// Exercise the real shortcut handlers with focused controls, editable fields and dialogs.
const handlerBlock = renderer.match(/let spaceShortcutKeyHandled=false;[\s\S]*?window\.addEventListener\('blur',\(\)=>\{spaceShortcutKeyHandled=false\},true\);/)[0];
const keyboardContext = vm.createContext({
  shortcuts: { play: 'Space', split: 's' },
  canonicalKey: e => { const bits=[]; if(e.ctrlKey||e.metaKey)bits.push('Ctrl');if(e.altKey)bits.push('Alt');if(e.shiftKey)bits.push('Shift');let key=e.key;if(key===' ')key='Space';else if(key==='Escape')key='Esc';else if(key.length===1)key=key.toLowerCase();else key=key[0].toUpperCase()+key.slice(1);if(['Control','Shift','Alt','Meta'].includes(key))return '';bits.push(key);return bits.join('+') },
  normalizeHotkey: s => String(s || '').toLowerCase(),
  runShortcut: id => keyboardContext.calls.push(id), calls: [],
  document: { querySelector: selector => selector==='dialog[open]'&&keyboardContext.dialogOpen?{}:null },
  window: { addEventListener: (name, fn) => { keyboardContext.listeners[name]=fn } },
  listeners: {}, dialogOpen:false, Object, Array, String
});
vm.runInContext(handlerBlock, keyboardContext);
const keyEvent = (target, key=' ', repeat=false) => ({
  target, key, code:key===' '?'Space':`Key${String(key).toUpperCase()}`, repeat, ctrlKey:false,metaKey:false,altKey:false,shiftKey:false,
  prevented:false,stopped:false,immediate:false,
  preventDefault(){this.prevented=true},stopPropagation(){this.stopped=true},stopImmediatePropagation(){this.immediate=true}
});
const focusedButton={tagName:'BUTTON',isContentEditable:false,closest:()=>null};
let down=keyEvent(focusedButton);keyboardContext.dispatchShortcutKeyDown(down);
assert.equal(keyboardContext.calls.join(','),'play','Espaço em botão focado deve executar somente play/pause');
assert.ok(down.prevented&&down.immediate,'keydown deve impedir a ativação nativa do botão');
const repeatEvent=keyEvent(focusedButton,' ',true);keyboardContext.dispatchShortcutKeyDown(repeatEvent);
assert.equal(keyboardContext.calls.length,1,'repetição de keydown não deve alternar play/pause');
const up=keyEvent(focusedButton);keyboardContext.suppressNativeSpaceActivation(up);
assert.ok(up.prevented&&up.immediate,'keyup da tecla controlada deve ser suprimido');
// The same keyboard sequence should work after focus lands on controls from the preview,
// timeline, asset library or inspector, not only the play button.
const controlTargets=['BUTTON','DIV','SVG','BUTTON'].map(tagName=>({tagName,isContentEditable:false,closest:()=>null}));
for(const target of controlTargets){
 const event=keyEvent(target);keyboardContext.dispatchShortcutKeyDown(event);
 assert.ok(event.prevented,'Space precisa ser interceptado em todos os controles não editáveis');
 const release=keyEvent(target);keyboardContext.suppressNativeSpaceActivation(release);
 assert.ok(release.prevented,'keyup também precisa ser suprimido em cada controle');
}
assert.equal(keyboardContext.calls.length,1+controlTargets.length,'cada pressionamento completo deve alternar play/pause exatamente uma vez');
const input={tagName:'INPUT',isContentEditable:false,closest:()=>null};
const inputEvent=keyEvent(input);keyboardContext.dispatchShortcutKeyDown(inputEvent);
assert.equal(keyboardContext.calls.length,1+controlTargets.length,'campos de entrada devem poder receber Espaços');
assert.equal(inputEvent.prevented,false,'Espaço digitado não pode ser cancelado');
const listeningButton={tagName:'BUTTON',isContentEditable:false,closest:(selector)=>selector.includes('.shortcut-button.listening')?{}:null};
assert.equal(keyboardContext.isTypingTarget(listeningButton),true,'o remapeamento de atalhos deve poder capturar Espaço');
keyboardContext.dialogOpen=true;
const dialogKey=keyEvent(focusedButton);keyboardContext.dispatchShortcutKeyDown(dialogKey);
assert.equal(dialogKey.prevented,false,'atalhos globais não devem roubar Space de botões dentro de diálogos');
keyboardContext.dialogOpen=false;
keyboardContext.shortcuts.play='p';keyboardContext.shortcuts.split='Space';
const remapped=keyEvent(focusedButton);keyboardContext.dispatchShortcutKeyDown(remapped);
assert.equal(keyboardContext.calls.at(-1),'split','o mapeamento de atalhos configurável deve ser respeitado');
// The keyup remains suppressed if focus changes between keydown and keyup.
const focusContext=vm.createContext({
  shortcuts:{play:'Space'},normalizeHotkey:s=>String(s||'').toLowerCase(),isTypingTarget:()=>false,
  stopKeyboardEvent:e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation()},spaceShortcutKeyHandled:true,
  isSpaceEvent:e=>e.code==='Space'||e.key===' ',hasOpenDialog:()=>false
});
vm.runInContext(renderer.match(/function suppressNativeSpaceActivation\(e\)\{[\s\S]*?\n\}/)[0],focusContext);
const changedFocusUp=keyEvent(input);focusContext.suppressNativeSpaceActivation(changedFocusUp);
assert.ok(changedFocusUp.prevented&&changedFocusUp.immediate,'troca de foco entre keydown/keyup não pode acionar o botão');

assert.match(fs.readFileSync(path.join(root, 'media-export.cjs'), 'utf8'), /libx264/);
assert.match(fs.readFileSync(path.join(root, 'media-export.cjs'), 'utf8'), /aac/);
assert.match(fs.readFileSync(path.join(root, 'media-export.cjs'), 'utf8'), /probeMedia\(outputPath/);
assert.match(main, /frame:cancel-export/);
assert.match(main, /frame:import-fonts-zip/);
assert.match(main, /validSignature/);
assert.match(main, /fadeIn: Math\.max\(0, Math\.min\(30/);
assert.match(fs.readFileSync(path.join(root, 'media-export.cjs'), 'utf8'), /afade=t=in/);
assert.match(fs.readFileSync(path.join(root, 'media-export.cjs'), 'utf8'), /afade=t=out/);
assert.match(renderer, /function cameraAtTime/);
assert.match(renderer, /function inverseCameraRotate/);
assert.match(renderer, /function processLayerPixels|function makeLayerBase/);
assert.match(renderer, /function makeFallbackImageTexture\(c,a\)/, 'imagem precisa de caminho alternativo de desenho');
assert.match(renderer, /efeito ignorado temporariamente.*imagem preservada/, 'falha de efeito não deve ocultar uma imagem estática');

// Verify that the project's interpolation math is genuinely non-linear for Smooth.
function sourceLine(name) {
  const line = renderer.split('\n').find(s => s.startsWith(`function ${name}(`));
  assert.ok(line, `função ${name} encontrada`);
  return line;
}
const easingSource = renderer.match(/function getPropsAt\(c,t\)\{[\s\S]*?\nfunction baseScale/);
assert.ok(easingSource, 'funções de interpolação encontradas');
const getPropsCode = easingSource[0].replace(/\nfunction baseScale$/, '');
const getPropsAt = vm.runInNewContext(`
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const duration=c=>Math.max(0,(c.outPoint-c.inPoint)/Math.max(.1,Number(c.speed)||1));
  let ease={x1:.25,y1:.1,x2:.25,y2:1};
  ${getPropsCode}
  getPropsAt;
`);
const smooth = { x1: .25, y1: .1, x2: .25, y2: 1 };
const linear = { x1: 0, y1: 0, x2: 1, y2: 1 };
const baseClip = {
  start: 0, inPoint: 0, outPoint: 1, speed: 1,
  props: { x: 0 }, keyframes: { x: [
    { time: 0, value: 0, ease: smooth },
    { time: 1, value: 100, ease: smooth }
  ] }
};
const smoothHalf = getPropsAt(baseClip, .5).x;
assert.ok(smoothHalf > 50 && smoothHalf < 100, `smooth precisa ser não linear; x(0.5)=${smoothHalf}`);
baseClip.keyframes.x[0].ease = linear;
const linearHalf = getPropsAt(baseClip, .5).x;
assert.ok(Math.abs(linearHalf - 50) < 0.1, `linear precisa preservar o ponto médio; x(0.5)=${linearHalf}`);

// Verify actual Time Remap mapping: linear defaults, curved source mapping, and finite rate.
const remapCode = ['function timeRemapPoints', 'function remapProgress', 'function sourceTimeAt', 'function sourceRateAt'].map(prefix => renderer.split('\n').find(line => line.startsWith(prefix))).filter(Boolean).join('\n');
assert.equal(remapCode.split('\n').length, 4, 'helpers de Time Remap devem ser extraíveis para teste');
const remapContext = vm.createContext({ clamp:(n,a,b)=>Math.max(a,Math.min(b,n)), duration:c=>Math.max(0,(c.outPoint-c.inPoint)/Math.max(.1,Number(c.speed)||1)), bezierEase:(x,curve)=>x, remapLinearEase:linear, projectFPS:30, Math, Number });
vm.runInContext(remapCode, remapContext);
const remapClip = { start:2, inPoint:4, outPoint:14, speed:1, timeRemap:[] };
remapContext.remapClip = remapClip;
assert.ok(Math.abs(vm.runInContext('sourceTimeAt(remapClip, 7)', remapContext)-9) < 0.001, 'sem pontos, Time Remap deve manter a leitura linear');
remapClip.timeRemap = [{time:.5,value:.2,ease:linear}];
assert.ok(Math.abs(vm.runInContext('sourceTimeAt(remapClip, 7)', remapContext)-6) < .02, 'ponto de remapeamento deve alterar a posição da fonte');
assert.ok(Number.isFinite(vm.runInContext('sourceRateAt(remapClip, 4.5)', remapContext)), 'taxa do remapeamento deve permanecer finita');

// Exercise partial and complete custom-preset application, including retained volume keyframes.
const presetScopeCode = renderer.split('\n').find(line => line.startsWith('function copyPresetScopeToClip('));
assert.ok(presetScopeCode, 'função de aplicação de escopo dos presets encontrada');
const presetContext = vm.createContext({ deepClone:value=>JSON.parse(JSON.stringify(value)), clamp:(n,a,b)=>Math.max(a,Math.min(b,n)), Number });
vm.runInContext(presetScopeCode, presetContext);
presetContext.presetTarget = { kind:'video', props:{x:0}, keyframes:{x:[{time:0,value:0}],volume:[{time:0,value:45}]}, speed:1, volume:80, timeRemap:[], mask:{type:'none'}, anchorX:0, anchorY:0 };
presetContext.presetPayload = { props:{x:24}, keyframes:{x:[{time:.5,value:24}],volume:[{time:0,value:130}]}, volume:130, speed:2, timeRemap:[{time:.5,value:.2,ease:linear}], mask:{type:'ellipse'}, anchorX:.2, anchorY:.3 };
vm.runInContext("copyPresetScopeToClip(presetTarget,presetPayload,'properties')", presetContext);
assert.equal(presetContext.presetTarget.props.x,24,'escopo Propriedades deve aplicar propriedades');
assert.equal(presetContext.presetTarget.keyframes.volume[0].value,45,'escopo Propriedades deve preservar keyframes de volume do clipe destino');
assert.equal(presetContext.presetTarget.speed,1,'escopo Propriedades não deve alterar a velocidade');
vm.runInContext("copyPresetScopeToClip(presetTarget,presetPayload,'all')", presetContext);
assert.equal(presetContext.presetTarget.speed,2,'escopo Tudo deve aplicar a velocidade');
assert.equal(presetContext.presetTarget.volume,130,'escopo Tudo deve aplicar o volume');
assert.equal(presetContext.presetTarget.timeRemap[0].value,.2,'escopo Tudo deve aplicar a curva Time Remap');

// Paste should create a new clip instance and look both above and below the original track when blocked.
const pasteSource = renderer.split('\n').find(line => line.startsWith('function pasteClips('));
assert.ok(pasteSource, 'função de colagem encontrada');
const pasteContext = vm.createContext({
  clipClipboard:{ clips:[{ data:{id:'old',assetId:'asset',kind:'video',name:'clip',start:20,inPoint:0,outPoint:2,speed:1,track:32,props:{x:1},keyframes:{x:[{time:0,value:1}]},timeRemap:[]},offset:0,track:32}],baseStart:20,baseTrack:32 },
  playhead:5, clips:[{id:'existing',assetId:'other',kind:'video',start:5,inPoint:0,outPoint:2,speed:1,track:32}],
  selectedId:null,selectedIds:new Set(), MAX_VIDEO_TRACKS:32, nextId:0,
  deepClone:value=>JSON.parse(JSON.stringify(value)), makeId:()=>`paste-${++pasteContext.nextId}`,
  duration:c=>Math.max(0,(c.outPoint-c.inPoint)/Math.max(.1,Number(c.speed)||1)), Math, Number,
  pushUndo(){pasteContext.undoCount++},undoCount:0, message:()=>{}, updateTimeline(){},updateInspector(){},drawPreview(){},syncMedia(){},queueAutosave(){},
});
vm.runInContext(pasteSource,pasteContext);
vm.runInContext('pasteClips()',pasteContext);
const pasted=pasteContext.clips.find(c=>c.id==='paste-1');
assert.ok(pasted,'colar deve criar uma instância com ID novo');
assert.equal(pasted.track,31,'quando V32 está ocupada, colar deve procurar uma faixa livre abaixo');
assert.equal(pasted.assetId,'asset','instância colada deve manter a referência à mídia original');
assert.notEqual(pasted.props,pasteContext.clipClipboard.clips[0].data.props,'propriedades da cópia devem ser independentes');
assert.notEqual(pasted.keyframes,pasteContext.clipClipboard.clips[0].data.keyframes,'keyframes da cópia devem ser independentes');
assert.equal(pasted.start,5,'a primeira instância deve alinhar ao playhead');
assert.equal(pasteContext.undoCount,1,'colar deve registrar Undo');

const mediaKindSource=renderer.split('\n').find(line=>line.startsWith('function mediaKindFromPath('));
const mediaKindContext=vm.createContext({});vm.runInContext(mediaKindSource,mediaKindContext);
assert.equal(vm.runInContext("mediaKindFromPath('/tmp/replacement.mp4')",mediaKindContext),'video','Replace Media identifica vídeos pela extensão');
assert.equal(vm.runInContext("mediaKindFromPath('/tmp/replacement.wav')",mediaKindContext),'audio','Replace Media identifica áudio pela extensão');
assert.equal(vm.runInContext("mediaKindFromPath('/tmp/replacement.png')",mediaKindContext),'image','Replace Media identifica imagens pela extensão');


// Run the actual camera math functions extracted from the renderer.
const cameraContext = vm.createContext({
  canvas: { width: 1280, height: 720 },
  camera3d: { enabled: true, x: 0, y: 0, z: -1800, rotationX: 0, rotationY: 0, rotationZ: 0, lens: 50, keyframes: {} },
  playhead: 0,
  ease: linear,
  clamp: (n, a, b) => Math.max(a, Math.min(b, n)),
  Math, Number
});
vm.runInContext([
  sourceLine('bezierCoord'), sourceLine('easeValue'), sourceLine('bezierCurveEase'), sourceLine('bezierEase'), sourceLine('cameraAtTime'),
  sourceLine('rotateVector'), sourceLine('inverseCameraRotate'), sourceLine('cameraRenderPoseAtTime'), sourceLine('cameraProject')
].join('\n'), cameraContext);
const center = vm.runInContext('cameraProject({x:0,y:0,z:0})', cameraContext);
assert.ok(center && Math.abs(center.x - 640) < 0.01 && Math.abs(center.y - 360) < 0.01, 'a câmera padrão deve projetar a origem no centro do canvas');
const offset = vm.runInContext('cameraProject({x:100,y:0,z:0})', cameraContext);
assert.ok(offset && offset.x > center.x, 'deslocamento X no mundo deve ser projetado à direita');
const cameraAnimation = vm.runInContext(`camera3d.keyframes.lens=[{time:0,value:50,ease:${JSON.stringify(linear)}},{time:1,value:100,ease:${JSON.stringify(linear)}}];playhead=.5;cameraAtTime(playhead).lens`, cameraContext);
assert.ok(Math.abs(cameraAnimation - 75) < 0.01, `distância focal deve interpolar keyframes; recebeu ${cameraAnimation}`);


// Regression test: makeLayerBase returns a texture descriptor {canvas, width, height};
// CanvasRenderingContext2D.drawImage must receive the CanvasImageSource, not the descriptor.
const drawLayer2DSource = renderer.match(/function drawLayer2D\(tex,p,c,alpha=1\)\{[^\n]*/)?.[0];
assert.ok(drawLayer2DSource, 'função drawLayer2D encontrada');
const drawable = { width: 16, height: 12, tag: 'actual-canvas' };
const wrapper = { canvas: drawable, width: 16, height: 12, baseWidth: 10, baseHeight: 8 };
const drawCalls = [];
const layerContext = vm.createContext({
  canvas: { width: 1280, height: 720 },
  ctx: { save(){}, restore(){}, translate(){}, rotate(){}, scale(){}, drawImage(...args){drawCalls.push(args)} },
  clamp: (n,a,b)=>Math.max(a,Math.min(b,n)), Math, Number
});
vm.runInContext(drawLayer2DSource, layerContext);
vm.runInContext('drawLayer2D(texture, {x:0,y:0,rotation:0,scaleX:100,scaleY:100}, {anchorX:0,anchorY:0}, 1)', Object.assign(layerContext, { texture: wrapper }));
assert.equal(drawCalls.length, 1, 'a camada deve desenhar exatamente uma vez');
assert.equal(drawCalls[0][0], drawable, 'drawLayer2D deve desenhar o canvas da textura, não o descritor');

const triangleSource = renderer.match(/function drawTexturedTriangle\(texture,s0,s1,s2,d0,d1,d2\)\{[^\n]*/)?.[0];
assert.ok(triangleSource, 'função drawTexturedTriangle encontrada');
const triangleDrawCalls=[];
const triangleContext=vm.createContext({ctx:{save(){},restore(){},setTransform(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},clip(){},drawImage(...args){triangleDrawCalls.push(args)}},Math});
vm.runInContext(triangleSource,triangleContext);
vm.runInContext('drawTexturedTriangle(texture,{x:0,y:0},{x:1,y:0},{x:0,y:1},{x:0,y:0},{x:1,y:0},{x:0,y:1})',Object.assign(triangleContext,{texture:wrapper}));
assert.equal(triangleDrawCalls[0][0],drawable,'a câmera 3D também deve desenhar o canvas da textura');
assert.match(renderer, /c\.kind==='text'\?c\.text:null/, 'texto não pode acessar a.kind quando a camada não tem asset');


// Regression: the still-image fallback must produce a valid CanvasImageSource wrapper.
const fallbackSource=renderer.match(/function makeFallbackImageTexture\(c,a\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(fallbackSource,'função de fallback encontrada');
const fallbackDraws=[];
const fakeCanvas=()=>({width:0,height:0,getContext(){return {clearRect(){},drawImage(...args){fallbackDraws.push(args)}}}});
const fallbackContext=vm.createContext({
  document:{createElement:(tag)=>{assert.equal(tag,'canvas');return fakeCanvas()}},
  textureCache:new Map(), baseScale:(w,h)=>Math.min(1280*.9/w,720*.86/h),
  console, Number, Math, String
});
vm.runInContext(fallbackSource,fallbackContext);
const fakeImage={complete:true,naturalWidth:40,naturalHeight:20};
const fakeAsset={id:'asset1',url:'blob:test',el:fakeImage,width:40,height:20};
const fallbackResult=vm.runInContext('makeFallbackImageTexture({id:"clip1",kind:"image"}, asset)',Object.assign(fallbackContext,{asset:fakeAsset}));
assert.ok(fallbackResult && fallbackResult.canvas,'fallback precisa devolver canvas');
assert.equal(fallbackDraws.length,1,'fallback precisa desenhar a imagem');

// Regression: the selected clip's transform overlay must never call a missing
// size helper when the playhead enters text/image/video/audio clips.
const overlaySizeSource = renderer.match(/function getCanvasSizeForClip\(c\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(overlaySizeSource, 'helper getCanvasSizeForClip deve existir para o overlay');
const overlaySizeContext = vm.createContext({
  playhead: 1.25,
  currentLayerProps: (clip, time) => ({ x: time, scaleX: 100, scaleY: 100 }),
  transformDimensions: (clip, props) => ({ iw: clip.kind === 'text' ? 120 : 640, ih: 72 }),
  Number, Math
});
vm.runInContext(overlaySizeSource, overlaySizeContext);
const overlayDims = vm.runInContext('getCanvasSizeForClip({kind:"text"})', overlaySizeContext);
assert.deepEqual({ ...overlayDims }, { p: { x: 1.25, scaleX: 100, scaleY: 100 }, iw: 120, ih: 72 },
  'overlay deve calcular dimensões sem interromper o preview em clipes de texto');

// Regression: an exception while drawing one preview frame must not terminate
// requestAnimationFrame permanently. This reproduces the previous freeze mode.
const frameSource = renderer.match(/function frame\(now\)\{[\s\S]*?\n\}\nrequestAnimationFrame\(frame\);/)?.[0]
  .replace(/\nrequestAnimationFrame\(frame\);$/, '');
assert.ok(frameSource, 'loop principal frame encontrado');
const frameElements = {
  '#time': { textContent: '' },
  '#playhead': { style: { left: '' } },
  '#previewseek': { value: '' },
  '#preview-current': { textContent: '' },
  '#play': { textContent: '' }
};
const frameContext = vm.createContext({
  previewMode: 'timeline', sourcePlaying: false, playing: true, playStarting: false,
  playhead: .5, lastFrame: 900, lastSync: 0, lastProgressStatus: 0, px: 45,
  projectFPS: 30, requestQueue: [], frameErrors: [], statuses: [],
  assets: [], sourcePreviewId: null,
  endTime: () => 5, formatTime: t => String(t), fmtShort: t => String(t),
  syncMedia() {}, drawPreview() { throw new Error('simulated overlay error') }, updateKeyUI() {},
  requestAnimationFrame: cb => frameContext.requestQueue.push(cb),
  setStatus: s => frameContext.statuses.push(s),
  $: selector => frameElements[selector] || { textContent: '', value: '', style: {} },
  console: { error: (...args) => frameContext.frameErrors.push(args) },
  Number, Math
});
vm.runInContext(frameSource, frameContext);
vm.runInContext('frame(1000)', frameContext);
assert.equal(frameContext.playing, true, 'erro no overlay não pode desligar a reprodução');
assert.ok(frameContext.playhead > .5, 'o relógio continua avançando mesmo quando um frame dá erro');
assert.equal(frameContext.requestQueue.length, 1, 'o loop tem de agendar o próximo frame depois de erro');
assert.ok(frameContext.frameErrors.length, 'erro do preview deve ser registado');
frameContext.drawPreview = () => {};
const nextFrame = frameContext.requestQueue.shift();
nextFrame(1016);
assert.equal(frameContext.requestQueue.length, 1, 'o loop também continua no frame seguinte ao recuperado');

// Exercise placement/selection helpers directly rather than only checking labels.
const helperLine = name => renderer.split('\n').find(line => line.startsWith(`function ${name}(`));
const trackContext = vm.createContext({
  clips: [
    { id: 'v1', kind: 'video', track: 1, start: 0, inPoint: 0, outPoint: 4, speed: 1 },
    { id: 'v2', kind: 'video', track: 2, start: 0, inPoint: 0, outPoint: 4, speed: 1 }
  ],
  videoTrackCount: 2, MAX_VIDEO_TRACKS: 32,
  duration: c => (c.outPoint - c.inPoint) / (Number(c.speed) || 1),
  clamp: (n, a, b) => Math.max(a, Math.min(b, n)),
  messages: [], message: text => trackContext.messages.push(text), statuses: [], setStatus: text => trackContext.statuses.push(text), trackSettings: {}
});
vm.runInContext([helperLine('trackHasConflict'),helperLine('findAvailableVideoTrack'),helperLine('findEmptyVideoTrack'),helperLine('chooseClipTrack')].join('\n'), trackContext);
assert.equal(vm.runInContext('findAvailableVideoTrack(0, 2, 1)', trackContext), null, 'faixas ocupadas no mesmo intervalo precisam ser detectadas');
assert.equal(vm.runInContext('findAvailableVideoTrack(4, 2, 1)', trackContext), 1, 'uma faixa já usada pode receber clipe num intervalo vazio');
assert.equal(vm.runInContext('chooseClipTrack({kind:"video"}, 0, 2, 1, true)', trackContext), 3, 'uma inserção numa faixa ocupada deve criar automaticamente outra camada');
assert.equal(trackContext.videoTrackCount, 3, 'a nova camada deve expandir a timeline sem pedir confirmação');
assert.ok(trackContext.messages.some(text => text.includes('nova camada V3')), 'a nova camada criada deve ser comunicada ao usuário');
trackContext.clips=[{id:'only-v1',kind:'text',track:1,start:0,inPoint:0,outPoint:4,speed:1}];trackContext.videoTrackCount=3;
assert.equal(vm.runInContext('findAvailableVideoTrack(6, 2, 1)', trackContext), 1, 'uma faixa ocupada pode ter um trecho temporal livre');
assert.equal(vm.runInContext('findEmptyVideoTrack(1)', trackContext), 2, 'a inserção de uma nova camada deve priorizar uma faixa realmente vazia, mesmo se V1 tiver um intervalo livre');
assert.equal(vm.runInContext('chooseClipTrack({kind:"text"}, 6, 2, 1, false)', trackContext), 2, 'a inserção automática precisa separar objetos visuais por faixa');
assert.equal(vm.runInContext('chooseClipTrack({kind:"text"}, 6, 2, 1, true)', trackContext), 1, 'uma faixa selecionada manualmente pode receber clipe em um intervalo livre');
trackContext.clips=[
 {id:'v1',kind:'video',track:1,start:0,inPoint:0,outPoint:4,speed:1},
 {id:'v2',kind:'video',track:2,start:0,inPoint:0,outPoint:4,speed:1}
];trackContext.videoTrackCount=2;
assert.equal(vm.runInContext('chooseClipTrack({kind:"video"}, 0, 2, 1, false)', trackContext), 3, 'se todas as faixas estiverem em uso, uma camada nova deve ser criada automaticamente');

// Legacy single-track projects are migrated to independent visual layers, while existing multilayer layouts remain intact.
const migrationContext = vm.createContext({ MAX_VIDEO_TRACKS: 32, Math, Number, Set, clamp: (n,a,b)=>Math.max(a,Math.min(b,n)) });
vm.runInContext(helperLine('migrateLegacyLayerTracks'), migrationContext);
const legacyProject = { version: 5, videoTrackCount: 6, clips: [
  { id: 'old-text-1', kind: 'text', track: 1, start: 0 },
  { id: 'old-text-2', kind: 'text', track: 1, start: 5 },
  { id: 'old-video-3', kind: 'video', track: 1, start: 10 },
  { id: 'old-audio', kind: 'audio', track: 0, start: 0 }
] };
migrationContext.data = legacyProject;
assert.equal(vm.runInContext('migrateLegacyLayerTracks(data)', migrationContext), true, 'um projeto legado concentrado numa única faixa deve ser migrado');
assert.deepEqual(legacyProject.clips.filter(clip=>clip.kind!=='audio').map(clip=>clip.track), [1,2,3], 'os clipes visuais legados devem ser separados em faixas distintas');
assert.equal(legacyProject.clips.find(clip=>clip.kind==='audio').track, 0, 'a migração não deve alterar a faixa de áudio');
assert.equal(legacyProject.videoTrackCount, 6, 'a migração deve preservar ao menos seis faixas disponíveis');
assert.equal(legacyProject.version, 6, 'o projeto migrado deve ser salvo no formato atual');

const conflictingV6 = { version: 6, videoTrackCount: 6, clips: [
  {kind:'video',track:2,start:0,inPoint:0,outPoint:10,speed:1},
  {kind:'text',track:2,start:1,inPoint:0,outPoint:5,speed:1},
  {kind:'video',track:2,start:8,inPoint:0,outPoint:10,speed:1}
] };
migrationContext.data = conflictingV6;
assert.equal(vm.runInContext('migrateLegacyLayerTracks(data)', migrationContext), true, 'um projeto v6 com clipes sobrepostos na mesma faixa deve ser reparado');
assert.notEqual(conflictingV6.clips[0].track, conflictingV6.clips[1].track, 'dois clipes sobrepostos não podem permanecer na mesma faixa');
assert.notEqual(conflictingV6.clips[0].track, conflictingV6.clips[2].track, 'clipes que se sobrepõem em tempos distintos também precisam ser separados');
assert.equal(conflictingV6.version, 6, 'a reparação não deve alterar a versão atual do projeto');
const sequentialV6 = { version: 6, videoTrackCount: 6, clips: [
  {kind:'video',track:2,start:0,inPoint:0,outPoint:5,speed:1},
  {kind:'video',track:2,start:6,inPoint:0,outPoint:5,speed:1}
] };
migrationContext.data = sequentialV6;
assert.equal(vm.runInContext('migrateLegacyLayerTracks(data)', migrationContext), false, 'clipes sequenciais na mesma faixa de um projeto atual devem ser preservados');
assert.deepEqual(sequentialV6.clips.map(clip=>clip.track), [2,2], 'a migração não deve redistribuir cortes sequenciais válidos');
const easingMigrationContext = vm.createContext({ MAX_VIDEO_TRACKS: 32, Number, Object, Math, clamp: (n,a,b)=>Math.max(a,Math.min(b,n)), defaultCamera3d:()=>({}) });
vm.runInContext(helperLine('migrateLegacyEasing'), easingMigrationContext);
easingMigrationContext.data = {version:6,videoTrackCount:6,clips:[]};
vm.runInContext('migrateLegacyEasing(data)', easingMigrationContext);
assert.equal(easingMigrationContext.data.version, 6, 'a migração de easing não pode rebaixar a versão do projeto antes da migração das camadas');

const alreadyLayered = { version: 5, videoTrackCount: 6, clips: [{kind:'video',track:1},{kind:'text',track:2}] };
migrationContext.data = alreadyLayered;
assert.equal(vm.runInContext('migrateLegacyLayerTracks(data)', migrationContext), false, 'um projeto que já usa várias faixas deve permanecer intacto');
assert.deepEqual(alreadyLayered.clips.map(clip=>clip.track), [1,2], 'a migração não deve alterar camadas já distintas');

// Tween-span geometry is shared by object and camera lanes. Camera keys use absolute project time.
const tweenContext = vm.createContext({ Number });
vm.runInContext(helperLine('getTweenSegments'), tweenContext);
const tweenSegments = vm.runInContext('getTweenSegments([{time:1,value:0},{time:3,value:50},{time:4,value:100}], 0)', tweenContext);
assert.equal(tweenSegments.length, 2, 'dois pares de keyframes devem gerar dois segmentos de tween');
assert.deepEqual(JSON.parse(JSON.stringify(tweenSegments.map(segment=>[segment.start,segment.end]))), [[1,3],[3,4]], 'os segmentos devem respeitar início e fim dos keyframes');
const clipTweenSegments = vm.runInContext('getTweenSegments([{time:0,value:0},{time:2,value:100}], 5)', tweenContext);
assert.deepEqual(JSON.parse(JSON.stringify(clipTweenSegments.map(segment=>[segment.start,segment.end]))), [[5,7]], 'keyframes relativos a um clipe devem virar tempos absolutos na timeline');

// Camera easing applies to the outgoing segment of the active camera keyframe.
const cameraEaseContext = vm.createContext({
  curveProp: 'camera:x', camera3d: { keyframes: { x: [
    { time: 0, value: 0, ease: { x1: .25, y1: .1, x2: .25, y2: 1 } },
    { time: 1, value: 100, ease: { x1: .25, y1: .1, x2: .25, y2: 1 } }
  ] } }, playhead: .5, projectFPS: 30,
  selected: () => null, clamp: (n,a,b) => Math.max(a, Math.min(b,n)), Number, Math,
  $: selector => selector === '#cameaseprop' ? { value: 'x' } : {},
  $$: () => [], presets: { out: { x1: 0, y1: 0, x2: .58, y2: 1 } },
  updateCurve() {}, updateCameraEaseUI() {}, updateTimeline() {}, queueAutosave() {}, message() {}
});
vm.runInContext(`${helperLine('currentKeyframeForCurve')}\n${helperLine('applyCameraEase')}`, cameraEaseContext);
assert.equal(vm.runInContext('currentKeyframeForCurve().time', cameraEaseContext), 0, 'o easing da câmera seleciona o keyframe que inicia o segmento');
vm.runInContext("applyCameraEase('out')", cameraEaseContext);

assert.equal(vm.runInContext('camera3d.keyframes.x[0].ease.x2', cameraEaseContext), .58, 'o preset Ease out deve ser aplicado ao canal da câmera selecionado');
const cameraPoseContext = vm.createContext({
  camera3d: {x:0,keyframes:{x:[{time:0,value:0,ease:{x1:.25,y1:.1,x2:.25,y2:1}}]}},
  playhead:2, projectFPS:30, extent:()=>10, ease:{x1:.25,y1:.1,x2:.25,y2:1},
  clamp:(n,a,b)=>Math.max(a,Math.min(b,n)), Number, Math
});
vm.runInContext(`${helperLine('setCameraUnderlying')}\n${helperLine('writeCameraPoseAtPlayhead')}`, cameraPoseContext);
vm.runInContext('writeCameraPoseAtPlayhead({x:320})', cameraPoseContext);
assert.equal(cameraPoseContext.camera3d.keyframes.x.length, 2, 'mover a câmera na viewport depois do primeiro keyframe deve gravar outro keyframe');
assert.equal(cameraPoseContext.camera3d.keyframes.x[1].time, 2, 'o keyframe criado pela navegação deve usar o tempo atual');
assert.equal(cameraPoseContext.camera3d.keyframes.x[1].value, 320, 'o segundo keyframe deve guardar a nova posição da câmera');


const selectionSource = helperLine('selectClip');
const selectionContext = vm.createContext({
  selectedIds: new Set(['first']), selectedId: 'first', previewMode: 'timeline', sourcePlaying: false,
  sourcePreviewId: null, assets: [], queueAutosave() {}, updateTimeline() {}, updateInspector() {}, drawPreview() {},
  $: () => ({ value: 'timeline' })
});
vm.runInContext(selectionSource, selectionContext);
vm.runInContext('selectClip("second", {ctrlKey:true,metaKey:false})', selectionContext);
assert.deepEqual([...selectionContext.selectedIds].sort(), ['first','second'], 'Ctrl-click deve adicionar ao grupo selecionado');
vm.runInContext('selectClip("first", {ctrlKey:true,metaKey:false})', selectionContext);
assert.deepEqual([...selectionContext.selectedIds], ['second'], 'Ctrl-click em item selecionado deve removê-lo do grupo');
const groupContext=vm.createContext({
 clips:[{id:'voice',kind:'audio',groupId:'pair',groupName:'Composição',start:0,duration:2},{id:'title',kind:'text',groupId:'pair',groupName:'Composição',start:0,duration:3}],
 layerGroups:[{id:'pair',name:'Composição',parentId:null,transform:{}}],selectedGroupId:null,
 selectedId:'voice',selectedIds:new Set(['voice']),collapsedGroups:new Set(),
 localStorage:{setItem(key,value){groupContext.saved={key,value}}},
 updateTimeline(){groupContext.timelineUpdates=(groupContext.timelineUpdates||0)+1},updateInspector(){},drawPreview(){},queueAutosave(){},
 message(text){groupContext.lastMessage=text},duration:c=>Number(c.duration)||0,Number,Math,Set,Array
});
vm.runInContext([helperLine('groupById'),helperLine('groupAncestorIds'),helperLine('groupDescendantClips'),helperLine('groupDescendantClipIds'),helperLine('groupNameFor'),helperLine('groupRepresentative'),helperLine('groupRange'),helperLine('persistCollapsedGroups'),helperLine('toggleGroupCollapse')].join('\n'),groupContext);
vm.runInContext("toggleGroupCollapse('pair')",groupContext);
assert.ok(groupContext.collapsedGroups.has('pair'),'o grupo deve poder ser recolhido');
assert.equal(groupContext.selectedId,'title','o representante de grupo deve preferir uma camada visual');
assert.equal(groupContext.selectedIds.size,2,'recolher deve manter todos os membros selecionados');
assert.equal(groupContext.saved.key,'frame-collapsed-groups','estado de recolhimento deve ser persistido');
vm.runInContext("toggleGroupCollapse('pair')",groupContext);
assert.ok(!groupContext.collapsedGroups.has('pair'),'o mesmo comando deve expandir um grupo recolhido');

const previewScaleSource = helperLine('effectPreviewScale');
const scaleContext = vm.createContext({ offlineRendering: false, playing: true, Math, Number });
vm.runInContext(previewScaleSource, scaleContext);
assert.ok(vm.runInContext('effectPreviewScale({blur:12,glow:50},1920,1080,"video")', scaleContext) < 1, 'efeitos pesados em camadas grandes devem reduzir a resolução intermediária');
scaleContext.offlineRendering = true;
assert.equal(vm.runInContext('effectPreviewScale({blur:12,glow:50},1920,1080,"video")', scaleContext), 1, 'exportação offline deve preservar a resolução integral');

console.log('FRAME Studio smoke tests: OK');
console.log(`Easing verified: smooth(0.5)=${smoothHalf.toFixed(2)}, linear(0.5)=${linearHalf.toFixed(2)}`);
console.log(`Camera verified: origin → (${center.x.toFixed(1)}, ${center.y.toFixed(1)}), animated mid-point lens = ${cameraAnimation}`);
console.log('Note: syntax and logic tests do not replace full graphical testing in the Electron window.');
