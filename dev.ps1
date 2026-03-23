# dev.ps1 — Script de desarrollo para Windows (PowerShell)
# Uso: .\dev.ps1 install | .\dev.ps1 run

param(
    [Parameter(Position=0)]
    [string]$Command
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Show-Help {
    Write-Host "Uso: .\dev.ps1 <comando>" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Comandos:"
    Write-Host "  install   Instala las dependencias del backend y frontend"
    Write-Host "  run       Inicia ambos servicios con hot reload"
    Write-Host "  help      Muestra esta ayuda"
    Write-Host ""
    Write-Host "Ejemplo:"
    Write-Host "  .\dev.ps1 install"
    Write-Host "  .\dev.ps1 run"
}

function Do-Install {
    Write-Host "==> Instalando dependencias del backend..." -ForegroundColor Green
    Push-Location "$ScriptDir\backend"
    bun install
    Pop-Location
    Write-Host ""

    Write-Host "==> Instalando dependencias del frontend..." -ForegroundColor Green
    Push-Location "$ScriptDir\frontend"
    bun install
    Pop-Location
    Write-Host ""

    Write-Host "Listo. Ahora ejecuta: .\dev.ps1 run" -ForegroundColor Yellow
}

function Do-Run {
    Write-Host "[backend]  Iniciando en http://localhost:3001" -ForegroundColor Cyan
    Write-Host "[frontend] Iniciando en http://localhost:5173" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Ambos servicios corriendo. Presiona Ctrl+C para detener." -ForegroundColor Yellow
    Write-Host ""

    $backendJob = Start-Job -ScriptBlock {
        param($dir)
        Set-Location "$dir\backend"
        bun run --hot index.ts 2>&1 | ForEach-Object { "[backend]  $_" }
    } -ArgumentList $ScriptDir

    $frontendJob = Start-Job -ScriptBlock {
        param($dir)
        Set-Location "$dir\frontend"
        bun run dev 2>&1 | ForEach-Object { "[frontend] $_" }
    } -ArgumentList $ScriptDir

    try {
        while ($true) {
            Receive-Job -Job $backendJob -ErrorAction SilentlyContinue
            Receive-Job -Job $frontendJob -ErrorAction SilentlyContinue
            Start-Sleep -Milliseconds 500
        }
    }
    finally {
        Write-Host ""
        Write-Host "Deteniendo servicios..." -ForegroundColor Yellow
        Stop-Job -Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
        Remove-Job -Job $backendJob, $frontendJob -Force -ErrorAction SilentlyContinue
        Write-Host "Listo."
    }
}

switch ($Command) {
    "install" { Do-Install }
    "run"     { Do-Run }
    "help"    { Show-Help }
    ""        {
        Write-Host "Error: falta un comando." -ForegroundColor Red
        Write-Host ""
        Show-Help
        exit 1
    }
    default   {
        Write-Host "Error: comando desconocido '$Command'" -ForegroundColor Red
        Write-Host ""
        Show-Help
        exit 1
    }
}
