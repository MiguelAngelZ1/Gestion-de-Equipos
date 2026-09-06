const db = require('../db/database');

class ReportingService {
    async getInventarioCompleto(id = null) {
        let sql = `
            SELECT eq.*, gc.nombre as tipo, e.nombre as estado, e.color_hex as estado_color,
                   u.nombre as ubicacion,
                   r.grado as resp_grado, r.nombre as resp_nombre, r.apellido as resp_apellido
            FROM equipos eq
            LEFT JOIN grupos_comodidad gc ON eq.categoria_id = gc.id
            LEFT JOIN estados e ON eq.estado_id = e.id
            LEFT JOIN ubicaciones u ON eq.ubicacion_id = u.id
            LEFT JOIN responsables r ON eq.responsable_id = r.id
            WHERE eq.is_deleted = 0
        `;
        const params = [];

        if (id && id !== "null" && id !== "undefined") {
            sql += " AND eq.id = ?";
            params.push(id);
        }

        sql += " ORDER BY eq.ine ASC";

        const equipos = await db.all(sql, params);
        if (equipos.length === 0) return [];
        const specs = await db.all(`SELECT * FROM especificaciones WHERE equipo_id IN (${equipos.map(() => '?').join(',')})`, equipos.map(e => e.id));
        const byEquipo = new Map();
        for (const s of specs) {
            if (!byEquipo.has(s.equipo_id)) byEquipo.set(s.equipo_id, []);
            byEquipo.get(s.equipo_id).push(s);
        }
        return equipos.map(eq => ({
            ...eq,
            responsable: eq.resp_nombre ? `${eq.resp_grado || ''} ${eq.resp_nombre} ${eq.resp_apellido.toUpperCase()}`.trim() : 'SIN ASIGNAR',
            especificaciones: byEquipo.get(eq.id) || []
        }));
    }
}

module.exports = new ReportingService();
