'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const renderer = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0]?.[1] || '';
const main = fs.readFileSync(path.join(root, 'main.cjs'), 'utf8');
const preload = fs.readFileSync(path.join(root, 'preload.cjs'), 'utf8');
new vm.Script(renderer, { filename: 'renderer-inline.js' });

const helpersStart = renderer.indexOf('function marqueeRectIntersects(');
const helpersEnd = renderer.indexOf('function syncTimelineSelectionClasses(', helpersStart);
assert.ok(helpersStart >= 0 && helpersEnd > helpersStart, 'marquee selection helpers exist');
const context = vm.createContext({ Set });
vm.runInContext(renderer.slice(helpersStart, helpersEnd), context);
assert.equal(vm.runInContext('marqueeRectIntersects({left:0,top:0,right:10,bottom:10},{left:9,top:9,right:12,bottom:12})', context), true);
assert.equal(vm.runInContext('marqueeRectIntersects({left:0,top:0,right:10,bottom:10},{left:11,top:11,right:12,bottom:12})', context), false);
assert.deepEqual([...vm.runInContext("mergeMarqueeSelection(new Set(['a']),new Set(['b','c']),'replace')", context)], ['b', 'c']);
assert.deepEqual([...vm.runInContext("mergeMarqueeSelection(new Set(['a']),new Set(['b']),'add')", context)], ['a', 'b']);
assert.deepEqual([...vm.runInContext("mergeMarqueeSelection(new Set(['a','b']),new Set(['b']),'subtract')", context)], ['a']);

assert.match(renderer, /function beginTimelineBlankGesture\(ev\)/, 'blank timeline drag starts a marquee gesture');
assert.match(renderer, /timeline-marquee-box/, 'marquee rectangle has a visible element');
assert.match(renderer, /window\.addEventListener\('pointercancel',onCancel,true\)/, 'marquee cancels on pointer cancellation');
assert.match(renderer, /window\.addEventListener\('blur',onBlur,true\)/, 'marquee cancels when the window loses focus');
assert.match(renderer, /window\.addEventListener\('keydown',onKey,true\)/, 'Escape cancels the marquee');
assert.match(renderer, /selectClip\(c\.id,null,\{preserveDOM:true\}\)/, 'starting a clip drag preserves the pointer target DOM node');
assert.match(renderer, /options\?\.preserveDOM\)syncTimelineSelectionClasses\(\);else updateTimeline\(\)/, 'selection can update without rebuilding the timeline');
assert.match(renderer, /await window\.frameAPI\.revealPath\(result\.filePath\)/, 'successful MP4 export reveals the file in the system file manager');
assert.match(preload, /revealPath: \(target\) => ipcRenderer\.invoke\('frame:reveal-path', target\)/, 'preload exposes the safe reveal operation');
assert.match(main, /ipcMain\.handle\('frame:reveal-path'/, 'main process handles reveal requests');
assert.match(main, /shell\.showItemInFolder\(target\)/, 'Electron reveals the exported file in its containing folder');
assert.match(main, /FRAME_STUDIO_TEST_PREVIEW === '1'/, 'test launch can use an isolated profile even when packaged');
assert.match(main, /FRAME_STUDIO_DISABLE_UPDATES === '1'/, 'test launch can disable automatic updates');
assert.equal((renderer.match(/#trackzone'\)\.addEventListener\('pointerdown'/g) || []).length, 1, 'only one empty-track pointerdown handler remains');
console.log('FRAME Studio marquee selection and export reveal tests: OK');
