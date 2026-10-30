@echo off
title INTERN PROJECT - Scholarship & Welfare Navigator
echo ================================================
echo      INTERN PROJECT
echo  AI Scholarship & Welfare Navigator
echo ================================================
echo.
echo Starting backend and frontend...
echo.

start "INTERN PROJECT - Backend" cmd /k "cd /d %~dp0backend && if not exist .venv (python -m venv .venv) && call .venv\Scripts\activate && python -m pip install --upgrade pip && pip install -r requirements.txt && python -m uvicorn main:app --reload"

timeout /t 3 /nobreak >nul

start "INTERN PROJECT - Frontend" cmd /k "cd /d %~dp0frontend && npm install && npm run dev"

echo.
echo Two terminals were opened.
echo Backend:  http://localhost:8000/docs
echo Frontend: http://localhost:5173
echo.
pause
