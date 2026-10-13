'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { Readable } = require('node:stream');

const MIME_TYPES = Object.freeze({
  '.aac': 'audio/aac',
  '.avi': 'video/x-msvideo',
  '.flac': 'audio/flac',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.m4a': 'audio/mp4',
  '.m4v': 'video/mp4',
  '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.mpeg': 'video/mpeg',
  '.mpg': 'video/mpeg',
  '.oga': 'audio/ogg',
  '.ogg': 'audio/ogg',
  '.ogv': 'video/ogg',
  '.opus': 'audio/ogg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.webm': 'video/webm',
  '.webp': 'image/webp'
});

function mimeTypeForPath(target) {
  return MIME_TYPES[path.extname(String(target || '')).toLowerCase()] || 'application/octet-stream';
}

// Return a single byte range, an unsatisfiable range, or null when the server
// should ignore a malformed/unsupported Range header and send the full file.
function parseByteRange(header, size) {
  if (!header || !/^\s*bytes=/i.test(String(header))) return null;
  const value = String(header).trim().slice(String(header).trim().indexOf('=') + 1).trim();
  if (value.includes(',')) return null; // Electron media elements normally request one range at a time.
  const match = /^(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2])) return null;
  if (!Number.isSafeInteger(size) || size <= 0) return { unsatisfiable: true };

  let start;
  let end;
  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return { unsatisfiable: true };
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || end < start) {
      return { unsatisfiable: true };
    }
    end = Math.min(end, size - 1);
  }
  return { start, end };
}

function createMediaFileResponse(target, request) {
  const stat = fs.statSync(target);
  if (!stat.isFile()) return new Response('Media path is not a file', { status: 404 });
  const size = stat.size;
  const method = String(request?.method || 'GET').toUpperCase();
  const rangeHeader = request?.headers?.get?.('range') || null;
  const requestedRange = parseByteRange(rangeHeader, size);
  const headers = new Headers({
    'Accept-Ranges': 'bytes',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache',
    'Content-Type': mimeTypeForPath(target),
    'Cross-Origin-Resource-Policy': 'cross-origin'
  });

  if (requestedRange?.unsatisfiable) {
    headers.set('Content-Range', `bytes */${size}`);
    headers.set('Content-Length', '0');
    return new Response(null, { status: 416, headers });
  }

  const partial = !!requestedRange;
  const start = partial ? requestedRange.start : 0;
  const end = partial ? requestedRange.end : Math.max(0, size - 1);
  const length = size === 0 ? 0 : end - start + 1;
  headers.set('Content-Length', String(length));
  if (partial) headers.set('Content-Range', `bytes ${start}-${end}/${size}`);

  // Range metadata is important even for HEAD requests. A HEAD request must
  // never open a file stream because it has no response body.
  if (method === 'HEAD' || length === 0) {
    return new Response(null, { status: partial ? 206 : 200, headers });
  }

  const fileStream = fs.createReadStream(target, partial ? { start, end } : undefined);
  const body = typeof Readable.toWeb === 'function'
    ? Readable.toWeb(fileStream)
    : new ReadableStream({
      start(controller) {
        fileStream.on('data', chunk => controller.enqueue(new Uint8Array(chunk)));
        fileStream.once('end', () => controller.close());
        fileStream.once('error', error => controller.error(error));
      },
      cancel() { fileStream.destroy(); }
    });

  return new Response(body, { status: partial ? 206 : 200, headers });
}

module.exports = { createMediaFileResponse, mimeTypeForPath, parseByteRange };
