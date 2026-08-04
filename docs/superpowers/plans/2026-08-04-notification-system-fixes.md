# Notification System Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 8 notification system issues to make it production-ready: dedup alerts, stop checkLowStock spam, server-side preferences, pagination, Socket.io reconnect, TTL cleanup, rate limiting, VAPID validation.

**Architecture:** Add a `last_alerts_sent` DB table to track when each alert type was last sent (dedup). Add `notification_preferences` JSON column to `usuarios` table (server-side filtering). Refactor `notificationService` to accept parameters for filtering and dedup checks. Add pagination, TTL, rate limiting at the route level.

**Tech Stack:** Express routes, SQLite (raw), Socket.io, web-push, React frontend

---

## File Structure

| File | Purpose |
|------|---------|
| `backend/db/migrations/002_notification_fixes.ts` | New migration: `last_alerts_sent` table, `notification_preferences` column |
| `backend/services/notificationService.ts` | Refactor: dedup logic, preferences filtering, pagination, TTL cleanup |
| `backend/routes/notificaciones.routes.ts` | Add: pagination params, preferences CRUD, rate limiting |
| `backend/controllers/componentes.controller.ts` | Fix: smart `checkLowStock` (check only changed component) |
| `backend/config/constants.ts` | Add: `NOTIFICATION_TYPES` array for preferences |
| `frontend/src/components/common/NotificationBell.tsx` | Fix: Socket.io reconnect with backoff, pagination |
| `frontend/src/components/config/NotificationsPanel.tsx` | Fix: wire preferences to server API |
| `frontend/src/services/notificationManager.ts` | No changes needed |
| `backend/server.ts` | Minor: validate VAPID keys on boot |

---

## Task 1: Database Migration — Add `last_alerts_sent` + `notification_preferences`

**Files:**
- Create: `backend/db/migrations/002_notification_fixes.ts`

- [ ] **Step 1: Create migration file**

```typescript
// backend/db/migrations/002_notification_fixes.ts
const db = require('../database');

async function up() {
    const run = (sql, params = []) => db.run(sql, params);
    
    // Track when each alert type was last sent to prevent duplicates
    await run(`
        CREATE TABLE IF NOT EXISTS last_alerts_sent (
            id SERIAL PRIMARY KEY,
            alert_type TEXT NOT NULL,
            last_sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            detail TEXT
        )
    `);
    
    // Server-side notification preferences per user (JSON)
    await run(`
        ALTER TABLE usuarios ADD COLUMN notification_preferences TEXT DEFAULT NULL
    `);
    
    // Update schema version
    await run(`
        INSERT INTO sync_metadata (id, clave, valor, updated_at) 
        VALUES (13, 'schema_version', '8', datetime('now'))
        ON CONFLICT (clave) DO UPDATE SET valor = '8', updated_at = datetime('now')
    `);
    
    console.log('Migration 002_notification_fixes applied');
}

module.exports = { up };
```

- [ ] **Step 2: Register migration in database.ts**

Open `backend/db/database.ts`, find where migrations are loaded, and add `002_notification_fixes` to the migration list.

- [ ] **Step 3: Commit**

```bash
git add backend/db/migrations/002_notification_fixes.ts backend/db/database.ts
git commit -m "feat(notifications): add dedup tracking + preferences migration"
```

---

## Task 2: Refactor `notificationService.ts` — Dedup + Preferences + Pagination + TTL

**Files:**
- Modify: `backend/services/notificationService.ts`

This is the core refactor. The service needs 5 new capabilities:

### 2a: Dedup — `shouldSendAlert(alertType, detail)`

