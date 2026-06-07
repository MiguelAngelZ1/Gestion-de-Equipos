# Plan de Implementacion - Auditoria Senior Control de Equipos 3.0

Fecha de revision: 2026-06-07  
Alcance auditado: `backend`, `frontend`, archivos raiz de build/deploy. Se excluyo `antigravity-awesome-skills` por ser material vendorizado de skills, no codigo de la app.

## Resumen ejecutivo

El proyecto esta bastante mas maduro que el `plan-remediacion.md` historico: ya existen cookies `httpOnly`, Helmet/CSP, rate limits, refresh token rotation, WAL/busy timeout, transacciones en servicios criticos, typecheck backend/frontend en verde y pruebas backend en verde.

Pero no esta listo para tratarse como "sin deuda tecnica". Hay 4 riesgos que deben corregirse antes de produccion seria:

1. Vulnerabilidades de dependencias criticas/altas en backend y frontend.
2. Sync/backup tiene inconsistencias funcionales graves: el schema de logs no coincide con el codigo, y la sincronizacion remota parece simulada/no implementada.
3. Frontend no pasa lint ni test suite completa.
4. Autorizacion e input validation siguen siendo demasiado permisivos para operaciones de escritura.

Grado global estimado: **C+ para produccion expuesta**, **B- para uso local/controlado**.

## Evidencia verificada

Comandos ejecutados:

| Comando | Resultado |
|---|---|
| `backend npm run typecheck` | OK |
| `frontend npm run typecheck` | OK |
| `backend npm test -- --run` | OK: 2 files, 11 tests |
| `frontend npm test -- --run` | Falla: 1 file, 4 tests fallidos en `ToastContext.test.tsx` |
| `backend npm run lint` | OK con 32 warnings |
| `frontend npm run lint` | Falla: 126 errores |
| `backend npm audit --json` | 25 vulnerabilidades: 1 critical, 12 high, 10 moderate, 2 low |
| `frontend npm audit --json` | 13 vulnerabilidades: 1 critical, 8 high, 4 moderate |

Nota de control de cambios: al inicio ya habia cambios sin commit en `.opencode-context.md`, `backend/services/equipos.service.ts`, `frontend/src/pages/Equipos.tsx` y `frontend/src/pages/Login.tsx`. Este plan no los revierte ni los asume como definitivos sin revision humana.

## Hallazgos y plan obligatorio

### P0 - Dependencias vulnerables en ambos paquetes

**Impacto:** exposicion a RCE/dev-server file read, DoS, path traversal, ReDoS y vulnerabilidades de parser/routing. Algunas son dev-only, pero otras estan en runtime o librerias expuestas.

**Evidencia:**
- Backend: `vitest` critical, `express`, `express-rate-limit`, `sqlite3`, `nodemailer`, `socket.io-parser`, `ws`, `tar`, `qs`, `path-to-regexp`.
- Frontend: `vitest` critical, `vite`, `react-router-dom/react-router`, `rollup`, `socket.io-parser`, `ws`, `flatted`, `picomatch`.

**Solucion:**
1. Crear branch solo para upgrades de dependencias.
2. Ejecutar `npm audit fix` en backend y frontend, revisar cambios de lockfile.
3. Para paquetes con major requerido: validar upgrade manual, especialmente `vitest@4`, `sqlite3@6`, `react-router-dom` y Vite.
4. Correr typecheck, lint, tests y build en ambos paquetes.
5. Agregar gate CI: `npm audit --audit-level=high` para runtime y politica separada para devDependencies.

**Criterio de cierre:** `npm audit` sin critical/high explotables en runtime; dev-only critical documentado o corregido.

### P0 - Sync logs roto por mismatch entre schema y codigo

**Impacto:** una sincronizacion puede fallar al registrar logs aun si el proceso principal termino bien; ademas `getSyncLogs` consulta columnas inexistentes.

