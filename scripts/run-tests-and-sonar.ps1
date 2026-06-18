$ErrorActionPreference = "Stop"

$root = Resolve-Path -LiteralPath "$PSScriptRoot\.."

Write-Host "== Backend: dependencies, unit tests, coverage =="
Push-Location "$root\Backend"
try {
    if (-not (Test-Path ".venv\Scripts\python.exe")) {
        python -m venv .venv
    }

    .\.venv\Scripts\python.exe -m pip install -r requirements.txt
    .\.venv\Scripts\coverage.exe erase
    .\.venv\Scripts\coverage.exe run manage.py test admin_config.tests
    .\.venv\Scripts\coverage.exe xml -o coverage.xml
}
finally {
    Pop-Location
}

Write-Host "== Frontend: unit tests, coverage, build =="
Push-Location "$root\Frontend"
try {
    npm install
    npm run test:coverage
    npm run build
}
finally {
    Pop-Location
}

Write-Host "== SonarQube analysis =="
if (Get-Command sonar-scanner -ErrorAction SilentlyContinue) {
    Push-Location $root
    try {
        sonar-scanner
    }
    finally {
        Pop-Location
    }
}
else {
    if ($env:SONAR_TOKEN) {
        & "$root\scripts\run-sonar-docker.ps1" -Token $env:SONAR_TOKEN
    }
    else {
        Write-Host "sonar-scanner is not installed or not available in PATH."
        Write-Host "Set SONAR_TOKEN to run the Docker scanner automatically."
        Write-Host "Reports generated:"
        Write-Host " - Backend\coverage.xml"
        Write-Host " - Frontend\coverage\lcov.info"
    }
}
