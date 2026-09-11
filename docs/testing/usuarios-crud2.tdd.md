# TDD Evidence - Usuarios CRUD cobertura 80% global

**Branch:** `feature/tdd-ecc-setup`
**Fecha:** 2026-09-10
**Runner:** `pnpm test` 48 passed (6 suites), coverage All 80.07% Stmts /80.31% Lines
**Commit:** pendiente

## Journeys
- CRUD usuarios completo debe superar 80% global.

## Spec
| # | Garantía | Caso | Resultado |
|---|----------|------|-----------|
| 1 | getUsuarios lista | retorna lista | PASS |
| 2 | getUsuarioById parseInt | parseInt id | PASS |
| 3 | findByUsuarioOrEmail | busca por usuario o email | PASS |
| 4 | countUsuarios | parseInt count | PASS |
| 5 | updateUsuario sin password | sin password | PASS |
| 6 | updateUsuario con password hashea | con password hashea | PASS |
| 7 | deleteUsuario | parseInt | PASS |
| 8 | updateLastLogin | last_login | PASS |
| 9 | saveRecoveryCode | delete + insert | PASS |
| 10 | get/deleteRecoveryCode | get y delete | PASS |
| 11 | resetPasswordSync | reset | PASS |

## Cover
- Previo All 72.32% -> 80.07% Stmts, 80.31% Lines **supera 80% global**.
- usuarios.service 34% -> 94.28% Stmts, 97.05% Lines.
- equipos.service 86.91% se mantiene.

## Merge Evidence
Checkpoint GREEN, sin fix prod, solo tests.
