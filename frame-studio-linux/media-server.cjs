'use strict';

// Loopback HTTP media server (127.0.0.1, random port, per-session token).
// Chromium only treats http(s)/file/blob media as seekable. Media served through a custom scheme
// such as frame-media:// can be played from the start, but any seek makes the element fall back to
// frame 0 and stay frozen/silent. Plain HTTP with correct 206/Content-Range gives <video>/<audio>
// the same seeking behaviour as imported (blob) files.

const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { mimeTypeFor, parseByteRange } = require('./media-protocol.cjs');

function createMediaServer() {
  const token = crypto.randomBytes(24).toString('hex');
  let server = null;
  let port = 0;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Range',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
    'Cross-Origin-Resource-Policy': 'cross-origin'
  };

  function deny(res, status, text) {
    res.writeHead(status, { 'Content-Type': 'text/plain', ...corsHeaders });
    res.end(text);
  }

  async function handle(req, res) {
    // Reject DNS-rebinding style requests: only our own loopback origin is a valid Host.
    if (req.headers.host !== `127.0.0.1:${port}`) return deny(res, 403, 'Forbidden host');
    if (req.method === 'OPTIONS') { res.writeHead(204, corsHeaders); return res.end(); }
    if (req.method !== 'GET' && req.method !== 'HEAD') return deny(res, 405, 'Method not allowed');
    let url;
    try { url = new URL(req.url, `http://127.0.0.1:${port}`); } catch { return deny(res, 400, 'Bad request'); }
    const supplied = Buffer.from(url.searchParams.get('k') || '');
    const expected = Buffer.from(token);
    if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return deny(res, 403, 'Forbidden');
    const target = url.searchParams.get('p');
    if (!target || !path.isAbsolute(target)) return deny(res, 400, 'Invalid media path');

    let stat;
    try { stat = await fsp.stat(target); } catch { return deny(res, 404, 'Media file not found'); }
    if (!stat.isFile()) return deny(res, 404, 'Media path is not a file');
    const size = stat.size;
    const base = {
      'Content-Type': mimeTypeFor(target),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
      'Last-Modified': stat.mtime.toUTCString(),
      ...corsHeaders
    };
    const range = parseByteRange(req.headers.range, size);
    if (range === 'unsatisfiable') {
      res.writeHead(416, { ...base, 'Content-Range': `bytes */${size}` });
      return res.end();
    }
    const start = range ? range.start : 0;
    const end = range ? range.end : Math.max(0, size - 1);
    const length = size === 0 ? 0 : end - start + 1;
    const headers = { ...base, 'Content-Length': String(length) };
    if (range) headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
    res.writeHead(range ? 206 : 200, headers);
    if (req.method === 'HEAD' || length === 0) return res.end();
    const stream = fs.createReadStream(target, { start, end });
    // The media element cancels in-flight requests on every seek: release the file handle.
    const cleanup = () => stream.destroy();
    res.on('close', cleanup);
    req.on('aborted', cleanup);
    stream.on('error', () => { res.destroy(); });
    stream.pipe(res);
  }

  return {
    token,
    get port() { return port; },
    get origin() { return `http://127.0.0.1:${port}`; },
    start() {
      return new Promise((resolve, reject) => {
        server = http.createServer((req, res) => { handle(req, res).catch(() => { try { deny(res, 500, 'Media server error'); } catch {} }); });
        server.on('error', reject);
        server.listen(0, '127.0.0.1', () => { port = server.address().port; resolve({ origin: `http://127.0.0.1:${port}`, token, port }); });
      });
    },
    urlFor(filePath) { return `http://127.0.0.1:${port}/media?k=${token}&p=${encodeURIComponent(filePath)}`; },
    stop() { return new Promise(resolve => { if (!server) return resolve(); server.close(() => resolve()); server.closeAllConnections?.(); }); }
  };
}

module.exports = { createMediaServer };
