// Puerto de backend/routes/usuarios.routes.ts + controllers/usuarios.controller.ts.
import { Hono } from 'hono';
import { requireAuth, requireAdmin, validateBody, rateLimit, W15M } from '../middleware';
import { createUsuarioSchema, updateUsuarioSchema } from '../schemas';
import { usuariosService } from '../services/usuarios.service';
import type { Db } from '../db';
import type { Env } from '../middleware';

type Vars = { db: Db; user: any; validatedBody: any };
const r = new Hono<{ Bindings: Env; Variables: Vars }>();

r.get('/perfil', requireAuth, async (c) => {
  const { userId, usuario: username } = c.get('user');
  if (userId === 0) {
    return c.json({ id: 0, usuario: username || 'admin', email: 'admin@sistema.cl', rol: 'admin', is_initial: true });
  }
  const usuario = await usuariosService(c.get('db')).getUsuarioById(userId);
  if (!usuario) return c.json({ error: 'Usuario no encontrado' }, 404);
  return c.json(usuario);
});

r.put('/perfil', requireAuth, async (c) => {
  const { userId } = c.get('user');
  const { usuario, email, password } = await c.req.json().catch(() => ({}));
  if (userId === 0) {
    return c.json({ error: 'El admin inicial no puede actualizarse. Por favor cree un usuario admin real en Gestión de Usuarios.' }, 400);
  }
  if (usuario || email) {
    const existing = await usuariosService(c.get('db')).findByUsuarioOrEmail(usuario || email);
    if (existing && existing.id !== userId) {
      return c.json({ error: 'El nombre de usuario o email ya está en uso.' }, 400);
    }
  }
  await usuariosService(c.get('db')).updateUsuario(userId, { usuario, email, password });
  return c.json({ success: true, message: 'Perfil actualizado correctamente' });
});

r.use('/*', requireAuth, requireAdmin);

r.get('/', async (c) => c.json(await usuariosService(c.get('db')).getUsuarios()));

r.get('/:id', async (c) => {
  const usuario = await usuariosService(c.get('db')).getUsuarioById(c.req.param('id'));
  if (!usuario) return c.json({ error: 'Usuario no encontrado' }, 404);
  return c.json(usuario);
});

const registerLimit = (c: any, n: any) => rateLimit(5, 60 * 60 * 1000, 'Demasiadas cuentas creadas desde esta IP. Intenta en 1 hora.')(c, n);
const writeLimit = (c: any, n: any) => rateLimit(30, W15M, 'Demasiadas operaciones de usuario. Intenta en 15 minutos.')(c, n);

r.post('/', registerLimit, validateBody(createUsuarioSchema), async (c) => {
  await usuariosService(c.get('db')).createUsuario(c.get('validatedBody'));
  return c.json({ success: true, message: 'Usuario creado exitosamente' }, 201);
});

r.put('/:id', writeLimit, validateBody(updateUsuarioSchema), async (c) => {
  await usuariosService(c.get('db')).updateUsuario(c.req.param('id'), c.get('validatedBody'));
  return c.json({ success: true, message: 'Usuario actualizado' });
});

r.delete('/:id', writeLimit, async (c) => {
  await usuariosService(c.get('db')).deleteUsuario(c.req.param('id'));
  return c.json({ success: true, message: 'Usuario eliminado' });
});

export default r;
