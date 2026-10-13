$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$node = Get-Command node -ErrorAction SilentlyContinue
$npm = Get-Command npm -ErrorAction SilentlyContinue
if (-not $node -or -not $npm) { throw 'Node.js 20+ and npm are required. Install Node.js from https://nodejs.org/ and run BUILD-WINDOWS.bat again.' }
Write-Host "Node: $(& node --version)"
Write-Host 'Installing Electron and Electron Builder dependencies (internet access required)...'
& npm install --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw "npm install failed with exit code $LASTEXITCODE" }
Write-Host 'Building NSIS installer (automatic updates) and portable executable (manual updates)...'
& npm run build:win
if ($LASTEXITCODE -ne 0) { throw "Electron Builder failed with exit code $LASTEXITCODE" }
Write-Host 'Build complete. Check dist for the NSIS Setup EXE, portable EXE, latest.yml, and .blockmap.'
