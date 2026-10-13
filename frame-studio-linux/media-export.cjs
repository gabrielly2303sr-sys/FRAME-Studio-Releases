'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { checkToolVersion } = require('./media-tools.cjs');

class ExportCanceledError extends Error {
  constructor() {
    super('Export canceled.');
    this.name = 'ExportCanceledError';
    this.code = 'EXPORT_CANCELED';
  }
}

function resolveToolPath(kind, override) {
  if (override) return override;
  const envName = kind === 'ffprobe' ? 'FRAME_FFPROBE_PATH' : 'FRAME_FFMPEG_PATH';
  if (process.env[envName]) return process.env[envName];
  // Official packaged releases must use their included tool. Never prompt end users
  // to install a system package or accidentally hide a packaging failure via PATH.
  if (process.env.FRAME_PACKAGED_APP === '1') return null;
  return kind;
}

function executableError(kind, error) {
  const label = kind === 'ffmpeg' ? 'FFmpeg' : 'ffprobe';
  if (error?.code === 'ENOENT') {
    if (process.env.FRAME_PACKAGED_APP === '1') {
      return new Error(`This FRAME Studio package is missing its bundled ${label}. Re-download the official installer/AppImage; users should not need to install separate media tools.`);
    }
    return new Error(`${label} is not available in this development run. Bundled tools are prepared automatically by the source start/build scripts.`);
  }
  return new Error(`Could not start ${label}: ${error?.message || String(error)}`);
}

function runProcess(binary, args, options = {}) {
  const { signal, onProgress, onProcess, kind = binary } = options;
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new ExportCanceledError());
    if (!binary) return reject(executableError(options.kind || 'ffmpeg', { code: 'ENOENT' }));
    let child;
    let stdout = '';
    let stderr = '';
    let progressBuffer = '';
    let settled = false;
    const settle = (fn, value) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', abort);
      fn(value);
    };
    const abort = () => {
      if (!child || child.exitCode !== null || child.signalCode !== null) return;
      try { child.kill('SIGTERM'); } catch {}
      const forceKill = setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) {
          try { child.kill('SIGKILL'); } catch {}
        }
      }, 1200);
      forceKill.unref?.();
      child.once('close', () => clearTimeout(forceKill));
    };
    try {
      child = spawn(binary, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    } catch (error) {
      settle(reject, executableError(kind, error));
      return;
    }
    signal?.addEventListener('abort', abort, { once: true });
    onProcess?.(kind, child);
    if (signal?.aborted) abort();
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      stdout = (stdout + chunk).slice(-2_000_000);
      if (!onProgress) return;
      progressBuffer += chunk;
      const lines = progressBuffer.split(/[\r\n]+/);
      progressBuffer = lines.pop() || '';
      for (const line of lines) {
        const match = line.match(/^out_time_(?:ms|us)=(\d+)/);
        if (match) onProgress(Number(match[1]) / 1_000_000);
        if (line === 'progress=end') onProgress(null, true);
      }
    });
    child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-12_000); });
    child.on('error', error => settle(reject, executableError(kind, error)));
    child.on('close', (code, closeSignal) => {
      if (signal?.aborted) return settle(reject, new ExportCanceledError());
      if (code === 0) return settle(resolve, { stdout, stderr });
      const detail = stderr.trim().split('\n').slice(-10).join('\n');
      const label = kind === 'ffmpeg' ? 'FFmpeg' : 'ffprobe';
      settle(reject, new Error(`${label} failed${code === null ? ` (${closeSignal || 'no exit code'})` : ` (exit code ${code})`}.${detail ? `\n${detail}` : ''}`));
    });
  });
}

async function probeMedia(filePath, options = {}) {
  const ffprobePath = resolveToolPath('ffprobe', options.ffprobePath);
  const { stdout } = await runProcess(ffprobePath, [
    '-v', 'error', '-show_entries',
    'format=duration:stream=codec_type,codec_name,width,height,pix_fmt,sample_rate,channels,duration,avg_frame_rate,r_frame_rate,nb_frames',
    '-of', 'json', filePath
  ], { signal: options.signal, onProcess: options.onProcess, kind: 'ffprobe' });
  let data;
  try { data = JSON.parse(stdout); }
  catch { throw new Error('ffprobe could not read metadata from the generated video.'); }
  const duration = Number(data.format?.duration);
  return {
    duration: Number.isFinite(duration) ? duration : Math.max(0, ...(data.streams || []).map(s => Number(s.duration) || 0)),
    streams: Array.isArray(data.streams) ? data.streams : [],
    format: data.format || {}
  };
}


function cubicBezierCoordinate(t, a, b) {
  return 3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
}