```typescript
// Add to NotificationService class
async shouldSendAlert(alertType, detail = null) {
    const existing = await db.get(
        `SELECT last_sent_at FROM last_alerts_sent WHERE alert_type = ? AND (detail = ? OR (detail IS NULL AND ? IS NULL))`,
        [alertType, detail, detail]
    );
    
    if (!existing) return true;
    
    // Don't send same alert within 12 hours
    const lastSent = new Date(existing.last_sent_at).getTime();
    const twelveHours = 12 * 60 * 60 * 1000;
    return Date.now() - lastSent > twelveHours;
}

async recordAlertSent(alertType, detail = null) {
    await db.run(
        `INSERT INTO last_alerts_sent (alert_type, last_sent_at, detail) VALUES (?, datetime('now'), ?)
         ON CONFLICT (alert_type, detail) DO UPDATE SET last_sent_at = datetime('now')`,
        [alertType, detail]
    );
}
```

Wait — SQLite doesn't support `ON CONFLICT` for arbitrary unique constraints unless we define a UNIQUE constraint. Let me fix:

```typescript
// First, ensure unique constraint exists (add in migration or alter)
// Actually, use a simpler approach: delete old record and insert new
async recordAlertSent(alertType, detail = null) {
    await db.run(
        `DELETE FROM last_alerts_sent WHERE alert_type = ? AND (detail = ? OR (detail IS NULL AND ? IS NULL))`,
        [alertType, detail, detail]
    );
    await db.run(
        `INSERT INTO last_alerts_sent (alert_type, last_sent_at, detail) VALUES (?, datetime('now'), ?)`,
        [alertType, detail]
    );
}
```

### 2b: Preferences filtering — `getUserPreferences(userId)`, `sendToUserWithPreferences(userId, payload)`

```typescript
async getUserPreferences(userId) {
    const result = await db.get(
        `SELECT notification_preferences FROM usuarios WHERE id = ?`,
        [parseInt(userId)]
    );
    
    if (!result?.notification_preferences) {
        // Default: all enabled except backups
        return { stock: true, taller: true, prestamo: true, sistema: true };
    }
    
    return JSON.parse(result.notification_preferences);
}

async sendToUserWithPreferences(userId, payload) {
    const prefs = await this.getUserPreferences(userId);
    const type = payload.type || 'sistema';
    
    // Check if user has this notification type enabled
    if (prefs[type] === false) return;
    
    await this.sendToUser(userId, payload);
}
```

### 2c: Pagination — `getUserAlerts(userId, limit, offset)`

```typescript
async getUserAlerts(userId, limit = 20, offset = 0) {
    return await db.all(
        `SELECT * FROM alertas_notificaciones WHERE usuario_id = ? ORDER BY fecha DESC LIMIT ? OFFSET ?`,
        [parseInt(userId), limit, offset]
    );
}

async getUserAlertsCount(userId) {
    const result = await db.get(
        `SELECT COUNT(*) as total FROM alertas_notificaciones WHERE usuario_id = ?`,
        [parseInt(userId)]
    );
    return result?.total || 0;
}
```

### 2d: TTL Cleanup — `cleanupOldAlerts(daysOld = 30)`

```typescript
async cleanupOldAlerts(daysOld = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);
    
    const result = await db.run(
        `DELETE FROM alertas_notificaciones WHERE leido = 1 AND fecha < ?`,
        [cutoff.toISOString()]
    );
    
    return result?.changes || 0;
}
```

### 2e: Refactor `checkDelayedRepairs()` and `checkLowStock()` to use dedup

