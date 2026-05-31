# Report: Spanish/English Naming Convention Inconsistencies

## 1. Current State: Directory Naming

### Backend (`backend/`)

| Directory | Language | Notes |
|-----------|----------|-------|
| `routes/` | English | `equipos.routes.ts`, `auth.routes.ts` — English dir, Spanish file content |
| `controllers/` | English | `equipos.controller.ts`, `auth.controller.ts` — English dir, Spanish file content |
| `servicios/` | **Spanish** | Should be `services/` in English |
| `repositorios/` | **Spanish** | Should be `repositories/` in English |
| `middleware/` | English | Consistent |
| `sincronizacion/` | **Spanish** | Should be `sync/` or `synchronization/` in English |
| `utils/` | English | Consistent |
| `config/` | English | Consistent |
| `db/` | English | Consistent |
| `prisma/` | English | Consistent |
| `scripts/` | English | Consistent |
| `src/tests/` | English | Consistent |

### Frontend (`frontend/src/`)

| Directory | Language | Notes |
|-----------|----------|-------|
| `pages/` | English | Files inside are Spanish named: `Equipos.jsx`, `Soporte.jsx` |
| `components/` | English | Subdirectories mix: `equipos/`, `soporte/`, `prestamos/` (Spanish) vs `common/`, `config/` (English) |
| `services/` | English | Consistent |
| `utils/` | English | Consistent |
| `context/` | English | Consistent |
| `layouts/` | English | Consistent |
| `tests/` | English | Consistent |

---

## 2. Inconsistencies Found

### 2.1 Directory Naming Conflicts (Backend)

- **`servicios/`** vs **`services/`** — Spanish/English pair for the same concept. English `controllers/` imports from Spanish `servicios/`.
- **`repositorios/`** vs no English equivalent — Spanish only, but all sibling dirs are English.
- **`sincronizacion/`** vs `sync` in filenames — Spanish dir name, but files inside use English (`syncLogger.ts`, `syncManager.ts`, `syncStats.ts`) and a Spanish file (`calcularHashEquipo.ts`).
- **`utils/`** is English, but all adjacent "service-layer" dirs (`servicios/`, `repositorios/`) are Spanish.

### 2.2 File Naming Conflicts

#### Backend Controllers
- `prestamosController.ts` — **no dot-separator**, inconsistent with all other controllers which use `.controller.ts` pattern (e.g., `equipos.controller.ts`)
- All other controllers follow `{spanish_noun}.controller.ts` — directory in English, filename content in Spanish

#### Backend Services
- `notificationService.ts` — **English** (should be `notificaciones.service.ts` to match others, or vice versa)
- `sincronizacionEquipos.ts` — **Spanish** file, but same dir has `syncLogger.ts`, `syncManager.ts`, `syncStats.ts` in English
- All others: `equipos.service.ts`, `usuarios.service.ts`, `soporte.service.ts` — Spanish noun + `.service.ts`

#### Backend Routes
- `prestamos.ts` — **missing route type suffix**, should be `prestamos.routes.ts` to match all other route files

### 2.3 Code-Level Naming Conflicts

#### Function/Variable Names (Backend controllers)
- `verificarAutenticacion`, `verificarAdmin` in `auth.middleware.ts` — Spanish function names in an English-named file
- `getEquipos`, `getEquipoById`, `createOrUpdateEquipo`, `deleteEquipo` — English verb + Spanish noun
- `crearPrestamo`, `devolverEquipo`, `limpiarHistorial` — Spanish verb + Spanish noun
- `login`, `forgotPassword`, `resetPassword`, `logout`, `me`, `refresh` — all English
- `getTareasSoporte`, `createOrUpdateTareaSoporte` — mixed English/Spanish in same file
- `calcularHashEquipo` — Spanish-only function

#### Comment Language
- Comments are **entirely in Spanish** across all files, regardless of code language: `"Asegurar que no haya caché"`, `"Registro de Historial"`, `"Gestión del responsable"`, `"Filtrar claves duplicadas"`
- Error messages are **entirely in Spanish**: `"Equipo no encontrado"`, `"No autorizado. Inicie sesión."`, `"Credenciales incorrectas"`

#### DB Column Names
- Table and column names are in **Spanish**: `equipos`, `usuarios`, `ubicaciones`, `responsables`, `especificaciones`, `prestamos`

### 2.4 Frontend Component Naming

#### Page Files (in `pages/`)
- `Dashboard.jsx` — English
- `Login.jsx` — English
- `IPAM.jsx` — English acronym
- `Equipos.jsx`, `Soporte.jsx`, `Historial.jsx`, `Prestamos.jsx`, `Configuracion.jsx`, `Componentes.jsx`, `MensajeAdmin.jsx` — Spanish

#### Component Subdirectories
- `common/` — English (contains `CommonCard`, `Toast`, `SearchInput`)
- `config/` — English (contains `BackupPanel`, `ProfilePanel`, `NotificationsPanel`)
- `equipos/` — Spanish (contains `EquipoDetalleModal`, `EquipoFormModal`, `AsignarIpModal`)
- `soporte/` — Spanish (contains `SoporteDetalleModal`, `SoporteFormModal`)
- `prestamos/` — Spanish (contains `ReceiveLoanModal`)
- `componentes/` — Spanish (contains `ComponenteDetalleModal`, `InstalarRepuestoModal`, `LocationChart`)

