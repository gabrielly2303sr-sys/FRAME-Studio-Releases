'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const custom = fs.readFileSync(path.join(root, 'customization.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.equal(pkg.version, '2.4.32');
for (const item of [
  'id="customAccentMode"', 'value="rgb"', 'value="background-rgb"',
  'id="customAccentSaturation"', 'id="customAccentLightness"', 'id="customAccentSpeed"',
  'sampleBackgroundPalette', 'generatedAccentGradient', 'accent-gradient-active',
  'id="camerapivotenabled"', 'id="camerapivotx"', 'id="camerapivoty"', 'id="camerapivotz"',
  'id="camerapivotfromselection"', 'cam.orbitPivotEnabled', 'function orbitCamera(action)',
  'id="groupselected"', 'id="ungroupselected"', 'id="entergroup"', 'id="exitgroupview"',
  'function effectTargetsForSelection()', 'multi-effect:', 'multi-layer-resize',
  'id="remappreset-freeze-split"', 'function freezeFrameSplitAtPlayhead()',
  'id="trimendjoin"', 'function trimEndAndCloseGap()'
]) assert.ok(html.includes(item) || custom.includes(item), `missing 2.4.31 feature: ${item}`);
assert.match(html, /freeze\.timeRemapDuration=1/);
assert.match(html, /right\.start=playhead\+1/);
assert.match(html, /item\.track===track&&item\.start>=next\.start/);
assert.match(custom, /accentSaturation: clamp\(input\.accentSaturation/);
assert.match(custom, /accentLightness: clamp\(input\.accentLightness/);
assert.match(custom, /hsl\(0 \$\{sat\}% \$\{light\}%\)/);
console.log('FRAME Studio 2.4.31 feature enhancement checks: OK');
