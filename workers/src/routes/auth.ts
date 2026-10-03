// Puerto de backend/routes/auth.routes.ts + controllers/auth.controller.ts a Hono.
// Nodemailer queda para Fase 2: forgot-password responde genérico y deja constancia en log.
import { Hono } from 'hono';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import bcrypt from 'bcryptjs';
import { signJwt, randomHex, random6, sha256hex, timingSafeEqualStr } from '../auth-crypto';
import { requireAuth, validateBody, limiters } from '../middleware';
import { loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../schemas';
import { usuariosService } from '../services/usuarios.service';
import { refreshTokenService } from '../services/refreshToken.service';
import type { Db } from '../db';
import type { Env } from '../middleware';

type Vars = { db: Db; user: any; validatedBody: any };
const auth = new Hono<{ Bindings: Env; Variables: Vars }>();

// Hash bcrypt de una contraseña desconocida (generado una vez): misma propiedad
// anti-enumeración que DUMMY_HASH del backend sin costo por cold-start.
const DUMMY_HASH = '$2b$10$2ojaycpdKovx0VcogVcdG.UFipDWOfEo/jHbWRJiafSzsRNX9aoyq';

const tokenCookie = { httpOnly: true, secure: true, sameSite: 'Strict' as const, maxAge: 24 * 60 * 60 };
const refreshCookie = { httpOnly: true, secure: true, sameSite: 'Strict' as const, path: '/api/auth', maxAge: 7 * 24 * 60 * 60 };

function permsOf(user: any): string[] {
  try {
    return JSON.parse(user.permisos_json || '[]');
  } catch {
    return [];
  }
}

auth.post('/login', limiters.auth, validateBody(loginSchema), async (c) => {
  const { usuario, password } = c.get('validatedBody');
  if (!usuario?.trim() || !password?.trim()) return c.json({ error: 'Usuario y contraseña son requeridos' }, 400);
  const svc = usuariosService(c.get('db'));
  const user = await svc.findByUsuarioOrEmail(usuario);
  const match = await bcrypt.compare(password, user?.password_hash || DUMMY_HASH);
  if (!user || !match) return c.json({ error: 'Credenciales incorrectas' }, 401);
  const token = await signJwt({ userId: user.id, rol: user.rol, usuario: user.usuario, permisos: permsOf(user) }, c.env.JWT_SECRET);
  const refreshToken = randomHex(32);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await refreshTokenService(c.get('db')).saveRefreshToken(user.id, refreshToken, refreshExpires);
  await svc.updateLastLogin(user.id);
  setCookie(c, 'token', token, tokenCookie);
  setCookie(c, 'refreshToken', refreshToken, refreshCookie);
  return c.json({ success: true, user: { id: user.id, usuario: user.usuario, rol: user.rol } });
});

auth.post('/forgot-password', limiters.forgot, validateBody(forgotPasswordSchema), async (c) => {
  const { email } = c.get('validatedBody');
  const svc = usuariosService(c.get('db'));
  const user = await svc.findByEmail(email);
  if (user) {
    const code = random6();
    await svc.saveRecoveryCode(email, await sha256hex(code), new Date(Date.now() + 15 * 60 * 1000));
    // Brevo por HTTP (Workers no tiene SMTP). Sin BREVO_API_KEY se deja
    // constancia en log; la respuesta sigue siendo genérica anti-enumeración.
    try {
      if (c.env.BREVO_API_KEY) {
        const fromEmail = c.env.BREVO_FROM || 'miguelangelimperio@gmail.com';
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { 'api-key': c.env.BREVO_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: { name: 'IMPERIO - Gestion de Equipos', email: fromEmail },
            to: [{ email }],
            subject: 'Codigo de recuperacion - IMPERIO',
            htmlContent: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:16px;"><tr><td align="center"><table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#1C1C1E;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px 24px;"><tr><td align="center" style="padding-bottom:16px;"><img src="https://app.control-equipos.workers.dev/icon-512x512.png" alt="IMPERIO" width="96" style="width:96px;height:auto;display:block;border-radius:50%;background-color:#ffffff;padding:4px;" /></td></tr><tr><td align="center" style="font-family:Arial,sans-serif;font-size:20px;font-weight:bold;color:#e4e2e4;padding-bottom:8px;">Recuperacion de contrasena</td></tr><tr><td align="center" style="font-family:Arial,sans-serif;font-size:14px;color:#c4c5d9;padding-bottom:24px;">Usa este codigo para restablecer tu acceso:</td></tr><tr><td align="center" style="padding-bottom:24px;"><div style="display:inline-block;font-family:Arial,sans-serif;font-size:32px;font-weight:bold;letter-spacing:10px;color:#b8c3ff;background-color:#131315;border:1px solid rgba(184,195,255,0.25);border-radius:12px;padding:12px 12px 12px 22px;">${code}</div></td></tr><tr><td align="center" style="font-family:Arial,sans-serif;font-size:12px;color:#71717a;">Vence en 15 minutos. Si no lo pediste, ignora este mensaje.</td></tr></table></td></tr></table>`,
          }),
        });
        if (!res.ok) console.error('[auth] Brevo error', res.status, await res.text().catch(() => ''));
      } else {
        console.log(`[auth] recovery code para ${email} (sin BREVO_API_KEY, mail omitido)`);
      }
    } catch (e) {
      console.error('[auth] fallo envio recovery', e);
    }
  }
  return c.json({ success: true, message: 'Si el correo existe, se enviará un código.' });
});

auth.post('/reset-password', limiters.reset, validateBody(resetPasswordSchema), async (c) => {
  const { email, code, newPassword } = c.get('validatedBody');
  const svc = usuariosService(c.get('db'));
  const stored = await svc.getRecoveryCode(email);
  if (!stored || new Date() > new Date(stored.expires)) return c.json({ error: 'Código inválido o expirado.' }, 400);
  if (!timingSafeEqualStr(stored.codigo, await sha256hex(code))) return c.json({ error: 'Código inválido o expirado.' }, 400);
  await svc.resetPasswordSync(email, await bcrypt.hash(newPassword, 12));
  await svc.deleteRecoveryCode(email);
  return c.json({ success: true, message: 'Contraseña actualizada correctamente.' });
});

auth.post('/logout', requireAuth, async (c) => {
  try {
    await refreshTokenService(c.get('db')).revokeAllUserTokens(c.get('user').userId);
  } catch (e) {
    console.error('[auth] Error en logout', e);
  }
  deleteCookie(c, 'token', { ...tokenCookie, maxAge: undefined });
  deleteCookie(c, 'refreshToken', { ...refreshCookie, maxAge: undefined });
  return c.json({ success: true, message: 'Sesión cerrada.' });
});

auth.post('/refresh', async (c) => {
  const token = getCookie(c, 'refreshToken');
  const clear = () => {
    deleteCookie(c, 'token', { ...tokenCookie, maxAge: undefined });
    deleteCookie(c, 'refreshToken', { ...refreshCookie, maxAge: undefined });
  };
  if (!token) {
    clear();
    return c.json({ error: 'Refresh token no proporcionado' }, 401);
  }
  try {
    const svc = refreshTokenService(c.get('db'));
    const stored = await svc.findRefreshToken(token);
    if (!stored || stored.revoked === 1 || new Date() > new Date(stored.expires)) {
      await svc.revokeRefreshToken(token);
      clear();
      return c.json({ error: 'Refresh token inválido o expirado' }, 401);
    }
    await svc.revokeRefreshToken(token);
    const user = await usuariosService(c.get('db')).getUsuarioById(stored.user_id);
    if (!user) return c.json({ error: 'Usuario no encontrado' }, 401);
    const newToken = await signJwt({ userId: user.id, rol: user.rol, usuario: user.usuario, permisos: permsOf(user) }, c.env.JWT_SECRET);
    const newRefreshToken = randomHex(32);
    await svc.saveRefreshToken(user.id, newRefreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    setCookie(c, 'token', newToken, tokenCookie);
    setCookie(c, 'refreshToken', newRefreshToken, refreshCookie);
    return c.json({ success: true, user: { id: user.id, usuario: user.usuario, rol: user.rol } });
  } catch {
    clear();
    return c.json({ error: 'Error al renovar sesión' }, 401);
  }
});

auth.get('/me', requireAuth, async (c) => {
  const user = await usuariosService(c.get('db')).getUsuarioById(c.get('user').userId);
  if (!user) return c.json({ error: 'Usuario no encontrado' }, 401);
  return c.json({ success: true, user: { id: user.id, usuario: user.usuario, rol: user.rol } });
});

export default auth;