**Evidencia:**
- `backend/db/database.ts` crea `sync_logs` con columnas: `sync_id`, `operation`, `tabla`, `registro_id`, `detalle`, `created_at`, `nivel`.
- `backend/services/syncManager.ts` inserta: `tipo`, `direccion`, `equipos_creados`, `equipos_actualizados`, `equipos_eliminados`, `errores`, `exitoso`.
- `backend/services/syncManager.ts` consulta `ORDER BY fecha DESC`, pero el schema usa `created_at`.

**Solucion:**
1. Elegir un contrato unico de `sync_logs`.
2. Recomiendo cambiar el schema a logs de corrida: `id`, `tipo`, `direccion`, `equipos_creados`, `equipos_actualizados`, `equipos_eliminados`, `errores`, `exitoso`, `created_at`.
3. Agregar migracion idempotente para instalaciones existentes.
4. Cambiar `getSyncLogs` a `ORDER BY created_at DESC`.
5. Agregar test unitario/integracion que ejecute `manager.logSyncOperation()` contra SQLite real.

**Criterio de cierre:** `/api/backup/sync/logs` devuelve logs reales luego de una sync exitosa y una fallida.

### P0 - Sincronizacion remota no implementada de forma real

**Impacto:** la UI/API promete sincronizacion con nube (`DATABASE_URL`), pero `backend/db/sync.ts` pasa `equiposRemote: []`, `obtenerEquiposRemote: () => []` y `actualizarRemote: async () => {}`. Esto puede generar falsa confianza operativa y perdida de datos si se cree que hay respaldo remoto.

**Solucion:**
1. Decidir si la sync remota es requisito real o feature deshabilitada.
2. Si es real: implementar adaptador remoto explicito con conexion, lectura, upsert, borrado logico y transacciones.
3. Si no es real: ocultar/deshabilitar endpoints y UI de sync remota; renombrar a backup local.
4. Agregar tests con dos SQLite temporales o una DB remota mockeada.

**Criterio de cierre:** una prueba automatizada crea/actualiza/elimina un equipo en local y verifica que el remoto queda consistente.

### P1 - Transaccion asincrona insegura en `backend/db/sync.ts`

**Impacto:** dentro de `database.client.serialize()` se llaman funciones async (`upsertEquipo`, `borrarEspecificacionesPorEquipo`, `insertarEspecificaciones`) sin `await`. El `COMMIT` puede ejecutarse antes de que terminen las operaciones y el `try/catch` no captura rechazos asincronos.

**Solucion:**
1. Reescribir `actualizarLocalConRetry` usando `await database.run("BEGIN IMMEDIATE")`, operaciones await y `COMMIT/ROLLBACK` await.
2. Evitar mezclar callbacks `sqlite3` con promesas en el mismo bloque transaccional.
3. Agregar test que fuerce error al insertar especificaciones y verifique rollback.

**Criterio de cierre:** no hay callbacks sueltos dentro de transacciones criticas de sync.

### P1 - Path traversal en descarga de backups autenticada

**Impacto:** `backend/controllers/backup.controller.ts` usa `path.join(backupDir, filename)` con `filename` de params y solo verifica `existsSync`. Aunque Express encodea separadores en muchos casos, no conviene depender de eso para un endpoint de descarga de archivos.

**Solucion:**
1. Resolver path absoluto y verificar que empieza con `backupDir + path.sep`.
2. Rechazar cualquier filename distinto de `path.basename(filename)`.
3. Limitar extension/patron: `equipos_backup_*.db`.
4. Exigir `verificarAdmin` para listar, descargar y borrar backups.

**Criterio de cierre:** tests de `../`, `%2e%2e`, nombres invalidos y descarga valida.

### P1 - Autorizacion demasiado amplia en operaciones de escritura

**Impacto:** muchas rutas `POST/PUT/DELETE` solo requieren `verificarAutenticacion`, no permisos de dominio. Esto permite que cualquier usuario autenticado modifique inventario, catalogos, prestamos, soporte, componentes o IPAM si conoce el endpoint.

