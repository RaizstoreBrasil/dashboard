$ErrorActionPreference = "Stop"

if (-not (Test-Path ".\.venv\Scripts\python.exe")) {
    throw "Ambiente virtual nao encontrado. Rode primeiro: npm run setup"
}

& ".\.venv\Scripts\python.exe" -m pytest tests\smoke_test.py -o cache_dir=data/.pytest_cache
