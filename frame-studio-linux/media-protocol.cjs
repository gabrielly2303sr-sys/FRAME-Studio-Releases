'use strict';

// Range-aware file serving for the frame-media:// protocol.
// <video> seeking needs correct 206/Content-Range/Accept-Ranges/Content-Length/Content-Type
// responses; relying on net.fetch(file://) to forward Range headers is not reliable and left
// downloaded videos (served through frame-media://) with a frozen frame while scrubbing.

const fsp = require('node:fs/promises');
const path = require('node:path');
const { ReadableStream } = require('node:stream/web');

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

// A Web ReadableStream backed by a file handle. Using Web Streams directly is
// important here: Electron's media decoder issues many byte-range requests while
// seeking. The Node-to-Web stream adapter worked for sequential playback but was
// unreliable for repeated media seeks in the packaged custom protocol.
async function createFileBody(filePath, start, length) {
  const handle = await fsp.open(filePath, 'r');
  let position = start;
  let remaining = length;
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    await handle.close().catch(() => {});
  };
  return new ReadableStream({
    async pull(controller) {
      if (closed) return;
      if (remaining <= 0) {
        controller.close();
        await close();
        return;
      }
      const buffer = Buffer.allocUnsafe(Math.min(256 * 1024, remaining));
      try {
        const { bytesRead } = await handle.read(buffer, 0, buffer.length, position);
        if (!bytesRead) {
          controller.close();
          await close();
          return;
        }
        position += bytesRead;
        remaining -= bytesRead;
        controller.enqueue(new Uint8Array(buffer.buffer, buffer.byteOffset, bytesRead));
        if (remaining <= 0) {
          controller.close();
          await close();
        }
      } catch (error) {
        await close();
        controller.error(error);
      }
    },
    async cancel() { await close(); }
  }, { highWaterMark: 1 });
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
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Content-Type',
    'Access-Control-Expose-Headers': 'Accept-Ranges, Content-Range, Content-Length',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'Cache-Control': 'no-cache',
    'Last-Modified': stat.mtime.toUTCString()
  };
  if (method === 'OPTIONS') return new Response(null, { status: 204, headers: baseHeaders });
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
  try {
    return new Response(await createFileBody(filePath, start, length), { status, headers });
  } catch (error) {
    return new Response(`Could not stream media: ${error.message || error}`, { status: 500, headers: baseHeaders });
  }
}

module.exports = { MIME_TYPES, mimeTypeFor, parseByteRange, serveMediaFile };
