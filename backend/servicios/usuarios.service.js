const db = require('../db/database');
const bcrypt = require('bcryptjs');

class UsuariosService {
    async getUsuarios() {
        return await db.all(`
            SELECT id, usuario, email, rol, permisos_json, created_at, last_login 
            FROM usuarios 
            ORDER BY id ASC
        `);
    }

    async getUsuarioById(id) {
        return await db.get(`
            SELECT id, usuario, email, rol, permisos_json, created_at 
            FROM usuarios 
            WHERE id = ?
        `, [parseInt(id)]);
    }

    async findByUsuarioOrEmail(identifier) {
        return await db.get(`
            SELECT * FROM usuarios 
            WHERE usuario = ? OR email = ?
        `, [identifier, identifier]);
    }

    async findByEmail(email) {
        return await db.get(`SELECT * FROM usuarios WHERE email = ?`, [email]);
    }

    async countUsuarios() {
        const row = await db.get(`SELECT COUNT(*) as count FROM usuarios`);
        return parseInt(row.count);
    }

    async createUsuario(data) {
        const { usuario, email, password, rol, permisos_json } = data;
        
        const existing = await this.findByUsuarioOrEmail(usuario);
        if (existing) throw new Error("El usuario o email ya existe");

        const password_hash = await bcrypt.hash(password, 12);
        
        const result = await db.run(`
            INSERT INTO usuarios (usuario, email, password_hash, rol, permisos_json) 
            VALUES (?, ?, ?, ?, ?)
        `, [
            usuario, 
            email, 
            password_hash, 
            rol || 'USER', 
            JSON.stringify(permisos_json || [])
        ]);
        
        return { id: result.lastID };
    }

    async updateUsuario(id, data) {
        const { usuario, email, password, rol, permisos_json } = data;
        
        // Determinar qué campos actualizar
        let sql = "UPDATE usuarios SET usuario = ?, email = ?, rol = ?, permisos_json = ?, updated_at = ?";
        const params = [usuario, email, rol, JSON.stringify(permisos_json), new Date().toISOString()];

        if (password) {
            const password_hash = await bcrypt.hash(password, 12);
            sql = "UPDATE usuarios SET usuario = ?, email = ?, password_hash = ?, rol = ?, permisos_json = ?, updated_at = ?";
            params.splice(2, 0, password_hash);
        }

        sql += " WHERE id = ?";
        params.push(parseInt(id));

        return await db.run(sql, params);
    }

    async deleteUsuario(id) {
        return await db.run(`DELETE FROM usuarios WHERE id = ?`, [parseInt(id)]);
    }

    async updateLastLogin(id) {
        return await db.run(`UPDATE usuarios SET last_login = ? WHERE id = ?`, [new Date().toISOString(), parseInt(id)]);
    }

    async resetPasswordSync(email, password_hash) {
        return await db.run(`
            UPDATE usuarios SET password_hash = ?, updated_at = ? 
            WHERE email = ?
        `, [password_hash, new Date().toISOString(), email]);
    }

    // Nota: recuperacion_claves se mantiene con Prisma o se adapta si es necesario.
    // Para simplificar el entorno local, lo adaptamos.
    async saveRecoveryCode(email, codigo, expires) {
        return await db.run(`
            INSERT OR REPLACE INTO recuperacion_claves (email, codigo, expires) 
            VALUES (?, ?, ?)
        `, [email, codigo, expires.toISOString()]);
    }

    async getRecoveryCode(email) {
        return await db.get(`
            SELECT codigo, expires FROM recuperacion_claves WHERE email = ?
        `, [email]);
    }

    async deleteRecoveryCode(email) {
        return await db.run(`
            DELETE FROM recuperacion_claves WHERE email = ?
        `, [email]);
    }
}

module.exports = new UsuariosService();

