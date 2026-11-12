@echo off
title MINEARENA 1.0 Launcher
echo ========================================================
echo   Launching MINEARENA 1.0 Deterioration Monitor
echo ========================================================

start "MINEARENA Backend (FastAPI)" cmd /k "cd /d "%~dp0backend" && .\venv\Scripts\python.exe run.py"
start "MINEARENA Frontend (Vite)" cmd /k "cd /d "%~dp0frontend" && "C:\Program Files\nodejs\node.exe" "node_modules\vite\bin\vite.js" --host 0.0.0.0 --port 5173"

echo.
echo Waiting 4 seconds for servers to initialize...
powershell -Command "Start-Sleep -Seconds 4"

echo Opening browser at http://localhost:5173 ...
start http://localhost:5173
echo Done! Both backend (port 8000) and frontend (port 5173) are running in dedicated console windows.
