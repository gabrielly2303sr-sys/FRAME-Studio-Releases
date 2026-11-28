'use strict';
// FRAME Studio 2.4.46 — streaming export + lightweight media proxies.
//
// Frames are piped straight into FFmpeg as raw RGBA: no PNG encoding, no
// multi-gigabyte temporary frame folder, and encoding runs *while* the editor
// renders (instead of after). The audio graph is validated before the first
// frame is rendered and any clip that FFmpeg cannot use is skipped with a
// warning, so a bad clip can never throw away hours of rendering.

const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const media = require('./media-export.cjs');
const { runProcess, resolveToolPath, tempoFilters, ExportCanceledError, probeMedia, buildRemapAudioSegments, volumeAutomationExpression, parseFrameRate } = media;

function n(value, fallback = 0) { const v = Number(value); return Number.isFinite(v) ? v : fallback; }

// Builds the filter chain of ONE audio clip. Returns null when the clip has no usable audio.
async function buildClipAudio(clip, ctx) {
  const { ffprobePath, signal, onProcess, duration, input, label, warnings } = ctx;
  const name = clip?.name || 'clip';
  if (!clip || !['video', 'audio'].includes(clip.kind)) return null;
  if (typeof clip.path !== 'string' || !path.isAbsolute(clip.path)) { warnings.push(`"${name}": no valid file path, audio skipped.`); return null; }
  const stat = await fs.stat(clip.path).catch(() => null);
  if (!stat?.isFile()) { warnings.push(`"${name}": source file not found, audio skipped.`); return null; }
  let probe;
  try { probe = await probeMedia(clip.path, { ffprobePath, signal, onProcess }); }
  catch (error) { if (error?.code === 'EXPORT_CANCELED') throw error; warnings.push(`"${name}": could not read the file (${String(error.message).split('\n')[0]}), audio skipped.`); return null; }
  if (!probe.streams.some(s => s.codec_type === 'audio')) {
    if (clip.kind === 'audio') warnings.push(`"${name}": no audio stream found, skipped.`);
    return null;
  }
  const start = Math.max(0, n(clip.start));
  const inPoint = Math.max(0, n(clip.inPoint));
  const outPoint = n(clip.outPoint, NaN);
  const speed = Math.max(0.1, Math.min(8, n(clip.speed, 1) || 1));
  if (!Number.isFinite(outPoint) || outPoint <= inPoint) { warnings.push(`"${name}": invalid source range, audio skipped.`); return null; }
  const gain = Math.max(0, Math.min(200, n(clip.volume ?? 100, 100))) / 100;
  const clipDuration = Math.max(0, n(clip.timeRemapDuration) > 0 ? n(clip.timeRemapDuration) : (outPoint - inPoint) / speed);
  const remapSegments = Array.isArray(clip.timeRemap) && clip.timeRemap.length ? buildRemapAudioSegments({ inPoint, outPoint, clipDuration, timeRemap: clip.timeRemap }) : null;
  const hasVolumeKeys = Array.isArray(clip.volumeKeyframes) && clip.volumeKeyframes.length > 0;
  const volumeFilter = hasVolumeKeys ? `volume='${volumeAutomationExpression(clip.volume ?? 100, clip.volumeKeyframes, clipDuration)}':eval=frame` : `volume=${gain.toFixed(4)}`;
  const fadeIn = Math.max(0, Math.min(clipDuration, n(clip.fadeIn)));
  const fadeOut = Math.max(0, Math.min(clipDuration, n(clip.fadeOut)));
  const fades = [
    ...(fadeIn > 0.001 ? [`afade=t=in:st=0:d=${fadeIn.toFixed(6)}`] : []),
    ...(fadeOut > 0.001 ? [`afade=t=out:st=${Math.max(0, clipDuration - fadeOut).toFixed(6)}:d=${fadeOut.toFixed(6)}`] : [])
  ];
  const tail = [`adelay=${Math.round(start * 1000)}|${Math.round(start * 1000)}`, `apad=pad_dur=${duration.toFixed(6)}`, `atrim=duration=${duration.toFixed(6)}[${label}]`];
  const filters = [];
  let inputArgs;
  if (remapSegments?.length) {
    inputArgs = ['-i', clip.path];
    const labels = [];
    remapSegments.forEach((segment, index) => {
      const segLabel = `${label}_r${index}`;
      labels.push(`[${segLabel}]`);
      const part = segment.duration.toFixed(6);
      if (segment.silent) {
        filters.push(`anullsrc=channel_layout=stereo:sample_rate=48000,atrim=duration=${part},asetpts=PTS-STARTPTS[${segLabel}]`);
      } else {
        const a = Math.min(segment.sourceStart, segment.sourceEnd), b = Math.max(segment.sourceStart, segment.sourceEnd);
        const chain = [`[${input}:a:0]atrim=start=${a.toFixed(6)}:end=${b.toFixed(6)}`, 'asetpts=PTS-STARTPTS', ...(segment.reverse ? ['areverse'] : []), ...tempoFilters(segment.rate), `apad=pad_dur=${part}`, `atrim=duration=${part}`, 'asetpts=PTS-STARTPTS', 'aformat=sample_rates=48000:channel_layouts=stereo'];
        filters.push(`${chain.join(',')}[${segLabel}]`);
      }
    });
    const raw = `${label}_raw`;
    filters.push(labels.length === 1 ? `${labels[0]}anull[${raw}]` : `${labels.join('')}concat=n=${labels.length}:v=0:a=1[${raw}]`);
    filters.push([`[${raw}]${volumeFilter}`, ...fades, ...tail].join(','));
  } else {
    // Seek in the input instead of decoding the whole file up to the clip: much faster on long sources.
    inputArgs = ['-ss', inPoint.toFixed(6), '-t', (outPoint - inPoint).toFixed(6), '-i', clip.path];
    filters.push([`[${input}:a:0]asetpts=PTS-STARTPTS`, ...tempoFilters(speed), volumeFilter, ...fades, ...tail].join(','));
  }
  return { inputArgs, filters, label };
}

