$ErrorActionPreference = "Stop"

function Get-PythonCommand {
    $commands = @("py", "python", "python3")

    foreach ($command in $commands) {
        $found = Get-Command $command -ErrorAction SilentlyContinue
        if ($found) {
            return $command
        }
    }

    throw "Python nao foi encontrado no PATH. Instale Python 3.11+ e marque a opcao 'Add python.exe to PATH', ou abra um novo terminal depois da instalacao."
}

$python = Get-PythonCommand

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
}

& $python -m venv .venv
if ($LASTEXITCODE -ne 0) {
    throw "Falha ao criar o ambiente virtual."
}

& ".\.venv\Scripts\python.exe" -m pip install --upgrade pip
if ($LASTEXITCODE -ne 0) {
    throw "Falha ao atualizar o pip."
}

& ".\.venv\Scripts\python.exe" -m pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    throw "Falha ao instalar as dependencias do requirements.txt."
}

Write-Host ""
Write-Host "Ambiente pronto."
Write-Host "Para iniciar a API: .\scripts\run.ps1"