```typescript
async checkDelayedRepairs() {
    const alertKey = 'delayed_repairs';
    
    if (!(await this.shouldSendAlert(alertKey))) {
        return;
    }
    
    const delayDays = parseInt(process.env.DELAY_REPAIR_DAYS) || 2;
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - delayDays);

    const delayed = await db.all(`
        SELECT eq.id, eq.ine, eq.serie 
        FROM equipos eq
        JOIN estados es ON eq.estado_id = es.id
        WHERE (es.nombre LIKE '%Taller%' OR es.nombre LIKE '%Reparación%')
        AND eq.updated_at < ?
        AND eq.is_deleted = 0
    `, [twoDaysAgo.toISOString()]);

    if (delayed.length > 0) {
        const admins = await db.all(`SELECT id FROM usuarios WHERE rol = ?`, [ROLES.ADMIN]);
        for (const admin of admins) {
            await this.sendToUserWithPreferences(admin.id, {
                title: '⚠️ Equipos Demorados',
                body: `Atención: ${delayed.length} equipos llevan más de ${delayDays * 24}h en taller.`,
                type: TIPOS_NOTIFICACION.TALLER
            });
        }
        await this.recordAlertSent(alertKey);
    }
}

async checkLowStock() {
    const alertKey = 'low_stock';
    
    if (!(await this.shouldSendAlert(alertKey))) {
        return;
    }
    
    const threshold = parseInt(process.env.LOW_STOCK_THRESHOLD) || 5;
    const lowStock = await db.all(`SELECT nombre, cantidad FROM componentes_repuestos WHERE cantidad <= ?`, [threshold]);

    if (lowStock.length > 0) {
        const listNames = lowStock.map(r => `${r.nombre} (${r.cantidad})`).join(', ');
        const body = lowStock.length === 1
            ? `El repuesto ${lowStock[0].nombre} tiene solo ${lowStock[0].cantidad} unidades.`
            : `Stock bajo en: ${listNames}`;

        const admins = await db.all(`SELECT id FROM usuarios WHERE rol = ?`, [ROLES.ADMIN]);
        for (const admin of admins) {
            await this.sendToUserWithPreferences(admin.id, {
                title: '📦 Alerta de Stock',
                body: body,
                type: TIPOS_NOTIFICACION.STOCK
            });
        }
        await this.recordAlertSent(alertKey);
    }
}

// New: check stock for a SINGLE component (called from controller)
async checkComponentStock(componenteId, nombre, cantidad) {
    const threshold = parseInt(process.env.LOW_STOCK_THRESHOLD) || 5;
    
    if (cantidad > threshold) return;
    
    const alertKey = `low_stock_component_${componenteId}`;
    
    if (!(await this.shouldSendAlert(alertKey))) {
        return;
    }
    
    const admins = await db.all(`SELECT id FROM usuarios WHERE rol = ?`, [ROLES.ADMIN]);
    for (const admin of admins) {
        await this.sendToUserWithPreferences(admin.id, {
            title: '📦 Alerta de Stock',
            body: `El repuesto ${nombre} tiene solo ${cantidad} unidades.`,
            type: TIPOS_NOTIFICACION.STOCK
        });
    }
    await this.recordAlertSent(alertKey);
}
```

- [ ] **Step 1: Add all methods to NotificationService class**

Add the following methods in order inside the class:
1. `shouldSendAlert(alertType, detail)` 
2. `recordAlertSent(alertType, detail)`
3. `getUserPreferences(userId)`
4. `sendToUserWithPreferences(userId, payload)`
5. Modify `getUserAlerts(userId, limit, offset)` — add offset param
6. Add `getUserAlertsCount(userId)`
7. Add `cleanupOldAlerts(daysOld)`
8. Refactor `checkDelayedRepairs()` — add dedup check
9. Refactor `checkLowStock()` — add dedup check
10. Add `checkComponentStock(componenteId, nombre, cantidad)` — single-component check

- [ ] **Step 2: Update `sendToUser` in `server.ts`**

In `server.ts`, update the scheduled job to also run cleanup:

```typescript
// After the setInterval, add:
setInterval(async () => {
    const cleaned = await notificationService.cleanupOldAlerts(30);
    if (cleaned > 0) logger.info({ count: cleaned }, 'Notificaciones antiguas limpiadas');
}, 24 * 60 * 60 * 1000); // Once per day
```

- [ ] **Step 3: Commit**

```bash
git add backend/services/notificationService.ts backend/server.ts
git commit -m "feat(notifications): add dedup, preferences, pagination, TTL"
```

---

## Task 3: Fix `componentes.controller.ts` — Smart `checkLowStock`

**Files:**
- Modify: `backend/controllers/componentes.controller.ts`

