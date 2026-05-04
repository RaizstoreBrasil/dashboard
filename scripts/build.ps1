$ErrorActionPreference = "Stop"

if (-not (Test-Path ".\.venv\Scripts\python.exe")) {
    throw "Ambiente virtual nao encontrado. Rode primeiro: npm run setup"
}

& ".\.venv\Scripts\python.exe" -m compileall main.py database.py models.py agents scripts
& ".\.venv\Scripts\python.exe" -m pytest tests\smoke_test.py -o cache_dir=data/.pytest_cache

Write-Host ""
Write-Host "Build validado."
