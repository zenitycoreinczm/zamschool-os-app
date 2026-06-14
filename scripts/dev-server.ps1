# Restart ZamSchool dev server on port 3000 (Windows)
$ErrorActionPreference = "Stop"
$port = 3000
$repoRoot = Join-Path $PSScriptRoot ".."
Set-Location $repoRoot

function Stop-PortListener([int]$listenPort) {
  $lines = netstat -ano | Select-String ":$listenPort\s" | Select-String "LISTENING"
  foreach ($line in $lines) {
    if ($line -match "\s+(\d+)\s*$") {
      $processId = [int]$Matches[1]
      if ($processId -gt 0) {
        Write-Host "Stopping process $processId on port $listenPort..."
        taskkill /F /PID $processId 2>$null | Out-Null
      }
    }
  }
}

function Stop-NextDevLock() {
  $lockFile = Join-Path $repoRoot ".next\dev\lock"
  if (-not (Test-Path $lockFile)) {
    return
  }

  $lockPid = 0
  try {
    $lockPid = [int](Get-Content $lockFile -Raw).Trim()
  } catch {
    return
  }

  if ($lockPid -gt 0) {
    Write-Host "Stopping Next.js dev lock PID $lockPid..."
    taskkill /F /PID $lockPid 2>$null | Out-Null
  }
}

Stop-NextDevLock
Stop-PortListener -listenPort $port
Start-Sleep -Seconds 2

$stillListening = netstat -ano | Select-String ":$port\s" | Select-String "LISTENING"
if ($stillListening) {
  Write-Host "Port $port is still in use. Close other dev terminals or run:"
  Write-Host "  taskkill /F /PID <pid>"
  exit 1
}

Write-Host "Starting Next.js at http://localhost:$port ..."
Start-Process "http://localhost:$port"
node node_modules/next/dist/bin/next dev --webpack -H 0.0.0.0 -p $port