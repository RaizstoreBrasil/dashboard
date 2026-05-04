@echo off
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo Ambiente virtual nao encontrado.
  echo Rode primeiro: npm.cmd run setup
  pause
  exit /b 1
)

start "Servidor Xavier" cmd /k ".venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8060"
timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:8060/xavier"
