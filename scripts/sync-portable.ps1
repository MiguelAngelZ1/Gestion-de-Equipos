param([switch]$SkipBuild, [switch]$SkipInstall, [ValidateSet('full','network')][string]$Mode = 'full')
$ErrorActionPreference='Stop'
$root=(Resolve-Path "$PSScriptRoot\..").Path
Set-Location $root
$portable="$root\Version-Portable"
if (!(Test-Path $portable)) { New-Item -ItemType Directory $portable | Out-Null }
Write-Host "==> modo portable: $Mode" -F Cyan

if (-not $SkipBuild) {
  Write-Host "==> frontend build (VITE_PORTABLE_MODE=$Mode)..." -F Cyan
  Push-Location frontend
  $env:VITE_PORTABLE_MODE=$Mode
  pnpm run build
  if ($LASTEXITCODE -ne 0) { throw "frontend build fallo" }
  Remove-Item Env:\VITE_PORTABLE_MODE -ErrorAction SilentlyContinue
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
# El portable siempre corre en production (pino-pretty es devDep y no viaja en --prod)
$penv="$portable/backend/.env"
if (Test-Path $penv) {
  $txt=[IO.File]::ReadAllText($penv)
  if ($txt -match '(?m)^NODE_ENV\s*=') { $txt=$txt -replace '(?m)^NODE_ENV\s*=.*$','NODE_ENV=production' }
  else { $txt=$txt.TrimEnd()+"`r`nNODE_ENV=production`r`n" }
  [IO.File]::WriteAllText($penv, $txt, (New-Object Text.UTF8Encoding $false))
}
# Seed seguro: checkpoint best-effort + copiar el set completo (db+wal+shm) para no
# llevar una foto a medias de una DB viva en WAL mode.
try { node -e "const s=require('./backend/node_modules/sqlite3');const db=new s.Database('backend/equipos.db');db.exec('PRAGMA wal_checkpoint(TRUNCATE);',()=>db.close());" 2>$null } catch {}
if (Test-Path "backend/equipos.db") {
  Remove-Item "$portable/backend/equipos.seed.db*" -Force -ErrorAction SilentlyContinue
  foreach ($ext in @('', '-wal', '-shm')) {
    $src = "backend/equipos.db$ext"
    if (Test-Path $src) { Copy-Item -Force $src "$portable/backend/equipos.seed.db$ext" }
  }
  Write-Host "  seed DB copiado (set consistente)" -F Yellow
}

# Runtime VC++ autocontenido: Windows carga DLLs primero desde la carpeta del
# .exe, asi el portable no requiere instalar vc_redist en destino.
foreach ($dll in @('vcruntime140.dll','msvcp140.dll')) {
  if (!(Test-Path "$portable/$dll")) {
    $sys = Join-Path $env:SystemRoot ("System32/" + $dll)
    if (Test-Path $sys) { Copy-Item -Force $sys "$portable/$dll"; Write-Host "  $dll empaquetada" -F Yellow }
    else { Write-Host "  AVISO: $sys no existe en esta PC; el portable puede fallar sin VC++ Redist" -F Red }
  }
}

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

# Verificación dura: sin tsx el iniciar.bat muere antes del menú (fallo visto en campo).
# No se confía en el skip por fecha de lock: si falta el cli, se reinstala.
if (!(Test-Path "$portable/backend/node_modules/tsx/dist/cli.mjs")) {
  Write-Host "  tsx ausente en portable -> reinstalando prod deps..." -F Yellow
  Push-Location "$portable/backend"
  pnpm install --prod --shamefully-hoist --frozen-lockfile; if ($LASTEXITCODE -ne 0) { pnpm install --prod --shamefully-hoist }
  Pop-Location
  if (!(Test-Path "$portable/backend/node_modules/tsx/dist/cli.mjs")) { throw "tsx sigue ausente tras reinstall - portable roto, no continuar" }
}
Write-Host "  tsx OK" -F DarkGray

if (!(Test-Path "$portable/iniciar.bat")) {
$bat=@'
@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul 2>&1
title Control de Equipos - Red
set "ROOT=%~dp0"
set "APPDATA_DB=%APPDATA%\ControlEquipos\equipos.db"
set "DB_PATH=%APPDATA_DB%"
set "STATIC_PATH=%ROOT%frontend\dist"
set "PORT=3001"
set "PORTABLE_MODE=__MODE__"
set "URL=http://localhost:3001"

if not exist "%ROOT%node.exe" echo [ERROR] Falta node.exe en %ROOT% - carpeta portable incompleta. & pause & exit /b 1
if not exist "%ROOT%backend\node_modules\tsx\dist\cli.mjs" echo [ERROR] Falta backend\node_modules\tsx - re-ejecutar scripts\sync-portable.ps1 o correr pnpm install --prod --shamefully-hoist dentro de Version-Portable\backend. & pause & exit /b 1
if exist "%ROOT%vcruntime140.dll" goto skipvc
where vcruntime140.dll >nul 2>&1
if %errorlevel% neq 0 echo [AVISO] No se encontro VC++ Redistributable ni DLL local. Si el servidor no arranca, instalar vc_redist.x64.exe de https://aka.ms/vs/17/release/vc_redist.x64.exe & pause
:skipvc

if not exist "%APPDATA%\ControlEquipos" mkdir "%APPDATA%\ControlEquipos" >nul 2>&1
if not exist "%APPDATA_DB%" (
  if exist "%ROOT%backend\equipos.seed.db" copy /Y "%ROOT%backend\equipos.seed.db" "%APPDATA_DB%" >nul
  if not exist "%APPDATA_DB%" if exist "%ROOT%backend\equipos.db" copy /Y "%ROOT%backend\equipos.db" "%APPDATA_DB%" >nul
)
rem Merge solo-usuarios seed->APPDATA (upsert por usuario, gana updated_at, nunca borra).
rem Cura instalaciones existentes sin pisar datos de campo. Si falla, el arranque sigue.
if exist "%ROOT%backend\equipos.seed.db" if exist "%ROOT%backend\scripts\merge-portable-users.js" (
  "%ROOT%node.exe" "%ROOT%backend\scripts\merge-portable-users.js" "%ROOT%backend\equipos.seed.db" "%APPDATA_DB%" >> "%APPDATA%\ControlEquipos\merge-portable-users.log" 2>&1
  if errorlevel 1 echo [aviso] Merge de usuarios fallo, ver merge-portable-users.log. El servidor arranca igual.
)

echo [ControlEquipos] Verificando puerto %PORT%...
netstat -aon | find ":%PORT% " | find "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
  echo [aviso] Puerto %PORT% ya en uso. Abriendo navegador...
  start "" "%URL%"
  goto menu
)

echo [ControlEquipos] Iniciando servidor...
echo %DATE% %TIME% arranque PORTABLE_MODE=%PORTABLE_MODE% > "%APPDATA%\ControlEquipos\startup.log"
echo "%ROOT%node.exe" "%ROOT%backend\node_modules\tsx\dist\cli.mjs" "%ROOT%backend\server.ts" ^>^> "%APPDATA%\ControlEquipos\startup.log" 2^>^&1 > "%TEMP%\ce_run.bat"
start /min "ControlEquipos - Logs del Sistema" cmd /k call "%TEMP%\ce_run.bat"

powershell -NoProfile -Command "$u='http://localhost:3001/health'; $i=0; while($true){ $p=$i%%100; Write-Progress -Activity 'Arrancando sistema' -Status 'Esperando al servidor... (puede tardar)' -PercentComplete $p -CurrentOperation (\"Intento \"+($i+1)); try{ $r=Invoke-WebRequest $u -UseBasicParsing -TimeoutSec 1; if($r.StatusCode -eq 200){ Write-Progress -Activity 'Arrancando sistema' -Completed; break } }catch{}; Start-Sleep 1; $i++ }" 2>nul
:ready

:menu
cls
echo ============================================================
echo   CONTROL DE EQUIPOS - RED
echo ============================================================
echo.
echo   Estado: Servidor en %URL%
echo   DB:     %APPDATA_DB%
echo   Log:    %APPDATA%\ControlEquipos\startup.log
echo.
echo ------------------------------------------------------------
echo   INSTRUCCIONES
echo ------------------------------------------------------------
echo   [1] Abrir sistema en el navegador
echo   [2] Ver logs del servidor
echo   [X] Cerrar sistema y salir
echo.
echo   No cierres la ventana de logs directamente.
echo   Usa [X] para apagado limpio.
echo.
choice /c 12X /n /m "  Elige [1/2/X]: "
if errorlevel 3 goto cerrar
if errorlevel 2 goto verlogs
if errorlevel 1 goto abrir

:abrir
start "" "%URL%"
goto menu

:verlogs
powershell -Command "$w=(Get-Process | Where-Object MainWindowTitle -like 'ControlEquipos - Logs*'); if($w){ Add-Type @' using System; using System.Runtime.InteropServices; public class W{ [DllImport(\"user32.dll\")] public static extern bool ShowWindow(IntPtr h,int c); [DllImport(\"user32.dll\")] public static extern bool SetForegroundWindow(IntPtr h); } '@; [W]::ShowWindow($w.MainWindowHandle,9); [W]::SetForegroundWindow($w.MainWindowHandle) }; Start-Sleep 1" >nul 2>&1
echo Ventana de logs traida al frente.
pause
goto menu

:cerrar
echo.
echo [ControlEquipos] Apagando...
powershell -Command "try { Invoke-WebRequest http://localhost:3001/internal/shutdown -Method POST -TimeoutSec 3 | Out-Null; echo '  shutdown OK' } catch { echo '  ya cerrado' }" 2>&1
timeout /t 2 >nul
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3001 " ^| find "LISTENING"') do taskkill /PID %%a /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq ControlEquipos - Logs del Sistema*" /F >nul 2>&1
echo Listo.
pause
exit /b 0
'@
$bat=$bat.Replace('__MODE__', $Mode)
Set-Content -Path "$portable/iniciar.bat" -Value $bat -Encoding ASCII
}
# detener.bat ya no se genera (integrado en iniciar.bat [X])

Write-Host "`nOK - Version-Portable lista. Probá doble click Version-Portable/iniciar.bat" -F Green
Write-Host "Destino cero-mod: copiar carpeta Version-Portable entera (USB, ~350MB) y doble click iniciar.bat" -F Cyan
