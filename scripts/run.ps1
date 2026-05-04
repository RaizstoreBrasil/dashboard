$ErrorActionPreference = "Stop"

if (-not (Test-Path ".\.venv\Scripts\python.exe")) {
    throw "Ambiente virtual nao encontrado. Rode primeiro: .\scripts\setup.ps1"
}

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
}

& ".\.venv\Scripts\python.exe" -m uvicorn main:app --reload --port 8060
