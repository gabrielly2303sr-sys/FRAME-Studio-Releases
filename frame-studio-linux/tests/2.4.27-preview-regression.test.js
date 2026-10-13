'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const custom = fs.readFileSync(path.join(root, 'customization.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.equal(pkg.version, '2.4.27');
for (const item of [
  'id="customAccentMode"', 'value="rgb"', 'value="background-rgb"',
  'id="customAccentSaturation"', 'id="customAccentLightness"', 'id="customAccentSpeed"', 'value="custom-gradient"', 'id="customAccentEditGradient"', 'id="accentGradientDialog"', 'id="accentGradientApply"',
  'sampleBackgroundPalette', 'generatedAccentGradient', 'accent-gradient-active',
  'id="camerapivotenabled"', 'id="camerapivotx"', 'id="camerapivoty"', 'id="camerapivotz"',
  'id="camerapivotfromselection"', 'cam.orbitPivotEnabled', 'function orbitCamera(action)', 'function updateCameraPivotOverlay()', 'id="camerapivotoverlay"', 'const forward=norm({x:pivot.x-position.x',
  'id="groupselected"', 'id="ungroupselected"', 'id="entergroup"', 'id="exitgroupview"',
  'function effectTargetsForSelection()', 'multi-effect:', 'multi-layer-resize', "const groupMove=mode==='move'&&(forceGroup||selectedIds.size>1),multiResize=", 'if(ev.ctrlKey||ev.metaKey){return}',
  'id="remappreset-freeze-split"', 'function freezeFrameSplitAtPlayhead()',
  'id="trimendjoin"', 'function trimEndAndCloseGap()', 'const audioEl=document.createElement(\'audio\')', "soundEl=(a.kind==='video'&&a.audioEl&&!a.audioElFailed)?a.audioEl:a.el"
]) assert.ok(html.includes(item) || custom.includes(item), `missing 2.4.27 feature: ${item}`);
assert.match(html, /freeze\.timeRemapDuration=1/);
assert.match(html, /right\.start=playhead\+1/);
assert.match(html, /item\.track===track&&item\.start>=next\.start/);
assert.match(custom, /accentSaturation: clamp\(input\.accentSaturation/);
assert.match(custom, /accentLightness: clamp\(input\.accentLightness/);
assert.match(custom, /hsl\(0 \$\{sat\}% \$\{light\}%\)/);
console.log('FRAME Studio 2.4.27 preview regression checks: OK');
