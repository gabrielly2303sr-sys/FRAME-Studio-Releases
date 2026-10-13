(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FrameGifDecoder = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  function decode(buffer, options = {}) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (bytes.length < 13 || String.fromCharCode(...bytes.subarray(0, 3)) !== 'GIF') throw new Error('Not a GIF file');
    const maxPixels = Math.max(1, Number(options.maxPixels) || 16000000);
    const maxFrames = Math.max(1, Number(options.maxFrames) || 2000);
    let pos = 6;
    const u16 = () => { if (pos + 1 >= bytes.length) throw new Error('Unexpected end of GIF'); const n = bytes[pos] | (bytes[pos + 1] << 8); pos += 2; return n; };
    const width = u16(), height = u16(), packed = bytes[pos++], backgroundIndex = bytes[pos++]; pos++; // pixel aspect ratio
    if (!width || !height || width * height > maxPixels) throw new Error('GIF dimensions exceed safe decode limits');
    const readPalette = count => { if (pos + count * 3 > bytes.length) throw new Error('Truncated GIF color table'); const table = new Uint8Array(count * 3); table.set(bytes.subarray(pos, pos + count * 3)); pos += count * 3; return table; };
    const globalPalette = packed & 0x80 ? readPalette(1 << ((packed & 7) + 1)) : null;
    const readSubBlocks = () => { const parts = []; let total = 0; for (;;) { if (pos >= bytes.length) throw new Error('Truncated GIF data blocks'); const n = bytes[pos++]; if (!n) break; if (pos + n > bytes.length) throw new Error('Truncated GIF data block'); parts.push(bytes.subarray(pos, pos + n)); total += n; pos += n; if (total > 128 * 1024 * 1024) throw new Error('GIF frame data exceeds safe decode limits'); } const result = new Uint8Array(total); let at = 0; for (const part of parts) { result.set(part, at); at += part.length; } return result; };
    const readCodeStream = (data, minSize, wanted) => {
      if (minSize < 2 || minSize > 8) throw new Error('Unsupported GIF LZW code size');
      const prefix = new Int16Array(4096), suffix = new Uint8Array(4096), stack = new Uint8Array(4097), out = new Uint8Array(wanted);
      const clear = 1 << minSize, end = clear + 1; let codeSize = minSize + 1, available = clear + 2, old = -1, first = 0, outPos = 0, bit = 0, datum = 0, bits = 0;
      for (let i = 0; i < clear; i++) suffix[i] = i;
      const readCode = () => { while (bits < codeSize) { if (bit >= data.length) return end; datum |= data[bit++] << bits; bits += 8; } const code = datum & ((1 << codeSize) - 1); datum >>>= codeSize; bits -= codeSize; return code; };
      let guard = 0;
      while (outPos < wanted && guard++ < wanted * 3 + 10000) {
        let code = readCode(); if (code === clear) { codeSize = minSize + 1; available = clear + 2; old = -1; continue; } if (code === end) break;
        if (code > available || code >= 4096) throw new Error('Invalid GIF LZW stream');
        const incoming = code; let stackPos = 0;
        if (code === available) { if (old < 0) throw new Error('Invalid GIF LZW dictionary'); stack[stackPos++] = first; code = old; }
        while (code >= clear) { if (code >= available || stackPos >= 4096) throw new Error('Invalid GIF LZW chain'); stack[stackPos++] = suffix[code]; code = prefix[code]; }
        first = suffix[code]; stack[stackPos++] = first;
        while (stackPos && outPos < wanted) out[outPos++] = stack[--stackPos];
        if (old >= 0 && available < 4096) { prefix[available] = old; suffix[available] = first; available++; if (available === (1 << codeSize) && codeSize < 12) codeSize++; }
        old = incoming;
      }
      if (outPos < wanted) { const filled = new Uint8Array(wanted); filled.set(out.subarray(0, outPos)); return filled; }
      return out;
    };
    const rgba = new Uint8ClampedArray(width * height * 4), frames = [];
    let gce = { delay: 100, disposal: 0, transparentIndex: -1 }, previous = null, totalDuration = 0, loopCount = 1;
    const fillRect = (rect, color) => { const left = Math.max(0, rect.left), top = Math.max(0, rect.top), right = Math.min(width, rect.left + rect.width), bottom = Math.min(height, rect.top + rect.height); for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) { const i = (y * width + x) * 4; rgba[i] = color ? color[0] : 0; rgba[i + 1] = color ? color[1] : 0; rgba[i + 2] = color ? color[2] : 0; rgba[i + 3] = color ? 255 : 0; } };
    while (pos < bytes.length && frames.length < maxFrames) {
      const marker = bytes[pos++];
      if (marker === 0x3b) break;
      if (marker === 0x21) {
        if (pos >= bytes.length) break;
        const label = bytes[pos++];
        if (label === 0xf9) { const size = bytes[pos++]; if (size !== 4 || pos + 4 >= bytes.length) throw new Error('Invalid GIF graphic control extension'); const flags = bytes[pos++], delay = bytes[pos++] | (bytes[pos++] << 8), transparent = bytes[pos++]; if (bytes[pos++] !== 0) throw new Error('Invalid GIF extension terminator'); gce = { delay: Math.max(20, delay * 10 || 100), disposal: (flags >> 2) & 7, transparentIndex: (flags & 1) ? transparent : -1 }; }
        else { const blocks = readSubBlocks(); if (label === 0xff && blocks.length >= 14 && String.fromCharCode(...blocks.subarray(0, 11)).startsWith('NETSCAPE2.0') && blocks[11] === 1) loopCount = blocks[12] | (blocks[13] << 8); }
        continue;
      }
      if (marker !== 0x2c) throw new Error('Unknown GIF block marker');
      const left = u16(), top = u16(), fw = u16(), fh = u16(), ip = bytes[pos++]; if (!fw || !fh || fw * fh > maxPixels) throw new Error('Invalid GIF frame dimensions');
      const palette = ip & 0x80 ? readPalette(1 << ((ip & 7) + 1)) : globalPalette; if (!palette) throw new Error('GIF frame has no color table');
      const minSize = bytes[pos++], compressed = readSubBlocks(), indices = readCodeStream(compressed, minSize, fw * fh);
      if (previous) { if (previous.disposal === 2) { const bg = previous.transparentIndex >= 0 ? null : (globalPalette && backgroundIndex * 3 + 2 < globalPalette.length ? globalPalette.subarray(backgroundIndex * 3, backgroundIndex * 3 + 3) : null); fillRect(previous.rect, bg); } else if (previous.disposal === 3 && previous.restore) rgba.set(previous.restore); }
      const restore = gce.disposal === 3 ? new Uint8ClampedArray(rgba) : null;
      let sourceY = 0; const rowOrder = [];
      if (ip & 0x40) { for (const [start, step] of [[0, 8], [4, 8], [2, 4], [1, 2]]) for (let y = start; y < fh; y += step) rowOrder.push(y); } else for (let y = 0; y < fh; y++) rowOrder.push(y);
      for (const y of rowOrder) { for (let x = 0; x < fw; x++) { const colorIndex = indices[sourceY++]; if (colorIndex === gce.transparentIndex) continue; const pi = colorIndex * 3; if (pi + 2 >= palette.length) continue; const dx = left + x, dy = top + y; if (dx < 0 || dy < 0 || dx >= width || dy >= height) continue; const di = (dy * width + dx) * 4; rgba[di] = palette[pi]; rgba[di + 1] = palette[pi + 1]; rgba[di + 2] = palette[pi + 2]; rgba[di + 3] = 255; } }
      const delay = Math.max(20, Number(gce.delay) || 100); if ((frames.length + 1) * width * height > 40000000) throw new Error('GIF animation is too large to decode safely (over 40 million stored pixels)'); frames.push({ data: new Uint8ClampedArray(rgba), delay }); totalDuration += delay;
      previous = { disposal: gce.disposal, transparentIndex: gce.transparentIndex, rect: { left, top, width: fw, height: fh }, restore };
      gce = { delay: 100, disposal: 0, transparentIndex: -1 };
    }
    if (!frames.length) throw new Error('GIF contains no frames');
    return { width, height, frames, duration: totalDuration, loopCount };
  }
  return { decode };
});
