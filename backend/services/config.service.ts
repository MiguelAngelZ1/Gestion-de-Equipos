const logger = require('../utils/logger');
const db = require('../db/database');
const fs = require('fs');
const path = require('path');

class ConfigService {
    // --- GRUPOS COMODIDAD ---
    async getGruposComodidad() {
        return await db.all("SELECT * FROM grupos_comodidad ORDER BY nombre ASC");
    }
    async createGrupoComodidad(nombre) {
        const result = await db.run("INSERT INTO grupos_comodidad (nombre) VALUES (?)", [nombre]);
        return await db.get("SELECT * FROM grupos_comodidad WHERE id = ?", [result.lastID]);
    }
    async updateGrupoComodidad(id, nombre) {
        await db.run("UPDATE grupos_comodidad SET nombre = ? WHERE id = ?", [nombre, id]);
        return await db.get("SELECT * FROM grupos_comodidad WHERE id = ?", [id]);
    }
    async deleteGrupoComodidad(id) {
        await db.run("DELETE FROM grupos_comodidad WHERE id = ?", [id]);
        return { success: true };
    }
    async deleteBulkGruposComodidad(ids) {
        const placeholders = ids.map(() => '?').join(',');
        await db.run(`DELETE FROM grupos_comodidad WHERE id IN (${placeholders})`, ids);
        return { success: true };
    }

    // --- GRADOS ---
    async getGrados() {
        return await db.all("SELECT * FROM grados ORDER BY id ASC");
    }
    async createGrado(abreviatura, grado_completo) {
        const result = await db.run("INSERT INTO grados (abreviatura, grado_completo) VALUES (?, ?)", [abreviatura, grado_completo]);
        return await db.get("SELECT * FROM grados WHERE id = ?", [result.lastID]);
    }
    async updateGrado(id, abreviatura, grado_completo) {
        await db.run("UPDATE grados SET abreviatura = ?, grado_completo = ? WHERE id = ?", [abreviatura, grado_completo, id]);
        return await db.get("SELECT * FROM grados WHERE id = ?", [id]);
    }
    async deleteGrado(id) {
        await db.run("DELETE FROM grados WHERE id = ?", [id]);
        return { success: true };
    }
    async deleteBulkGrados(ids) {
        const placeholders = ids.map(() => '?').join(',');
        await db.run(`DELETE FROM grados WHERE id IN (${placeholders})`, ids);
        return { success: true };
    }

    // --- ESTADOS ---
    async getEstados() {
        return await db.all("SELECT * FROM estados ORDER BY nombre ASC");
    }
    async createEstado(nombre, color_hex) {
        const result = await db.run("INSERT INTO estados (nombre, color_hex) VALUES (?, ?)", [nombre, color_hex]);
        return await db.get("SELECT * FROM estados WHERE id = ?", [result.lastID]);
    }
    async updateEstado(id, nombre, color_hex) {
        await db.run("UPDATE estados SET nombre = ?, color_hex = ? WHERE id = ?", [nombre, color_hex, id]);
        return await db.get("SELECT * FROM estados WHERE id = ?", [id]);
    }
    async deleteEstado(id) {
        await db.run("DELETE FROM estados WHERE id = ?", [id]);
        return { success: true };
    }
    async deleteBulkEstados(ids) {
        const placeholders = ids.map(() => '?').join(',');
        await db.run(`DELETE FROM estados WHERE id IN (${placeholders})`, ids);
        return { success: true };
    }

    // --- UBICACIONES ---
    async getUbicaciones() {
        return await db.all("SELECT * FROM ubicaciones ORDER BY nombre ASC");
    }
    async createUbicacion(nombre) {
        const result = await db.run("INSERT INTO ubicaciones (nombre, ubicacion) VALUES (?, ?)", [nombre, nombre]);
        return await db.get("SELECT * FROM ubicaciones WHERE id = ?", [result.lastID]);
    }
    async updateUbicacion(id, nombre) {
        await db.run("UPDATE ubicaciones SET nombre = ?, ubicacion = ? WHERE id = ?", [nombre, nombre, id]);
        return await db.get("SELECT * FROM ubicaciones WHERE id = ?", [id]);
    }
    async deleteUbicacion(id) {
        await db.run("DELETE FROM ubicaciones WHERE id = ?", [id]);
        return { success: true };
    }
    async deleteBulkUbicaciones(ids) {
        const placeholders = ids.map(() => '?').join(',');
        await db.run(`DELETE FROM ubicaciones WHERE id IN (${placeholders})`, ids);
        return { success: true };
    }