function easedUnitValue(x, curve = {}) {
  const x1 = Math.max(0, Math.min(1, Number(curve.x1 ?? 0.25)));
  const x2 = Math.max(0, Math.min(1, Number(curve.x2 ?? 0.25)));
  const y1 = Math.max(0, Math.min(1, Number(curve.y1 ?? 0.1)));
  const y2 = Math.max(0, Math.min(1, Number(curve.y2 ?? 1)));
  let lo = 0, hi = 1, t = Math.max(0, Math.min(1, x));
  for (let i = 0; i < 18; i++) {
    t = (lo + hi) / 2;
    if (cubicBezierCoordinate(t, x1, x2) < x) lo = t;
    else hi = t;
  }
  return Math.max(0, Math.min(1, cubicBezierCoordinate(t, y1, y2)));
}

/** Creates a bounded FFmpeg volume expression from clip-local volume keyframes. */
function volumeAutomationExpression(baseVolume, keyframes, clipDuration) {
  const base = Math.max(0, Math.min(200, Number(baseVolume ?? 100))) / 100;
  const limit = Math.max(0, Number(clipDuration) || 0);
  const input = Array.isArray(keyframes) ? keyframes : [];
  const keys = input.map(k => ({
    time: Math.max(0, Math.min(limit, Number(k?.time) || 0)),
    value: Math.max(0, Math.min(200, Number(k?.value) || 0)) / 100,
    ease: k?.ease && typeof k.ease === 'object' ? k.ease : { x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 }
  })).sort((a, b) => a.time - b.time).filter((k, i, all) => i === 0 || k.time > all[i - 1].time + 0.0001);
  if (!keys.length) return base.toFixed(6);

  const points = [];
  // A keyframe controls the property before its first timestamp as well, matching the preview.
  if (keys[0].time > 0.0001) points.push({ time: keys[0].time, value: keys[0].value });
  else points.push({ time: 0, value: keys[0].value });
  for (let i = 0; i < keys.length - 1; i++) {
    const left = keys[i], right = keys[i + 1], span = right.time - left.time;
    if (span <= 0.0001) continue;
    // Sample the Bezier curve so the rendered audio follows the same ease shape.
    for (let sample = 1; sample <= 12; sample++) {
      const u = sample / 12;
      const value = left.value + (right.value - left.value) * easedUnitValue(u, left.ease);
      points.push({ time: left.time + span * u, value });
    }
  }
  if (points.length === 1) return points[0].value.toFixed(6);
  let expression = points[points.length - 1].value.toFixed(6);
  for (let i = points.length - 2; i >= 0; i--) {
    const left = points[i], right = points[i + 1], dt = Math.max(0.000001, right.time - left.time);
    const v0 = left.value.toFixed(6), dv = (right.value - left.value).toFixed(6);
    const t0 = left.time.toFixed(6), t1 = right.time.toFixed(6), span = dt.toFixed(6);
    expression = `if(lt(t,${t1}),${v0}+(${dv})*(t-${t0})/${span},${expression})`;
  }
  if (keys[0].time > 0.0001) expression = `if(lt(t,${keys[0].time.toFixed(6)}),${keys[0].value.toFixed(6)},${expression})`;
  return expression;
}

function parseFrameRate(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parts = String(value || '').split('/').map(Number);
  if (parts.length === 1) return Number.isFinite(parts[0]) ? parts[0] : null;
  if (parts.length !== 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1]) || parts[1] === 0) return null;
  return parts[0] / parts[1];
}

function validateProbe(probe, expectedDuration, label, options = {}) {
  const video = probe.streams.find(stream => stream.codec_type === 'video');
  if (!video) throw new Error(`${label}: does not contain a video stream.`);
  const durationKnown = Number.isFinite(probe.duration) && probe.duration > 0.04;
  if (!durationKnown && !options.allowUnknownDuration) throw new Error(`${label}: duration is missing or invalid.`);
  if (durationKnown && expectedDuration > 0) {
    const tolerance = Math.max(0.35, 2 / 60, expectedDuration * 0.10);
    if (probe.duration < Math.max(0.04, expectedDuration - tolerance) || probe.duration > expectedDuration + tolerance) {
      throw new Error(`${label}: unexpected duration (${probe.duration.toFixed(2)} s; expected about ${expectedDuration.toFixed(2)} s).`);
    }
  }
  return video;
}

async function checkMediaTools(options = {}) {
  const ffmpegPath = resolveToolPath('ffmpeg', options.ffmpegPath);
  const ffprobePath = resolveToolPath('ffprobe', options.ffprobePath);
  // Version arguments come from the shared helper (ffmpeg/ffprobe: -version), so export checks and the
  // downloader status check can never disagree about how to validate a tool.
  const runner = options.runner;
  const check = async (binary, kind) => {
    const result = await checkToolVersion(kind, binary, runner ? { runner } : {});
    return result.available
      ? { available: true, version: result.version || `${kind} available`, kind: '', stdout: result.stdout, stderr: result.stderr }
      : { available: false, error: `${result.kind}: ${result.reason}`, kind: result.kind, stdout: result.stdout, stderr: result.stderr };
  };
  const [ffmpeg, ffprobe] = await Promise.all([check(ffmpegPath, 'ffmpeg'), check(ffprobePath, 'ffprobe')]);
  const missing = [];
  if (!ffmpeg.available) missing.push('FFmpeg');
  if (!ffprobe.available) missing.push('ffprobe');
  const message = missing.length
    ? (process.env.FRAME_PACKAGED_APP === '1'
      ? `This FRAME Studio package is missing bundled ${missing.join(' and ')}. Re-download the official installer/AppImage; separate tool installation should not be needed.`
      : `${missing.join(' and ')} are not available in this development run. The official application packages bundle these tools automatically.`)
    : '';
  return { available: ffmpeg.available && ffprobe.available, ffmpeg, ffprobe, message };
}

