[CmdletBinding()]
param(
    [string]$ProjectDir = "C:\Users\sshkolby\open-webui",
    [string]$DockerDesktopExe = "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
    [int]$EngineTimeoutSeconds = 240,
    [int]$HealthTimeoutSeconds = 120
)

$ErrorActionPreference = "Continue"

$LogDir = Join-Path $env:LOCALAPPDATA "KolbBot"
$LogPath = Join-Path $LogDir "docker-watchdog.log"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Write-WatchdogLog {
    param([string]$Message)
    Add-Content -LiteralPath $LogPath -Value "$(Get-Date -Format o) $Message"
}

function Test-DockerEngine {
    & docker version --format "{{.Server.Version}}" *> $null
    return ($LASTEXITCODE -eq 0)
}

function Start-DockerDesktopEngine {
    if (Test-DockerEngine) {
        Write-WatchdogLog "Docker engine is already available."
        return $true
    }

    $dockerProcesses = Get-Process -Name "Docker Desktop", "com.docker.backend" -ErrorAction SilentlyContinue
    if (-not $dockerProcesses) {
        if (-not (Test-Path -LiteralPath $DockerDesktopExe)) {
            Write-WatchdogLog "Docker Desktop executable not found at $DockerDesktopExe."
            return $false
        }

        Write-WatchdogLog "Docker engine is unavailable; starting Docker Desktop."
        Start-Process -FilePath $DockerDesktopExe -WindowStyle Hidden
    } else {
        Write-WatchdogLog "Docker Desktop process exists; waiting for engine readiness."
    }

    $deadline = (Get-Date).AddSeconds($EngineTimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Seconds 5
        if (Test-DockerEngine) {
            Write-WatchdogLog "Docker engine is ready."
            return $true
        }
    }

    Write-WatchdogLog "Docker engine did not become ready within $EngineTimeoutSeconds seconds."
    return $false
}

function Start-KolbBotStack {
    $composeFile = Join-Path $ProjectDir "docker-compose.yaml"
    if (-not (Test-Path -LiteralPath $composeFile)) {
        Write-WatchdogLog "Compose file not found at $composeFile."
        return $false
    }

    Push-Location $ProjectDir
    try {
        Write-WatchdogLog "Running docker compose up for Kolb-Bot."
        $composeOutput = & docker compose up -d --no-build --pull never 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-WatchdogLog "docker compose up failed with exit code $LASTEXITCODE."
            foreach ($line in $composeOutput) {
                Write-WatchdogLog "compose: $line"
            }
            return $false
        }
    } finally {
        Pop-Location
    }

    return $true
}

function Wait-KolbBotHealth {
    $deadline = (Get-Date).AddSeconds($HealthTimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:3000/health" -TimeoutSec 10
            if ($response.StatusCode -eq 200 -and $response.Content -match '"status"\s*:\s*true') {
                Write-WatchdogLog "Kolb-Bot health endpoint is healthy."
                return $true
            }
        } catch {
            Write-WatchdogLog "Kolb-Bot health check is not ready: $($_.Exception.Message)"
        }

        Start-Sleep -Seconds 5
    }

    Write-WatchdogLog "Kolb-Bot health endpoint did not become healthy within $HealthTimeoutSeconds seconds."
    return $false
}

Write-WatchdogLog "Watchdog run started."

if (-not (Start-DockerDesktopEngine)) {
    exit 1
}

if (-not (Start-KolbBotStack)) {
    exit 2
}

if (-not (Wait-KolbBotHealth)) {
    exit 3
}

Write-WatchdogLog "Watchdog run completed successfully."
exit 0