    // --- MANTENIMIENTO ---
    async getSystemStats() {
        let databaseSize = "0 MB";
        
        try {
            const dbPaths = [
              path.resolve(process.cwd(), 'backend/equipos.db'),
              path.resolve(process.cwd(), 'backend/equipos.db'),
              path.resolve(process.cwd(), 'backend/prisma/equipos.db'),
              path.resolve(process.cwd(), 'prisma/equipos.db'),
              path.resolve(__dirname, '../prisma/equipos.db'),
              path.resolve(__dirname, '../../backend/prisma/equipos.db')
            ];
            
            for (const p of dbPaths) {
              if (fs.existsSync(p)) {
                const stats = fs.statSync(p);
                databaseSize = (stats.size / 1024 / 1024).toFixed(2) + " MB";
                break;
              }
            }
        } catch (e) {
            logger.warn({ err: e.message }, "No se pudo obtener el tamaño de la BD");
            databaseSize = "N/A";
        }

        const activeVal = 0;
        const deletedVal = 1;

        const counts = await Promise.all([
            db.get("SELECT COUNT(*) as count FROM equipos WHERE is_deleted = ?", [activeVal]),
            db.get("SELECT COUNT(*) as count FROM equipos WHERE is_deleted = ?", [deletedVal]),
            db.get("SELECT COUNT(*) as count FROM componentes_repuestos"),
            db.get("SELECT COUNT(*) as count FROM movimientos_stock"),
            db.get("SELECT COUNT(*) as count FROM soporte_tareas")
        ]);

        return {
            databaseSize,
            counts: {
                equipos: counts[0].count,
                papelera: counts[1].count,
                repuestos: counts[2].count,
                movimientos: counts[3].count,
                soporte: counts[4].count
            },
            engine: "SQLite (Local)"
        };
    }

    async getTrashItems() {
        const deletedVal = 1;

        const items = await db.all(`
            SELECT e.*, 
                   gc.nombre as tipo, 
                   r.nombre as resp_nombre, r.apellido as resp_apellido, r.grado as resp_grado,
                   u.nombre as ubi_nombre
            FROM equipos e
            LEFT JOIN grupos_comodidad gc ON e.categoria_id = gc.id
            LEFT JOIN responsables r ON e.responsable_id = r.id
            LEFT JOIN ubicaciones u ON e.ubicacion_id = u.id
            WHERE e.is_deleted = ?
            ORDER BY e.updated_at DESC
        `, [deletedVal]);

        return items.map(e => {
            const resp = e.resp_nombre ? `${e.resp_grado || ''} ${e.resp_nombre} ${e.resp_apellido.toUpperCase()}`.trim() : 'SIN ASIGNAR';
            return {
                id: e.id,
                ine: e.ine,
                nne: e.nne,
                serie: e.serie,
                tipo: e.tipo,
                responsable: resp,
                ubicacion: e.ubi_nombre,
                fecha_eliminacion: e.updated_at
            };
        });
    }

    async restoreEquipo(id) {
        const activeVal = 0;

        await db.run(
            "UPDATE equipos SET is_deleted = ?, updated_at = ? WHERE id = ?",
            [activeVal, new Date().toISOString(), id]
        );

        await db.run(
            "INSERT INTO historial_personal (equipo_id, responsable, evento, notas) VALUES (?, ?, ?, ?)",
            [id, "SISTEMA", 'RESTAURACION_EQUIPO', 'El equipo ha sido recuperado de la papelera']
        );

        return { success: true };
    }

    async deleteFromTrash(id) {
        // En SQLite y PG, cascada manual si no está activada en DB (pero db.js activa pragma en SQLite)
        // Para mayor seguridad y consistencia local-nube, lo hacemos explícito o confiamos en db.js
        await db.run("DELETE FROM especificaciones WHERE equipo_id = ?", [id]);
        await db.run("DELETE FROM historial_personal WHERE equipo_id = ?", [id]);
        await db.run("DELETE FROM soporte_tareas WHERE equipo_id = ?", [id]);
        await db.run("DELETE FROM componentes_instalados WHERE equipo_id = ?", [id]);
        await db.run("UPDATE movimientos_stock SET equipo_id = NULL WHERE equipo_id = ?", [id]);
        await db.run("UPDATE componentes_repuestos SET equipo_id = NULL WHERE equipo_id = ?", [id]);
        await db.run("DELETE FROM equipos WHERE id = ?", [id]);
        
        return { success: true };
    }

    async purgeTrash() {
        const deletedVal = 1;

        const trashItems = await db.all("SELECT id FROM equipos WHERE is_deleted = ?", [deletedVal]);
        const ids = trashItems.map(item => item.id);

        if (ids.length === 0) return { success: true, count: 0 };

        for (const id of ids) {
            await this.deleteFromTrash(id);
        }

        return { success: true, count: ids.length };
    }

    async optimizeDatabase() {
        await db.run("DELETE FROM especificaciones WHERE equipo_id IS NOT NULL AND equipo_id NOT IN (SELECT id FROM equipos)");
        await db.run("DELETE FROM historial_personal WHERE equipo_id IS NOT NULL AND equipo_id NOT IN (SELECT id FROM equipos)");
        await db.run("DELETE FROM soporte_tareas WHERE equipo_id IS NOT NULL AND equipo_id NOT IN (SELECT id FROM equipos)");
        await db.run("DELETE FROM componentes_instalados WHERE equipo_id IS NOT NULL AND equipo_id NOT IN (SELECT id FROM equipos)");

        await db.run("VACUUM");
        await db.run("ANALYZE");

        return { success: true };
    }
}

module.exports = new ConfigService();
