'use strict';
// 2.4.25: seekable loopback HTTP media + extracted audio is removed from the source video clip.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { createMediaServer } = require('../media-server.cjs');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const preload = fs.readFileSync(path.join(root, 'preload.cjs'), 'utf8');
const main = fs.readFileSync(path.join(root, 'main.cjs'), 'utf8');

function request(url, { method = 'GET', headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method, headers }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frame-http-'));
  const server = createMediaServer();
  try {
    await server.start();
    const file = path.join(dir, 'downloaded clip.mp4');
    const data = Buffer.from(Array.from({ length: 5000 }, (_, i) => i % 251));
    fs.writeFileSync(file, data);
    const url = server.urlFor(file);
    assert.ok(url.startsWith('http://127.0.0.1:'));

    const full = await request(url);
    assert.equal(full.status, 200);
    assert.equal(full.headers['accept-ranges'], 'bytes');
    assert.equal(full.headers['content-type'], 'video/mp4');
    assert.equal(full.headers['content-length'], '5000');
    assert.ok(full.body.equals(data));

    // A seek is a Range request far from the start.
    const seek = await request(url, { headers: { Range: 'bytes=3000-3999' } });
    assert.equal(seek.status, 206);
    assert.equal(seek.headers['content-range'], 'bytes 3000-3999/5000');
    assert.ok(seek.body.equals(data.subarray(3000, 4000)));

    const open = await request(url, { headers: { Range: 'bytes=4500-' } });
    assert.equal(open.status, 206);
    assert.equal(open.headers['content-range'], 'bytes 4500-4999/5000');

    assert.equal((await request(url, { headers: { Range: 'bytes=9000-' } })).status, 416);
    assert.equal((await request(url, { method: 'HEAD' })).status, 200);
    assert.equal(full.headers['access-control-allow-origin'], '*');

    // Wrong token, wrong host and relative paths are rejected.
    assert.equal((await request(url.replace(server.token, 'x'.repeat(server.token.length)))).status, 403);
    assert.equal((await request(url, { headers: { Host: 'evil.example' } })).status, 403);
    assert.equal((await request(`${server.origin}/media?k=${server.token}&p=${encodeURIComponent('relative.mp4')}`)).status, 400);
    assert.equal((await request(`${server.origin}/media?k=${server.token}&p=${encodeURIComponent(path.join(dir, 'missing.mp4'))}`)).status, 404);
  } finally {
    await server.stop();
    fs.rmSync(dir, { recursive: true, force: true });
  }

  // Wiring.
  assert.match(main, /mediaServer\.start\(\)/);
  assert.match(main, /frame:media-server-info/);
  assert.match(preload, /frame:media-server-info/);
  assert.match(preload, /127\.0\.0\.1|mediaServerInfo\.origin/);
  assert.match(html, /media-src[^"]*http:\/\/127\.0\.0\.1:\*/);
  assert.match(html, /connect-src[^"]*http:\/\/127\.0\.0\.1:\*/);
  assert.match(html, /img-src[^"]*http:\/\/127\.0\.0\.1:\*/);

  // Extracted audio is detached from the source video clip (preview, export, waveform, re-extraction).
  assert.match(html, /c\.audioDetached=true/);
  assert.match(html, /el\.muted=detached/);
  assert.match(html, /clip\.kind==='video'&&clip\.audioDetached===true\)continue/);
  assert.match(html, /c\.audioDetached!==true/);
  assert.match(html, /c\.audioDetached===true\)return message/);

  console.log('2.4.25 seek over HTTP + detached extracted audio: OK');
})().catch(error => { console.error(error); process.exit(1); });
