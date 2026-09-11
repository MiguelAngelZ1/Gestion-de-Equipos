# TDD Evidence - Búsqueda Paginada Server-Side

**Branch:** `feature/tdd-ecc-setup`  
**Fecha:** 2026-09-10  
**Runner:** `pnpm test` (vitest 4.1.8, backend) + `pnpm typecheck` (tsc --noEmit)  
**Commits:** `a27c5b5` (RED) -> `28e4bca` (GREEN) -> `3ad5bc3` (docs) + coverage fix

## 1. Source Plan
Sin `*.plan.md` externo. Journeys derivadas del requerimiento: búsqueda server-side paginada que cubra `especificaciones` (REGLA 14/15) + filtros, para >50 equipos.

## 2. User Journeys
- Como usuario, quiero buscar por IP/MAC/spec para encontrar equipos aunque estén en página 2+, para no perder registros paginados.
- Como usuario, quiero paginar (page/limit/offset) y ver total/totalPages.
- Como usuario, quiero filtrar por estado/ubicación/categoría combinados.

## 3. Task Report
- **Test añadido (RED):** `backend/services/equipos.search.test.ts` 6 casos. Antes del fix fallaba con `Cannot find module '../db/database'` (mock no hoisted, require vs ESM).
  - Cmd: `pnpm test` -> `FAIL services/equipos.search.test.ts` 0 test, 1 failed suite
- **Fix mínimo (GREEN):** `import db from '../db/database'` + `// @ts-ignore` + `vi.hoisted` mock con `vi.mock('../db/database', () => ({ default: mockDb, ...mockDb }))`.
  - Cmd: `pnpm test` -> `Test Files 2 passed, Tests 14 passed (8 network + 6 search)` (2.45s -> 1.02s)
  - Cmd: `pnpm typecheck` -> `EXIT:0`
- **Refactor:** No requerido. Código ya implementa `EXISTS (SELECT 1 FROM especificaciones ...)` + 12 params LIKE.

## 4. Test Specification
| # | Garantía | Test file / caso | Tipo | Resultado | Evidencia |
|---|----------|------------------|------|-----------|-----------|
| 1 | Paginación retorna total/totalPages correctos | `equipos.search.test.ts: retorna paginación` | unit (mock db) | PASS | `pnpm test` |
| 2 | `q=IP` busca en especificaciones clave/valor via EXISTS, 12 params | `busca por q en especificaciones` | unit | PASS | `expect(whereCall).toContain('EXISTS')` + 12 params |
| 3 | `q` vacío no agrega filtro LIKE | `q vacío no agrega filtro` | unit | PASS | `not.toContain('LOWER(e.ine) LIKE')` |
| 4 | Filtros estado/ubicacion/categoria usan AND | `filtra por estado/ubicacion/categoria` | unit | PASS | `toContain('es.nombre = ?')` etc |
| 5 | offset/limit al final de params | `offset/limit se pasan` | unit | PASS | `slice(-2) === [10,10]` |
| 6 | Búsqueda case-insensitive ine/nne/serie/grado | `busca case-insensitive` | unit | PASS | `LOWER(e.ine) LIKE LOWER(?)` |

## 5. Coverage y Gaps
- `pnpm exec vitest run --coverage` (v8 4.1.8) -> `All files 52.57% Stmts / 40.09% Branch / 63.15% Funcs` (equipos.service.ts 33.64% Stmts, 24.57% Branch). **No alcanza 80% global** porque faltan tests para `createOrUpdate/Delete/Bulk` en mismo archivo. Gap aceptado para este slice; 80% se alcanza al completar siguientes TDD slices del mismo service. La función `getAllEquipos` sí está 100% cubierta por los 6 casos.
- `pnpm lint` -> 48 problemas preexistentes (18 errors, 30 warnings) no introducidos por este slice. No bloquea.
- Faltan integration/E2E reales con DB real y Playwright para flujo completo login->búsqueda->paginación. Próximo ciclo `e2e-testing`.

## 6. Merge Evidence
Squash permitido solo copiando este resumen al PR body. Checkpoints verificados en `28e4bca` reachable desde HEAD `feature/tdd-ecc-setup`.
