[CmdletBinding()]
param(
    [string]$EnsureScript = "C:\Users\sshkolby\open-webui\scripts\Ensure-KolbBotDocker.ps1",
    [int]$IntervalSeconds = 300
)

$ErrorActionPreference = "Continue"

$LogDir = Join-Path $env:LOCALAPPDATA "KolbBot"
$LogPath = Join-Path $LogDir "docker-watchdog.log"
$StopFile = Join-Path $LogDir "watchdog.stop"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Write-WatchdogLog {
    param([string]$Message)
    Add-Content -LiteralPath $LogPath -Value "$(Get-Date -Format o) $Message"
}

$mutex = New-Object System.Threading.Mutex($false, "Local\KolbBotDockerWatchdogLoop")
if (-not $mutex.WaitOne(0)) {
    Write-WatchdogLog "Watchdog loop is already running; exiting duplicate process."
    exit 0
}

try {
    Write-WatchdogLog "Watchdog loop started with interval ${IntervalSeconds}s."

    while ($true) {
        if (Test-Path -LiteralPath $StopFile) {
            Write-WatchdogLog "Stop file found at $StopFile; watchdog loop exiting."
            break
        }

        $startedAt = Get-Date

        if (-not (Test-Path -LiteralPath $EnsureScript)) {
            Write-WatchdogLog "Ensure script not found at $EnsureScript."
        } else {
            & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $EnsureScript
            Write-WatchdogLog "Ensure script exited with code $LASTEXITCODE."
        }

        $elapsedSeconds = [int]((Get-Date) - $startedAt).TotalSeconds
        $sleepSeconds = [Math]::Max(10, $IntervalSeconds - $elapsedSeconds)
        Start-Sleep -Seconds $sleepSeconds
    }
} finally {
    $mutex.ReleaseMutex()
    $mutex.Dispose()
    Write-WatchdogLog "Watchdog loop stopped."
}
