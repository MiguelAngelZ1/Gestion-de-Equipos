# Plan de Remediación — Control de Equipos 3.0

Basado en auditoría del 2026-05-24. 47 hallazgos totales (10 críticos, 10 altos, 16 medios, 11 bajos).

---

## Fase 1: Críticos (ejecución inmediata)

### 1.1 Seguridad — Secretos y Autenticación

| Tarea | Archivos | Subagente |
|-------|----------|-----------|
| 1.1.1 Eliminar fallback hardcodeado de JWT (`'dev-secret-key-change-me'`). El servidor debe fallar cerrado si no hay JWT_SECRET | `backend/middleware/auth.middleware.js` | `fix-jwt-secret` |
| 1.1.2 Eliminar fallback hardcodeado de admin password (`'admin123'`). El bootstrap debe requerir ADMIN_PASSWORD env | `backend/controllers/auth.controller.js` | `fix-jwt-secret` |
| 1.1.3 Reemplazar `Math.random()` por `crypto.randomInt()` en generación de código de recuperación | `backend/controllers/auth.controller.js` | `fix-jwt-secret` |
| 1.1.4 Agregar rate limiting a `/forgot-password` y `/reset-password` (3 intentos/15min por email) | `backend/server.js` + `backend/routes/auth.routes.js` | `fix-jwt-secret` |

### 1.2 Sync Engine — Consistencia de Datos

| Tarea | Archivos | Subagente |
|-------|----------|-----------|
| 1.2.1 Reconectar hash pipeline: poblar `.hash` en objetos equipo antes de `sincronizarEquipos`, arreglar `calcularHashEquipo.js` para que use los field names correctos del schema | `backend/sincronizacion/calcularHashEquipo.js`, `backend/servicios/sincronizacionEquipos.js`, `backend/db/sync.js` | `fix-sync-engine` |
| 1.2.2 Agregar TTL al lock de sync + heartbeat periódico + columna `expires_at` | `backend/servicios/syncManager.js`, `backend/db/database.js` | `fix-sync-engine` |
| 1.2.3 Eliminar double-fetch: pasar datos directamente en vez de usar callbacks que refetch | `backend/db/sync.js` | `fix-sync-engine` |
| 1.2.4 Arreglar backup path para que coincida con `database.js` y use `DB_PATH` env | `backend/servicios/syncManager.js` | `fix-sync-engine` |
| 1.2.5 Crear tabla `sync_logs` en `database.js:initializeTables()` | `backend/db/database.js` | `fix-sync-engine` |
| 1.2.6 Corregir `syncLogger.js` para que realmente haga logging (hoy tiene cuerpo vacío) | `backend/servicios/syncLogger.js` | `fix-sync-engine` |
| 1.2.7 Reemplazar TOCTOU lock no-atómico por advisory lock (BEGIN IMMEDIATE en SQLite) | `backend/servicios/syncManager.js` | `fix-sync-engine` |

### 1.3 Base de Datos — Transacciones en Writes Críticos

| Tarea | Archivos | Subagente |
|-------|----------|-----------|
| 1.3.1 Envolver `createOrUpdateEquipo()` en transacción raw SQLite (BEGIN/COMMIT/ROLLBACK) | `backend/servicios/equipos.service.js` | `fix-transactions` |
| 1.3.2 Envolver `instalarComponente()` en transacción raw SQLite | `backend/servicios/componentes.service.js` | `fix-transactions` |
| 1.3.3 Envolver `createOrUpdateTareaSoporte()` en transacción raw SQLite | `backend/servicios/soporte.service.js` | `fix-transactions` |
| 1.3.4 Agregar `PRAGMA journal_mode=WAL` y `PRAGMA busy_timeout=5000` a inicialización SQLite | `backend/db/database.js` | `fix-transactions` |

---

## Fase 2: Altos ✅ (Completada 2026-05-24)

### 2.1 Backend ✅
- ✅ N+1 queries: índices agregados a `especificaciones.equipo_id`, `historial_personal.equipo_id`, `movimientos_stock.repuesto_id`, `especificaciones_repuestos.repuesto_id`, `componentes_instalados.equipo_id`, `soporte_tareas.equipo_id`, `prestamos.equipo_id` en `database.js:initializeTables()`
- ✅ N+1 loop reemplazado por batch query (`SELECT * FROM especificaciones WHERE equipo_id IN (...)`) en `equiposRepositorio.js`
- ✅ Error propagation corregida en `prestamosController.js` (5 handlers), `backup.controller.js` (6 handlers), `sync.controller.js` (1 handler) — ahora usan `next(error)`
- ✅ CORS restrictivo: Socket.IO CORS alineado con REST whitelist (`allowedOrigins`), `credentials: true` en Socket.IO
- ✅ CSP hardening: nonce-based para scripts (removido `'unsafe-inline'` de script-src), `connect-src` acotado a orígenes específicos (sin wildcards)

### 2.2 Frontend ✅
- ✅ `AbortController` con timeout de 15s en `api.js`
- ✅ `retry` con backoff exponencial (max 2 retries, delay 1-4s) en errores de red
- ✅ `navigator.onLine` check antes de API calls
- ✅ `react-hooks/exhaustive-deps` agregado como `error` en ESLint
- ✅ Stale closures evaluados — patrón de fetch-on-mount es correcto (funciones estables, sin dependencias cambiantes)

### 2.3 Sync ✅
- ✅ Sync incremental: filtra equipos por `updated_at > last_sync` usando timestamp de `sync_metadata`
- ✅ Retry con backoff por operación individual (`withRetry`: 3 intentos, delay 1-8s)
- ✅ Timeout por operación de 30s (`withTimeout`)

---

## Fase 3: Medios (próximo sprint)

### 3.1 Backend
- Implementar refresh token rotation
- Agregar express-validator/zod para validación de input
- Endurecer rate limiting login (10 req/15min)
- Agregar constant-time login (siempre bcrypt-compare)
- Agregar `SIGTERM`/`SIGINT` handler para cierre graceful
- Agregar `X-Content-Type-Options` y verificar helmet defaults

### 3.2 Frontend
- Crear `AuthContext` (eliminar localStorage sprawl)
- Crear `useBulkSelect` hook + `BulkActionBar` component
- Agregar focus trap y ARIA attributes a modales
- Agregar offline fallback page en SW
- Lazy load `socket.io-client` solo para admin

### 3.3 Infraestructura
- Dockerizar (Dockerfile + docker-compose.yml con SQLite/PostgreSQL)
- CI/CD pipeline básico (GitHub Actions: lint + build)
- Configurar logging estructurado (pino/winston)
- Configurar Prisma migrations para PostgreSQL

---

## Fase 4: Bajos (backlog)

- Eliminar dependencias muertas (`sqlite`, `clsx`, `tailwind-merge`, `localforage`, `date-fns`)
- Unificar naming español/inglés
- Limpiar modelo duplicado `tareas_soporte`
- Agregar TypeScript (post-MVP)
- Reducir body limit de 10MB a 1MB
- Agregar `loading="lazy"` a imágenes
