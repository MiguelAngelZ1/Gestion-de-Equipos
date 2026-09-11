param([switch]$SkipBuild, [switch]$SkipInstall)
$ErrorActionPreference='Stop'
$root=(Resolve-Path "$PSScriptRoot\..").Path
Set-Location $root
$portable="$root\Version-Portable"
if (!(Test-Path $portable)) { New-Item -ItemType Directory $portable | Out-Null }

if (-not $SkipBuild) {
  Write-Host "==> frontend build (vos: pnpm build ~30s)..." -F Cyan
  Push-Location frontend
  pnpm run build
  if ($LASTEXITCODE -ne 0) { throw "frontend build fallo" }
  Pop-Location
}

Write-Host "==> sync frontend/dist..." -F Cyan
Remove-Item -Recurse -Force "$portable/frontend/dist" -ErrorAction SilentlyContinue
New-Item -ItemType Directory "$portable/frontend" -Force | Out-Null
Copy-Item -Recurse -Force "frontend/dist" "$portable/frontend/dist"

Write-Host "==> sync backend (sin node_modules/db/.env)..." -F Cyan
$excludes=@('node_modules','equipos.db','equipos.db-wal','equipos.db-shm','dist')
New-Item -ItemType Directory "$portable/backend" -Force | Out-Null
Get-ChildItem backend -Force | Where-Object { $excludes -notcontains $_.Name } | ForEach-Object {
  $dest="$portable/backend/$($_.Name)"
  if ($_.PSIsContainer) { Remove-Item -Recurse -Force $dest -ErrorAction SilentlyContinue; Copy-Item -Recurse -Force $_.FullName $dest }
  else { Copy-Item -Force $_.FullName $dest }
}
@('package.json','pnpm-lock.yaml','tsconfig.json') | ForEach-Object { if (Test-Path "backend/$_") { Copy-Item -Force "backend/$_" "$portable/backend/$_" } }
if (!(Test-Path "$portable/backend/.env") -and (Test-Path "backend/.env")) { Copy-Item "backend/.env" "$portable/backend/.env"; Write-Host "  .env copiado" -F Yellow }
if (Test-Path "backend/equipos.db") { Copy-Item -Force "backend/equipos.db" "$portable/backend/equipos.seed.db"; Write-Host "  seed DB copiado" -F Yellow }

if (!(Test-Path "$portable/node.exe")) {
  $sysNode=(Get-Command node -ErrorAction SilentlyContinue).Source
  if ($sysNode) { Copy-Item $sysNode "$portable/node.exe"; Write-Host "  node.exe copiado de $sysNode" -F Yellow }
  else {
    Write-Host "  Descargando node v22..." -F Yellow
    $zip="$env:TEMP\node-v22.zip"; $url="https://nodejs.org/dist/v22.22.0/node-v22.22.0-win-x64.zip"
    Invoke-WebRequest $url -OutFile $zip; Expand-Archive $zip -DestinationPath $env:TEMP -Force
    Copy-Item "$env:TEMP\node-v22.22.0-win-x64\node.exe" "$portable/node.exe"
    Remove-Item $zip -Force; Remove-Item "$env:TEMP\node-v22.22.0-win-x64" -Recurse -Force
  }
}

if (-not $SkipInstall) {
  $needInstall=!(Test-Path "$portable/backend/node_modules")
  if ((Test-Path "backend/pnpm-lock.yaml") -and (Test-Path "$portable/backend/pnpm-lock.yaml")) {
    if ((Get-Item "backend/pnpm-lock.yaml").LastWriteTime -gt (Get-Item "$portable/backend/pnpm-lock.yaml").LastWriteTime) { $needInstall=$true }
  }
  if ($needInstall) {
    Write-Host "==> pnpm install --prod --shamefully-hoist (vos: ~1min)..." -F Cyan
    Push-Location "$portable/backend"
    pnpm install --prod --shamefully-hoist --frozen-lockfile; if ($LASTEXITCODE -ne 0) { pnpm install --prod --shamefully-hoist }
    Pop-Location
  } else { Write-Host "  deps al dia (skip)" -F DarkGray }
  if (!(Test-Path "$portable/backend/node_modules/sqlite3/build/Release/node_sqlite3.node")) {
    Write-Host "  fix sqlite3 bindings (copia build)..." -F Yellow
    if (Test-Path "backend/node_modules/sqlite3/build/Release/node_sqlite3.node") {
      New-Item -ItemType Directory "$portable/backend/node_modules/sqlite3/build/Release" -Force | Out-Null
      Copy-Item -Force "backend/node_modules/sqlite3/build/Release/node_sqlite3.node" "$portable/backend/node_modules/sqlite3/build/Release/node_sqlite3.node"
    } else {
      Push-Location "$portable/backend"; pnpm rebuild sqlite3 2>&1 | Out-Null; Pop-Location
    }
  }
}

$bat=@'
@echo off
setlocal
set "ROOT=%~dp0"
set "APPDATA_DB=%APPDATA%\ControlEquipos\equipos.db"
set "DB_PATH=%APPDATA_DB%"
set "STATIC_PATH=%ROOT%frontend\dist"
set "PORT=3001"
if not exist "%APPDATA%\ControlEquipos" mkdir "%APPDATA%\ControlEquipos"
if not exist "%APPDATA_DB%" (
  if exist "%ROOT%backend\equipos.seed.db" copy "%ROOT%backend\equipos.seed.db" "%APPDATA_DB%" >nul
  if not exist "%APPDATA_DB%" if exist "%ROOT%backend\equipos.db" copy "%ROOT%backend\equipos.db" "%APPDATA_DB%" >nul
  echo [init] DB seed copiada a %APPDATA_DB%
)
echo [ControlEquipos] DB_PATH=%DB_PATH%
echo [ControlEquipos] STATIC_PATH=%STATIC_PATH%
echo [ControlEquipos] http://localhost:%PORT%
"%ROOT%node.exe" "%ROOT%backend\node_modules\tsx\dist\cli.mjs" "%ROOT%backend\server.ts" 2>&1
pause
'@
Set-Content -Path "$portable/iniciar.bat" -Value $bat -Encoding ASCII
$stopBat='@echo off
powershell -Command "try { Invoke-WebRequest http://localhost:3001/internal/shutdown -Method POST -TimeoutSec 2 | Out-Null; echo [stop] shutdown OK } catch { echo [stop] ya cerrado o puerto libre }"'
Set-Content -Path "$portable/detener.bat" -Value $stopBat -Encoding ASCII

Write-Host "`nOK - Version-Portable lista. Probá doble click Version-Portable/iniciar.bat" -F Green
Write-Host "Destino cero-mod: copiar carpeta Version-Portable entera (USB, ~350MB) y doble click iniciar.bat" -F Cyan
