@echo off
cd /d "%~dp0"
title CarePulse AI Backend (:8000)
echo Starting CarePulse AI Backend on port 8000...
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause

