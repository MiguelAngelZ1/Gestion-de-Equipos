# Telegram Bot de Consulta de Equipos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a Telegram bot that lets the user query their equipment database (equipos + especificaciones) via a menu-driven chat interface, without using slash commands.

**Architecture:** A new `telegraf` bot that runs in the same Node.js process as the Express server. Uses a state machine (Map<chatId, Session>) to track conversation flow across menu/submenu/input states. Connects to the same SQLite `db` module the rest of the backend uses.

**Tech Stack:** telegraf (Telegram Bot API framework for Node.js), existing sqlite3 + Database class, TypeScript + CommonJS

---
## File Structure

### New files to create:

| File | Responsibility |
|------|---------------|
| `backend/telegram-bot/index.ts` | Bot setup (token, middleware, launch), exports `initBot()` |
| `backend/telegram-bot/session.ts` | Session state machine (Map<chatId, Session>, state transitions) |
| `backend/telegram-bot/queries.ts` | All database query functions (count, search, get specs, etc.) |
| `backend/telegram-bot/menus.ts` | Menu text builders (main menu, submenu text, result formatters) |
| `backend/telegram-bot/handlers.ts` | Message handler — routes user input based on current session state |

### Files to modify:

| File | Change |
|------|--------|
| `backend/package.json` | Add `telegraf` dependency |
| `backend/server.ts:66-80` | Call `initBot()` after DB connects, add bot shutdown on SIGTERM |
| `backend/.env` | Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_ALLOWED_USERS` |

---
## Session State Machine

```
IDLE ──("hola"|"ey"|"."|"buenas")──> MAIN_MENU
MAIN_MENU ──("1".."7")──> SUB_MENU or AWAITING_INPUT
MAIN_MENU ──("8")──> (show help, stay in MAIN_MENU)
SUB_MENU ──("1".."N")──> AWAITING_INPUT
SUB_MENU ──("0"|"volver")──> MAIN_MENU
AWAITING_INPUT ──(user types data)──> (query DB, show result) ──> RESULT
RESULT ──("1")──> MAIN_MENU
RESULT ──("2")──> (bot says "Chau!") ──> IDLE
AWAITING_INPUT / SUB_MENU / RESULT ──("menu"|"volver")──> MAIN_MENU
```

**Session interface:**
```typescript
interface Session {
  state: 'IDLE' | 'MAIN_MENU' | 'SUB_MENU' | 'AWAITING_INPUT' | 'RESULT';
  subMenu?: string;         // e.g. 'contrasenas', 'red', 'hardware', 'listados'
  awaitingType?: string;    // e.g. 'pass_admin', 'ubicacion_count', 'serie_for_info'
  tempData?: Record<string, any>;
  lastResult?: string;      // last message_id for editing
}
```

---
## Menu Tree

```
MAIN_MENU:
1️⃣ Cantidad de equipos
2️⃣ Contraseñas y credenciales
3️⃣ Datos de red
4️⃣ Hardware y sistema
5️⃣ Info completa de un equipo
6️⃣ Buscar (texto libre)
7️⃣ Listados
8️⃣ Ayuda

SUB_MENU → "1" (Cantidad):
  → AWAITING_INPUT (ubicacion)
  → AWAITING_INPUT (estado)
  → AWAITING_INPUT (responsable)
  → query total general → show result

SUB_MENU → "2" (Contraseñas):
  1️⃣ PASS ADMIN
  2️⃣ PASS ESTANDAR
  3️⃣ PASS BIOS
  4️⃣ PASS RUSTDESK
  5️⃣ CUENTA ADMIN
  6️⃣ CUENTA ESTANDAR
  7️⃣ Todas las credenciales
  → AWAITING_INPUT (serie/nne/cuenta → lookup equipo → show credential)

SUB_MENU → "3" (Datos de red):
  1️⃣ IP + red de un equipo
  2️⃣ Buscar equipo por IP
  3️⃣ MAC de un equipo
  4️⃣ Todo lo de red de un equipo
  → AWAITING_INPUT (search term)

SUB_MENU → "4" (Hardware):
  1️⃣ Procesador
  2️⃣ RAM
  3️⃣ Disco
  4️⃣ Sistema operativo
  → AWAITING_INPUT (search term)

SUB_MENU → "7" (Listados):
  1️⃣ Equipos en una ubicación
  2️⃣ Equipos de un responsable
  3️⃣ Equipos por estado
  4️⃣ Todas las ubicaciones
  → AWAITING_INPUT or show list

"5" → AWAITING_INPUT (serie/nne/ine → show full card)
"6" → AWAITING_INPUT (free text → search all fields)
```

---
## Database Queries

All queries use the existing `db` module (`require('../db/database')`).

### Query: countByUbicacion
```sql
SELECT u.nombre, COUNT(e.id) as total
FROM equipos e
JOIN ubicaciones u ON e.ubicacion_id = u.id
WHERE e.is_deleted = 0 AND u.nombre LIKE ?
GROUP BY u.id
ORDER BY total DESC
```

### Query: findEquipo (search by serie, INE, NNE, or cuenta admin)
```sql
-- Try exact match first
SELECT e.id, e.ine, e.nne, e.serie
FROM equipos e
WHERE e.is_deleted = 0
  AND (e.serie = ? OR e.nne = ? OR e.ine LIKE ?)

-- Fallback: search in especificaciones for cuenta admin
SELECT e.id, e.ine, e.nne, e.serie
FROM equipos e
JOIN especificaciones esp ON esp.equipo_id = e.id
WHERE e.is_deleted = 0
  AND esp.clave IN ('CUENTA ADMIN', 'USUARIO ADMIN')
  AND esp.valor = ?
```

### Query: getPasswordsByTipo(equipoId, tipoClave)
```sql
SELECT clave, valor FROM especificaciones
WHERE equipo_id = ? AND clave = ?
ORDER BY id ASC
```

### Query: getFullEquipoInfo(equipoId)
```sql
SELECT e.*, gc.nombre as tipo, es.nombre as estado, es.color_hex,
       u.nombre as ubicacion_nombre, u.ubicacion as ubicacion_desc,
       r.nombre as responsable_nombre, r.apellido as responsable_apellido, r.grado as responsable_grado
