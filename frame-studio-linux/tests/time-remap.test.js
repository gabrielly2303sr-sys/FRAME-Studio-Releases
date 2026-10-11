'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const renderer = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0]?.[1] || '';
const lines = renderer.split('\n');
const helperNames = ['timeRemapPoints','remapProgress','sourceTimeAt','sourceRateAt'];
const source = helperNames.map(name => { const line = lines.find(item => item.startsWith(`function ${name}(`)); assert.ok(line, `${name} helper exists`); return line; }).join('\n');
const context = vm.createContext({
  Number, Math, Array, Map, Object,
  projectFPS: 30,
  clamp: (n,a,b) => Math.max(a, Math.min(b, n)),
  duration: c => Number(c.timeRemapDuration) > 0 ? Number(c.timeRemapDuration) : Math.max(0,(c.outPoint-c.inPoint)/Math.max(.1,Number(c.speed)||1)),
  remapLinearEase: {x1:0,y1:0,x2:1,y2:1},
  bezierEase: value => value
});
vm.runInContext(source, context);
const reverse = {id:'reverse',start:0,inPoint:2,outPoint:6,speed:1,timeRemap:[{time:0,value:1,mode:'linear'},{time:1,value:0,mode:'linear'}]};
context.clip = reverse;
assert.equal(vm.runInContext('sourceTimeAt(clip,0)',context),6,'reverse begins at the trimmed source end');
assert.equal(vm.runInContext('sourceTimeAt(clip,4)',context),2,'reverse ends at the trimmed source start');
assert.ok(vm.runInContext('sourceRateAt(clip,2)',context)<0,'reverse keyframes create a negative source rate');
const frozen = {id:'freeze',start:0,inPoint:0,outPoint:10,speed:1,timeRemapDuration:10,timeRemap:[{time:.2,value:.5,mode:'hold'},{time:.6,value:.5,mode:'smooth'}]};
context.clip=frozen;
assert.ok(Math.abs(vm.runInContext('sourceTimeAt(clip,5)',context)-5)<1e-6,'hold segments keep the source frame fixed');
assert.equal(vm.runInContext('sourceRateAt(clip,5)',context),0,'hold segments produce zero source rate');
const linear = {id:'linear',start:0,inPoint:3,outPoint:7,speed:1,timeRemap:[]};
context.clip=linear;
assert.equal(vm.runInContext('sourceTimeAt(clip,2)',context),5,'normal playback remains linear and source-time accurate');
console.log('FRAME Studio 2.4.12 Time Remapping tests: OK');