async function transcodeWebmToMp4(options) {
  const {
    inputPath,
    outputPath,
    expectedDuration = 0,
    fps = 30,
    crf = 18,
    signal,
    onProgress,
    onProcess,
    ffmpegPath = resolveToolPath('ffmpeg'),
    ffprobePath = resolveToolPath('ffprobe')
  } = options || {};
  if (!inputPath || !outputPath) throw new Error('Input and output paths are required.');
  if (signal?.aborted) throw new ExportCanceledError();

  try {
    const inputStat = await fs.stat(inputPath).catch(() => null);
    if (!inputStat?.isFile() || inputStat.size === 0) throw new Error('The temporary WebM capture is empty or missing.');
    const inputProbe = await probeMedia(inputPath, { ffprobePath, signal, onProcess });
    validateProbe(inputProbe, expectedDuration, 'Temporary capture', { allowUnknownDuration: true });
    const inputVideo = inputProbe.streams.find(stream => stream.codec_type === 'video');
    const hasAudio = inputProbe.streams.some(stream => stream.codec_type === 'audio');
    const safeFps = Math.max(1, Math.min(120, Math.round(Number(fps) || 30)));
    const safeCrf = Math.max(16, Math.min(28, Math.round(Number(crf) || 18)));
    const args = [
      '-hide_banner', '-y', '-i', inputPath,
      '-map', '0:v:0'
    ];
    if (hasAudio) args.push('-map', '0:a:0');
    args.push(
      '-map_metadata', '-1',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(safeCrf),
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-r', String(safeFps), '-fps_mode', 'cfr', '-pix_fmt', 'yuv420p'
    );
    if (hasAudio) args.push('-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-af', 'aresample=async=1:first_pts=0');
    args.push('-movflags', '+faststart', '-progress', 'pipe:1', '-nostats', outputPath);

    await runProcess(ffmpegPath, args, {
      signal,
      kind: 'ffmpeg',
      onProcess,
      onProgress: (seconds, ended) => {
        if (ended) return onProgress?.({ stage: 'transcoding', progress: 99, seconds: expectedDuration, duration: expectedDuration });
        const denominator = expectedDuration > 0 ? expectedDuration : inputProbe.duration;
        const progress = denominator > 0 ? Math.max(0, Math.min(98, seconds / denominator * 100)) : 0;
        onProgress?.({ stage: 'transcoding', progress, seconds, duration: denominator });
      }
    });
    if (signal?.aborted) throw new ExportCanceledError();
    onProgress?.({ stage: 'validating', progress: 99, seconds: 0, duration: expectedDuration });
    const outputStat = await fs.stat(outputPath).catch(() => null);
    if (!outputStat?.isFile() || outputStat.size < 1024) throw new Error('FFmpeg did not generate a valid MP4 (the file is empty or too small).');
    const outputProbe = await probeMedia(outputPath, { ffprobePath, signal, onProcess });
    const outputVideo = validateProbe(outputProbe, expectedDuration, 'O MP4 exportado');
    if (outputVideo.codec_name !== 'h264') throw new Error(`Unexpected video codec: ${outputVideo.codec_name || 'unknown'}; expected H.264.`);
    if (!outputVideo.width || !outputVideo.height || outputVideo.width % 2 || outputVideo.height % 2) throw new Error('The exported MP4 has dimensions that are invalid for H.264/yuv420p.');
    const outputAudio = outputProbe.streams.find(stream => stream.codec_type === 'audio');
    if (hasAudio && outputAudio?.codec_name !== 'aac') throw new Error(`Unexpected audio codec: ${outputAudio?.codec_name || 'missing'}; expected AAC.`);
    if (!hasAudio && outputAudio) throw new Error('The MP4 contains an unexpected audio stream even though the capture has no audio.');
    if (signal?.aborted) throw new ExportCanceledError();
    onProgress?.({ stage: 'validating', progress: 100, seconds: outputProbe.duration, duration: outputProbe.duration });
    return {
      duration: outputProbe.duration,
      size: outputStat.size,
      videoCodec: outputVideo.codec_name,
      audioCodec: outputAudio?.codec_name || null,
      width: outputVideo.width,
      height: outputVideo.height,
      fps: safeFps,
      inputHasAudio: hasAudio,
      inputVideoCodec: inputVideo.codec_name || null
    };
  } catch (error) {
    await fs.rm(outputPath, { force: true }).catch(() => {});
    throw error;
  }
}


