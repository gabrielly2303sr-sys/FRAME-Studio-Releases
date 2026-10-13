'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createMediaFileResponse, mimeTypeForPath, parseByteRange } = require('../media-range.cjs');

function fakeRequest(range, method = 'GET') {
  return { method, headers: { get: key => key.toLowerCase() === 'range' ? range : null } };
}

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frame-media-range-'));
  try {
    const videoPath = path.join(dir, 'downloaded-video.mp4');
    const audioPath = path.join(dir, 'downloaded-audio.mp3');
    fs.writeFileSync(videoPath, '0123456789');
    fs.writeFileSync(audioPath, 'abcdefghij');

    assert.deepEqual(parseByteRange('bytes=2-5', 10), { start: 2, end: 5 });
    assert.deepEqual(parseByteRange('bytes=-3', 10), { start: 7, end: 9 });
    assert.deepEqual(parseByteRange('bytes=4-', 10), { start: 4, end: 9 });
    assert.deepEqual(parseByteRange('bytes=12-', 10), { unsatisfiable: true });
    assert.equal(mimeTypeForPath(audioPath), 'audio/mpeg');
    assert.equal(mimeTypeForPath(videoPath), 'video/mp4');

    const full = createMediaFileResponse(videoPath, fakeRequest(null));
    assert.equal(full.status, 200);
    assert.equal(full.headers.get('accept-ranges'), 'bytes');
    assert.equal(full.headers.get('content-length'), '10');
    assert.equal(await full.text(), '0123456789');

    const partial = createMediaFileResponse(videoPath, fakeRequest('bytes=3-6'));
    assert.equal(partial.status, 206, 'range requests must use HTTP partial-content status');
    assert.equal(partial.headers.get('content-range'), 'bytes 3-6/10');
    assert.equal(partial.headers.get('content-length'), '4');
    assert.equal(await partial.text(), '3456', 'video seek must read only the requested byte window');

    const suffix = createMediaFileResponse(audioPath, fakeRequest('bytes=-3'));
    assert.equal(suffix.status, 206);
    assert.equal(suffix.headers.get('content-range'), 'bytes 7-9/10');
    assert.equal(await suffix.text(), 'hij', 'downloaded MP3 suffix seek must read the requested tail');

    const openEnded = createMediaFileResponse(videoPath, fakeRequest('bytes=7-'));
    assert.equal(await openEnded.text(), '789');

    const invalid = createMediaFileResponse(videoPath, fakeRequest('bytes=99-'));
    assert.equal(invalid.status, 416);
    assert.equal(invalid.headers.get('content-range'), 'bytes */10');
    assert.equal(await invalid.text(), '');

    const head = createMediaFileResponse(videoPath, fakeRequest('bytes=1-3', 'HEAD'));
    assert.equal(head.status, 206);
    assert.equal(head.headers.get('content-length'), '3');
    assert.equal(await head.text(), '');

    const main = fs.readFileSync(path.join(__dirname, '..', 'main.cjs'), 'utf8');
    assert.match(main, /createMediaFileResponse\(target, request\)/, 'custom media protocol must route through the range-aware responder');
    console.log('FRAME Studio byte-range media seek tests: OK');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
