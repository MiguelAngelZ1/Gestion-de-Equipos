# TDD Evidence - Equipos CRUD cobertura 80%

**Branch:** `feature/tdd-ecc-setup`
**Fecha:** 2026-09-10
**Runner:** `pnpm test` 37 passed (5 suites), `pnpm exec vitest run --coverage` All 72.32%, equipos.service 86.91% Stmts
**Commit:** pendiente

## Journeys
- Como admin, CRUD equipo completo debe ser testeable y cubrir 80%+.

## Spec
| # | Garantía | Caso | Resultado |
|---|----------|------|-----------|
| 1 | getById dedup case-insensitive | retorna equipo con specs dedup | PASS |
| 2 | getById null si no existe | retorna null | PASS |
| 3 | delete soft + historial | deleteEquipo | PASS |
| 4 | deleteBulk vacio 0 | deleteBulk vacio | PASS |
| 5 | deleteBulk multiples | deleteBulk multiples | PASS |
| 6 | validación obligatorios | createOrUpdate valida | PASS |
| 7 | dedup especificaciones | dedup especificaciones | PASS |

## Cover
- Previo All 66.49% -> 72.32% (+6%). equipos.service 33% -> 86.91% Stmts, 86.59% Lines **supera 80%**.
- Resto usuarios.service 34% pendiente para 80% global.

## Merge Evidence
Checkpoint GREEN, sin fix prod, solo tests para cobertura.