FROM equipos e
LEFT JOIN grupos_comodidad gc ON e.categoria_id = gc.id
LEFT JOIN estados es ON e.estado_id = es.id
LEFT JOIN ubicaciones u ON e.ubicacion_id = u.id
LEFT JOIN responsables r ON e.responsable_id = r.id
WHERE e.id = ? AND e.is_deleted = 0
```

### Query: searchEquipos(term)
```sql
SELECT e.id, e.ine, e.nne, e.serie, u.nombre as ubicacion
FROM equipos e
LEFT JOIN ubicaciones u ON e.ubicacion_id = u.id
LEFT JOIN responsables r ON e.responsable_id = r.id
LEFT JOIN grupos_comodidad gc ON e.categoria_id = gc.id
LEFT JOIN estados es ON e.estado_id = es.id
WHERE e.is_deleted = 0
  AND (
    e.ine LIKE ? OR e.nne LIKE ? OR e.serie LIKE ?
    OR u.nombre LIKE ? OR r.nombre LIKE ? OR r.apellido LIKE ?
    OR EXISTS (
      SELECT 1 FROM especificaciones esp
      WHERE esp.equipo_id = e.id
      AND (esp.clave LIKE ? OR esp.valor LIKE ?)
    )
  )
ORDER BY e.ine ASC
LIMIT 10
```

### Query: listUbicaciones
```sql
SELECT id, nombre FROM ubicaciones ORDER BY nombre ASC
```

### Query: listResponsables
```sql
SELECT id, nombre, apellido, grado FROM responsables WHERE activo = 1 ORDER BY apellido ASC
```

### Query: equiposByUbicacion(ubicacionNombre)
```sql
SELECT e.ine, e.nne, e.serie, es.nombre as estado
FROM equipos e
JOIN ubicaciones u ON e.ubicacion_id = u.id
LEFT JOIN estados es ON e.estado_id = es.id
WHERE e.is_deleted = 0 AND u.nombre LIKE ?
ORDER BY e.ine ASC
```

---
## Tasks

### Task 1: Install dependency and create bot structure

**Files:**
- Modify: `backend/package.json`
- Create: `backend/telegram-bot/index.ts`
- Create: `backend/telegram-bot/session.ts`

- [ ] **Step 1: Install telegraf**

Run: `pnpm add telegraf`

- [ ] **Step 2: Create session.ts — state machine**

```typescript
const db = require('../db/database');

const sessions = new Map();

const STATES = {
  IDLE: 'IDLE',
  MAIN_MENU: 'MAIN_MENU',
  SUB_MENU: 'SUB_MENU',
  AWAITING_INPUT: 'AWAITING_INPUT',
  RESULT: 'RESULT',
};

function getSession(chatId) {
  if (!sessions.has(chatId)) {
    sessions.set(chatId, { state: STATES.IDLE });
  }
  return sessions.get(chatId);
}

function setState(chatId, state, extra = {}) {
  const session = getSession(chatId);
  session.state = state;
  Object.assign(session, extra);
}

function resetSession(chatId) {
  sessions.delete(chatId);
}

module.exports = { sessions, STATES, getSession, setState, resetSession };
```

- [ ] **Step 3: Create index.ts — bot skeleton**

```typescript
const { Telegraf } = require('telegraf');
const logger = require('../utils/logger');

let bot = null;

function initBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    logger.warn('[TelegramBot] TELEGRAM_BOT_TOKEN no configurado. Bot deshabilitado.');
    return null;
  }

  bot = new Telegraf(token);

  bot.launch().then(() => {
    logger.info('[TelegramBot] Bot iniciado correctamente');
  }).catch((err) => {
    logger.error({ err }, '[TelegramBot] Error al iniciar');
  });

  return bot;
}

function stopBot() {
  if (bot) {
    bot.stop('SIGTERM');
    logger.info('[TelegramBot] Bot detenido');
  }
}

module.exports = { initBot, stopBot };
```

- [ ] **Step 4: Verify bot file loads without errors**

Run: `node -e "require('./backend/telegram-bot/index')"` from project root
Expected: no errors

---

### Task 2: Implement database queries module

**Files:**
- Create: `backend/telegram-bot/queries.ts`

- [ ] **Step 1: Create queries.ts with all database functions**

```typescript
const db = require('../db/database');

async function countByUbicacion(searchTerm) {
  return db.all(`
    SELECT u.nombre, COUNT(e.id) as total
    FROM equipos e
    JOIN ubicaciones u ON e.ubicacion_id = u.id
    WHERE e.is_deleted = 0 AND u.nombre LIKE ?
    GROUP BY u.id
    ORDER BY total DESC
  `, [`%${searchTerm}%`]);
}

async function countByEstado(searchTerm) {
  return db.all(`
    SELECT es.nombre, COUNT(e.id) as total
    FROM equipos e
    JOIN estados es ON e.estado_id = es.id
    WHERE e.is_deleted = 0 AND es.nombre LIKE ?
    GROUP BY es.id
    ORDER BY total DESC
  `, [`%${searchTerm}%`]);
}

async function countByResponsable(searchTerm) {
  return db.all(`
    SELECT r.nombre, r.apellido, r.grado, COUNT(e.id) as total
    FROM equipos e
    JOIN responsables r ON e.responsable_id = r.id
    WHERE e.is_deleted = 0 AND (r.nombre LIKE ? OR r.apellido LIKE ?)
    GROUP BY r.id
    ORDER BY total DESC
  `, [`%${searchTerm}%`, `%${searchTerm}%`]);
}

async function getTotalEquipos() {
  const row = await db.get('SELECT COUNT(*) as total FROM equipos WHERE is_deleted = 0');
  return row.total;
}

