param(
    [string]$Token = $env:SONAR_TOKEN,
    [string]$HostUrl = "http://host.docker.internal:9000"
)

$ErrorActionPreference = "Stop"

if (-not $Token) {
    throw "Missing SonarQube token. Pass -Token '<token>' or set SONAR_TOKEN."
}

$root = (Resolve-Path -LiteralPath "$PSScriptRoot\..").Path

docker run --rm `
    -e SONAR_HOST_URL=$HostUrl `
    -e SONAR_TOKEN=$Token `
    -v "${root}:/usr/src" `
    -w /usr/src `
    sonarsource/sonar-scanner-cli