**Evidencia:** rutas de `equipos`, `componentes`, `config`, `prestamos`, `soporte`, parte de `ipam` y `backup` aplican auth, pero no un modelo RBAC granular.

**Solucion:**
1. Definir matriz de permisos por modulo: inventario, soporte, prestamos, componentes, ipam, config, usuarios, backups.
2. Implementar middleware `requirePermission("modulo:accion")` reutilizable usando `rol` y `permisos_json`.
3. Aplicarlo a todas las escrituras y operaciones destructivas.
4. Agregar tests 403 para usuario normal y 200 para admin/perfil autorizado.

**Criterio de cierre:** ninguna ruta destructiva queda protegida solo por login salvo que este explicitamente justificado.

### P1 - Validacion de entrada incompleta

**Impacto:** `auth.routes.ts` usa Zod, pero gran parte de controladores pasa `req.body` directo a servicios. Aunque las queries usan parametros y reducen riesgo SQL injection, faltan limites de longitud, enums, rangos, formatos y coercion segura.

**Solucion:**
1. Crear carpeta `backend/schemas`.
2. Definir schemas Zod por recurso: equipo, componente, soporte, prestamo, IPAM, config, usuario.
3. Usar `validateBody`, `validateParams`, `validateQuery`.
4. Normalizar `parseInt`/ids en schema, no en servicios.

**Criterio de cierre:** todas las rutas con body/query/params relevantes validan antes de llamar al controlador.

### P1 - CSRF y origenes con cookies

**Impacto:** el backend usa cookies `httpOnly` con `credentials: true`. `sameSite=strict/lax` ayuda, pero no reemplaza una defensa CSRF robusta si se expone por tuneles/dominios o cambia SameSite por necesidad operativa.

**Solucion:**
1. Validar `Origin`/`Referer` en metodos mutables.
2. Agregar token CSRF double-submit o endpoint `/api/csrf`.
3. Mantener CORS whitelist estricta y documentar dominios esperados.

**Criterio de cierre:** POST/PUT/PATCH/DELETE sin origen valido o sin token fallan con 403.

### P1 - Socket.IO permite `join` por `userId` sin autenticar socket

**Impacto:** cualquier cliente que consiga conectar desde origen permitido puede emitir `join` con un `userId` arbitrario y recibir eventos dirigidos a esa sala.

**Solucion:**
1. Autenticar handshake con cookie JWT.
2. Derivar `userId` del token, no del payload enviado por el cliente.
3. Rechazar conexiones sin token valido.
4. Test de socket con usuario A intentando unirse a sala de usuario B.

**Criterio de cierre:** el servidor solo permite `socket.join("user_X")` cuando `X` proviene del JWT validado.

### P2 - Frontend no pasa lint

**Impacto:** 126 errores impiden usar lint como quality gate. Hay problemas reales mezclados con reglas demasiado estrictas de React Compiler (`set-state-in-effect`, refs durante render, funciones usadas antes de declararse) y problemas simples (`clients` en service worker, imports/vars sin uso).

**Solucion:**
1. Separar configuracion ESLint para `src`, `public/sw.js` y `tests`.
2. Declarar globals de service worker (`self`, `clients`) o excluir `public/sw.js` y lintarlo con config propia.
3. Corregir errores simples de unused/no-useless-escape.
4. Revisar reglas React Compiler: arreglar casos reales (`Math.random` en render, funciones antes de declararse) y relajar temporalmente reglas que no aporten valor inmediato si bloquean el sprint.

**Criterio de cierre:** `frontend npm run lint` en verde y CI bloqueando regresiones.

### P2 - Tests frontend fallan por lazy/Suspense en ToastContext

**Impacto:** 4 tests fallan porque el `Toast` lazy no llega a renderizar durante la asercion; no necesariamente es bug de usuario final, pero la suite no es confiable.

**Solucion:**
1. En tests, esperar `findByText` o envolver lazy resolution correctamente con `await`.
2. Alternativa preferida: no lazy-loadear el Toast, es un componente pequeno y critico para feedback de errores.
3. Agregar test de accesibilidad basico: toast debe tener rol/status o alert segun tipo.