function tempoFilters(speed) {
  const filters = [];
  let remaining = Math.max(0.1, Math.min(8, Number(speed) || 1));
  while (remaining > 2.000001) { filters.push('atempo=2'); remaining /= 2; }
  while (remaining < 0.499999) { filters.push('atempo=0.5'); remaining /= 0.5; }
  if (Math.abs(remaining - 1) > 0.0001) filters.push(`atempo=${remaining.toFixed(6)}`);
  return filters;
}

function bezierCoordinate(t, a, b) {
  return 3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
}

function remapEase(progress, curve = {}) {
  const x1 = Number.isFinite(Number(curve.x1)) ? Number(curve.x1) : 0;
  const y1 = Number.isFinite(Number(curve.y1)) ? Number(curve.y1) : 0;
  const x2 = Number.isFinite(Number(curve.x2)) ? Number(curve.x2) : 1;
  const y2 = Number.isFinite(Number(curve.y2)) ? Number(curve.y2) : 1;
  let low = 0, high = 1, t = Math.max(0, Math.min(1, progress));
  for (let i = 0; i < 16; i++) {
    t = (low + high) / 2;
    if (bezierCoordinate(t, x1, x2) < progress) low = t;
    else high = t;
  }
  return bezierCoordinate(t, y1, y2);
}

function remapAudioPoints(timeRemap) {
  const raw = Array.isArray(timeRemap) ? timeRemap : [];
  const points = [
    { time: 0, value: 0, mode: 'linear', ease: {}, implicit: true },
    ...raw.filter(k => k && Number.isFinite(Number(k.time)) && Number.isFinite(Number(k.value))).map(k => ({
      time: Math.max(0, Math.min(1, Number(k.time))),
      value: Math.max(0, Math.min(1, Number(k.value))),
      mode: ['linear', 'smooth', 'hold'].includes(k.mode) ? k.mode : (k.ease ? 'smooth' : 'linear'),
      ease: k.ease && typeof k.ease === 'object' ? k.ease : {},
      implicit: false
    })),
    { time: 1, value: 1, mode: 'linear', ease: {}, implicit: true }
  ].sort((a, b) => a.time - b.time);
  const unique = [];
  for (const point of points) {
    const previous = unique[unique.length - 1];
    if (previous && Math.abs(previous.time - point.time) < 0.0001) {
      if (!point.implicit || previous.implicit) unique[unique.length - 1] = point;
    } else unique.push(point);
  }
  return unique;
}

/**
 * Approximate the same normalized source-time curve used by the renderer as
 * bounded linear audio segments. Reverse segments use areverse, while holds
 * produce silence so a frozen video frame does not replay a tiny audio region.
 */
function buildRemapAudioSegments({ inPoint = 0, outPoint, clipDuration, timeRemap = [] } = {}) {
  const inTime = Math.max(0, Number(inPoint) || 0);
  const outTime = Number(outPoint);
  const duration = Math.max(0, Number(clipDuration) || 0);
  if (!Number.isFinite(outTime) || outTime <= inTime || duration <= 0 || !Array.isArray(timeRemap) || !timeRemap.length) return null;
  const points = remapAudioPoints(timeRemap);
  const sourceSpan = outTime - inTime;
  const sample = (left, right, u) => {
    if (left.mode === 'hold') return left.value;
    const eased = left.mode === 'smooth' ? remapEase(u, left.ease) : u;
    return Math.max(0, Math.min(1, left.value + (right.value - left.value) * eased));
  };
  const segments = [];
  for (let i = 0; i < points.length - 1; i++) {
    const left = points[i], right = points[i + 1];
    const span = Math.max(0, right.time - left.time);
    if (span <= 0.000001) continue;
    const timelineSpan = span * duration;
    const steps = left.mode === 'hold' || left.mode === 'linear'
      ? 1
      : Math.max(1, Math.min(48, Math.ceil(timelineSpan / 0.2)));
    for (let step = 0; step < steps; step++) {
      const u0 = step / steps, u1 = (step + 1) / steps;
      const t0 = (left.time + span * u0) * duration;
      const t1 = (left.time + span * u1) * duration;
      const sourceA = inTime + sourceSpan * sample(left, right, u0);
      const sourceB = inTime + sourceSpan * sample(left, right, u1);
      const segmentDuration = Math.max(0.0001, t1 - t0);
      const sourceDelta = sourceB - sourceA;
      const silent = left.mode === 'hold' || Math.abs(sourceDelta) < 0.0001;
      segments.push({
        start: t0,
        end: t1,
        duration: segmentDuration,
        sourceStart: Math.max(inTime, Math.min(outTime, sourceA)),
        sourceEnd: Math.max(inTime, Math.min(outTime, sourceB)),
        rate: silent ? 0 : Math.abs(sourceDelta) / segmentDuration,
        reverse: !silent && sourceDelta < 0,
        silent
      });
    }
  }
  return segments;
}

