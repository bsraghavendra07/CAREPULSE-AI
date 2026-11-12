@echo off
title CarePulse AI Launcher
echo ========================================================
echo   Launching CarePulse AI Post-Discharge Deterioration Monitor
echo ========================================================

start "CarePulse Backend" "%~dp0backend\start_backend.bat"
start "CarePulse Frontend" "%~dp0frontend\start_frontend.bat"

echo Waiting 3 seconds for servers to start...
powershell -Command "Start-Sleep -Seconds 3"

echo Opening browser at http://localhost:5173 ...
start http://localhost:5173
echo.
echo Both servers are running in their own terminal windows!
