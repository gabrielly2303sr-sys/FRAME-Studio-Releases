'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { checkMediaTools, transcodeWebmToMp4, renderFrameSequenceToMp4, probeMedia, volumeAutomationExpression, buildRemapAudioSegments } = require('../media-export.cjs');

function run(binary, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-8000); });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`${binary} falhou (${code}): ${stderr}`)));
  });
}

async function main() {
  await run('ffmpeg', ['-version']);
  await run('ffprobe', ['-version']);
  const automatedVolume = volumeAutomationExpression(100, [{time:0,value:0,ease:{x1:.25,y1:.1,x2:.25,y2:1}},{time:.6,value:100,ease:{x1:.25,y1:.1,x2:.25,y2:1}}], 1.2);
  assert.match(automatedVolume, /if\(lt\(t,/,'automação de volume deve gerar uma expressão temporal FFmpeg');
  const remapSegments = buildRemapAudioSegments({
    inPoint: 0, outPoint: 1.2, clipDuration: 1.2,
    timeRemap: [{ time: 0, value: 1, mode: 'linear' }, { time: 0.5, value: 0.5, mode: 'hold' }, { time: 1, value: 0, mode: 'linear' }]
  });
  assert.ok(remapSegments?.some(segment => segment.reverse), 'reverse Time Remap sections must produce reverse audio segments');
  assert.ok(remapSegments?.some(segment => segment.silent), 'held frames must produce silent audio segments');
  const installedTools = await checkMediaTools();
  assert.equal(installedTools.available, true, 'pré-verificação deve reconhecer ffmpeg e ffprobe instalados');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'frame-studio-2.4.2-test-'));
  try {
    const withAudio = path.join(dir, 'capture-with-audio.webm');
    const withoutAudio = path.join(dir, 'capture-silent.webm');
    const withAudioMp4 = path.join(dir, 'validated-with-audio.mp4');
    const silentMp4 = path.join(dir, 'validated-silent.mp4');
    const framePattern = path.join(dir, 'frame-%08d.png');
    const sequenceWithAudioMp4 = path.join(dir, 'sequence-with-audio.mp4');
    const sequenceSilentMp4 = path.join(dir, 'sequence-silent.mp4');
    const sequenceBitrateMp4 = path.join(dir, 'sequence-bitrate.mp4');
    const sequenceRemapAudioMp4 = path.join(dir, 'sequence-remap-audio.mp4');
    const overlayImage = path.join(dir, 'image-layer.png');
    await run('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi',
      '-i', 'color=c=magenta:s=64x64:d=0.1', '-frames:v', '1', overlayImage
    ]);
    // The source fixture represents a small composition: moving video, a still-image
    // layer, rendered text and an audio track. This tests transcoding, not the app UI.
    await run('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-loop', '1', '-framerate', '24', '-i', overlayImage,
      '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=24:duration=1.2',
      '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=1.2',
      '-filter_complex', '[1:v][0:v]overlay=12:12:shortest=1,drawtext=text=FRAME_Studio_2.4.2:fontcolor=white:fontsize=16:x=12:y=100[v]',
      '-map', '[v]', '-map', '2:a', '-t', '1.2',
      '-c:v', 'libvpx-vp9', '-deadline', 'realtime', '-cpu-used', '8', '-pix_fmt', 'yuv420p',
      '-c:a', 'libopus', '-shortest', withAudio
    ]);
    await run('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=24:duration=1.2',
      '-c:v', 'libvpx-vp9', '-deadline', 'realtime', '-cpu-used', '8', '-pix_fmt', 'yuv420p', '-an', withoutAudio
    ]);

    const progress = [];
    const audioResult = await transcodeWebmToMp4({
      inputPath: withAudio, outputPath: withAudioMp4, expectedDuration: 1.2, fps: 30,
      onProgress: item => progress.push(item.stage)
    });
    const audioProbe = await probeMedia(withAudioMp4);
    assert.equal(audioResult.videoCodec, 'h264');
    assert.equal(audioResult.audioCodec, 'aac');
    assert.ok(Math.abs(audioProbe.duration - 1.2) < 0.4, `duração plausível com áudio: ${audioProbe.duration}`);
    assert.ok(audioProbe.streams.some(s => s.codec_type === 'audio' && s.codec_name === 'aac'));
    assert.ok(progress.includes('transcoding') && progress.includes('validating'));

    const silentResult = await transcodeWebmToMp4({ inputPath: withoutAudio, outputPath: silentMp4, expectedDuration: 1.2, fps: 30 });
    const silentProbe = await probeMedia(silentMp4);
    assert.equal(silentResult.videoCodec, 'h264');
    assert.equal(silentResult.audioCodec, null);
    assert.equal(silentProbe.streams.some(s => s.codec_type === 'audio'), false, 'exportação sem áudio não deve inventar uma faixa AAC');

    // Deterministic renderer fixture: 12 numbered frames at 10 FPS (1.2s). This
    // tests the actual frame-sequence encoder rather than live MediaRecorder capture.
    await run('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi',
      '-i', 'testsrc2=size=320x180:rate=10:duration=1.2', '-frames:v', '12',
      '-start_number', '0', '-f', 'image2', framePattern
    ]);
    const sequenceProgress = [];
    const sequenceWithAudio = await renderFrameSequenceToMp4({
      framePattern, frameCount: 12, outputPath: sequenceWithAudioMp4,
      expectedDuration: 1.2, fps: 10, crf: 23,
      audioClips: [{ kind: 'video', name: 'Vídeo com áudio', path: withAudio, start: 0, inPoint: 0, outPoint: 1.2, speed: 1, volume: 100, volumeKeyframes: [{time:0,value:0,ease:{x1:.25,y1:.1,x2:.25,y2:1}},{time:.6,value:100,ease:{x1:.25,y1:.1,x2:.25,y2:1}}] }],
      onProgress: item => sequenceProgress.push(item.stage)
    });
    const sequenceAudioProbe = await probeMedia(sequenceWithAudioMp4);
    const sequenceVideo = sequenceAudioProbe.streams.find(stream => stream.codec_type === 'video');
    assert.equal(sequenceWithAudio.videoCodec, 'h264');
    assert.equal(sequenceWithAudio.audioCodec, 'aac');
    assert.equal(sequenceWithAudio.fps, 10, 'FPS escolhido precisa ser reportado pelo renderizador');
    assert.equal(sequenceWithAudio.crf, 23, 'CRF selecionado precisa ser preservado no resultado');
    assert.equal(sequenceWithAudio.frameCount, 12);
    assert.equal(sequenceWithAudio.deterministicFrames, true);
    assert.ok(Math.abs(sequenceAudioProbe.duration - 1.2) < 0.15, `duração de sequência com áudio: ${sequenceAudioProbe.duration}`);
    assert.ok(sequenceVideo, 'sequência codificada deve conter vídeo');
    const [fpsNumerator, fpsDenominator] = String(sequenceVideo.avg_frame_rate || sequenceVideo.r_frame_rate).split('/').map(Number);
    assert.ok(fpsDenominator > 0 && Math.abs(fpsNumerator / fpsDenominator - 10) < 0.01, `ffprobe deve confirmar 10 FPS, recebeu ${sequenceVideo.avg_frame_rate || sequenceVideo.r_frame_rate}`);
    assert.ok(sequenceAudioProbe.streams.some(stream => stream.codec_type === 'audio' && stream.codec_name === 'aac'));
    assert.ok(sequenceProgress.includes('transcoding') && sequenceProgress.includes('validating'));

    const sequenceRemapAudio = await renderFrameSequenceToMp4({
      framePattern, frameCount: 12, outputPath: sequenceRemapAudioMp4,
      expectedDuration: 1.2, fps: 10, crf: 23,
      audioClips: [{ kind: 'video', name: 'Remapped audio', path: withAudio, start: 0, inPoint: 0, outPoint: 1.2, speed: 1, timeRemapDuration: 1.2, timeRemap: [{ time: 0, value: 1, mode: 'linear' }, { time: 0.5, value: 0.5, mode: 'hold' }, { time: 1, value: 0, mode: 'linear' }], volume: 100 }]
    });
    const sequenceRemapProbe = await probeMedia(sequenceRemapAudioMp4);
    assert.equal(sequenceRemapAudio.audioCodec, 'aac', 'time-remapped audio should still encode as AAC');
    assert.ok(sequenceRemapProbe.streams.some(stream => stream.codec_type === 'audio' && stream.codec_name === 'aac'), 'time-remapped render should contain audio');
    assert.ok(Math.abs(sequenceRemapProbe.duration - 1.2) < 0.15, 'time-remapped audio must not extend or truncate project output');

    const sequenceSilent = await renderFrameSequenceToMp4({
      framePattern, frameCount: 12, outputPath: sequenceSilentMp4,
      expectedDuration: 1.2, fps: 10, crf: 28, audioClips: []
    });
    const sequenceSilentProbe = await probeMedia(sequenceSilentMp4);
    assert.equal(sequenceSilent.videoCodec, 'h264');
    assert.equal(sequenceSilent.audioCodec, null);
    assert.equal(sequenceSilent.crf, 28);
    assert.equal(sequenceSilentProbe.streams.some(stream => stream.codec_type === 'audio'), false, 'a sequência silenciosa não deve conter áudio');

    const sequenceBitrate = await renderFrameSequenceToMp4({
      framePattern, frameCount: 12, outputPath: sequenceBitrateMp4,
      expectedDuration: 1.2, fps: 10, rateMode: 'bitrate', videoBitrate: 5,
      encoderPreset: 'veryfast', audioBitrate: 128,
      audioClips: [{ kind: 'video', name: 'Bitrate audio', path: withAudio, start: 0, inPoint: 0, outPoint: 1.2, speed: 1, volume: 100 }]
    });
    const sequenceBitrateProbe = await probeMedia(sequenceBitrateMp4);
    assert.equal(sequenceBitrate.videoCodec, 'h264');
    assert.equal(sequenceBitrate.rateMode, 'bitrate');
    assert.equal(sequenceBitrate.videoBitrate, 5);
    assert.equal(sequenceBitrate.encoderPreset, 'veryfast');
    assert.equal(sequenceBitrate.audioBitrate, 128);
    assert.equal(sequenceBitrate.audioCodec, 'aac');
    assert.ok(sequenceBitrateProbe.streams.some(stream => stream.codec_type === 'audio' && stream.codec_name === 'aac'));

    await assert.rejects(
      transcodeWebmToMp4({ inputPath: withAudio, outputPath: path.join(dir, 'missing-ffmpeg.mp4'), expectedDuration: 1.2, ffmpegPath: path.join(dir, 'ffmpeg-inexistente') }),
      /FFmpeg is not available in this development run.*prepared automatically/s
    );
    const missingTools = await checkMediaTools({ ffmpegPath: path.join(dir, 'ffmpeg-inexistente') });
    assert.equal(missingTools.available, false, 'pré-verificação deve bloquear exportação se FFmpeg estiver ausente');
    assert.match(missingTools.message, /FFmpeg.*not available in this development run.*bundle these tools automatically/s);

    const corrupted = path.join(dir, 'not-a-video.webm');
    await fs.writeFile(corrupted, 'não é um vídeo');
    await assert.rejects(transcodeWebmToMp4({ inputPath: corrupted, outputPath: path.join(dir, 'corrupted.mp4'), expectedDuration: 1 }), /ffprobe failed|metadata|duration/i);

    const fakeFfmpeg = path.join(dir, 'fake-ffmpeg');
    await fs.writeFile(fakeFfmpeg, '#!/usr/bin/env node\nsetInterval(() => {}, 1000);\n');
    await fs.chmod(fakeFfmpeg, 0o755);
    const controller = new AbortController();
    const canceledPath = path.join(dir, 'canceled.mp4');
    await assert.rejects(
      transcodeWebmToMp4({
        inputPath: withoutAudio, outputPath: canceledPath, expectedDuration: 1.2,
        ffmpegPath: fakeFfmpeg, signal: controller.signal,
        onProcess: kind => { if (kind === 'ffmpeg') controller.abort(); }
      }),
      error => error.code === 'EXPORT_CANCELED'
    );
    assert.equal(await fs.access(canceledPath).then(() => true, () => false), false, 'cancelamento precisa remover o MP4 parcial');

    const canceledSequencePath = path.join(dir, 'canceled-sequence.mp4');
    const sequenceController = new AbortController();
    await assert.rejects(
      renderFrameSequenceToMp4({
        framePattern, frameCount: 12, outputPath: canceledSequencePath, fps: 10,
        ffmpegPath: fakeFfmpeg, signal: sequenceController.signal,
        onProcess: kind => { if (kind === 'ffmpeg') sequenceController.abort(); }
      }),
      error => error.code === 'EXPORT_CANCELED'
    );
    assert.equal(await fs.access(canceledSequencePath).then(() => true, () => false), false, 'cancelamento da sequência deve remover o MP4 parcial');

    console.log('FRAME Studio 2.4.17 export integration tests: OK');
    console.log('Generated and validated with ffprobe: deterministic 10 FPS H.264 + AAC sequence (CRF 23), silent H.264 sequence (CRF 28), target-bitrate sequence, reverse/freeze Time Remap audio, and compatibility transcodes.');
    console.log('Verified: final FPS and duration, audio presence/absence, codecs, progress, missing FFmpeg, corrupt input, and cancellation on both export paths.');
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error('FRAME Studio export integration tests: FAILED');
  console.error(error?.stack || error);
  process.exitCode = 1;
});
