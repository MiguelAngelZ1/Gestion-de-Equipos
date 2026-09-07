# Control de Equipos 3.0

Sistema de gestión de equipos con frontend React + backend Express + SQLite, distribuido como carpeta portable offline (Node embebido + .bat).

## Stack
- Frontend: React 19 + Vite 7 + TypeScript + Tailwind + MUI (dev 5300, build -> `frontend/dist`)
- Backend: Node 22 + Express 4 + SQLite (WAL) + tsx (puerto 3001, sirve `frontend/dist` en prod)
- Portable: `Version-Portable/` con `node.exe` (83MB) + `backend/` + `frontend/dist` + `iniciar.bat` / `iniciar-app.bat`

## Desarrollo rápido
```powershell
# Terminal 1 - Backend
cd backend; pnpm install; pnpm run dev  # http://localhost:3001

# Terminal 2 - Frontend HMR
cd frontend; pnpm install; pnpm run dev  # http://localhost:5300
```

Frontend build en Windows: `pnpm run build` usa `vite build` (sin `NODE_OPTIONS=...` que falla en PowerShell).

## Distribución offline portable (PC sin Node/internet)
```powershell
pnpm run build:portable   # build frontend + espeja a Version-Portable
# o por separado:
pnpm run portable:sync        # build + sync + pnpm install si cambio lock
pnpm run portable:quick       # solo copia files (sin build/install)
```
Copia `Version-Portable/` completa a la PC destino (Escritorio/USB, **no** en `C:\Program Files`). Doble click `iniciar.bat` (navegador) o `iniciar-app.bat` (ventana app Edge/Chrome) -> `http://localhost:3001`.

- `node.exe` v22 embebido, `backend/equipos.db` portable (se mueve con la carpeta), `frontend/dist` precompilado
- `scripts/sync-portable.ps1` sincroniza: `frontend/dist` + `backend/*` (preserva `equipos.db` y `.env` del portable) + `pnpm install --prod --shamefully-hoist` si cambia `pnpm-lock.yaml`
- No requiere instalar nada en destino. Cada PC tiene DB local aislada.

## Estructura
- `frontend/` SPA, `frontend/dist` es lo que sirve el backend en prod
- `backend/` Express + `equipos.db` (SQLite WAL), `server.ts` + `app.ts` (`STATIC_PATH` y `DB_PATH` resolubles)
- `Version-Portable/` carpeta lista para copiar (gitignored, no commitear `node.exe`)
- `scripts/sync-portable.ps1` espejo automático source -> portable

## Actualización
Edita `frontend/` o `backend/` -> `pnpm run build:portable` -> recopia `Version-Portable/` a la VM/USB. `scripts/sync-portable.ps1` puede llamarse con `-SkipBuild` / `-SkipInstall` para iteración rápida.

Ver `.opencode-context.md` para mapa del proyecto.
