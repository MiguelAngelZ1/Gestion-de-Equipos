// Puertos de backend/middleware/* a Hono. Mismos mensajes de error que Express.
import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { verifyJwt } from './auth-crypto';
import { ROLES_ADMIN } from './constants';
import type { Db } from './db';

export interface RateLimitBinding {
  limit(opts: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  ASSETS: Fetcher;
  AUTH_LIMITER?: RateLimitBinding;
  API_LIMITER?: RateLimitBinding;
  BREVO_API_KEY?: string;
  BREVO_FROM?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REFRESH_TOKEN?: string;
  GOOGLE_DRIVE_FOLDER_ID?: string;
}

function secret(c: Context<{ Bindings: Env }>): string {
  const s = c.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error('JWT_SECRET no configurado o débil');
  return s;
}

export async function requireAuth(c: Context<{ Bindings: Env; Variables: { db: Db; user: any } }>, next: Next) {
  const auth = c.req.header('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : getCookie(c, 'token');
  if (!token) return c.json({ error: 'No autorizado. Inicie sesión.' }, 401);
  try {
    c.set('user', await verifyJwt(token, secret(c)));
    await next();
  } catch {
    return c.json({ error: 'Token inválido o expirado.' }, 401);
  }
}

export async function requireAdmin(c: Context<{ Variables: { user: any } }>, next: Next) {
  const rol = c.get('user')?.rol;
  if (rol === 'admin' || rol === 'ADMIN') return next();
  return c.json({ error: 'Acceso denegado. Se requieren permisos de administrador.' }, 403);
}

export function requirePermission(...permisos: string[]) {
  return async (c: Context<{ Variables: { user: any } }>, next: Next) => {
    const user = c.get('user');
    if (!user) return c.json({ error: 'No autorizado. Inicie sesión.' }, 401);
    if (ROLES_ADMIN.includes(user.rol?.toUpperCase?.())) return next();
    const mine: string[] = user.permisos || [];
    if (permisos.some((p) => mine.includes(p))) return next();
    return c.json({ error: 'Acceso denegado. No tiene permisos suficientes.' }, 403);
  };
}

// validateBody de validate.middleware.ts adaptado: valida JSON contra zod.
export function validateBody(schema: { safeParse: (v: unknown) => any }) {
  return async (c: Context, next: Next) => {
    let body: unknown = {};
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'Cuerpo JSON inválido' }, 400);
    }
    const result = schema.safeParse(body);
    if (!result.success) {
      const messages = result.error.issues.map((e: any) => e.message).join(', ');
      return c.json({ error: messages }, 400);
    }
    c.set('validatedBody' as never, result.data);
    await next();
  };
}

// CSRF misma idea que csrf.middleware: solo acepta mismo origen (o sin Origin).
export async function validateOrigin(c: Context, next: Next) {
  const origin = c.req.header('origin');
  if (origin) {
    const self = new URL(c.req.url).origin;
    if (origin !== self) return c.json({ error: 'Origen no permitido' }, 403);
  }
  await next();
}

// Rate limit en dos capas:
// 1) Binding de Cloudflare (AUTH_LIMITER/API_LIMITER, ver wrangler.toml): cuenta
//    global por colo, frena fuerza bruta distribuida. Solo existe en producción;
//    en `wrangler dev` local se salta y queda la capa 2.
// 2) Bucket en memoria por aislado: conserva los límites sostenidos de 15 min
//    (el binding solo admite ventanas de 10/60 s).
const buckets = new Map<string, { count: number; reset: number }>();
export function rateLimit(max: number, windowMs: number, message: string, binding?: 'AUTH_LIMITER' | 'API_LIMITER') {
  return async (c: Context, next: Next) => {
    if (binding) {
      try {
        const rl = (c.env as Env)?.[binding];
        if (rl?.limit) {
          const ip = c.req.header('cf-connecting-ip') || 'unknown';
          const { success } = await rl.limit({ key: `${ip}:${c.req.path}` });
          if (!success) return c.json({ error: message }, 429);
        }
      } catch {
        // Sin binding (dev local): sigue el bucket en memoria.
      }
    }
    const ip = c.req.header('cf-connecting-ip') || 'unknown';
    const key = `${ip}:${c.req.path}`;
    const now = Date.now();
    const b = buckets.get(key);
    if (!b || now > b.reset) {
      buckets.set(key, { count: 1, reset: now + windowMs });
      return next();
    }
    b.count += 1;
    if (b.count > max) return c.json({ error: message }, 429);
    await next();
  };
}

export const W15M = 15 * 60 * 1000;
export const limiters = {
  // Mismos umbrales que backend/utils/rateLimiter.ts
  auth: (c: Context, n: Next) => rateLimit(10, W15M, 'Demasiados intentos de login. Intenta mas tarde.', 'AUTH_LIMITER')(c, n),
  forgot: (c: Context, n: Next) => rateLimit(5, W15M, 'Demasiados intentos de envío de código. Intenta de nuevo en 15 minutos.', 'AUTH_LIMITER')(c, n),
  reset: (c: Context, n: Next) => rateLimit(3, W15M, 'Demasiados intentos de restablecimiento de contraseña. Intenta de nuevo en 15 minutos.', 'AUTH_LIMITER')(c, n),
  api: (c: Context, n: Next) => rateLimit(2000, W15M, 'Demasiadas peticiones. Intenta mas tarde.', 'API_LIMITER')(c, n),
};
