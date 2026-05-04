$ErrorActionPreference = "Stop"

if (-not (Test-Path ".\.venv\Scripts\python.exe")) {
    throw "Ambiente virtual nao encontrado. Rode primeiro: npm run setup"
}

& ".\.venv\Scripts\python.exe" -m uvicorn main:app --host 0.0.0.0 --port 8060
