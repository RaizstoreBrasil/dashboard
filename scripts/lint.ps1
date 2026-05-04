$ErrorActionPreference = "Stop"

if (-not (Test-Path ".\.venv\Scripts\python.exe")) {
    throw "Ambiente virtual nao encontrado. Rode primeiro: npm run setup"
}

& ".\.venv\Scripts\python.exe" -m compileall main.py database.py models.py agents scripts
Write-Host ""
Write-Host "Lint basico concluido."