**Criterio de cierre:** `frontend npm test -- --run` en verde sin warnings `act(...)` relevantes.

### P2 - Login no es constant-time para usuario inexistente

**Impacto:** el login compara bcrypt solo si el usuario existe. Puede permitir enumeracion por timing, especialmente si se expone en red.

**Solucion:**
1. Mantener un hash bcrypt dummy en memoria.
2. Ejecutar `bcrypt.compare(password, user?.password_hash || DUMMY_HASH)` siempre.
3. Responder mismo mensaje y codigo para usuario/password invalidos.

**Criterio de cierre:** test que verifica llamada a bcrypt aun cuando el usuario no existe.

### P2 - Politica de password insuficiente en reset

**Impacto:** `newPassword` permite minimo 6 caracteres. Para cuentas admin o sistema expuesto, es bajo.

**Solucion:**
1. Subir minimo a 10 o 12.
2. Aplicar misma regla en creacion, actualizacion y reset.
3. Opcional: bloquear passwords comunes con lista local pequena.

**Criterio de cierre:** tests de create/update/reset rechazan passwords debiles.

## Mejoras opcionales recomendadas

1. CI/CD: GitHub Actions con backend/frontend `npm ci`, typecheck, lint, test, build y audit.
2. E2E: Playwright para login, alta/edicion de equipo, busqueda server-side, prestamo, soporte y backup.
3. Observabilidad: request id, health `/ready`, metricas basicas, log de auditoria para cambios destructivos.
4. Migraciones: reemplazar `initializeTables()` monolitico por migraciones versionadas y reversibles.
5. Backups: retencion configurable, checksum, restore probado, backup cifrado si contiene datos sensibles.
6. Arquitectura frontend: normalizar acceso a usuario mediante `AuthContext`; eliminar lecturas directas repetidas de `localStorage`.
7. Accesibilidad: focus trap estandar en todos los modales, roles ARIA, navegacion por teclado y contraste.
8. Performance: virtualizar tablas/listados grandes, paginacion server-side consistente y cache de catalogos.
9. Hardening deploy: `.env.example`, Docker healthcheck real, usuario no-root, volumen dedicado para SQLite/backups.
10. Documentacion operativa: runbook de recuperacion, rotacion de secretos, procedimiento de restore y matriz de permisos.

## Roadmap propuesto

### Sprint 0 - Estabilizacion inmediata (1-2 dias)

1. Corregir `sync_logs` schema/codigo.
2. Deshabilitar o implementar correctamente sync remota; no dejar una sync falsa en UI/API.
3. Arreglar transaccion async de `backend/db/sync.ts`.
4. Ejecutar upgrades de dependencias con foco en critical/high.

### Sprint 1 - Seguridad funcional (3-5 dias)

1. RBAC granular en escrituras/destructivas.
2. Zod schemas para rutas principales.
3. CSRF/origin validation.
4. Socket.IO autenticado.
5. Tests de autorizacion y validacion.

### Sprint 2 - Calidad frontend y CI (2-4 dias)

1. Arreglar lint frontend o ajustar reglas con criterio.
2. Arreglar tests de ToastContext y warnings `act`.
3. Agregar workflow CI.
4. Agregar build checks backend/frontend.

### Sprint 3 - Robustez operativa (1 semana)

1. Migraciones versionadas.
2. Backup/restore probado.
3. E2E con Playwright.
4. Logs de auditoria y health/readiness.

## No negociar antes de produccion

- No desplegar expuesto a internet mientras `npm audit` tenga critical/high explotables sin decision documentada.
- No vender la sincronizacion como respaldo remoto hasta que exista adaptador remoto real y test de consistencia.
- No aceptar rutas destructivas protegidas solo por "usuario logueado" sin matriz de permisos.
- No activar CI si frontend lint/test siguen fallando: primero estabilizar, despues bloquear regresiones.