async function findEquipo(searchTerm) {
  const term = searchTerm.trim();
  if (!term) return null;

  // Try exact match on serie, nne, ine
  let equipo = await db.get(`
    SELECT e.*, u.nombre as ubicacion_nombre,
           r.nombre as responsable_nombre, r.apellido as responsable_apellido, r.grado as responsable_grado
    FROM equipos e
    LEFT JOIN ubicaciones u ON e.ubicacion_id = u.id
    LEFT JOIN responsables r ON e.responsable_id = r.id
    WHERE e.is_deleted = 0 AND (e.serie = ? OR e.nne = ?)
    LIMIT 1
  `, [term, term]);

  if (equipo) return equipo;

  // Try LIKE on ine
  equipo = await db.get(`
    SELECT e.*, u.nombre as ubicacion_nombre,
           r.nombre as responsable_nombre, r.apellido as responsable_apellido, r.grado as responsable_grado
    FROM equipos e
    LEFT JOIN ubicaciones u ON e.ubicacion_id = u.id
    LEFT JOIN responsables r ON e.responsable_id = r.id
    WHERE e.is_deleted = 0 AND e.ine LIKE ?
    LIMIT 1
  `, [`%${term}%`]);

  if (equipo) return equipo;

  // Fallback: search especificaciones (cuenta admin, user, etc)
  equipo = await db.get(`
    SELECT e.*, u.nombre as ubicacion_nombre,
           r.nombre as responsable_nombre, r.apellido as responsable_apellido, r.grado as responsable_grado
    FROM equipos e
    JOIN especificaciones esp ON esp.equipo_id = e.id
    LEFT JOIN ubicaciones u ON e.ubicacion_id = u.id
    LEFT JOIN responsables r ON e.responsable_id = r.id
    WHERE e.is_deleted = 0 AND esp.valor = ?
    LIMIT 1
  `, [term]);

  return equipo || null;
}

async function getEspecificaciones(equipoId, claveFilter = null) {
  if (claveFilter) {
    return db.all(
      'SELECT clave, valor FROM especificaciones WHERE equipo_id = ? AND clave = ? ORDER BY id ASC',
      [equipoId, claveFilter]
    );
  }
  return db.all(
    'SELECT clave, valor FROM especificaciones WHERE equipo_id = ? ORDER BY id ASC',
    [equipoId]
  );
}

async function getEquiposByUbicacion(ubicacionNombre) {
  return db.all(`
    SELECT e.ine, e.nne, e.serie, es.nombre as estado
    FROM equipos e
    JOIN ubicaciones u ON e.ubicacion_id = u.id
    LEFT JOIN estados es ON e.estado_id = es.id
    WHERE e.is_deleted = 0 AND u.nombre LIKE ?
    ORDER BY e.ine ASC
  `, [`%${ubicacionNombre}%`]);
}

async function getEquiposByEstado(estadoNombre) {
  return db.all(`
    SELECT e.ine, e.nne, e.serie, u.nombre as ubicacion
    FROM equipos e
    JOIN estados es ON e.estado_id = es.id
    LEFT JOIN ubicaciones u ON e.ubicacion_id = u.id
    WHERE e.is_deleted = 0 AND es.nombre LIKE ?
    ORDER BY e.ine ASC
  `, [`%${estadoNombre}%`]);
}

async function getEquiposByResponsable(searchTerm) {
  return db.all(`
    SELECT e.ine, e.nne, e.serie, u.nombre as ubicacion
    FROM equipos e
    JOIN responsables r ON e.responsable_id = r.id
    LEFT JOIN ubicaciones u ON e.ubicacion_id = u.id
    WHERE e.is_deleted = 0 AND (r.nombre LIKE ? OR r.apellido LIKE ?)
    ORDER BY e.ine ASC
  `, [`%${searchTerm}%`, `%${searchTerm}%`]);
}

async function searchAll(term) {
  const search = `%${term}%`;
  return db.all(`
    SELECT DISTINCT e.id, e.ine, e.nne, e.serie,
           u.nombre as ubicacion, es.nombre as estado
    FROM equipos e
    LEFT JOIN ubicaciones u ON e.ubicacion_id = u.id
    LEFT JOIN responsables r ON e.responsable_id = r.id
    LEFT JOIN grupos_comodidad gc ON e.categoria_id = gc.id
    LEFT JOIN estados es ON e.estado_id = es.id
    WHERE e.is_deleted = 0
      AND (
        e.ine LIKE ? OR e.nne LIKE ? OR e.serie LIKE ?
        OR u.nombre LIKE ? OR r.nombre LIKE ? OR r.apellido LIKE ? OR r.grado LIKE ?
        OR EXISTS (
          SELECT 1 FROM especificaciones esp
          WHERE esp.equipo_id = e.id AND (esp.clave LIKE ? OR esp.valor LIKE ?)
        )
      )
    ORDER BY e.ine ASC
    LIMIT 15
  `, [search, search, search, search, search, search, search, search, search]);
}

async function searchByIP(ip) {
  return db.all(`
    SELECT e.id, e.ine, e.nne, e.serie, u.nombre as ubicacion,
           esp.clave, esp.valor
    FROM equipos e
    JOIN especificaciones esp ON esp.equipo_id = e.id
    LEFT JOIN ubicaciones u ON e.ubicacion_id = u.id
    WHERE e.is_deleted = 0
      AND (esp.clave IN ('IP', 'ip', 'DIRECCION IP', 'DIRECCIÓN IP') OR esp.clave LIKE '%ip%')
      AND esp.valor LIKE ?
    ORDER BY e.ine ASC
    LIMIT 5
  `, [`%${ip}%`]);
}

async function listUbicaciones() {
  return db.all('SELECT id, nombre FROM ubicaciones ORDER BY nombre ASC');
}

async function listResponsables() {
  return db.all("SELECT id, nombre, apellido, grado FROM responsables WHERE activo = 1 ORDER BY apellido ASC");
}

module.exports = {
  countByUbicacion, countByEstado, countByResponsable, getTotalEquipos,
  findEquipo, getEspecificaciones,
  getEquiposByUbicacion, getEquiposByEstado, getEquiposByResponsable,
  searchAll, searchByIP,
  listUbicaciones, listResponsables,
};
```

- [ ] **Step 2: Verify queries module loads**

Run: `node -e "require('./backend/telegram-bot/queries')"` from project root
Expected: no errors

---

### Task 3: Implement menus module (text formatters)

**Files:**
- Create: `backend/telegram-bot/menus.ts`

- [ ] **Step 1: Create menus.ts with all menu texts and result formatters**

```typescript
function mainMenu() {
  return (
    '🤖 *Bot de Consulta de Equipos*\n\n' +
    'Elegí una opción:\n\n' +
    '1️⃣  Cantidad de equipos\n' +
    '2️⃣  Contraseñas y credenciales\n' +
    '3️⃣  Datos de red\n' +
    '4️⃣  Hardware y sistema\n' +
    '5️⃣  Info completa de un equipo\n' +
    '6️⃣  Buscar (texto libre)\n' +
    '7️⃣  Listados\n' +
    '8️⃣  Ayuda\n\n' +
    'O escribí "salir" para terminar.'
  );
}

