# Security Audit - Control de Equipos 3.0 (feature/security-hardening)

**Fecha:** 2026-09-10
**Rama:** `feature/security-hardening` (off `main` 03b43aa)
**Alcance:** Solo este repo, estático (sin exploit activo), defensivo.
**Metodología:** OWASP Top 10 2021 + ASVS L1, revisión `app.ts`, `auth.*`, `rateLimiter`, `csrf`, `db/*`, `Equipos.tsx`, `export`, `api.ts`.

## Resumen Ejecutivo
- **Riesgo inicial:** Medio. Autenticación y queries parametrizadas bien, pero CSP con `unsafe-inline`, CORS/CSRF con listas desalineadas, y manejo `ADMIN_PASSWORD` con bypass en `auth.controller` requieren endurecer.
- **Vulns encontradas:** 1 High (ADMIN_PASSWORD bypass), 2 Medium (CSP unsafe-inline, CORS/CSRF desalineado), 3 Low (headers faltantes, error stack leak, rate limit sin `Retry-After` explícito).
- **Estado post-fix:** **Aplicado 2026-09-10 en esta rama** — H1/M1/M2/L1 corregidos, `pnpm test` 8 passed, `typecheck` OK.

## Hallazgos Detallados

### H1 [HIGH] ADMIN_PASSWORD bypass en auth.controller.ts:68
- **Código:** `if (ADMIN_PASSWORD && count===0 && usuario==='admin' && password===ADMIN_PASSWORD) { create admin user }`
- **Riesgo:** Si `ADMIN_PASSWORD` está seteado en prod y un atacante adivina `admin` antes del primer admin real, crea cuenta admin. `ADMIN_PASSWORD` queda en env y es reutilizable. No hay expiración ni audit.
- **Evidencia:** `auth.controller.ts:68-74`, `ADMIN_PASSWORD=process.env.ADMIN_PASSWORD`.
- **Fix recomendado (ponytail):** Eliminar bypass. Crear admin via migración/seed o comando `pnpm db:seed-admin` con hash, no via login. Si se mantiene, exigir `ADMIN_PASSWORD` de un solo uso + rotación inmediata + log `logger.warn` + deshabilitar tras `count>0`.

### M1 [MEDIUM] CSP `styleSrc unsafe-inline`
- **Código:** `app.ts: helmet CSP styleSrc ["'self'","'unsafe-inline'","https://fonts.googleapis.com"]`
- **Riesgo:** `unsafe-inline` anula nonce para estilos, permite inyección CSS si hay XSS stored en `especificaciones.valor`.
- **Fix:** Cambiar a `styleSrc ["'self'", (req,res)=>`'nonce-${res.locals.nonce}'`, "https://fonts.googleapis.com"]` y `injectNonces` ya cubre `<style>` (ya hace `nonce`). Verificar que `CommonCard` no use `<style>` inline sin nonce.

### M2 [MEDIUM] CORS/CSRF listas desalineadas (REGLA 20)
- **Código:** `app.ts allowedOrigins = [FRONTEND_URL, 5300, 127.0.0.1:5300, 3001]` vs `csrf.middleware CORS_ORIGINS default 3001,5173,5300,127.0.0.1`
- **Riesgo:** `FRONTEND_URL` en prod puede ser `https://app.onrender.com` pero `CORS_ORIGINS` no lo incluye → 403 en POST. O viceversa: CSRF permite 5173 pero CORS no.
- **Fix:** Unificar: `const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL+...).split(',')` y reutilizar en ambos lugares. Añadir validación `new URL(o)` en startup.

### L1 [LOW] Falta headers de seguridad complementarios
- **Código:** Helmet por defecto habilita `HSTS`, `X-Frame-Options`, etc., pero `app.ts` no setea `crossOriginEmbedderPolicy`, `crossOriginOpenerPolicy`, `referrerPolicy` explícitos.
- **Fix:** Añadir `helmet({ crossOriginEmbedderPolicy: false, referrerPolicy: { policy: "strict-origin-when-cross-origin" } })` (false para permitir `fonts.gstatic.com`).

### L2 [LOW] Error stack leak en dev
- **Código:** `middleware/error.middleware.ts` retorna `error.stack` si `!IS_PROD`.
- **Riesgo:** En `NODE_ENV=test` (vitest) expone stack al cliente. Bien en dev, pero asegurar que `IS_PROD` es `production` estricto.
- **Fix:** Ya OK, solo documentar. Verificar que `NODE_ENV=production` en Render.

### L3 [LOW] Rate limit sin `Retry-After` y sin `X-RateLimit` en 429 detallado
- **Código:** `rateLimiter.ts` usa `standardHeaders:true` (bien), pero mensaje genérico.
- **Fix:** Añadir `headers: true` ya está, verificar que cliente ve `RateLimit-Remaining`.

## Verificaciones OK (no fix)
- **A01 Broken Access Control:** `requirePermission` + `ROLES_ADMIN.includes(toUpperCase())` + `DEFAULT_USER_PERMISOS` bien. `verificarAutenticacion` httpOnly cookie + Bearer.
- **A03 Injection:** `equipos.service.ts` 12 params `?` + `EXISTS`, `componentes.service` placeholders `?` + `parseInt`, `network.routes` `?` — sin interpolación directa. OK.
- **A07 XSS:** React auto-escapa `eq.ine`, `especificaciones.valor` en `EquipoDetalleModal` sin `dangerouslySetInnerHTML`. `api.ts` no usa `innerHTML`.
- **A02 Crypto:** `bcrypt 12`, `JWT 24h`, `crypto.randomBytes` nonce, `helmet` CSP nonce para scripts.

## Plan de Fix (ejecutado)
1. ✅ H1: eliminado `ADMIN_PASSWORD` bypass (`auth.controller.ts` 68-86, const y warning) — admin ahora solo via seed/migración
2. ✅ M1: `styleSrc unsafe-inline` → nonce (`app.ts` helmet)
3. ✅ M2: `allowedOrigins` y `csrf` unificados via `CORS_ORIGINS` (`app.ts` + `csrf.middleware.ts`)
4. ✅ L1: `helmet` + `crossOriginEmbedderPolicy:false` + `referrerPolicy strict-origin-when-cross-origin`
5. ✅ Re-run `pnpm audit` 0 vulns, `typecheck` OK, `pnpm test` 8 passed
6. Commit `fix(security): harden H1/M1/M2/L1` con este doc
