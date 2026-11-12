@echo off
cd /d "%~dp0"
title CarePulse AI Frontend (:5173)
echo Starting CarePulse AI Frontend on port 5173...
"C:\Program Files\nodejs\node.exe" node_modules\vite\bin\vite.js --host 0.0.0.0 --port 5173
pause