function assembleAudio(parts, duration, firstInput) {
  const inputArgs = [], filters = [], labels = [];
  let index = firstInput;
  for (const part of parts) {
    // parts carry builders so input indexes are assigned in final order
    inputArgs.push(...part.inputArgs);
    filters.push(...part.filters);
    labels.push(`[${part.label}]`);
    index++;
  }
  if (labels.length) filters.push(`${labels.join('')}amix=inputs=${labels.length}:duration=longest:normalize=0:dropout_transition=0,atrim=duration=${duration.toFixed(6)},asetpts=PTS-STARTPTS[aout]`);
  return { inputArgs, filters };
}

async function buildAudioParts(clips, ctx) {
  const parts = [];
  let input = ctx.firstInput;
  for (const clip of clips.slice(0, 500)) {
    const part = await buildClipAudio(clip, { ...ctx, input, label: `ca${parts.length}` });
    if (part) { parts.push({ ...part, clip }); input++; }
  }
  return parts;
}

async function dryRunAudio(parts, duration, ctx) {
  if (!parts.length) return true;
  const graph = assembleAudio(parts, duration, 1);
  const args = ['-hide_banner', '-y', '-f', 'lavfi', '-i', 'color=c=black:s=16x16:d=0.5', ...graph.inputArgs, '-filter_complex', graph.filters.join(';'), '-map', '[aout]', '-t', '0.5', '-f', 'null', '-'];
  try { await runProcess(ctx.ffmpegPath, args, { signal: ctx.signal, kind: 'ffmpeg' }); return true; }
  catch (error) { if (error?.code === 'EXPORT_CANCELED') throw error; return false; }
}

