@echo off
title PulseFit AI Local Server
cd /d "%~dp0"
echo ========================================================
echo   Starting PulseFit AI Local Server on http://localhost:8080/
echo ========================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause
