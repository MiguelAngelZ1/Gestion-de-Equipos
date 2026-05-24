const db = require('../db/database');
const notificationService = require('./notificationService');

class SoporteService {
    async getTareasSoporte(query) {
        const { q } = query;
        
        let sql = `
            SELECT t.*, 
                   e.ine, e.serie, e.nne,
                   gc.nombre as equipo_tipo,
                   u.nombre as equipo_ubicacion,
                   r.nombre as resp_nombre, r.apellido as resp_apellido, r.grado as resp_grado
            FROM soporte_tareas t
            LEFT JOIN equipos e ON t.equipo_id = e.id
            LEFT JOIN grupos_comodidad gc ON e.categoria_id = gc.id
            LEFT JOIN ubicaciones u ON e.ubicacion_id = u.id
            LEFT JOIN responsables r ON e.responsable_id = r.id
            WHERE 1=1
        `;

        const params = [];
        if (q && q.trim() !== "") {
            const search = `%${q.trim()}%`;
            sql += ` AND (
                t.responsable LIKE ? OR 
                t.tarea_realizada LIKE ? OR 
                t.ticket_id LIKE ? OR 
                e.ine LIKE ? OR 
                e.serie LIKE ?
            )`;
            for(let i=0; i<5; i++) params.push(search);
        }

        sql += " ORDER BY t.fecha DESC LIMIT 200";

        const tareas = await db.all(sql, params);

        return tareas.map(t => {
            const responsable_completo = t.resp_nombre ? 
                `${t.resp_grado || ''} ${t.resp_nombre} ${t.resp_apellido.toUpperCase()}`.trim() : 
                t.responsable;

            return {
                ...t,
                responsable_completo,
                especificaciones: [] // Se podría cargar bajo demanda si es necesario
            };
        });
    }

    async createOrUpdateTareaSoporte(data, id = null) {
        const { equipo_id, tarea_realizada, fecha, tipo_falla, costo_estimado } = data;

        // Obtener equipo y responsable
        const equipo = await db.get(`
            SELECT e.*, r.nombre, r.apellido, r.grado 
            FROM equipos e 
            LEFT JOIN responsables r ON e.responsable_id = r.id 
            WHERE e.id = ?`, [equipo_id]
        );

        if (!equipo) throw new Error("Equipo no encontrado");

        const responsableReal = equipo.nombre ? 
            `${equipo.grado || ''} ${equipo.nombre} ${equipo.apellido.toUpperCase()}`.trim() : 
            'Servicio Técnico';

        let tareaId = id;
        
        if (id) {
            await db.run(
                `UPDATE soporte_tareas SET 
                    equipo_id = ?, responsable = ?, tarea_realizada = ?, 
                    fecha = ?, tipo_falla = ?, costo_estimado = ?, updated_at = ?
                 WHERE id = ?`,
                [
                    equipo_id, responsableReal, tarea_realizada, 
                    fecha ? (fecha.includes('T') ? fecha : `${fecha}T12:00:00Z`) : new Date().toISOString(),
                    tipo_falla, costo_estimado || 0, new Date().toISOString(), id
                ]
            );

            await db.run(
                "INSERT INTO historial_personal (equipo_id, responsable, evento, notas) VALUES (?, ?, 'MANTENIMIENTO_ACTUALIZADO', ?)",
                [equipo_id, responsableReal, `Se actualizó la tarea de soporte ID: ${id}`]
            );
        } else {
            const now = new Date();
            const year = now.getFullYear();
            
            // Generar Ticket ID
            const countRow = await db.get(
                "SELECT COUNT(*) as total FROM soporte_tareas WHERE ticket_id LIKE ?",
                [`SOP-${year}-%`]
            );
            const nextNum = (parseInt(countRow.total) + 1).toString().padStart(3, '0');
            const ticket_id = `SOP-${year}-${nextNum}`;

            const result = await db.run(
                `INSERT INTO soporte_tareas (ticket_id, equipo_id, responsable, tarea_realizada, fecha, tipo_falla, costo_estimado, updated_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    ticket_id, equipo_id, responsableReal, tarea_realizada,
                    fecha ? (fecha.includes('T') ? fecha : `${fecha}T12:00:00Z`) : now.toISOString(),
                    tipo_falla || 'Mantenimiento / Hardware', costo_estimado || 0, now.toISOString()
                ]
            );
            tareaId = result.lastID;

            await db.run(
                "INSERT INTO historial_personal (equipo_id, responsable, evento, notas) VALUES (?, ?, 'SOPORTE_MANTENIMIENTO', ?)",
                [equipo_id, responsableReal, `Ticket ${ticket_id}: ${tarea_realizada.substring(0, 50)}`]
            );

            // Notificaciones proactivas
            try {
                const admins = await db.all("SELECT id FROM usuarios WHERE rol = 'ADMIN'");
                const payload = {
                    title: `🔧 Nuevo Ticket: ${ticket_id}`,
                    body: `${equipo.ine}: ${tarea_realizada.substring(0, 50)}...`,
                    type: 'taller'
                };

                for (const admin of admins) {
                    await notificationService.sendToUser(admin.id, payload);
                }
            } catch (e) {
                console.error("⚠️ Error en notificaciones de soporte:", e);
            }
        }

        return { id: tareaId };
    }

    async deleteTareaSoporte(id) {
        return await db.run("DELETE FROM soporte_tareas WHERE id = ?", [parseInt(id)]);
    }

    async deleteBulkSoporte(ids) {
        if (!Array.isArray(ids) || ids.length === 0) return { count: 0 };
        const placeholders = ids.map(() => '?').join(',');
        const result = await db.run(`DELETE FROM soporte_tareas WHERE id IN (${placeholders})`, ids.map(id => parseInt(id)));
        return { count: result.changes };
    }
}

module.exports = new SoporteService();

