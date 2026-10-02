// Control de Equipos 3.0 — Worker API (mismo origen que el frontend).
// Fase actual: auth + health + stubs 501 de sondeo LAN ("solo red local").
import { Hono } from 'hono';
import { createDb } from './db';
import { requireAuth, validateOrigin, limiters } from './middleware';
import type { Env } from './middleware';
import auth from './routes/auth';
import equipos from './routes/equipos';
import config from './routes/config';
import mantenimiento from './routes/mantenimiento';
import componentes from './routes/componentes';
import soporte from './routes/soporte';
import notificaciones from './routes/notificaciones';
import usuarios from './routes/usuarios';
import prestamos from './routes/prestamos';
import { historial, dashboard } from './routes/historial';
import ipam from './routes/ipam';
import network from './routes/network';
import exp from './routes/export';

const app = new Hono<{ Bindings: Env }>();

app.use('/api/*', async (c, next) => {
  c.set('db' as never, createDb(c.env.DB));
  await next();
});
app.use('/api/*', validateOrigin);
app.use('/api/*', limiters.api);

app.get('/health', async (c) => {
  try {
    await createDb(c.env.DB).query('SELECT 1');
    return c.json({ status: 'ok', timestamp: new Date().toISOString(), database: 'connected (d1)', environment: 'production' });
  } catch (e) {
    console.error('[health]', e);
    return c.json({ status: 'error', message: 'Service unavailable', timestamp: new Date().toISOString() }, 503);
  }
});

app.route('/api/auth', auth);
app.route('/api/equipos', equipos);
app.route('/api/config', config);
app.route('/api/mantenimiento', mantenimiento);
app.route('/api/componentes', componentes);
app.route('/api/soporte', soporte);
app.route('/api/notificaciones', notificaciones);
app.route('/api/usuarios', usuarios);
app.route('/api/prestamos', prestamos);
app.route('/api/historial', historial);
app.route('/api/dashboard', dashboard);
app.route('/api/ipam', ipam);
app.route('/api/network', network);
app.route('/api', exp);

const LOCAL_ONLY = { error: 'Disponible solo en red local. Usa el portable en la red a monitorear.' };

// --- Sondeo LAN: sin equivalente físico desde la nube (ver decisión #16) ---
app.post('/api/network/redes/:redId/scan', requireAuth, (c) => c.json(LOCAL_ONLY, 501));
app.get('/api/network/ping/:ip', requireAuth, (c) => c.json(LOCAL_ONLY, 501));
app.get('/api/network/ping-stream/:ip', requireAuth, (c) => c.json(LOCAL_ONLY, 501));
app.get('/api/network/tracert/:ip', requireAuth, (c) => c.json(LOCAL_ONLY, 501));
app.get('/api/network/canary', requireAuth, (c) => c.json(LOCAL_ONLY, 501));
app.post('/api/network/benchmark', requireAuth, (c) => c.json(LOCAL_ONLY, 501));
app.get('/api/network/telemetria', requireAuth, (c) => c.json(LOCAL_ONLY, 501));
app.get('/api/network/mi-red', requireAuth, (c) => c.json(LOCAL_ONLY, 501));
app.get('/api/ipam/ping/:ip', requireAuth, (c) => c.json(LOCAL_ONLY, 501));

app.notFound((c) => {
  if (c.req.path.startsWith('/api/')) return c.json({ error: 'No encontrado' }, 404);
  return c.text('Not found', 404);
});

// --- Frontend estático mismo origen (paridad CSP con backend/app.ts) ---
function nonce(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  let s = '';
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s);
}

function cspHeader(n: string): string {
  // style-src lleva 'unsafe-inline': Emotion/MUI inyectan <style> en runtime y
  // ningún nonce estático puede cubrirlos (el backend local tiene la misma
  // violación en consola). Scripts siguen estrictos con nonce por respuesta.
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${n}'`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self' https://fonts.gstatic.com",
  ].join('; ');
}

const injectNonces = (html: string, n: string) =>
  html
    .replace(/<script(?=[\s>])/g, `<script nonce="${n}"`)
    .replace(/<link(?=[\s>])/g, `<link nonce="${n}"`)
    .replace(/<style(?=[\s>])/g, `<style nonce="${n}"`);

async function serveAsset(c: any, path: string, isIndexFallback = false): Promise<Response> {
  const url = new URL(c.req.url);
  const res: Response = await c.env.ASSETS.fetch(new Request(new URL(path, url).toString(), c.req.raw));
  const ct = res.headers.get('content-type') || '';
  if (res.status === 404 && isIndexFallback === false && c.req.header('accept')?.includes('text/html')) {
    return serveAsset(c, '/index.html', true);
  }
  if (!ct.includes('text/html')) {
    const out = new Response(res.body, res);
    if (/\.(js|css|woff2?)$/.test(path)) out.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    return out;
  }
  const n = nonce();
  const html = injectNonces(await res.text(), n);
  return new Response(html, {
    status: res.status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': cspHeader(n), 'Cache-Control': 'no-cache' },
  });
}

app.get('/sw.js', async (c) => {
  // Igual que backend: el SW se sirve sin CSP del documento.
  const url = new URL(c.req.url);
  const res: Response = await c.env.ASSETS.fetch(new Request(new URL('/sw.js', url).toString(), c.req.raw));
  return new Response(res.body, { status: res.status, headers: { 'Content-Type': 'application/javascript' } });
});

app.get('*', async (c) => {
  const path = new URL(c.req.url).pathname;
  if (path.startsWith('/api/') || path === '/health') return c.text('Not found', 404);
  return serveAsset(c, path);
});
app.onError((err, c) => {
  console.error('[worker]', err);
  return c.json({ error: 'Error interno del servidor' }, 500);
});

export default {
  fetch: app.fetch,
  // Fase 2: notificaciones programadas (reemplaza setInterval de server.ts).
  async scheduled() {
    console.log('[cron] no-op (Fase 2)');
  },
};