- [ ] **Step 1: Replace global checkLowStock with per-component check**

Change `createOrUpdateComponente`:

```typescript
const createOrUpdateComponente = async (req, res, next) => {
    try {
        const result = await componentesService.createOrUpdateComponente(req.body);
        
        // Check stock only for this specific component
        if (req.body.cantidad !== undefined) {
            notificationService.checkComponentStock(
                result.id, 
                req.body.nombre || 'Repuesto', 
                req.body.cantidad
            ).catch(err => logger.error({ err }, "Error checking component stock"));
        }

        res.json({ success: true, id: result.id });
    } catch (err) {
        next(err);
    }
};
```

Change `instalarComponente`:

```typescript
const instalarComponente = async (req, res, next) => {
    try {
        const { equipo_id } = req.body;
        if (!equipo_id) return res.status(400).json({ error: "Faltan datos requeridos (equipo_id)" });

        const result = await componentesService.instalarComponente(req.body);

        // After installation, the source component quantity decreased
        // Get the updated component info and check its stock
        if (req.body.componente_id) {
            const componente = await componentesService.getComponenteById(req.body.componente_id);
            if (componente) {
                notificationService.checkComponentStock(
                    componente.id,
                    componente.nombre,
                    componente.cantidad
                ).catch(err => logger.error({ err }, "Error checking component stock"));
            }
        }

        res.json({ success: true, id: result.id });
    } catch (err) {
        next(err);
    }
};
```

- [ ] **Step 2: Commit**

```bash
git add backend/controllers/componentes.controller.ts
git commit -m "fix(notifications): replace global checkLowStock with per-component check"
```

---

## Task 4: Update Routes — Pagination + Preferences CRUD + Rate Limiting

**Files:**
- Modify: `backend/routes/notificaciones.routes.ts`

- [ ] **Step 1: Add pagination to GET /notificaciones**

```typescript
// Change the GET / route
router.get('/', verificarAutenticacion, async (req, res, next) => {
    try {
        const userId = req.user?.userId ?? req.user?.id;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = parseInt(req.query.offset) || 0;
        
        const [alerts, total] = await Promise.all([
            notificationService.getUserAlerts(userId, limit, offset),
            notificationService.getUserAlertsCount(userId)
        ]);
        
        res.json({ data: alerts, total, limit, offset });
    } catch (error) {
        next(error);
    }
});
```

- [ ] **Step 2: Add Preferences endpoints**

```typescript
// Get user notification preferences
router.get('/preferences', verificarAutenticacion, async (req, res, next) => {
    try {
        const userId = req.user?.userId ?? req.user?.id;
        const prefs = await notificationService.getUserPreferences(userId);
        res.json(prefs);
    } catch (error) {
        next(error);
    }
});

// Update user notification preferences
router.put('/preferences', verificarAutenticacion, async (req, res, next) => {
    try {
        const userId = req.user?.userId ?? req.user?.id;
        const prefs = req.body;
        
        // Validate: only allowed keys
        const allowedKeys = ['stock', 'taller', 'prestamo', 'sistema'];
        const sanitized = {};
        for (const key of allowedKeys) {
            if (typeof prefs[key] === 'boolean') {
                sanitized[key] = prefs[key];
            }
        }
        
        await db.run(
            `UPDATE usuarios SET notification_preferences = ? WHERE id = ?`,
            [JSON.stringify(sanitized), parseInt(userId)]
        );
        
        res.json({ success: true, preferences: sanitized });
    } catch (error) {
        next(error);
    }
});
```

Add `const db = require('../db/database');` at the top of the routes file.

- [ ] **Step 3: Add rate limiting to test endpoint**

