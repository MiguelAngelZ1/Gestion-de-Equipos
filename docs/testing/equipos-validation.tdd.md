# TDD Evidence - Validación Serie Única / NNE Libre

**Branch:** `feature/tdd-ecc-setup`
**Fecha:** 2026-09-10
**Runner:** `pnpm test` (vitest 4.1.8) + `pnpm typecheck`
**Commit:** test validación serie (GREEN, sin fix necesario - lógica ya existe)

## Journeys
- Como admin, quiero que serie duplicada sea rechazada para evitar colisión de inventario.
- Como admin, quiero que NNE pueda repetirse (requisito 2026-06-01) sin bloquear alta.
- Como sistema, validar que sin NNE ni serie se rechace.

## Task Report
- **Test añadido:** `backend/services/equipos.validation.test.ts` 7 casos, todos GREEN sin cambio de producción.
  - Cmd: `pnpm test` -> `Test Files 3 passed, Tests 21 passed (8 network + 6 search + 7 validation)`
  - `pnpm typecheck` -> OK
  - `pnpm exec vitest run --coverage` -> All files 66.49% (prev 52.57%), equipos.service mejora.

## Test Spec
| # | Garantía | Caso | Resultado |
|---|----------|------|-----------|
| 1 | Serie duplicada en create rechaza | `rechaza serie duplicada en create` | PASS |
| 2 | Serie duplicada en update distinto id rechaza | `rechaza serie duplicada en update` | PASS |
| 3 | Update mismo id permite misma serie | `permite serie duplicada mismo id` | PASS |
| 4 | Serie "-" / vacío no valida | `no valida serie si es "-"` | PASS |
| 5 | NNE duplicado permitido | `permite NNE duplicado` | PASS |
| 6 | Sin NNE ni serie rechaza | `rechaza si faltan ambos` | PASS |
| 7 | Trim de serie antes de validar | `trimtea serie` | PASS |

## Coverage
Previo 52.57% -> 66.49% (+14%). equipos.service aún <80% por métodos restantes (deleteBulk, etc) - se cubre en próximos slices.

## Merge Evidence
Checkpoint en HEAD feature/tdd-ecc-setup, sin fix de producción necesario (validación ya implementada per REGLA 13).
