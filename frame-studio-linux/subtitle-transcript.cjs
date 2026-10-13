'use strict';

function timeValue(value, numericUnit = 'seconds') {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return numericUnit === 'milliseconds' ? value / 1000 : value;
  }
  const text = String(value ?? '').trim();
  if (!text) return NaN;
  if (/^\d+(\.\d+)?$/.test(text)) {
    const numeric = Number(text);
    return numericUnit === 'milliseconds' ? numeric / 1000 : numeric;
  }
  const clock = text.match(/^(\d+):(\d{2}):(\d{2})[,.](\d{1,3})$/);
  if (clock) {
    return Number(clock[1]) * 3600 + Number(clock[2]) * 60 + Number(clock[3]) + Number(clock[4].padEnd(3, '0')) / 1000;
  }
  return NaN;
}

function parseWhisperTranscript(raw) {
  const rawLanguage = raw?.result?.language || raw?.language || '';
  const language = String(rawLanguage).toLowerCase().replace(/^language:\s*/, '').trim();
  if (!/^(en|english|pt|pt-br|portuguese|português)(\b|$)/i.test(language)) {
    throw new Error(`Detected language "${language || 'unknown'}" is not supported. This tool accepts English and Portuguese only.`);
  }
  const records = Array.isArray(raw?.transcription)
    ? raw.transcription
    : Array.isArray(raw?.segments) ? raw.segments : [];
  const segments = records.map((item) => {
    // whisper.cpp `offsets` are milliseconds; `timestamps` are formatted clock times.
    const start = item?.timestamps?.from != null
      ? timeValue(item.timestamps.from)
      : item?.offsets?.from != null ? timeValue(item.offsets.from, 'milliseconds') : timeValue(item?.start);
    const end = item?.timestamps?.to != null
      ? timeValue(item.timestamps.to)
      : item?.offsets?.to != null ? timeValue(item.offsets.to, 'milliseconds') : timeValue(item?.end);
    return { start, end, text: String(item?.text || '').trim() };
  }).filter((item) => Number.isFinite(item.start) && Number.isFinite(item.end) && item.end > item.start && item.text).slice(0, 10000);
  if (!segments.length) throw new Error('Whisper produced no timestamped transcript segments. Check the model and whisper-cli version.');
  return { language, segments };
}

module.exports = { timeValue, parseWhisperTranscript };
