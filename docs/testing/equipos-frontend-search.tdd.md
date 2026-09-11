# TDD Evidence - Frontend buildEquiposParams (REGLA 14)

**Branch:** `feature/tdd-ecc-setup`
**Fecha:** 2026-09-10
**Runner:** `pnpm test` frontend (vitest 4.1.10 jsdom) + backend 21 passed
**Commits:** `b2907fa` (RED) -> `6b2c56f` (GREEN)

## Journeys
- Como usuario, quiero buscar "281" y que se envíe `?q=281` al backend para hallar equipo en página 2+.

## Task Report
- **RED:** `frontend/src/pages/Equipos.search.test.tsx` 6 casos fallan `buildEquiposParams is not a function` + `Cannot find module setup.ts`.
  - Cmd: `pnpm test` frontend -> `Tests 6 failed`
- **Fix:** Crear `frontend/src/tests/setup.ts`, exportar `buildEquiposParams` en `Equipos.tsx` con trim + URLSearchParams, refactorizar `fetchData` para usarlo.
  - Cmd: `pnpm test` frontend -> `Test Files 1 passed, Tests 6 passed`
  - Backend: `pnpm test` 21 passed (no regresión)

## Spec
| # | Garantía | Caso | Resultado |
|---|----------|------|-----------|
| 1 | q+page+limit | construye q + page + limit | PASS |
| 2 | q vacío no incluye | no incluye q si vacío | PASS |
| 3 | filtros TODOS no incluyen | no incluye filtros TODOS | PASS |
| 4 | filtros específicos incluye | incluye estado/ubicacion/categoria | PASS |
| 5 | codifica IP/espacios | codifica correctamente | PASS |
| 6 | paginación siempre | page/limit siempre | PASS |

## Coverage / Typecheck
- Frontend typecheck: error preexistente `IPAM.tsx:412 TOPOLOGY` no relacionado, no bloquea este slice.
- Backend coverage 66.49% (ver slice anterior).

## Merge Evidence
Checkpoint GREEN `6b2c56f` reachable desde HEAD.
