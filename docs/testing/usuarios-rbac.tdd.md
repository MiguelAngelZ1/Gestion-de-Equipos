# TDD Evidence - RBAC DEFAULT_USER_PERMISOS

**Branch:** `feature/tdd-ecc-setup`
**Fecha:** 2026-09-10
**Runner:** `pnpm test` backend 30 passed (4 suites)
**Commit:** `d857ba0` (GREEN, sin RED previo - lógica ya existía per REGLA 21)

## Journeys
- Como sistema, USER sin permisos_json recibe DEFAULT_USER_PERMISOS (7 perms ver).
- Como admin case-insensitive, `admin` == `ADMIN` bypass.

## Spec
| # | Garantía | Caso | Resultado |
|---|----------|------|-----------|
| 1 | USER sin permisos_json -> 7 perms | asigna DEFAULT_USER_PERMISOS | PASS |
| 2 | ADMIN sin permisos_json -> [] | asigna [] a ADMIN | PASS |
| 3 | permisos_json explicito respeta | respeta permisos_json explicito | PASS |
| 4 | rol admin lower -> ADMIN | admin lower case es ADMIN | PASS |
| 5 | ADMIN bypass | ADMIN mayuscula bypass | PASS |
| 6 | admin lower bypass | admin minuscula bypass via toUpperCase | PASS |
| 7 | USER con permiso pasa | USER con permiso pasa | PASS |
| 8 | USER sin permiso 403 | USER sin permiso 403 | PASS |
| 9 | sin user 401 | sin user 401 | PASS |

## Fix Producción
- `usuarios.service.ts`: `require` -> `import` con // @ts-ignore para vi.mock hoisted.
- `auth.middleware.ts`: `require` -> `import` con constants default, mantiene `toUpperCase()`.

## Coverage
All files 66% -> mejora tras RBAC (mismo), typecheck OK.
