param([switch]$SkipBuild, [switch]$SkipInstall)
$ErrorActionPreference='Stop'
$root=$PSScriptRoot+'\..'
Set-Location $root
$portable="$root\Version-Portable"
if (!(Test-Path $portable)) { New-Item -ItemType Directory $portable | Out-Null }

if (-not $SkipBuild) {
  Write-Host "==> frontend build..." -F Cyan
  Push-Location frontend
  pnpm run build
  if ($LASTEXITCODE -ne 0) { throw "frontend build fallo" }
  Pop-Location
}

Write-Host "==> sync frontend/dist -> portable..." -F Cyan
Remove-Item -Recurse -Force "$portable/frontend/dist" -ErrorAction SilentlyContinue
Copy-Item -Recurse -Force "frontend/dist" "$portable/frontend/dist"

Write-Host "==> sync backend -> portable (preserva equipos.db y .env)..." -F Cyan
$excludes=@('node_modules','equipos.db','equipos.db-wal','equipos.db-shm','dist','.env')
Get-ChildItem backend -Force | Where-Object { $excludes -notcontains $_.Name } | ForEach-Object {
  $dest="$portable/backend/$($_.Name)"
  if ($_.PSIsContainer) {
    Remove-Item -Recurse -Force $dest -ErrorAction SilentlyContinue
    Copy-Item -Recurse -Force $_.FullName $dest
  } else { Copy-Item -Force $_.FullName $dest }
}
@('package.json','pnpm-lock.yaml','tsconfig.json') | ForEach-Object {
  if (Test-Path "backend/$_") { Copy-Item -Force "backend/$_" "$portable/backend/$_" }
}
if (!(Test-Path "$portable/backend/.env") -and (Test-Path "backend/.env")) {
  Copy-Item "backend/.env" "$portable/backend/.env"
  Write-Host "  .env copiado (no existia en portable)" -F Yellow
}
if (!(Test-Path "$portable/node.exe")) {
  $sysNode=(Get-Command node -ErrorAction SilentlyContinue).Source
  if ($sysNode) { Copy-Item $sysNode "$portable/node.exe"; Write-Host "  node.exe copiado de $sysNode" -F Yellow }
  else { Write-Host "  AVISO: falta Version-Portable/node.exe - copia uno de https://nodejs.org (v22 x64)" -F Red }
}

$lockSrc="backend/pnpm-lock.yaml"
$lockDst="$portable/backend/pnpm-lock.yaml"
$needInstall=$false
if (-not $SkipInstall) {
  if (!(Test-Path "$portable/backend/node_modules")) { $needInstall=$true }
  elseif ((Get-Item $lockSrc).LastWriteTime -gt (Get-Item $lockDst -ErrorAction SilentlyContinue).LastWriteTime) { $needInstall=$true }
  if ($needInstall) {
    Write-Host "==> pnpm install --prod --shamefully-hoist en portable..." -F Cyan
    Push-Location "$portable/backend"
    pnpm install --prod --shamefully-hoist --frozen-lockfile
    if ($LASTEXITCODE -ne 0) { pnpm install --prod --shamefully-hoist }
    Pop-Location
  } else { Write-Host "  deps portable al dia (skip install)" -F DarkGray }
}

Write-Host "`nOK - Version-Portable espejada. Prueba con Version-Portable/iniciar.bat" -F Green
