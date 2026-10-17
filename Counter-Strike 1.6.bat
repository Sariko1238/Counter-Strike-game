@echo off
title Counter-Strike 1.6 - 3D Web Edition
cd /d "%~dp0"
echo ==========================================================
echo    * LAUNCHING COUNTER-STRIKE 1.6 3D (DESKTOP APP) *
echo ==========================================================

if exist "node_modules\electron" (
    echo Starting native Electron App...
    npx electron .
    exit /b
)

echo Starting local game server on port 8080...
start /b "" python -m http.server 8080 >nul 2>&1
timeout /t 1 >nul

where chrome >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    start "" chrome --app="http://localhost:8080" --window-size=1280,800
    exit /b
)

where msedge >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    start "" msedge --app="http://localhost:8080" --window-size=1280,800
    exit /b
)

start http://localhost:8080
exit /b