function subMenuCantidad() {
  return (
    '📊 *Cantidad de equipos*\n\n' +
    '1️⃣  Por ubicación\n' +
    '2️⃣  Por estado\n' +
    '3️⃣  Por responsable\n' +
    '4️⃣  Total general\n' +
    '0️⃣  🔙 Volver al menú principal'
  );
}

function subMenuContrasenas() {
  return (
    '🔐 *Contraseñas y credenciales*\n\n' +
    '1️⃣  PASS ADMIN\n' +
    '2️⃣  PASS ESTANDAR\n' +
    '3️⃣  PASS BIOS\n' +
    '4️⃣  PASS RUSTDESK\n' +
    '5️⃣  CUENTA ADMIN\n' +
    '6️⃣  CUENTA ESTANDAR\n' +
    '7️⃣  Todas las credenciales\n' +
    '0️⃣  🔙 Volver al menú principal'
  );
}

function subMenuRed() {
  return (
    '🌐 *Datos de red*\n\n' +
    '1️⃣  IP y red de un equipo\n' +
    '2️⃣  Buscar equipo por IP\n' +
    '3️⃣  MAC de un equipo\n' +
    '4️⃣  Todos los datos de red de un equipo\n' +
    '0️⃣  🔙 Volver al menú principal'
  );
}

function subMenuHardware() {
  return (
    '🖥️ *Hardware y sistema*\n\n' +
    '1️⃣  Procesador\n' +
    '2️⃣  RAM\n' +
    '3️⃣  Disco\n' +
    '4️⃣  Sistema operativo\n' +
    '5️⃣  Todo el hardware\n' +
    '0️⃣  🔙 Volver al menú principal'
  );
}

function subMenuListados() {
  return (
    '📋 *Listados*\n\n' +
    '1️⃣  Equipos en una ubicación\n' +
    '2️⃣  Equipos de un responsable\n' +
    '3️⃣  Equipos por estado\n' +
    '4️⃣  Todas las ubicaciones\n' +
    '5️⃣  Todos los responsables\n' +
    '0️⃣  🔙 Volver al menú principal'
  );
}

function helpText() {
  return (
    '🤖 *Ayuda - Bot de Equipos*\n\n' +
    'Este bot te permite consultar la base de datos de equipos ' +
    'desde Telegram.\n\n' +
    'Simplemente escribí "hola", "ey", "menú" o cualquier ' +
    'mensaje para empezar.\n\n' +
    'Navegá por los menúes eligiendo el número de la opción.\n' +
    'En cualquier momento podés escribir:\n' +
    '  • "menú" — volver al menú principal\n' +
    '  • "salir" — terminar la conversación\n\n' +
    'Los datos se consultan en vivo desde la base de datos.'
  );
}

function formatEquipoCard(equipo, specs) {
  const lines = [
    `💻 *${equipo.ine}*`,
    ``,
    `📍 *Ubicación:* ${equipo.ubicacion_nombre || 'Sin asignar'}`,
    `👤 *Responsable:* ${equipo.responsable_grado || ''} ${equipo.responsable_nombre || ''} ${equipo.responsable_apellido || ''}`.trim() || 'Sin asignar',
    `📌 *Estado:* ${equipo.estado || 'N/A'}`,
  ];

  if (equipo.nne && equipo.nne !== '-') lines.push(`🔖 *NNE:* ${equipo.nne}`);
  if (equipo.serie && equipo.serie !== '-') lines.push(`🔖 *Serie:* ${equipo.serie}`);

  if (specs && specs.length > 0) {
    lines.push(``, `📋 *Especificaciones:*`);
    for (const spec of specs) {
      const val = spec.clave.toUpperCase().includes('PASS') || spec.clave.toUpperCase().includes('CONTRASEÑA')
        ? `||${spec.valor}||`  // Telegram spoiler tag for passwords
        : spec.valor;
      lines.push(`  • *${spec.clave}:* ${val}`);
    }
  }

  return lines.join('\n');
}

function formatEquipoCompact(equipo) {
  return `💻 ${equipo.ine} — ${equipo.ubicacion || '?'} (${equipo.estado || '?'})`;
}

module.exports = {
  mainMenu, subMenuCantidad, subMenuContrasenas, subMenuRed, subMenuHardware,
  subMenuListados, helpText, formatEquipoCard, formatEquipoCompact,
};
```

- [ ] **Step 2: Verify menus module loads**

Run: `node -e "require('./backend/telegram-bot/menus')"` from project root
Expected: no errors

---

### Task 4: Implement message handlers (main logic)

**Files:**
- Create: `backend/telegram-bot/handlers.ts`

- [ ] **Step 1: Create handlers.ts with the state-machine router**

```typescript
const logger = require('../utils/logger');
const { getSession, setState, resetSession, STATES } = require('./session');
const { mainMenu, subMenuCantidad, subMenuContrasenas, subMenuRed, subMenuHardware, subMenuListados, helpText, formatEquipoCard, formatEquipoCompact } = require('./menus');
const q = require('./queries');

function isAllowed(chatId) {
  const allowed = process.env.TELEGRAM_ALLOWED_USERS;
  if (!allowed) return true; // if not configured, allow all
  return allowed.split(',').map(s => s.trim()).includes(String(chatId));
}

