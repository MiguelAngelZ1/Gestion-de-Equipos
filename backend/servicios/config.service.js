const { IS_DELETED_VAL } = require('../prismaClient');
const prisma = require('../prismaClient');
const db = require('../db/database');
const fs = require('fs');
const path = require('path');

class ConfigService {
    // --- GRUPOS COMODIDAD ---
    async getGruposComodidad() {
        return await prisma.grupos_comodidad.findMany({ orderBy: { nombre: 'asc' } });
    }
    async createGrupoComodidad(nombre) {
        return await prisma.grupos_comodidad.create({ data: { nombre } });
    }
    async updateGrupoComodidad(id, nombre) {
        return await prisma.grupos_comodidad.update({ where: { id: parseInt(id) }, data: { nombre } });
    }
    async deleteGrupoComodidad(id) {
        return await prisma.grupos_comodidad.delete({ where: { id: parseInt(id) } });
    }
    async deleteBulkGruposComodidad(ids) {
        return await prisma.grupos_comodidad.deleteMany({ where: { id: { in: ids.map(i => parseInt(i)) } } });
    }

    // --- GRADOS ---
    async getGrados() {
        return await prisma.grados.findMany({ orderBy: { id: 'asc' } });
    }
    async createGrado(abreviatura, grado_completo) {
        return await prisma.grados.create({ data: { abreviatura, grado_completo } });
    }
    async updateGrado(id, abreviatura, grado_completo) {
        return await prisma.grados.update({ where: { id: parseInt(id) }, data: { abreviatura, grado_completo } });
    }
    async deleteGrado(id) {
        return await prisma.grados.delete({ where: { id: parseInt(id) } });
    }
    async deleteBulkGrados(ids) {
        return await prisma.grados.deleteMany({ where: { id: { in: ids.map(i => parseInt(i)) } } });
    }

    // --- ESTADOS ---
    async getEstados() {
        return await prisma.estados.findMany({ orderBy: { nombre: 'asc' } });
    }
    async createEstado(nombre, color_hex) {
        return await prisma.estados.create({ data: { nombre, color_hex } });
    }
    async updateEstado(id, nombre, color_hex) {
        return await prisma.estados.update({ where: { id: parseInt(id) }, data: { nombre, color_hex } });
    }
    async deleteEstado(id) {
        return await prisma.estados.delete({ where: { id: parseInt(id) } });
    }
    async deleteBulkEstados(ids) {
        return await prisma.estados.deleteMany({ where: { id: { in: ids.map(i => parseInt(i)) } } });
    }

    // --- UBICACIONES ---
    async getUbicaciones() {
        return await prisma.ubicaciones.findMany({ orderBy: { nombre: 'asc' } });
    }
    async createUbicacion(nombre) {
        return await prisma.ubicaciones.create({ data: { nombre, ubicacion: nombre } });
    }
    async updateUbicacion(id, nombre) {
        return await prisma.ubicaciones.update({ where: { id: parseInt(id) }, data: { nombre, ubicacion: nombre } });
    }
    async deleteUbicacion(id) {
        return await prisma.ubicaciones.delete({ where: { id: parseInt(id) } });
    }
    async deleteBulkUbicaciones(ids) {
        return await prisma.ubicaciones.deleteMany({ where: { id: { in: ids.map(i => parseInt(i)) } } });
    }

    // --- MANTENIMIENTO ---
    async getSystemStats() {
        let databaseSize = "0 MB";
        
        try {
            const dbPaths = [
              path.resolve(process.cwd(), 'backend/prisma/equipos.db'),
              path.resolve(process.cwd(), 'prisma/equipos.db'),
              path.resolve(process.cwd(), 'backend/equipos.db'),
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
            console.warn("⚠️ No se pudo obtener el tamaño de la BD:", e.message);
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
        // Limpieza de huérfanos (Prisma)
        await prisma.$transaction([
            prisma.especificaciones.deleteMany({ where: { NOT: { equipos: { isNot: null } } } }),
            prisma.historial_personal.deleteMany({ where: { NOT: { equipos: { isNot: null } } } }),
            prisma.soporte_tareas.deleteMany({ where: { NOT: { equipos: { isNot: null } } } }),
            prisma.componentes_instalados.deleteMany({ where: { NOT: { equipos: { isNot: null } } } })
        ]);

        // Optimización física SQLite
        await prisma.$executeRaw`VACUUM`;
        await prisma.$executeRaw`ANALYZE`;

        return { success: true };
    }
}

module.exports = new ConfigService();
