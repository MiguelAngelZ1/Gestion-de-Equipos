// Puerto de backend/routes/historial.routes.ts + dashboard summary.
import { Hono } from 'hono';
import { requireAuth } from '../middleware';
import { historialService, dashboardService } from '../services/analitica.service';
import type { Db } from '../db';
import type { Env } from '../middleware';

type Vars = { db: Db; user: any };
const historial = new Hono<{ Bindings: Env; Variables: Vars }>();
const dashboard = new Hono<{ Bindings: Env; Variables: Vars }>();

historial.get('/', requireAuth, async (c) => {
  const q = c.req.query();
  const page = Math.max(1, parseInt(q.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(q.limit) || 50));
  const offset = (page - 1) * limit;
  return c.json(await historialService(c.get('db')).getHistorial({ ...q, page, limit, offset }));
});

dashboard.get('/summary', requireAuth, async (c) => c.json(await dashboardService(c.get('db')).getDashboardSummary()));

export { historial, dashboard };