#### Component Name Language
- Mixed within the same subdirectory: `LocationChart.jsx` (English) in `componentes/` (Spanish) dir

---

## 3. Summary Statistics

| Category | English | Spanish | Mixed | Total |
|----------|---------|---------|-------|-------|
| Backend dirs | 7 | 3 | 0 | 10 |
| Backend route files | 0 | 13 | 1 | 14 |
| Backend controller files | 0 | 12 | 2 | 14 |
| Backend service files | 3 | 10 | 3 | 16 |
| Frontend page files | 2 | 0 | 8 | 10 |
| Frontend component dirs | 2 | 4 | 0 | 6 |
| Frontend service files | 2 | 0 | 0 | 2 |

---

## 4. Recommendation

### 4.1 Adopt English as the single language for all code identifiers

**Rationale:**
- All major frameworks, libraries, and tooling are English-based (Express, React, Node.js, Prisma, JWT)
- The project already uses English for infrastructure (`middleware/`, `utils/`, `db/`, `config/`, `routes/`, `controllers/`)
- Mixing languages creates cognitive overhead and makes onboarding harder for developers who don't speak Spanish
- English is the universal standard for programming; error messages in Spanish are fine for a Spanish-speaking user base, but internal code should be English

### 4.2 Specific convention

| Layer | Convention | Example |
|-------|-----------|---------|
| **Directory names** | English | `services/` not `servicios/` |
| **File names** | English `{noun}.{type}.ts` | `equipment.service.ts` not `equipos.service.ts` |
| **Function/variable names** | `camelCase` in English | `getEquipmentById` not `getEquipoById` nor `obtenerEquipoPorId` |
| **Class names** | `PascalCase` in English | `EquipmentService` not `EquiposService` |
| **Comments** | English for code intent, Spanish OK for domain-specific notes | — |
| **Error messages** | Spanish (this serves Spanish-speaking end users) | `"Equipo no encontrado"` ✓ |
| **DB schema** | Spanish OK (domain language for stakeholders) | `equipos`, `usuarios` ✓ |

### 4.3 If English is chosen → suggested renames

#### Rename directories:

| Current | Proposed |
|---------|----------|
| `backend/servicios/` | `backend/services/` |
| `backend/repositorios/` | `backend/repositories/` |
| `backend/sincronizacion/` | `backend/sync/` |

#### Rename files:

| Current | Proposed |
|---------|----------|
| `controllers/prestamosController.ts` | `controllers/loans.controller.ts` |
| `routes/prestamos.ts` | `routes/loans.routes.ts` |
| `servicios/sincronizacionEquipos.ts` | `services/equipmentSync.ts` |
| `servicios/notificationService.ts` | `services/notification.service.ts` |
| `repositorios/equiposRepositorio.ts` | `repositories/equipment.repository.ts` |
| `repositorios/especificacionesRepositorio.ts` | `repositories/specifications.repository.ts` |
| `sincronizacion/calcularHashEquipo.ts` | `sync/calculateEquipmentHash.ts` |

All other `.controller.ts`, `.service.ts`, `.routes.ts` files could also be renamed from Spanish nouns to English nouns (e.g., `equipos.controller.ts` → `equipment.controller.ts`, `usuarios.service.ts` → `user.service.ts`).

#### Rename frontend dirs & files:

| Current | Proposed |
|---------|----------|
| `pages/Equipos.jsx` | `pages/Equipment.jsx` |
| `pages/Soporte.jsx` | `pages/Support.jsx` |
| `pages/Prestamos.jsx` | `pages/Loans.jsx` |
| `pages/Configuracion.jsx` | `pages/Settings.jsx` |
| `pages/Componentes.jsx` | `pages/Components.jsx` |
| `pages/Historial.jsx` | `pages/History.jsx` |
| `pages/MensajeAdmin.jsx` | `pages/AdminMessages.jsx` |
| `components/equipos/` | `components/equipment/` |
| `components/soporte/` | `components/support/` |
| `components/prestamos/` | `components/loans/` |
| `components/componentes/` | `components/parts/` |
| `components/equipos/EquipoDetalleModal.jsx` | `components/equipment/EquipmentDetailModal.jsx` |
| `components/soporte/SoporteDetalleModal.jsx` | `components/support/SupportDetailModal.jsx` |
| etc. | |

### 4.4 If Spanish is chosen → simpler but less standard

- Rename `middleware/` → `intermediarios/` (awkward)
- Rename `utils/` → `utilidades/`
- Rename `config/` → `configuracion/`
- Rename `db/` → `bd/`
- Rename all English-named frontend dirs to Spanish

This is **not recommended** since most third-party code, docs, and tooling are in English.

---

## 5. Effort Estimate

- **Directory renames (3 backend dirs):** Low effort but requires updating all `require()`/`import` paths
- **Backend file renames (~10-15 files):** Medium effort — each rename needs import updates across controllers, routes, and services
- **Frontend renames (~25 files):** Medium effort — component names referenced in routes, imports, and navigation
- **Code-level renames (variables/functions):** High effort — pervasive changes across ~50+ files, high risk of merge conflicts
- **DB schema renames:** Not recommended — breaking change requiring migrations

**Suggested approach:** Phase 1: directories only (fixes the most visible inconsistency). Phase 2: file names. Phase 3: code identifiers (lowest priority).