```typescript
// Simple in-memory rate limiter for test endpoint
const testNotificationTimestamps = new Map();

router.post('/test', verificarAutenticacion, async (req, res, next) => {
    try {
        const userId = req.user?.userId ?? req.user?.id;
        const now = Date.now();
        const lastTest = testNotificationTimestamps.get(userId) || 0;
        
        // Max 1 test notification per 30 seconds
        if (now - lastTest < 30000) {
            return res.status(429).json({ 
                error: "Espera 30 segundos antes de enviar otra notificación de prueba" 
            });
        }
        
        testNotificationTimestamps.set(userId, now);
        
        await notificationService.sendToUser(userId, {
            title: 'Notificación de Prueba',
            body: '¡Excelente! Las notificaciones Push están configuradas correctamente.'
        });
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});
```

- [ ] **Step 4: Commit**

```bash
git add backend/routes/notificaciones.routes.ts
git commit -m "feat(notifications): add pagination, preferences CRUD, rate limiting"
```

---

## Task 5: Fix `NotificationBell.tsx` — Reconnect + Pagination

**Files:**
- Modify: `frontend/src/components/common/NotificationBell.tsx`

- [ ] **Step 1: Add Socket.io reconnect with exponential backoff**

Replace the Socket.io useEffect:

```typescript
useEffect(() => {
    if (!userId) return;

    let socket = null;
    let cancelled = false;
    let reconnectAttempts = 0;
    let reconnectTimer = null;

    const connectSocket = () => {
        import('socket.io-client').then(({ io }) => {
            if (cancelled) return;
            
            socket = io(socketURL, { 
                auth: { token: getAuthToken() },
                reconnection: false, // We handle reconnect manually
                transports: ['websocket', 'polling']
            });

            socket.on('connect', () => {
                reconnectAttempts = 0;
                socket.emit('join', userId);
            });

            socket.on('new_notification', (newNotif) => {
                setNotifications(prev => [newNotif, ...prev]);
                setUnreadCount(prev => prev + 1);
            });

            socket.on('disconnect', () => {
                // Attempt reconnect with backoff
                const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
                reconnectAttempts++;
                reconnectTimer = setTimeout(connectSocket, delay);
            });

            socket.on('connect_error', () => {
                const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
                reconnectAttempts++;
                reconnectTimer = setTimeout(connectSocket, delay);
            });
        });
    };

    connectSocket();

    return () => {
        cancelled = true;
        if (reconnectTimer) clearTimeout(reconnectTimer);
        if (socket) {
            socket.off('new_notification');
            socket.off('disconnect');
            socket.off('connect_error');
            socket.disconnect();
        }
    };
}, [userId, socketURL]);
```

- [ ] **Step 2: Update fetchNotifications to handle paginated response**

```typescript
const fetchNotifications = async (offset = 0) => {
    try {
        const response = await apiRequest(`/notificaciones?limit=20&offset=${offset}`);
        const data = response?.data || response || [];
        
        if (offset === 0) {
            setNotifications(data);
        } else {
            setNotifications(prev => [...prev, ...data]);
        }
        setUnreadCount((offset === 0 ? data : notifications).filter(n => !n.leido).length);
    } catch {
        // silent
    }
};
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/common/NotificationBell.tsx
git commit -m "feat(notifications): add Socket.io reconnect + pagination support"
```

---

## Task 6: Fix `NotificationsPanel.tsx` — Server-side Preferences

**Files:**
- Modify: `frontend/src/components/config/NotificationsPanel.tsx`

- [ ] **Step 1: Load preferences from server on mount**

Replace the preferences state initialization:

```typescript
const [preferences, setPreferences] = useState({
    'stock': true,
    'taller': true,
    'prestamo': true,
    'sistema': true
});
const [prefsLoaded, setPrefsLoaded] = useState(false);

useEffect(() => {
    // Load from server
    apiRequest('/notificaciones/preferences')
        .then(data => {
            if (data) {
                setPreferences(data);
            }
            setPrefsLoaded(true);
        })
        .catch(() => setPrefsLoaded(true));
}, []);

useEffect(() => {
    if (!prefsLoaded) return;
    
    // Save to server (debounced)
    const timer = setTimeout(() => {
        apiRequest('/notificaciones/preferences', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(preferences)
        }).catch(() => {});
    }, 500);
    
    return () => clearTimeout(timer);
}, [preferences, prefsLoaded]);
```