// Returns the audio graph that FFmpeg can really run; drops (with warnings) clips that break it.
async function prepareAudioGraph(audioClips, duration, ctx) {
  const probeCtx = { ...ctx, duration, firstInput: 1 };
  let parts = await buildAudioParts(Array.isArray(audioClips) ? audioClips : [], probeCtx);
  if (await dryRunAudio(parts, duration, ctx)) return { parts };
  const good = [];
  for (const part of parts) {
    // Rebuild each clip alone with input index 1 to test it in isolation.
    const single = await buildAudioParts([part.clip], probeCtx);
    if (single.length && await dryRunAudio(single, duration, ctx)) good.push(part.clip);
    else ctx.warnings.push(`"${part.clip.name || 'clip'}": FFmpeg could not process this audio; the clip was exported without sound.`);
  }
  parts = await buildAudioParts(good, probeCtx);
  if (parts.length && !(await dryRunAudio(parts, duration, ctx))) {
    ctx.warnings.push('The audio mix could not be built; the video was exported without audio.');
    return { parts: [] };
  }
  return { parts };
}

async function createStreamingEncoder(options = {}) {
  const {
    width, height, fps = 30, frameCount, outputPath, crf = 18, rateMode = 'crf', videoBitrate = 12,
    encoderPreset = 'veryfast', audioBitrate = 192, audioClips = [], signal, onProcess, onProgress,
    ffmpegPath = resolveToolPath('ffmpeg'), ffprobePath = resolveToolPath('ffprobe')
  } = options;
  const w = Math.floor(n(width)), h = Math.floor(n(height));
  if (!(w >= 16 && h >= 16 && w <= 8192 && h <= 8192)) throw new Error('Invalid render resolution.');
  const safeFps = Math.max(1, Math.min(120, Math.round(n(fps, 30))));
  const total = Math.floor(n(frameCount));
  if (!Number.isSafeInteger(total) || total < 1) throw new Error('Invalid frame count.');
  const duration = total / safeFps;
  const warnings = [];
  const ctx = { ffmpegPath, ffprobePath, signal, onProcess, warnings };
  const audio = await prepareAudioGraph(audioClips, duration, ctx);
  const hasAudio = audio.parts.length > 0;
  const graph = assembleAudio(audio.parts, duration, 1);

  const safeCrf = Math.max(14, Math.min(30, Math.round(n(crf, 18))));
  const preset = ['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow', 'slower'].includes(encoderPreset) ? encoderPreset : 'veryfast';
  const brate = Math.max(2, Math.min(100, n(videoBitrate, 12)));
  const abr = [96, 128, 160, 192, 256, 320].includes(Number(audioBitrate)) ? Number(audioBitrate) : 192;
  const partPath = `${outputPath}.part`;
  await fs.rm(partPath, { force: true }).catch(() => {});

  const args = ['-hide_banner', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${w}x${h}`, '-framerate', String(safeFps), '-i', 'pipe:0', ...graph.inputArgs];
  if (hasAudio) args.push('-filter_complex', graph.filters.join(';'));
  args.push('-map', '0:v:0');
  if (hasAudio) args.push('-map', '[aout]');
  args.push(
    '-frames:v', String(total),
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2:out_color_matrix=bt709:out_range=tv,format=yuv420p',
    '-c:v', 'libx264', '-preset', preset
  );
  if (rateMode === 'bitrate') args.push('-b:v', `${brate}M`, '-maxrate', `${Math.round(brate * 1.35)}M`, '-bufsize', `${Math.round(brate * 2)}M`);
  else args.push('-crf', String(safeCrf));
  args.push('-r', String(safeFps), '-fps_mode', 'cfr', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv');
  if (hasAudio) args.push('-c:a', 'aac', '-b:a', `${abr}k`, '-ar', '48000', '-ac', '2');
  args.push('-movflags', '+faststart', '-f', 'mp4', partPath);

  const child = spawn(ffmpegPath, args, { stdio: ['pipe', 'ignore', 'pipe'], windowsHide: true });
  onProcess?.('ffmpeg', child);
  let stderr = '', exited = false, exitCode = null, spawnError = null;
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', c => { stderr = (stderr + c).slice(-8000); });
  const closed = new Promise(resolve => {
    child.on('error', e => { spawnError = e; exited = true; resolve(); });
    child.on('close', code => { exited = true; exitCode = code; resolve(); });
  });
  child.stdin.on('error', () => {}); // surfaced through writeFrame/finish with ffmpeg's own message
  const failure = () => new Error(`FFmpeg stopped while exporting${exitCode !== null ? ` (exit code ${exitCode})` : ''}.${spawnError ? `\n${spawnError.message}` : ''}${stderr.trim() ? `\n${stderr.trim().split('\n').slice(-8).join('\n')}` : ''}`);
  const frameBytes = w * h * 4;
  let written = 0, aborted = false;
  const onAbort = () => { aborted = true; try { child.kill('SIGTERM'); } catch {} setTimeout(() => { try { child.kill('SIGKILL'); } catch {} }, 1500).unref?.(); };
  signal?.addEventListener('abort', onAbort, { once: true });
  const cleanupPart = () => fs.rm(partPath, { force: true }).catch(() => {});

  return {
    warnings, hasAudio, partPath,
    get framesWritten() { return written; },
    // Synchronous enqueue (keeps frame order); the promise resolves when the pipe can take more.
    writeFrame(buffer) {
      if (aborted || signal?.aborted) return Promise.reject(new ExportCanceledError());
      if (exited) return Promise.reject(failure());
      const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
      if (buf.length !== frameBytes) return Promise.reject(new Error(`Frame has ${buf.length} bytes; expected ${frameBytes} (${w}x${h} RGBA).`));
      written++;
      const ok = child.stdin.write(buf);
      if (ok) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const done = () => { child.stdin.off('drain', done); child.off('close', done); exited ? reject(aborted ? new ExportCanceledError() : failure()) : resolve(); };
        child.stdin.once('drain', done); child.once('close', done);
      });
    },
    async finish() {
      try {
        if (!exited) { try { child.stdin.end(); } catch {} }
        onProgress?.({ stage: 'transcoding', progress: 99, seconds: duration, duration });
        await closed;
        if (signal?.aborted || aborted) throw new ExportCanceledError();
        if (exitCode !== 0) throw failure();
        if (written !== total) throw new Error(`Incomplete render: ${written} of ${total} frames reached the encoder.`);
        const stat = await fs.stat(partPath).catch(() => null);
        if (!stat?.isFile() || stat.size < 1024) throw new Error('FFmpeg did not produce a valid MP4 (file empty or missing).');
        onProgress?.({ stage: 'validating', progress: 99, seconds: 0, duration });
        // Validation is advisory: a finished file is never deleted because of a metadata mismatch.
        let probe = null, video = null, audioStream = null;
        try {
          probe = await probeMedia(partPath, { ffprobePath, signal, onProcess });
          video = probe.streams.find(s => s.codec_type === 'video');
          audioStream = probe.streams.find(s => s.codec_type === 'audio');
        } catch (error) { if (error?.code === 'EXPORT_CANCELED') throw error; warnings.push(`Could not verify the MP4 with ffprobe: ${String(error.message).split('\n')[0]}`); }
        if (probe) {
          if (!video) throw new Error('The rendered file has no video stream.');
          if (Number.isFinite(probe.duration) && Math.abs(probe.duration - duration) > Math.max(0.5, duration * 0.1)) warnings.push(`MP4 duration ${probe.duration.toFixed(2)} s differs from the project (${duration.toFixed(2)} s).`);
          const fpsOut = parseFrameRate(video.avg_frame_rate) ?? parseFrameRate(video.r_frame_rate);
          if (Number.isFinite(fpsOut) && Math.abs(fpsOut - safeFps) > 0.1) warnings.push(`MP4 reports ${fpsOut.toFixed(2)} fps (expected ${safeFps}).`);
        }
        await fs.rename(partPath, outputPath).catch(async error => {
          if (error?.code !== 'EXDEV') throw error;
          await fs.copyFile(partPath, outputPath); await fs.rm(partPath, { force: true });
        });
        return {
          duration: Number.isFinite(probe?.duration) ? probe.duration : duration, size: stat.size,
          videoCodec: video?.codec_name || 'h264', audioCodec: audioStream?.codec_name || (hasAudio ? 'aac' : null),
          width: video?.width || w, height: video?.height || h, fps: safeFps, frameCount: total,
          crf: safeCrf, rateMode: rateMode === 'bitrate' ? 'bitrate' : 'crf', videoBitrate: brate, encoderPreset: preset, audioBitrate: abr,
          warnings, deterministicFrames: true, streamed: true
        };
      } catch (error) { await cleanupPart(); throw error; }
      finally { signal?.removeEventListener('abort', onAbort); }
    },
    async abort() { aborted = true; try { child.stdin.destroy(); } catch {} try { child.kill('SIGTERM'); } catch {} await Promise.race([closed, new Promise(r => setTimeout(r, 1500))]); try { child.kill('SIGKILL'); } catch {} await cleanupPart(); signal?.removeEventListener('abort', onAbort); }
  };
}

// ---------------------------------------------------------------------------
// All-intra proxies: every frame is a keyframe, so seeking (scrubbing, reverse,
// frame-by-frame export) costs one decode instead of a whole GOP.
// ---------------------------------------------------------------------------
async function makeIntraProxy(options = {}) {
  const { input, outputPath, start = 0, duration = 0, maxWidth = 0, crf = 20, threads = 0, signal, onProcess, ffmpegPath = resolveToolPath('ffmpeg') } = options;
  if (!input || !outputPath) throw new Error('Input and output are required.');
  const tmp = `${outputPath}.tmp.mp4`;
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.rm(tmp, { force: true }).catch(() => {});
  const vf = maxWidth > 0 ? `scale='min(${Math.round(maxWidth)},iw)':-2:flags=lanczos,format=yuv420p` : 'scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p';
  const args = ['-hide_banner', '-y', '-loglevel', 'error'];
  if (start > 0) args.push('-ss', Number(start).toFixed(3));
  args.push('-i', input);
  if (duration > 0) args.push('-t', Number(duration).toFixed(3));
  args.push('-map', '0:v:0', '-an', '-sn', '-dn', '-vf', vf, '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', String(crf), '-g', '1', '-bf', '0', '-fps_mode', 'passthrough', '-movflags', '+faststart');
  if (threads > 0) args.push('-threads', String(threads));
  args.push('-f', 'mp4', tmp);
  try {
    await runProcess(ffmpegPath, args, { signal, kind: 'ffmpeg', onProcess });
    const stat = await fs.stat(tmp).catch(() => null);
    if (!stat?.isFile() || stat.size < 1024) throw new Error('Proxy generation produced an empty file.');
    await fs.rename(tmp, outputPath);
    return { path: outputPath, size: stat.size };
  } catch (error) { await fs.rm(tmp, { force: true }).catch(() => {}); throw error; }
}

async function trimProxyCache(dir, maxBytes) {
  try {
    const entries = [];
    for (const name of await fs.readdir(dir)) {
      const full = path.join(dir, name);
      const st = await fs.stat(full).catch(() => null);
      if (st?.isFile()) entries.push({ full, size: st.size, time: st.atimeMs || st.mtimeMs });
    }
    let total = entries.reduce((a, e) => a + e.size, 0);
    entries.sort((a, b) => a.time - b.time);
    for (const e of entries) { if (total <= maxBytes) break; await fs.rm(e.full, { force: true }).catch(() => {}); total -= e.size; }
  } catch {}
}

module.exports = { createStreamingEncoder, makeIntraProxy, trimProxyCache, prepareAudioGraph };