async function handleMessage(ctx) {
  const chatId = ctx.chat.id;
  const text = (ctx.message.text || '').trim();

  if (!isAllowed(chatId)) {
    return ctx.reply('⛔ No tenés permiso para usar este bot.');
  }

  const session = getSession(chatId);

  // Global commands: always work
  if (['salir', 'chau', 'adiós', 'adios', 'gracias'].includes(text.toLowerCase())) {
    resetSession(chatId);
    return ctx.reply('¡Hasta luego! Mandame un mensaje cuando me necesites.');
  }

  if (['menu', 'menú', 'volver', 'atras', 'atrás'].includes(text.toLowerCase())) {
    setState(chatId, STATES.MAIN_MENU);
    return ctx.reply(mainMenu(), { parse_mode: 'Markdown' });
  }

  // IDLE state — start the conversation
  if (session.state === STATES.IDLE) {
    setState(chatId, STATES.MAIN_MENU);
    return ctx.reply(mainMenu(), { parse_mode: 'Markdown' });
  }

  // MAIN_MENU state
  if (session.state === STATES.MAIN_MENU) {
    return handleMainMenu(ctx, chatId, text);
  }

  // SUB_MENU state
  if (session.state === STATES.SUB_MENU) {
    return handleSubMenu(ctx, chatId, text, session);
  }

  // AWAITING_INPUT state
  if (session.state === STATES.AWAITING_INPUT) {
    return handleAwaitingInput(ctx, chatId, text, session);
  }

  // RESULT state
  if (session.state === STATES.RESULT) {
    if (text === '1') {
      setState(chatId, STATES.MAIN_MENU);
      return ctx.reply(mainMenu(), { parse_mode: 'Markdown' });
    }
    if (text === '2') {
      resetSession(chatId);
      return ctx.reply('¡Hasta luego! Mandame un mensaje cuando me necesites.');
    }
    return ctx.reply('Respondé con 1 para seguir consultando o 2 para salir.');
  }
}

async function handleMainMenu(ctx, chatId, text) {
  switch (text) {
    case '1':
      setState(chatId, STATES.SUB_MENU, { subMenu: 'cantidad' });
      return ctx.reply(subMenuCantidad(), { parse_mode: 'Markdown' });
    case '2':
      setState(chatId, STATES.SUB_MENU, { subMenu: 'contrasenas' });
      return ctx.reply(subMenuContrasenas(), { parse_mode: 'Markdown' });
    case '3':
      setState(chatId, STATES.SUB_MENU, { subMenu: 'red' });
      return ctx.reply(subMenuRed(), { parse_mode: 'Markdown' });
    case '4':
      setState(chatId, STATES.SUB_MENU, { subMenu: 'hardware' });
      return ctx.reply(subMenuHardware(), { parse_mode: 'Markdown' });
    case '5':
      setState(chatId, STATES.AWAITING_INPUT, { awaitingType: 'info_completa' });
      return ctx.reply('🔍 Decime el número de serie, INE, NNE o nombre de cuenta del equipo:');
    case '6':
      setState(chatId, STATES.AWAITING_INPUT, { awaitingType: 'busqueda_libre' });
      return ctx.reply('🔍 Decime qué querés buscar (texto libre: serie, nombre, IP, usuario, etc.):');
    case '7':
      setState(chatId, STATES.SUB_MENU, { subMenu: 'listados' });
      return ctx.reply(subMenuListados(), { parse_mode: 'Markdown' });
    case '8':
      return ctx.reply(helpText(), { parse_mode: 'Markdown' });
    default:
      return ctx.reply('❌ Opción no válida. Elegí un número del 1 al 8.');
  }
}

async function handleSubMenu(ctx, chatId, text, session) {
  if (text === '0') {
    setState(chatId, STATES.MAIN_MENU);
    return ctx.reply(mainMenu(), { parse_mode: 'Markdown' });
  }

  const { subMenu } = session;

  if (subMenu === 'cantidad') {
    return handleCantidadSubMenu(ctx, chatId, text);
  }
  if (subMenu === 'contrasenas') {
    return handleContrasenasSubMenu(ctx, chatId, text);
  }
  if (subMenu === 'red') {
    return handleRedSubMenu(ctx, chatId, text);
  }
  if (subMenu === 'hardware') {
    return handleHardwareSubMenu(ctx, chatId, text);
  }
  if (subMenu === 'listados') {
    return handleListadosSubMenu(ctx, chatId, text);
  }

  return ctx.reply('❌ Opción no válida.');
}