/**
 * Encodes deterministic canvas frames saved as frame-%08d.png. The renderer is
 * responsible for seeking every active source to n / fps and drawing that frame
 * before sending it to the main process. This function never records screen-time.
 */
function voiceEffectFilters(effect) {
  switch (effect) {
    case 'telephone': return ['highpass=f=300', 'lowpass=f=3400'];
    case 'radio': return ['highpass=f=220', 'lowpass=f=3200', 'acompressor=threshold=0.12:ratio=3:attack=10:release=80'];
    case 'echo': return ['aecho=0.8:0.78:70|140:0.30|0.18'];
    case 'robot': return ['highpass=f=100', 'lowpass=f=3800', 'aecho=0.8:0.9:8|16:0.42|0.24'];
    default: return [];
  }
}

async function renderFrameSequenceToMp4(options = {}) {
  const {
    framePattern,
    frameCount,
    outputPath,
    expectedDuration = 0,
    fps = 30,
    crf = 18,
    rateMode = 'crf',
    videoBitrate = 12,
    encoderPreset = 'veryfast',
    audioBitrate = 192,
    audioClips = [],
    signal,
    onProgress,
    onProcess,
    ffmpegPath = resolveToolPath('ffmpeg'),
    ffprobePath = resolveToolPath('ffprobe')
  } = options;
  if (!framePattern || !outputPath) throw new Error('A frame sequence and MP4 output path are required.');
  const safeFps = Math.max(1, Math.min(120, Math.round(Number(fps) || 30)));
  const safeCrf = Math.max(16, Math.min(28, Math.round(Number(crf) || 18)));
  const safeRateMode = rateMode === 'bitrate' ? 'bitrate' : 'crf';
  const safeVideoBitrate = Math.max(2, Math.min(100, Number(videoBitrate) || 12));
  const safeEncoderPreset = ['veryfast', 'fast', 'medium', 'slow', 'slower'].includes(encoderPreset) ? encoderPreset : 'veryfast';
  const safeAudioBitrate = [96, 128, 160, 192, 256, 320].includes(Number(audioBitrate)) ? Number(audioBitrate) : 192;
  const safeFrameCount = Math.floor(Number(frameCount));
  if (!Number.isSafeInteger(safeFrameCount) || safeFrameCount < 1 || safeFrameCount > safeFps * 60 * 60 * 12) {
    throw new Error('Invalid frame count or video duration exceeds 12 hours.');
  }
  const duration = safeFrameCount / safeFps;
  const firstFrame = framePattern.replace('%08d', '00000000');
  const lastFrame = framePattern.replace('%08d', String(safeFrameCount - 1).padStart(8, '0'));
  for (const file of [firstFrame, lastFrame]) {
    const stat = await fs.stat(file).catch(() => null);
    if (!stat?.isFile() || stat.size < 16) throw new Error(`Missing or invalid sequence frame: ${path.basename(file)}.`);
  }
  if (signal?.aborted) throw new ExportCanceledError();

  const args = [
    '-hide_banner', '-y',
    '-framerate', String(safeFps), '-start_number', '0', '-i', framePattern
  ];
  const filters = [];
  const audioLabels = [];
  let nextInput = 1;
  let audioIndex = 0;
  const sourceClips = Array.isArray(audioClips) ? audioClips.slice(0, 500) : [];
  for (const clip of sourceClips) {
    if (!clip || !['video', 'audio'].includes(clip.kind)) continue;
    const sourcePath = clip.path;
    if (typeof sourcePath !== 'string' || !path.isAbsolute(sourcePath)) {
      throw new Error(`Clip "${clip.name || 'unnamed'}" does not have a valid file path. Relink or reimport the media.`);
    }
    const sourceStat = await fs.stat(sourcePath).catch(() => null);
    if (!sourceStat?.isFile()) {
      throw new Error(`Source file "${clip.name || sourcePath}" does not exist. Relink the media before exporting.`);
    }
    const probe = await probeMedia(sourcePath, { ffprobePath, signal, onProcess });
    const hasSourceAudio = probe.streams.some(stream => stream.codec_type === 'audio');
    if (!hasSourceAudio) {
      if (clip.kind === 'audio') throw new Error(`File "${clip.name || sourcePath}" does not contain a readable audio stream.`);
      continue;
    }

    const start = Math.max(0, Number(clip.start) || 0);
    const inPoint = Math.max(0, Number(clip.inPoint) || 0);
    const outPoint = Number(clip.outPoint);
    const speed = Math.max(0.1, Math.min(8, Number(clip.speed) || 1));
    if (!Number.isFinite(outPoint) || outPoint <= inPoint) {
      throw new Error(`Source range for clip "${clip.name || 'unnamed'}" is invalid.`);
    }
    args.push('-i', sourcePath);
    const input = nextInput++;
    const label = `clipaudio${audioIndex++}`;
    const gain = Math.max(0, Math.min(200, Number(clip.volume ?? 100))) / 100;
    const clipDuration = Math.max(0, Number(clip.timeRemapDuration) > 0 ? Number(clip.timeRemapDuration) : (outPoint - inPoint) / speed);
    const remapSegments = Array.isArray(clip.timeRemap) && clip.timeRemap.length ? buildRemapAudioSegments({ inPoint, outPoint, clipDuration, timeRemap: clip.timeRemap }) : null;
    const volumeExpression = volumeAutomationExpression(clip.volume ?? 100, clip.volumeKeyframes, clipDuration);
    const hasVolumeKeys = Array.isArray(clip.volumeKeyframes) && clip.volumeKeyframes.length > 0;
    const volumeFilter = hasVolumeKeys ? `volume='${volumeExpression}':eval=frame` : `volume=${gain.toFixed(4)}`;
    const voiceFilters = voiceEffectFilters(clip.voiceEffect);
    const fadeIn = Math.max(0, Math.min(clipDuration, Number(clip.fadeIn) || 0));
    const fadeOut = Math.max(0, Math.min(clipDuration, Number(clip.fadeOut) || 0));
    if (remapSegments?.length) {
      const segmentLabels = [];
      remapSegments.forEach((segment, segmentIndex) => {
        const segmentLabel = `remap_${audioIndex}_${segmentIndex}`;
        segmentLabels.push(`[${segmentLabel}]`);
        const partDuration = segment.duration.toFixed(6);
        if (segment.silent) {
          filters.push(`anullsrc=channel_layout=stereo:sample_rate=48000,atrim=duration=${partDuration},asetpts=PTS-STARTPTS[${segmentLabel}]`);
        } else {
          const sourceStart = Math.min(segment.sourceStart, segment.sourceEnd);
          const sourceEnd = Math.max(segment.sourceStart, segment.sourceEnd);
          const sourceTrim = `[${input}:a:0]atrim=start=${sourceStart.toFixed(6)}:end=${sourceEnd.toFixed(6)},asetpts=PTS-STARTPTS`;
          const direction = segment.reverse ? ['areverse'] : [];
          const tempo = tempoFilters(segment.rate);
          const segmentFilters = [sourceTrim, ...direction, ...tempo, `apad=pad_dur=${partDuration}`, `atrim=duration=${partDuration}`, 'asetpts=PTS-STARTPTS', 'aformat=sample_rates=48000:channel_layouts=stereo'];
          filters.push(`${segmentFilters.join(',')}[${segmentLabel}]`);
        }
      });
      const rawLabel = `remapraw_${audioIndex}`;
      if (segmentLabels.length === 1) filters.push(`${segmentLabels[0]}anull[${rawLabel}]`);
      else filters.push(`${segmentLabels.join('')}concat=n=${segmentLabels.length}:v=0:a=1[${rawLabel}]`);
      const post = [
        `[${rawLabel}]${[...voiceFilters, volumeFilter].join(',')}`,
        ...(fadeIn > 0.001 ? [`afade=t=in:st=0:d=${fadeIn.toFixed(6)}`] : []),
        ...(fadeOut > 0.001 ? [`afade=t=out:st=${Math.max(0, clipDuration - fadeOut).toFixed(6)}:d=${fadeOut.toFixed(6)}`] : []),
        `adelay=${Math.round(start * 1000)}|${Math.round(start * 1000)}`,
        `apad=pad_dur=${duration.toFixed(6)}`,
        `atrim=duration=${duration.toFixed(6)}[${label}]`
      ];
      filters.push(post.join(','));
    } else {
      const chain = [
        `[${input}:a:0]atrim=start=${inPoint.toFixed(6)}:end=${outPoint.toFixed(6)}`,
        'asetpts=PTS-STARTPTS',
        ...tempoFilters(speed),
        ...voiceFilters,
        volumeFilter,
        ...(fadeIn > 0.001 ? [`afade=t=in:st=0:d=${fadeIn.toFixed(6)}`] : []),
        ...(fadeOut > 0.001 ? [`afade=t=out:st=${Math.max(0, clipDuration - fadeOut).toFixed(6)}:d=${fadeOut.toFixed(6)}`] : []),
        `adelay=${Math.round(start * 1000)}|${Math.round(start * 1000)}`,
        `apad=pad_dur=${duration.toFixed(6)}`,
        `atrim=duration=${duration.toFixed(6)}[${label}]`
      ];
      filters.push(chain.join(','));
    }
    audioLabels.push(`[${label}]`);
  }

  const hasAudio = audioLabels.length > 0;
  if (hasAudio) {
    filters.push(`${audioLabels.join('')}amix=inputs=${audioLabels.length}:duration=longest:normalize=0:dropout_transition=0,atrim=duration=${duration.toFixed(6)},asetpts=PTS-STARTPTS[aout]`);
    args.push('-filter_complex', filters.join(';'));
  }
  args.push('-map', '0:v:0');
  if (hasAudio) args.push('-map', '[aout]');
  const videoBaseArgs = args.slice();
  const progressHandler = (seconds, ended) => {
    if (ended) return onProgress?.({ stage: 'transcoding', progress: 99, seconds: duration, duration });
    const progress = duration > 0 ? Math.max(0, Math.min(98, seconds / duration * 100)) : 0;
    onProgress?.({ stage: 'transcoding', progress, seconds, duration });
  };
  const finishArgs = (base, encoder) => {
    const out = base.slice();
    out.push('-frames:v', String(safeFrameCount), '-t', duration.toFixed(6));
    if (encoder === 'h264_vaapi') {
      out.push('-vf', 'format=nv12,hwupload,scale_vaapi=w=trunc(iw/2)*2:h=trunc(ih/2)*2', '-c:v', encoder, '-qp', String(safeCrf));
    } else if (encoder === 'h264_nvenc') {
      out.push('-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', encoder, '-preset', 'p4');
      if (safeRateMode === 'bitrate') out.push('-b:v', `${safeVideoBitrate}M`, '-maxrate', `${Math.round(safeVideoBitrate * 1.35)}M`, '-bufsize', `${Math.round(safeVideoBitrate * 2)}M`);
      else out.push('-rc', 'vbr', '-cq', String(safeCrf), '-b:v', '0');
    } else if (encoder === 'h264_qsv') {
      out.push('-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', encoder, '-preset', 'veryfast');
      if (safeRateMode === 'bitrate') out.push('-b:v', `${safeVideoBitrate}M`, '-maxrate', `${Math.round(safeVideoBitrate * 1.35)}M`, '-bufsize', `${Math.round(safeVideoBitrate * 2)}M`);
      else out.push('-global_quality', String(safeCrf));
    } else if (encoder === 'h264_amf') {
      out.push('-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', encoder, '-quality', 'speed');
      out.push('-b:v', `${safeRateMode === 'bitrate' ? safeVideoBitrate : Math.max(4, safeVideoBitrate)}M`);
    } else if (encoder === 'h264_videotoolbox') {
      out.push('-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', encoder, '-q:v', String(Math.max(40, 100 - safeCrf * 2)));
      if (safeRateMode === 'bitrate') out.push('-b:v', `${safeVideoBitrate}M`);
    } else if (encoder === 'h264_mf') {
      out.push('-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', encoder, '-b:v', `${safeVideoBitrate}M`);
    } else {
      out.push('-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-preset', safeEncoderPreset);
      if (safeRateMode === 'bitrate') out.push('-b:v', `${safeVideoBitrate}M`, '-maxrate', `${Math.round(safeVideoBitrate * 1.35)}M`, '-bufsize', `${Math.round(safeVideoBitrate * 2)}M`);
      else out.push('-crf', String(safeCrf));
    }
    out.push('-r', String(safeFps), '-fps_mode', 'cfr', '-pix_fmt', encoder === 'h264_vaapi' ? 'nv12' : 'yuv420p');
    if (hasAudio) out.push('-c:a', 'aac', '-b:a', `${safeAudioBitrate}k`, '-ar', '48000', '-ac', '2');
    out.push('-movflags', '+faststart', '-progress', 'pipe:1', '-nostats', outputPath);
    return out;
  };
  let usedEncoder = 'libx264';

  try {
    const preferred = process.platform === 'linux'
      ? ['h264_vaapi', 'h264_nvenc', 'h264_qsv']
      : process.platform === 'win32'
        ? ['h264_nvenc', 'h264_qsv', 'h264_amf', 'h264_mf']
        : process.platform === 'darwin' ? ['h264_videotoolbox'] : [];
    let available = '';
    try { const enc = await runProcess(ffmpegPath, ['-hide_banner', '-encoders'], { signal, kind: 'ffmpeg', onProcess }); available = `${enc.stdout || ''}\n${enc.stderr || ''}`; } catch {}
    const candidates = preferred.filter(name => available.includes(name));
    for (const encoder of candidates) {
      if (signal?.aborted) throw new ExportCanceledError();
      if (encoder === 'h264_vaapi') {
        const device = await fs.stat('/dev/dri/renderD128').catch(() => null);
        if (!device?.isCharacterDevice?.()) continue;
      }
      let encoderBase = videoBaseArgs;
      if (encoder === 'h264_vaapi') {
        encoderBase = videoBaseArgs.slice();
        const inputPos = encoderBase.indexOf('-framerate');
        if (inputPos >= 0) encoderBase.splice(inputPos, 0, '-vaapi_device', '/dev/dri/renderD128');
      }
      try {
        await runProcess(ffmpegPath, finishArgs(encoderBase, encoder), { signal, kind: 'ffmpeg', onProcess, onProgress: progressHandler });
        const candidateStat = await fs.stat(outputPath).catch(() => null);
        if (!candidateStat?.isFile() || candidateStat.size < 1024) throw new Error(`Hardware encoder ${encoder} did not create a valid MP4.`);
        const candidateProbe = await probeMedia(outputPath, { ffprobePath, signal, onProcess });
        const candidateVideo = validateProbe(candidateProbe, duration, 'MP4 de hardware');
        const candidateFps = parseFrameRate(candidateVideo.avg_frame_rate) ?? parseFrameRate(candidateVideo.r_frame_rate);
        if (candidateVideo.codec_name !== 'h264' || !candidateVideo.width || !candidateVideo.height || candidateVideo.width % 2 || candidateVideo.height % 2 || !Number.isFinite(candidateFps) || Math.abs(candidateFps-safeFps)>.05) throw new Error(`Hardware encoder ${encoder} produced an incompatible MP4.`);
        usedEncoder = encoder;
        break;
      } catch (hardwareError) {
        if (signal?.aborted || hardwareError instanceof ExportCanceledError) throw hardwareError;
        await fs.rm(outputPath, { force: true }).catch(() => {});
      }
    }
    if (usedEncoder === 'libx264') {
      await runProcess(ffmpegPath, finishArgs(videoBaseArgs, 'libx264'), { signal, kind: 'ffmpeg', onProcess, onProgress: progressHandler });
    }
    if (signal?.aborted) throw new ExportCanceledError();
    onProgress?.({ stage: 'validating', progress: 99, seconds: 0, duration });
    const outputStat = await fs.stat(outputPath).catch(() => null);
    if (!outputStat?.isFile() || outputStat.size < 1024) throw new Error('FFmpeg did not generate a valid MP4 (the file is empty or too small).');
    const outputProbe = await probeMedia(outputPath, { ffprobePath, signal, onProcess });
    const outputVideo = validateProbe(outputProbe, duration, 'O MP4 renderizado');
    if (outputVideo.codec_name !== 'h264') throw new Error(`Unexpected video codec: ${outputVideo.codec_name || 'unknown'}; expected H.264.`);
    if (!outputVideo.width || !outputVideo.height || outputVideo.width % 2 || outputVideo.height % 2) throw new Error('The rendered MP4 has dimensions that are invalid for H.264/yuv420p.');
    const actualFps = parseFrameRate(outputVideo.avg_frame_rate) ?? parseFrameRate(outputVideo.r_frame_rate);
    if (!Number.isFinite(actualFps) || Math.abs(actualFps - safeFps) > 0.05) {
      throw new Error(`FPS do MP4 inesperado: ${Number.isFinite(actualFps) ? actualFps.toFixed(3) : 'desconhecido'}; esperado ${safeFps} FPS.`);
    }
    const reportedFrameCount = Number(outputVideo.nb_frames);
    if (Number.isFinite(reportedFrameCount) && reportedFrameCount > 0 && reportedFrameCount !== safeFrameCount) {
      throw new Error(`Quantidade de frames do MP4 inesperada: ${reportedFrameCount}; esperado ${safeFrameCount}.`);
    }
    const outputAudio = outputProbe.streams.find(stream => stream.codec_type === 'audio');
    if (hasAudio && outputAudio?.codec_name !== 'aac') throw new Error(`Unexpected audio codec: ${outputAudio?.codec_name || 'missing'}; expected AAC.`);
    if (!hasAudio && outputAudio) throw new Error('The MP4 contains an unexpected audio stream even though the sequence has no audio.');
    if (signal?.aborted) throw new ExportCanceledError();
    onProgress?.({ stage: 'validating', progress: 100, seconds: outputProbe.duration, duration: outputProbe.duration });
    return {
      duration: outputProbe.duration,
      size: outputStat.size,
      videoCodec: outputVideo.codec_name,
      videoEncoder: usedEncoder,
      hardwareEncoding: usedEncoder !== 'libx264',
      audioCodec: outputAudio?.codec_name || null,
      width: outputVideo.width,
      height: outputVideo.height,
      fps: actualFps,
      crf: safeCrf,
      rateMode: safeRateMode,
      videoBitrate: safeVideoBitrate,
      encoderPreset: safeEncoderPreset,
      audioBitrate: safeAudioBitrate,
      frameCount: Number.isFinite(reportedFrameCount) && reportedFrameCount > 0 ? reportedFrameCount : safeFrameCount,
      deterministicFrames: true,
      inputAudioClips: audioLabels.length
    };
  } catch (error) {
    await fs.rm(outputPath, { force: true }).catch(() => {});
    throw error;
  }
}

module.exports = { ExportCanceledError, checkMediaTools, parseFrameRate, probeMedia, transcodeWebmToMp4, renderFrameSequenceToMp4, volumeAutomationExpression, remapAudioPoints, buildRemapAudioSegments, voiceEffectFilters };

