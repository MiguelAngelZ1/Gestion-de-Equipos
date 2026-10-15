# Control de Equipos 3.0

Sistema de gestión de equipos con frontend React + backend Express + SQLite.

## Stack
- Frontend: React 19 + Vite 7 + TypeScript + Tailwind + MUI (dev 5300, build -> `frontend/dist`)
- Backend: Node 22 + Express 4 + SQLite (WAL) + tsx (puerto 3001, sirve `frontend/dist` en prod)

## Desarrollo rápido
```powershell
# Terminal 1 - Backend
cd backend; pnpm install; pnpm run dev  # http://localhost:3001

# Terminal 2 - Frontend HMR
cd frontend; pnpm install; pnpm run dev  # http://localhost:5300
```

Frontend build en Windows: `pnpm run build` usa `vite build` (sin `NODE_OPTIONS=...` que falla en PowerShell).

## Estructura
- `frontend/` SPA, `frontend/dist` es lo que sirve el backend en prod
- `backend/` Express + `equipos.db` (SQLite WAL), `server.ts` + `app.ts` (`STATIC_PATH` y `DB_PATH` resolubles)

Ver `.opencode-context.md` para mapa del proyecto.
