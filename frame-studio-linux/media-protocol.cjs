'use strict';

// Range-aware file serving for the frame-media:// protocol.
// <video> seeking needs correct 206/Content-Range/Accept-Ranges/Content-Length/Content-Type
// responses; relying on net.fetch(file://) to forward Range headers is not reliable and left
// downloaded videos (served through frame-media://) with a frozen frame while scrubbing.

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { Readable } = require('node:stream');

const MIME_TYPES = Object.freeze({
  '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.mov': 'video/quicktime', '.mkv': 'video/x-matroska',
  '.webm': 'video/webm', '.avi': 'video/x-msvideo', '.mpeg': 'video/mpeg', '.mpg': 'video/mpeg', '.wmv': 'video/x-ms-wmv',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
  '.opus': 'audio/ogg', '.flac': 'audio/flac',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.bmp': 'image/bmp', '.avif': 'image/avif', '.svg': 'image/svg+xml'
});

function mimeTypeFor(filePath) {
  return MIME_TYPES[path.extname(String(filePath || '')).toLowerCase()] || 'application/octet-stream';
}

// Returns {start,end} (inclusive), null when there is no usable Range header, or 'unsatisfiable'.
function parseByteRange(header, size) {
  if (!header) return null;
  const match = /^\s*bytes\s*=\s*(\d*)\s*-\s*(\d*)\s*(?:,.*)?$/i.exec(String(header));
  if (!match) return null;
  const [, rawStart, rawEnd] = match;
  if (rawStart === '' && rawEnd === '') return null;
  if (size <= 0) return 'unsatisfiable';
  let start;
  let end;
  if (rawStart === '') {
    const suffix = Number(rawEnd);
    if (!Number.isFinite(suffix) || suffix <= 0) return 'unsatisfiable';
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === '' ? size - 1 : Math.min(Number(rawEnd), size - 1);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= size || start > end) return 'unsatisfiable';
  return { start, end };
}

// Builds a fetch-style Response for a local file with full Range support.
async function serveMediaFile(filePath, rangeHeader, method = 'GET') {
  let stat;
  try { stat = await fsp.stat(filePath); } catch { return new Response('Media file not found', { status: 404 }); }
  if (!stat.isFile()) return new Response('Media path is not a file', { status: 404 });
  const size = stat.size;
  const baseHeaders = {
    'Content-Type': mimeTypeFor(filePath),
    'Accept-Ranges': 'bytes',
    'Access-Control-Allow-Origin': '*',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'Cache-Control': 'no-cache',
    'Last-Modified': stat.mtime.toUTCString()
  };
  const range = parseByteRange(rangeHeader, size);
  if (range === 'unsatisfiable') {
    return new Response(null, { status: 416, headers: { ...baseHeaders, 'Content-Range': `bytes */${size}` } });
  }
  const start = range ? range.start : 0;
  const end = range ? range.end : Math.max(0, size - 1);
  const length = size === 0 ? 0 : end - start + 1;
  const headers = { ...baseHeaders, 'Content-Length': String(length) };
  if (range) headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
  const status = range ? 206 : 200;
  if (method === 'HEAD' || length === 0) return new Response(null, { status, headers });
  const stream = fs.createReadStream(filePath, { start, end });
  return new Response(Readable.toWeb(stream), { status, headers });
}

module.exports = { MIME_TYPES, mimeTypeFor, parseByteRange, serveMediaFile };