async function handleCantidadSubMenu(ctx, chatId, text) {
  if (text === '4') {
    try {
      const total = await q.getTotalEquipos();
      setState(chatId, STATES.RESULT);
      return ctx.reply(
        `📊 *Total de equipos activos:* ${total}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      logger.error({ err }, '[TelegramBot] Error getting total');
      return ctx.reply('❌ Error al consultar la base de datos.');
    }
  }

  let awaitingType;
  let prompt;

  if (text === '1') {
    awaitingType = 'cantidad_ubicacion';
    prompt = '📍 Decime el nombre de la ubicación (ej: "tropa", "oficina", "deposito"):';
  } else if (text === '2') {
    awaitingType = 'cantidad_estado';
    prompt = '📌 Decime el estado (E/S, F/S, MANT, PRESTAMO):';
  } else if (text === '3') {
    awaitingType = 'cantidad_responsable';
    prompt = '👤 Decime el nombre o apellido del responsable:';
  } else {
    return ctx.reply('❌ Opción no válida. Elegí 1-4.');
  }

  setState(chatId, STATES.AWAITING_INPUT, { awaitingType });
  return ctx.reply(prompt);
}

async function handleContrasenasSubMenu(ctx, chatId, text) {
  const tipoMap = {
    '1': 'PASS ADMIN',
    '2': 'PASS ESTANDAR',
    '3': 'PASS BIOS',
    '4': 'PASS RUSTDESK',
    '5': 'CUENTA ADMIN',
    '6': 'CUENTA ESTANDAR',
    '7': 'TODAS',
  };

  const tipo = tipoMap[text];
  if (!tipo) return ctx.reply('❌ Opción no válida. Elegí 1-7.');

  setState(chatId, STATES.AWAITING_INPUT, {
    awaitingType: 'credencial',
    credencialTipo: tipo,
  });

  const prompt = tipo === 'TODAS'
    ? '🔍 Decime el número de serie, INE, NNE o nombre de cuenta del equipo:'
    : `🔍 Decime el número de serie, INE, NNE o nombre de cuenta para buscar el *${tipo}*:`;

  return ctx.reply(prompt, { parse_mode: 'Markdown' });
}

async function handleRedSubMenu(ctx, chatId, text) {
  const tipoMap = {
    '1': 'red_equipo',
    '2': 'buscar_ip',
    '3': 'mac_equipo',
    '4': 'red_todo',
  };

  const tipo = tipoMap[text];
  if (!tipo) return ctx.reply('❌ Opción no válida. Elegí 1-4.');

  let prompt;
  if (tipo === 'buscar_ip') {
    prompt = '🌐 Decime la dirección IP (ej: "10.22.16.7"):';
  } else if (tipo === 'mac_equipo') {
    prompt = '🔍 Decime el número de serie, INE o NNE del equipo:';
  } else {
    prompt = '🔍 Decime el número de serie, INE o NNE del equipo:';
  }

  setState(chatId, STATES.AWAITING_INPUT, { awaitingType: tipo });
  return ctx.reply(prompt);
}

async function handleHardwareSubMenu(ctx, chatId, text) {
  const tipoMap = {
    '1': 'PROCESADOR',
    '2': 'RAM',
    '3': 'DISCO',
    '4': 'SO',
    '5': 'TODO_HW',
  };

  const tipo = tipoMap[text];
  if (!tipo) return ctx.reply('❌ Opción no válida. Elegí 1-5.');

  setState(chatId, STATES.AWAITING_INPUT, { awaitingType: 'hardware', hardwareClave: tipo });

  const prompt = tipo === 'TODO_HW'
    ? '🔍 Decime el número de serie, INE o NNE del equipo:'
    : `🔍 Decime el número de serie, INE o NNE para ver el *${tipo}*:`;

  return ctx.reply(prompt, { parse_mode: 'Markdown' });
}

async function handleListadosSubMenu(ctx, chatId, text) {
  if (text === '4') {
    try {
      const ubicaciones = await q.listUbicaciones();
      const lines = ubicaciones.map((u, i) => `${i + 1}. ${u.nombre}`);
      setState(chatId, STATES.RESULT);
      return ctx.reply(
        `📍 *Ubicaciones:*\n${lines.join('\n')}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      logger.error({ err }, '[TelegramBot] Error listing ubicaciones');
      return ctx.reply('❌ Error al consultar.');
    }
  }

  if (text === '5') {
    try {
      const responsables = await q.listResponsables();
      const lines = responsables.map((r, i) =>
        `${i + 1}. ${r.grado ? r.grado + ' ' : ''}${r.nombre} ${r.apellido}`
      );
      setState(chatId, STATES.RESULT);
      return ctx.reply(
        `👤 *Responsables:*\n${lines.join('\n')}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      logger.error({ err }, '[TelegramBot] Error listing responsables');
      return ctx.reply('❌ Error al consultar.');
    }
  }

  if (text === '1') {
    setState(chatId, STATES.AWAITING_INPUT, { awaitingType: 'listado_ubicacion' });
    return ctx.reply('📍 Decime el nombre de la ubicación:');
  }
  if (text === '2') {
    setState(chatId, STATES.AWAITING_INPUT, { awaitingType: 'listado_responsable' });
    return ctx.reply('👤 Decime el nombre o apellido del responsable:');
  }
  if (text === '3') {
    setState(chatId, STATES.AWAITING_INPUT, { awaitingType: 'listado_estado' });
    return ctx.reply('📌 Decime el estado (E/S, F/S, MANT, PRESTAMO):');
  }

  return ctx.reply('❌ Opción no válida. Elegí 1-5.');
}

async function handleAwaitingInput(ctx, chatId, text, session) {
  const { awaitingType, credencialTipo, hardwareClave } = session;

  try {
    // ── CANTIDAD ──
    if (awaitingType === 'cantidad_ubicacion') {
      const rows = await q.countByUbicacion(text);
      if (rows.length === 0) return ctx.reply('📍 No encontré ubicaciones con ese nombre.');
      const lines = rows.map(r => `📍 *${r.nombre}:* ${r.total} equipos`);
      setState(chatId, STATES.RESULT);
      return ctx.reply(
        `${lines.join('\n')}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`,
        { parse_mode: 'Markdown' }
      );
    }

    if (awaitingType === 'cantidad_estado') {
      const rows = await q.countByEstado(text);
      if (rows.length === 0) return ctx.reply('📌 No encontré equipos con ese estado.');
      const lines = rows.map(r => `📌 *${r.nombre}:* ${r.total} equipos`);
      setState(chatId, STATES.RESULT);
      return ctx.reply(
        `${lines.join('\n')}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`,
        { parse_mode: 'Markdown' }
      );
    }

    if (awaitingType === 'cantidad_responsable') {
      const rows = await q.countByResponsable(text);
      if (rows.length === 0) return ctx.reply('👤 No encontré responsables con ese nombre.');
      const lines = rows.map(r =>
        `👤 *${r.grado ? r.grado + ' ' : ''}${r.nombre} ${r.apellido}:* ${r.total} equipos`
      );
      setState(chatId, STATES.RESULT);
      return ctx.reply(
        `${lines.join('\n')}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`,
        { parse_mode: 'Markdown' }
      );
    }

    // ── CREDENCIALES ──
    if (awaitingType === 'credencial') {
      const equipo = await q.findEquipo(text);
      if (!equipo) return ctx.reply('❌ No encontré ningún equipo con ese identificador.');

      const specs = await q.getEspecificaciones(equipo.id);

      if (credencialTipo === 'TODAS') {
        const credenciales = specs.filter(s =>
          s.clave.includes('CUENTA') || s.clave.includes('PASS') ||
          s.clave.includes('CONTRASEÑA') || s.clave.includes('CLAVE') ||
          s.clave.includes('RUSTDESK') || s.clave.includes('BIOS') ||
          s.clave.includes('USUARIO')
        );
        const card = `🔐 *${equipo.ine}*\n📍 ${equipo.ubicacion_nombre || '?'}\n\n` +
          (credenciales.length > 0
            ? credenciales.map(s => `*${s.clave}:* ||${s.valor}||`).join('\n')
            : 'No tiene credenciales registradas.');
        setState(chatId, STATES.RESULT);
        return ctx.reply(`${card}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`, { parse_mode: 'Markdown' });
      }

      const filtered = specs.filter(s => s.clave === credencialTipo);
      if (filtered.length === 0) {
        return ctx.reply(`❌ El equipo *${equipo.ine}* no tiene *${credencialTipo}* registrado.`, { parse_mode: 'Markdown' });
      }

      const card = `🔐 *${equipo.ine}* — ${equipo.ubicacion_nombre || '?'}\n\n*${credencialTipo}:* ||${filtered[0].valor}||`;
      setState(chatId, STATES.RESULT);
      return ctx.reply(`${card}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`, { parse_mode: 'Markdown' });
    }

    // ── INFO COMPLETA ──
    if (awaitingType === 'info_completa') {
      const equipo = await q.findEquipo(text);
      if (!equipo) return ctx.reply('❌ No encontré ningún equipo con ese identificador.');

      const specs = await q.getEspecificaciones(equipo.id);
      const card = formatEquipoCard(equipo, specs);
      setState(chatId, STATES.RESULT);
      return ctx.reply(`${card}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`, { parse_mode: 'Markdown' });
    }

    // ── DATOS DE RED ──
    if (awaitingType === 'buscar_ip') {
      const equipos = await q.searchByIP(text);
      if (equipos.length === 0) return ctx.reply('🌐 No encontré equipos con esa IP.');

      const lines = equipos.map(e => `💻 ${e.ine} — ${e.ubicacion || '?'}\n  IP: ${e.valor}`);
      const unique = [...new Set(lines)];
      setState(chatId, STATES.RESULT);
      return ctx.reply(
        `🌐 *Equipos con IP ${text}:*\n${unique.join('\n')}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`,
        { parse_mode: 'Markdown' }
      );
    }

    if (awaitingType === 'red_equipo' || awaitingType === 'mac_equipo' || awaitingType === 'red_todo') {
      const equipo = await q.findEquipo(text);
      if (!equipo) return ctx.reply('❌ No encontré ningún equipo con ese identificador.');

      const specs = await q.getEspecificaciones(equipo.id);

      const redKeys = ['IP', 'ip', 'MASCARA', 'PUERTA DE ENLACE', 'DNS 1', 'DNS 2', 'MAC', 'PUERTO'];
      const redSpecs = specs.filter(s => redKeys.includes(s.clave));

      if (redSpecs.length === 0) {
        return ctx.reply(`🌐 El equipo *${equipo.ine}* no tiene datos de red registrados.`, { parse_mode: 'Markdown' });
      }

      const card = `🌐 *${equipo.ine}* — ${equipo.ubicacion_nombre || '?'}\n\n` +
        redSpecs.map(s => `*${s.clave}:* ${s.valor}`).join('\n');
      setState(chatId, STATES.RESULT);
      return ctx.reply(`${card}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`, { parse_mode: 'Markdown' });
    }

    // ── HARDWARE ──
    if (awaitingType === 'hardware') {
      const equipo = await q.findEquipo(text);
      if (!equipo) return ctx.reply('❌ No encontré ningún equipo con ese identificador.');

      const specs = await q.getEspecificaciones(equipo.id);

      if (hardwareClave === 'TODO_HW') {
        const hwKeys = ['PROCESADOR', 'RAM', 'DISCO', 'SO', 'ENTRADAS DE VIDEO'];
        const hwSpecs = specs.filter(s => hwKeys.includes(s.clave));
        if (hwSpecs.length === 0) {
          return ctx.reply(`🖥️ El equipo *${equipo.ine}* no tiene hardware registrado.`, { parse_mode: 'Markdown' });
        }
        const card = `🖥️ *${equipo.ine}* — ${equipo.ubicacion_nombre || '?'}\n\n` +
          hwSpecs.map(s => `*${s.clave}:* ${s.valor}`).join('\n');
        setState(chatId, STATES.RESULT);
        return ctx.reply(`${card}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`, { parse_mode: 'Markdown' });
      }

      const filtered = specs.filter(s => s.clave === hardwareClave);
      if (filtered.length === 0) {
        return ctx.reply(`🖥️ El equipo *${equipo.ine}* no tiene *${hardwareClave}* registrado.`, { parse_mode: 'Markdown' });
      }

      setState(chatId, STATES.RESULT);
      return ctx.reply(
        `🖥️ *${equipo.ine}* — ${equipo.ubicacion_nombre || '?'}\n\n*${hardwareClave}:* ${filtered[0].valor}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`,
        { parse_mode: 'Markdown' }
      );
    }

    // ── LISTADOS ──
    if (awaitingType === 'listado_ubicacion') {
      const equipos = await q.getEquiposByUbicacion(text);
      if (equipos.length === 0) return ctx.reply('📍 No encontré equipos en esa ubicación.');
      const lines = equipos.map(e => `💻 ${e.ine} — ${e.estado || '?'}`);
      setState(chatId, STATES.RESULT);
      return ctx.reply(
        `📍 *Equipos en "${text}":*\n${lines.join('\n')}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`,
        { parse_mode: 'Markdown' }
      );
    }

    if (awaitingType === 'listado_responsable') {
      const equipos = await q.getEquiposByResponsable(text);
      if (equipos.length === 0) return ctx.reply('👤 No encontré equipos de ese responsable.');
      const lines = equipos.map(e => `💻 ${e.ine} — ${e.ubicacion || '?'}`);
      setState(chatId, STATES.RESULT);
      return ctx.reply(
        `👤 *Equipos de "${text}":*\n${lines.join('\n')}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`,
        { parse_mode: 'Markdown' }
      );
    }

    if (awaitingType === 'listado_estado') {
      const equipos = await q.getEquiposByEstado(text);
      if (equipos.length === 0) return ctx.reply('📌 No encontré equipos con ese estado.');
      const lines = equipos.map(e => `💻 ${e.ine} — ${e.ubicacion || '?'}`);
      setState(chatId, STATES.RESULT);
      return ctx.reply(
        `📌 *Equipos en estado "${text}":*\n${lines.join('\n')}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`,
        { parse_mode: 'Markdown' }
      );
    }

    // ── BUSQUEDA LIBRE ──
    if (awaitingType === 'busqueda_libre') {
      const results = await q.searchAll(text);
      if (results.length === 0) return ctx.reply('❌ No encontré resultados para esa búsqueda.');
      const lines = results.map((e, i) =>
        `${i + 1}. ${e.ine} — ${e.ubicacion || '?'} (${e.estado || '?'})`
      );
      setState(chatId, STATES.RESULT);
      return ctx.reply(
        `🔍 *Resultados para "${text}":*\n${lines.join('\n')}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`,
        { parse_mode: 'Markdown' }
      );
    }

  } catch (err) {
    logger.error({ err }, '[TelegramBot] Error processing input');
    return ctx.reply('❌ Ocurrió un error al procesar tu consulta.');
  }
}

module.exports = { handleMessage };
```

- [ ] **Step 2: Verify handlers module loads**

Run: `node -e "require('./backend/telegram-bot/handlers')"` from project root
Expected: no errors

---

### Task 5: Wire bot into server.ts

**Files:**
- Modify: `backend/server.ts:66-80`

- [ ] **Step 1: Add import and startup in server.ts**

Edit `backend/server.ts` — after the `require` block (line 8), add:

```typescript
const { initBot, stopBot } = require('./telegram-bot/index');
```

Edit `backend/server.ts` — inside the `server.listen` callback, after `db.connect()` (around line 73), add:

```typescript
// Initialize Telegram Bot
initBot();
```

Edit `backend/server.ts` — inside the `shutdown()` function, before `process.exit(0)` (around line 56), add:

```typescript
stopBot();
```

Edit `backend/server.ts` — inside the `handleMessage` middleware, add the handler (before bot.launch in index.ts actually). Wait — the handler registration should be in `index.ts`.

Actually, let me redesign this. The `index.ts` needs to register the message handler. Let me update the bot to use `bot.on('text', ...)`:

- [ ] **Step 2: Update index.ts to register the handler**

Edit `backend/telegram-bot/index.ts` — add handler registration before `bot.launch()`:

```typescript
const { handleMessage } = require('./handlers');

// Inside initBot(), before bot.launch():
bot.on('text', async (ctx) => {
  try {
    await handleMessage(ctx);
  } catch (err) {
    logger.error({ err }, '[TelegramBot] Unhandled error');
  }
});
```

- [ ] **Step 3: Verify server starts without errors**

Run: `pnpm run dev` (or `node -e "require('./telegram-bot/index')"`)
Expected: server starts, shows "TELEGRAM_BOT_TOKEN no configurado. Bot deshabilitado." warning (expected, since we haven't set the token yet)

---

### Task 6: Configure .env and test

**Files:**
- Modify: `backend/.env` (add token — get from user)

- [ ] **Step 1: Add Telegram config to .env**

```bash
# Telegram Bot
TELEGRAM_BOT_TOKEN=tu_token_aqui
TELEGRAM_ALLOWED_USERS=tu_user_id_telegram
```

- [ ] **Step 2: Get user's Telegram user ID**

Send any message to [@userinfobot](https://t.me/userinfobot) on Telegram to get the numeric ID.

- [ ] **Step 3: Start the server and test the bot**

Run: `pnpm run dev` in backend/
Expected: "Bot iniciado correctamente" in logs

Test menu navigation:
1. Send "hola" → should get main menu
2. Send "1" → should show cantidad submenu
3. Send "4" → should show total equipos count
4. Click through all menu options

Test credential lookup:
1. Main menu → 2 (Contraseñas) → 1 (PASS ADMIN)
2. Send "U2233-CE-15" → should return the real PASS ADMIN

Test search:
1. Main menu → 6 (Buscar)
2. Send "U2233" → should list matching equipos

- [ ] **Step 4: Verify state transitions work correctly**

Test edge cases:
- Send "menu" at any point → should return to main menu
- Send "salir" at any point → should end session
- Send invalid numbers → should show error
- Send empty text → should handle gracefully

---

### Task 7: Add error handling for Telegram API limits

**Files:**
- Modify: `backend/telegram-bot/handlers.ts`

- [ ] **Step 1: Add message length safety**

Telegram has a 4096 character limit per message. Add a helper to split long messages:

```typescript
async function replyOrSplit(ctx, text, opts = {}) {
  const MAX_LENGTH = 4000;
  if (text.length <= MAX_LENGTH) {
    return ctx.reply(text, opts);
  }
  // Split into chunks
  for (let i = 0; i < text.length; i += MAX_LENGTH) {
    const chunk = text.slice(i, i + MAX_LENGTH);
    // Add "(continúa...)" to all but last chunk
    const isLast = i + MAX_LENGTH >= text.length;
    await ctx.reply(isLast ? chunk : chunk + '\n\n(continúa...)', opts);
  }
}
```

Replace all `ctx.reply(...)` with `replyOrSplit(ctx, ...)` in handlers.ts.

---
## Test Scenarios

### Menu Navigation Test
```
User: hola
Bot: (shows main menu with 8 options)

User: 1
Bot: (shows cantidad submenu with 4 options)

User: 4
Bot: "Total de equipos activos: 60" + "1. Seguir 2. Salir"

User: 1
Bot: (shows main menu again)
```

### Credential Lookup Test
```
User: hola
Bot: (main menu)

User: 2
Bot: (contrasenas submenu)

User: 1
Bot: "Decime el número de serie, INE, NNE o nombre de cuenta"

User: U2233-CE-15
Bot: "PASS ADMIN: ||Admin@U2233||" (with spoiler tags)
```

### Fallback by Cuenta Admin Test
```
User: hola → 2 → 1
Bot: "Decime..."

User: U2233-CE-15
Bot: Finds equipo by CUENTA ADMIN match → shows PASS ADMIN
```

### No Result Test
```
User: hola → 1 → 1
Bot: "Decime la ubicación"

User: UbicacionFalsa123
Bot: "No encontré ubicaciones con ese nombre."
```
---
## Files Summary

| Action | File |
|--------|------|
| **Modify** | `backend/package.json` — add telegraf |
| **Create** | `backend/telegram-bot/index.ts` — bot setup + launch |
| **Create** | `backend/telegram-bot/session.ts` — state machine |
| **Create** | `backend/telegram-bot/queries.ts` — DB queries |
| **Create** | `backend/telegram-bot/menus.ts` — menu texts |
| **Create** | `backend/telegram-bot/handlers.ts` — input router |
| **Modify** | `backend/server.ts` — initBot + stopBot |
| **Modify** | `backend/.env` — TELEGRAM_BOT_TOKEN |