- [ ] **Step 2: Update categories to match TIPOS_NOTIFICACION**

```typescript
const categories = [
    { id: 'stock', title: 'Alerta de Stock', desc: 'Avisos cuando los repuestos están por agotarse', icon: AlertCircle },
    { id: 'taller', title: 'Equipos en Taller', desc: 'Alertas sobre equipos demorados en reparación', icon: Wrench },
    { id: 'prestamo', title: 'Préstamos', desc: 'Notificaciones de préstamos y devoluciones', icon: Bell },
    { id: 'sistema', title: 'Sistema', desc: 'Alertas generales del sistema', icon: Info },
];
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/config/NotificationsPanel.tsx
git commit -m "feat(notifications): wire preferences to server API"
```

---

## Task 7: VAPID Key Validation on Boot

**Files:**
- Modify: `backend/server.ts`

- [ ] **Step 1: Add VAPID validation at startup**

In `server.ts`, after the JWT_SECRET check, add:

```typescript
// Validate VAPID keys if push notifications are expected
if (process.env.NODE_ENV === 'production') {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
        logger.warn('VAPID keys not configured — Push notifications will not work. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env');
    } else {
        try {
            const webpush = require('web-push');
            webpush.setVapidDetails(
                process.env.VAPID_SUBJECT || 'mailto:admin@imperio.cl',
                process.env.VAPID_PUBLIC_KEY,
                process.env.VAPID_PRIVATE_KEY
            );
            logger.info('VAPID keys validated successfully');
        } catch (err) {
            logger.error({ err: err.message }, 'Invalid VAPID keys — Push notifications will not work');
        }
    }
}
```

- [ ] **Step 2: Add VAPID feedback in GET /public-key**

```typescript
router.get('/public-key', (req, res) => {
    const key = process.env.VAPID_PUBLIC_KEY;
    if (!key) {
        return res.status(503).json({ 
            error: 'Push notifications not configured',
            publicKey: null 
        });
    }
    res.json({ publicKey: key });
});
```

- [ ] **Step 3: Commit**

```bash
git add backend/server.ts backend/routes/notificaciones.routes.ts
git commit -m "feat(notifications): add VAPID key validation on boot"
```

---

## Task 8: Run Migration + Verify

- [ ] **Step 1: Start backend and verify migration runs**

```bash
cd backend && npx tsx server.ts
```

Expected: Migration 002_notification_fixes applied. Schema version updated to 8.

- [ ] **Step 2: Verify new endpoints work**

Test with curl or frontend:
```
GET  /api/notificaciones?limit=5&offset=0  → paginated response
GET  /api/notificaciones/preferences       → user preferences
PUT  /api/notificaciones/preferences       → save preferences
POST /api/notificaciones/test              → rate limited to 1/30s
```

- [ ] **Step 3: Verify dedup works**

Trigger `checkLowStock()` twice within 12 hours — second call should NOT send notifications.

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "chore: verify notification system fixes"
```

---

## Verification Checklist

After all tasks are complete:

- [ ] `GET /api/notificaciones?limit=5&offset=0` returns `{ data: [...], total: N, limit: 5, offset: 0 }`
- [ ] `GET /api/notificaciones/preferences` returns `{ stock: true, taller: true, ... }`
- [ ] `PUT /api/notificaciones/preferences` with `{ stock: false }` saves and persists
- [ ] `POST /api/notificaciones/test` returns 429 if called twice within 30s
- [ ] Calling `checkLowStock()` twice within 12h only sends ONE notification
- [ ] Calling `checkDelayedRepairs()` twice within 12h only sends ONE notification
- [ ] Socket.io reconnects after disconnect (test by stopping/starting server)
- [ ] Old read notifications are cleaned up after 30 days
- [ ] `notification_preferences` column exists in `usuarios` table
- [ ] `last_alerts_sent` table exists and tracks alert timestamps
