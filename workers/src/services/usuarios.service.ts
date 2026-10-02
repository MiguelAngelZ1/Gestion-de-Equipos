// Puerto directo de backend/services/usuarios.service.ts.
// bcryptjs es JS puro: funciona en Workers y los hashes existentes siguen válidos.
import bcrypt from 'bcryptjs';
import type { Db } from '../db';

export const DEFAULT_USER_PERMISOS = [
  'equipos:ver',
  'componentes:ver',
  'soporte:ver',
  'prestamos:ver',
  'ipam:ver',
  'config:ver',
  'backups:ver',
];

export function usuariosService(db: Db) {
  return {
    async getUsuarios() {
      return db.all(`SELECT id, usuario, email, rol, permisos_json, created_at, last_login FROM usuarios ORDER BY id ASC`);
    },
    async getUsuarioById(id: unknown) {
      return db.get(`SELECT id, usuario, email, rol, permisos_json, created_at FROM usuarios WHERE id = ?`, [parseInt(String(id))]);
    },
    async findByUsuarioOrEmail(identifier: string) {
      return db.get(`SELECT * FROM usuarios WHERE usuario = ? OR email = ?`, [identifier, identifier]);
    },
    async findByEmail(email: string) {
      return db.get(`SELECT * FROM usuarios WHERE email = ?`, [email]);
    },
    async countUsuarios() {
      const row = await db.get(`SELECT COUNT(*) as count FROM usuarios`);
      return parseInt(row.count);
    },
    async createUsuario(data: any) {
      const { usuario, email, password, rol, permisos_json } = data;
      const byName = await db.get(`SELECT id FROM usuarios WHERE usuario = ?`, [usuario]);
      if (byName) throw new Error('El usuario ya existe');
      const byEmail = await this.findByEmail(email);
      if (byEmail) throw new Error('El email ya existe');
      const password_hash = await bcrypt.hash(password, 12);
      const targetRol = (rol || 'USER').toUpperCase();
      const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(targetRol);
      const permisos = permisos_json !== undefined ? permisos_json : isAdmin ? [] : DEFAULT_USER_PERMISOS;
      const result = await db.run(
        `INSERT INTO usuarios (usuario, email, password_hash, rol, permisos_json) VALUES (?, ?, ?, ?, ?)`,
        [usuario, email, password_hash, targetRol, JSON.stringify(permisos)]
      );
      return { id: result.lastID };
    },
    async updateUsuario(id: unknown, data: any) {
      const { usuario, email, password, rol, permisos_json } = data;
      let sql = 'UPDATE usuarios SET usuario = ?, email = ?, rol = ?, permisos_json = ?, updated_at = ?';
      const params: any[] = [usuario, email, rol, JSON.stringify(permisos_json), new Date().toISOString()];
      if (password) {
        const password_hash = await bcrypt.hash(password, 12);
        sql = 'UPDATE usuarios SET usuario = ?, email = ?, password_hash = ?, rol = ?, permisos_json = ?, updated_at = ?';
        params.splice(2, 0, password_hash);
      }
      sql += ' WHERE id = ?';
      params.push(parseInt(String(id)));
      return db.run(sql, params);
    },
    async deleteUsuario(id: unknown) {
      return db.run(`DELETE FROM usuarios WHERE id = ?`, [parseInt(String(id))]);
    },
    async updateLastLogin(id: unknown) {
      return db.run(`UPDATE usuarios SET last_login = ? WHERE id = ?`, [new Date().toISOString(), parseInt(String(id))]);
    },
    async resetPasswordSync(email: string, password_hash: string) {
      return db.run(`UPDATE usuarios SET password_hash = ?, updated_at = ? WHERE email = ?`, [password_hash, new Date().toISOString(), email]);
    },
    async saveRecoveryCode(email: string, codigo: string, expires: Date) {
      await db.run(`DELETE FROM recuperacion_claves WHERE email = ?`, [email]);
      return db.run(`INSERT INTO recuperacion_claves (email, codigo, expires) VALUES (?, ?, ?)`, [email, codigo, expires.toISOString()]);
    },
    async getRecoveryCode(email: string) {
      return db.get(`SELECT codigo, expires FROM recuperacion_claves WHERE email = ?`, [email]);
    },
    async deleteRecoveryCode(email: string) {
      return db.run(`DELETE FROM recuperacion_claves WHERE email = ?`, [email]);
    },
  };
}
