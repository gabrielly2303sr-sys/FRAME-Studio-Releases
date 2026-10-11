@echo off
setlocal
cd /d "%~dp0"
echo FRAME Studio 2.4.12 - Windows auto-update build
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install Node.js 20 or newer, then run this file again.
  pause
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Reinstall Node.js with npm enabled.
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-windows.ps1"
if errorlevel 1 (
  echo Windows build failed. Review the errors above.
  pause
  exit /b 1
)
echo Build complete.
echo NSIS Setup EXE = automatic updates.
echo Portable EXE = manual updates only.
echo Open the dist folder for both builds and latest.yml metadata.
pause
