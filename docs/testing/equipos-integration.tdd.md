# TDD Evidence - Integración Equipos (frontend)

**Branch:** `feature/tdd-ecc-setup`
**Fecha:** 2026-09-10
**Runner:** `pnpm test` frontend jsdom 9 passed (6 unit +3 integ), backend 30 passed
**Commit:** `d84c84c`

## Journeys
- Como usuario, busco "281" y veo equipo INE-281 sin recargar, via debounce 400ms.

## Task Report
- **Test:** `frontend/src/pages/Equipos.integration.test.tsx` 3 casos. Mock hoisted apiRequest + framer-motion.
- **Fix setup:** `frontend/src/tests/setup.ts` import jest-dom.
- **GREEN:** frontend 9 passed, backend 30 passed.

## Spec
| # | Garantía | Caso | Resultado |
|---|----------|------|-----------|
| 1 | Estado inicial vacio sin fetch /equipos | muestra estado inicial vacio | PASS |
| 2 | Type 281 -> fetch ?q=281 debounce | escribe búsqueda y hace fetch | PASS |
| 3 | Filtros sin búsqueda no fetch | filtros no disparan | PASS |

## Cover
Frontend 9 tests, backend 66% (slice previo). Sin Playwright pesado, integración via RTL es suficiente (ponytail).
