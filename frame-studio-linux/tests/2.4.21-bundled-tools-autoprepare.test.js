'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const main = fs.readFileSync(path.join(root, 'main.cjs'), 'utf8');
const mediaExport = fs.readFileSync(path.join(root, 'media-export.cjs'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const install = fs.readFileSync(path.join(root, 'install-linux.sh'), 'utf8');
const bootstrap = fs.readFileSync(path.join(root, 'scripts', 'prepare-bundled-tools.cjs'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '..', '.github', 'workflows', 'release.yml'), 'utf8');

assert.equal(pkg.version, '2.4.21');
assert.equal(pkg.scripts['prestart'], 'node scripts/prepare-bundled-tools.cjs --quiet --allow-missing');
for (const lifecycle of ['prebuild', 'prebuild:win', 'prebuild:win:installer', 'prebuild:win:portable', 'prebuild:linux', 'prebuild:linux:appimage']) {
  assert.match(pkg.scripts[lifecycle] || '', /prepare-bundled-tools\.cjs/, `${lifecycle} should provision the native tools`);
}
assert.match(bootstrap, /yt-dlp\/yt-dlp\/releases\/latest\/download/);
assert.match(bootstrap, /ffmpeg-release-amd64-static\.tar\.xz/);
assert.match(bootstrap, /ffmpeg-release-essentials\.zip/);
assert.match(bootstrap, /--version/);
assert.match(bootstrap, /FRAME tools/);
assert.match(main, /function bundledToolPath\(/);
assert.match(main, /process\.resourcesPath, 'downloader', filename/);
assert.match(main, /return app\.isPackaged \? null : toolFilename\(tool\)/);
assert.match(main, /packaged: app\.isPackaged/);
assert.match(main, /users should not need to install separate media tools/);
assert.match(mediaExport, /function resolveToolPath\(/);
assert.match(mediaExport, /FRAME_PACKAGED_APP === '1'/);
assert.match(mediaExport, /users should not need to install separate media tools/);
assert.match(install, /prepare-bundled-tools\.cjs/);
assert.match(install, /cp -a \"\$SRC_DIR\/vendor\/linux\/.\"/);
assert.match(html, /This official package is missing its bundled media tools/);
assert.doesNotMatch(html, /Instale com: sudo pacman -S --needed ffmpeg/);
assert.match(workflow, /Verify bundled tools are inside the Windows app resources/);
assert.match(workflow, /Verify bundled tools are inside the Linux app resources/);
console.log('FRAME Studio 2.4.21 automatic bundled media-tool preparation checks: OK');
