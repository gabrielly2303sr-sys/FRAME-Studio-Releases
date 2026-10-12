'use strict';

// Release smoke test: runs the REAL yt-dlp, FFmpeg and ffprobe found in a directory
// using the shared per-tool version arguments. Exits nonzero if any tool is missing or
// its version command does not exit with status 0. No placeholders, no PATH fallback.
//
// Usage:
//   node scripts/verify-bundled-tools.cjs <directory-containing-the-tools> [--platform win32|linux]
// Examples:
//   node scripts/verify-bundled-tools.cjs dist/linux-unpacked/resources/downloader
//   node scripts/verify-bundled-tools.cjs squashfs-root/resources/downloader
//   node scripts/verify-bundled-tools.cjs dist/win-unpacked/resources/downloader

const fs = require('node:fs');
const path = require('node:path');
const { TOOL_NAMES, toolFilename, checkToolVersion } = require('../media-tools.cjs');

async function verifyDirectory(directory, platform = process.platform) {
  const results = [];
  for (const tool of TOOL_NAMES) {
    const command = path.join(directory, toolFilename(tool, platform));
    let exists = false;
    try { exists = fs.statSync(command).isFile(); } catch {}
    if (!exists) {
      results.push({ tool, command, args: [], available: false, kind: 'missing-file', reason: 'file not found in package', version: '', stdout: '', stderr: '' });
      continue;
    }
    results.push(await checkToolVersion(tool, command, { fileExists: () => true, timeoutMs: 20000 }));
  }
  return results;
}

async function main() {
  const argv = process.argv.slice(2);
  const platformIndex = argv.indexOf('--platform');
  const platform = platformIndex >= 0 ? argv.splice(platformIndex, 2)[1] : process.platform;
  const directory = argv[0];
  if (!directory) {
    process.stderr.write('Usage: node scripts/verify-bundled-tools.cjs <tools-directory> [--platform win32|linux]\n');
    process.exit(2);
  }
  const results = await verifyDirectory(path.resolve(directory), platform);
  let failed = false;
  for (const r of results) {
    const line = `${r.tool}: ${r.command} ${r.args.join(' ')}`.trim();
    if (r.available) {
      process.stdout.write(`OK   ${line}\n     ${r.version}\n`);
    } else {
      failed = true;
      process.stderr.write(`FAIL ${line}\n     [${r.kind}] ${r.reason}\n`);
      if (r.stderr) process.stderr.write(`     stderr: ${r.stderr.split(/\r?\n/).slice(0, 5).join(' | ')}\n`);
    }
  }
  if (failed) {
    process.stderr.write('Bundled media tool verification FAILED. Do not publish this package.\n');
    process.exit(1);
  }
  process.stdout.write('All bundled media tools verified.\n');
}

if (require.main === module) main().catch(error => { process.stderr.write(`${error?.stack || error}\n`); process.exit(1); });

module.exports = { verifyDirectory };
