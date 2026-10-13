'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const main = fs.readFileSync(path.join(root, 'main.cjs'), 'utf8');
const preload = fs.readFileSync(path.join(root, 'preload.cjs'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

function grab(name) {
  const start = html.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} located in index.html`);
  const next = html.indexOf('\nfunction ', start + 1);
  return html.slice(start, next < 0 ? html.length : next);
}

assert.equal(pkg.version, '2.4.28', 'package and release tag must stay aligned');
const removeAsset = grab('removeAssetFromProject');
assert.match(removeAsset, /clips=clips\.filter\(clip=>clip\.assetId!==id\)/, 'removing a project asset also removes clips linked to it');
assert.match(removeAsset, /assets=assets\.filter\(item=>item\.id!==id\)/, 'the asset is removed from the current project bin');
assert.match(removeAsset, /URL\.revokeObjectURL\(asset\.url\)/, 'temporary object URLs are released');
assert.match(removeAsset, /original file on disk will not be deleted/i, 'the original media file is preserved');
assert.match(removeAsset, /queueAutosave\(\)/, 'asset removal is persisted to project autosave');
assert.match(html, /function updateLibrary\(\)[\s\S]*?removeAssetFromProject\(a\.id\)/, 'each media card exposes a remove-from-project action');
assert.match(html, /className='asset-remove'/, 'the remove action has a dedicated accessible control');
assert.match(main, /function downloadedMediaRoot\(/, 'Downloaded Media remains separate from project-bin removal');
assert.match(preload, /resolveDownloadedMedia:/, 'Downloaded Media importing remains connected');
console.log('FRAME Studio 2.4.23 seeking and project-media deletion regression tests: OK');
