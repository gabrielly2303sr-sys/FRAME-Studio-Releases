'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const custom = fs.readFileSync(path.join(root, 'customization.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.equal(pkg.version, '2.4.30');
for (const item of [
  'id="customAccentMode"', 'value="gradient"', 'value="rgb"', 'value="background-rgb"', 'id="customAccentGradientControls"', 'id="customAccentGradient1"', 'id="customAccentGradient2"', 'id="customAccentGradient3"', 'id="customAccentGradientAngle"',
  'id="customAccentSaturation"', 'id="customAccentLightness"', 'id="customAccentSpeed"',
  'sampleBackgroundPalette', 'generatedAccentGradient', 'accent-gradient-active',
  'id="camerapivotenabled"', 'id="camerapivotx"', 'id="camerapivoty"', 'id="camerapivotz"',
  'id="camerapivotfromselection"', 'cam.orbitPivotEnabled', 'function orbitCamera(action)',
  'id="groupselected"', 'id="ungroupselected"', 'id="entergroup"', 'id="exitgroupview"',
  'function effectTargetsForSelection()', 'multi-effect:', 'multi-layer-resize', 'groupResize', 'multiSelectBound', 'scene-pivot-marker', 'activeClipForAsset', 'Visual overlays (including photos) never suppress a still-active video\'s audio', 'syncBackgroundSampler', 'normalizeAccentGradient', 'accentGradientCss',
  'id="remappreset-freeze-split"', 'function freezeFrameSplitAtPlayhead()',
  'id="trimendjoin"', 'function trimEndAndCloseGap()'
]) assert.ok(html.includes(item) || custom.includes(item), `missing carried-forward feature: ${item}`);
assert.match(html, /freeze\.timeRemapDuration=1/);
assert.match(html, /right\.start=playhead\+1/);
assert.match(html, /item\.track===track&&item\.start>=next\.start/);
assert.match(custom, /accentSaturation: clamp\(input\.accentSaturation/);
assert.match(custom, /accentLightness: clamp\(input\.accentLightness/);
assert.match(custom, /accentGradient: normalizeAccentGradient/);
assert.match(custom, /accent-gradient-static/);
assert.match(html, /const dx=nx-pivot\.x,dy=ny-pivot\.y,dz=nz-pivot\.z/);
assert.match(custom, /hsl\(0 \$\{sat\}% \$\{light\}%\)/);
assert.match(html, /result\.hardwareAcceleration\?'GPU':'CPU'/, 'export status must disclose whether hardware encoding succeeded');
assert.match(html, /function scheduleScrubPreviewDraw\(\)\{if\(scrubPreviewFrameRequest\)return;.*syncMedia\(true\);drawPreview\(\)/, 'playhead scrubbing should coalesce sync/render work to one animation frame');
assert.match(html, /function stripLegacyGroupMetadata\(data\).*data\.groups=\[\.\.\.byId\.values\(\)\]/, 'project loading must preserve and reconstruct groups instead of deleting them');
console.log('FRAME Studio 2.4.30 carried-forward feature checks: OK');
