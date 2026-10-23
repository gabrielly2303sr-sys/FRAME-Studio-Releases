'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const renderer = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0]?.[1] || '';
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.equal(pkg.version, '2.4.39');
for (const id of ['groupclips','groupmask','ungroupclips','selectgroup','togglegroup','grouptransform','groupmasktoggle']) {
  assert.doesNotMatch(html, new RegExp(`id=["']${id}["']`), `grouping UI control ${id} should be removed`);
}
assert.match(html, /id=\"groupselected\"/, 'new group action is exposed on the timeline');
assert.match(html, /id=\"ungroupselected\"/, 'ungroup action is exposed on the timeline');
assert.match(renderer, /function groupSelectedClips\(/, 'current layer grouping is available');
assert.match(renderer, /function stripLegacyGroupMetadata\(/, 'legacy grouping migration exists');
assert.match(renderer, /legacyGroupTransforms/, 'legacy group transforms can be retained on individual clips');
function functionSource(name) {
  const start = renderer.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `function ${name} exists`);
  const brace = renderer.indexOf('{', start);
  let depth = 0, quote = null, escaped = false;
  for (let i = brace; i < renderer.length; i++) {
    const ch = renderer[i];
    if (quote) { if (escaped) escaped = false; else if (ch === '\\') escaped = true; else if (ch === quote) quote = null; }
    else { if (ch === '"' || ch === "'" || ch === '`') quote = ch; else if (ch === '{') depth++; else if (ch === '}' && --depth === 0) return renderer.slice(start, i + 1); }
  }
  throw new Error(`could not extract ${name}`);
}
const migration = vm.runInNewContext(`(${functionSource('stripLegacyGroupMetadata')})`);
const data = {version:8,format:'frameproj',groups:[{id:'g1',name:'Old group',parentId:null,transform:{x:50,y:20,scaleX:125,scaleY:90,rotation:5,opacity:80},maskMode:'alpha'}],clips:[{id:'a',groupId:'g1',groupName:'Old group',groupParentId:null},{id:'b'}],selectedGroupId:'g1',activeGroupViewId:'g1',collapsedGroups:['g1']};
migration(data);
assert.equal(data.groups.length, 0);
assert.equal(data.layerGroups.length, 0);
assert.equal(data.selectedGroupId, null);
assert.equal(data.activeGroupViewId, null);
assert.equal(data.clips[0].groupId, undefined);
assert.equal(data.clips[0].groupName, undefined);
assert.equal(data.clips[0].legacyGroupTransforms[0].x, 50);
assert.equal(data.clips[0].legacyGroupTransforms[0].opacity, 80);

// Native v9 layer groups must survive even if the optional maskClipId field is absent.
const currentData = {version:9,format:'frameproj',groups:[{id:'new-g',name:'New group',parentId:null,maskMode:'none',transform:{x:0,y:0,scaleX:100,scaleY:100,rotation:0,opacity:100}}],clips:[{id:'a',groupId:'new-g',groupName:'New group',groupParentId:null},{id:'b',groupId:'new-g',groupName:'New group',groupParentId:null}],selectedGroupId:'new-g',activeGroupViewId:'new-g',collapsedGroups:['new-g']};
migration(currentData);
assert.equal(currentData.groups.length, 1, 'current layer groups survive compatibility migration');
assert.equal(currentData.clips[0].groupId, 'new-g', 'current clip membership is retained');
assert.equal(currentData.selectedGroupId, 'new-g');
assert.equal(currentData.activeGroupViewId, 'new-g');
assert.deepEqual(currentData.collapsedGroups, ['new-g']);
console.log('FRAME Studio 2.4.38 group persistence regression tests: OK');
