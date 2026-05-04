$ErrorActionPreference = "Stop"

if (-not (Test-Path ".\.venv\Scripts\python.exe")) {
    throw "Ambiente virtual nao encontrado. Rode primeiro: npm run setup"
}

& ".\.venv\Scripts\python.exe" ".\scripts\seed.py"
