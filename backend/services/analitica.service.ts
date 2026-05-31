const logger = require('../utils/logger');
const db = require('../db/database');
const IS_DELETED_VAL_SQL = 0; // Para SQL local usaremos 0

class DashboardService {
    async getDashboardSummary() {
        try {
            // Detección de valores booleanos/enteros según motor
            const isDeleted = db.isPostgreSQL ? false : 0;

            const [stats, locations, totalResult, stockBajo, equiposCriticos] = await Promise.all([
                // Conteo por Estado
                db.all(`
                    SELECT e.nombre, e.color_hex, COUNT(eq.id) as count
                    FROM estados e
                    LEFT JOIN equipos eq ON e.id = eq.estado_id AND eq.is_deleted = ?
                    GROUP BY e.id, e.nombre, e.color_hex
                `, [isDeleted]),

                // Conteo por Ubicación
                db.all(`
                    SELECT u.nombre, COUNT(eq.id) as count
                    FROM ubicaciones u
                    LEFT JOIN equipos eq ON u.id = eq.ubicacion_id AND eq.is_deleted = ?
                    GROUP BY u.id, u.nombre
                `, [isDeleted]),

                // Total Equipos
                db.get(`SELECT COUNT(*) as total FROM equipos WHERE is_deleted = ?`, [isDeleted]),

                // Stock Bajo
                db.all(`SELECT nombre, cantidad FROM componentes_repuestos WHERE cantidad < 3`),

                db.all(`
                    SELECT 
                        eq.id, 
                        eq.ine, 
                        eq.nne,
                        eq.serie,
                        eq.updated_at, 
                        e.nombre as estado, 
                        e.color_hex, 
                        gc.nombre as categoria,
                        u.nombre as ubicacion,
                        (r.grado || ' ' || r.nombre || ' ' || r.apellido) as responsable_actual,
                        (SELECT notas FROM historial_personal WHERE equipo_id = eq.id ORDER BY fecha DESC LIMIT 1) as falla
                    FROM equipos eq
                    JOIN estados e ON eq.estado_id = e.id
                    LEFT JOIN grupos_comodidad gc ON eq.categoria_id = gc.id
                    LEFT JOIN ubicaciones u ON eq.ubicacion_id = u.id
                    LEFT JOIN responsables r ON eq.responsable_id = r.id
                    WHERE eq.is_deleted = ? 
                    AND (
                        LOWER(e.nombre) LIKE '%mant%' OR 
                        LOWER(e.nombre) LIKE '%f/s%' OR 
                        LOWER(e.nombre) LIKE '%malo%' OR 
                        LOWER(e.nombre) LIKE '%mala%' OR 
                        LOWER(e.nombre) LIKE '%baja%' OR
                        LOWER(e.nombre) LIKE '%taller%' OR
                        LOWER(e.nombre) LIKE '%reparaci%' OR
                        LOWER(e.nombre) LIKE '%fuera%'
                    )
                    ORDER BY eq.updated_at DESC
                    LIMIT 8
                `, [isDeleted])
            ]);

            return {
                stats: stats.map(s => ({
                    name: s.nombre,
                    value: s.count,
                    color: s.color_hex
                })),
                locations: locations
                    .map(u => ({
                        name: u.nombre,
                        value: u.count
                    }))
                    .filter(u => u.value > 0)
                    .sort((a, b) => b.value - a.value),
                total: totalResult.total,
                alerts: {
                    lowStock: stockBajo
                },
                criticalEquipos: equiposCriticos
            };
        } catch (error) {
            logger.error({ err: error }, "Error en getDashboardSummary");
            throw error;
        }
    }
}

class HistorialService {
    async getHistorial(query) {
        const { q, page = 1, limit = 50, offset = 0 } = query;

        const fromClause = `
            FROM historial_personal hp
            LEFT JOIN equipos eq ON hp.equipo_id = eq.id
            LEFT JOIN grupos_comodidad gc ON eq.categoria_id = gc.id
            LEFT JOIN responsables r ON eq.responsable_id = r.id
        `;

        let whereClause = "WHERE eq.is_deleted = 0";
        const params = [];

        if (q && q.trim() !== "") {
            const searchStr = `%${q.trim()}%`;
            whereClause += ` AND (
                hp.responsable LIKE ? OR hp.evento LIKE ? OR hp.notas LIKE ?
                OR eq.ine LIKE ? OR eq.serie LIKE ? OR eq.nne LIKE ?
                OR gc.nombre LIKE ? OR r.apellido LIKE ?
                OR EXISTS (SELECT 1 FROM especificaciones esp WHERE esp.equipo_id = eq.id AND (esp.clave LIKE ? OR esp.valor LIKE ?))
            )`;
            params.push(searchStr, searchStr, searchStr, searchStr, searchStr, searchStr, searchStr, searchStr, searchStr, searchStr);
        }

        const countResult = await db.get(`SELECT COUNT(*) as total ${fromClause} ${whereClause}`, params);
        const total = countResult.total;

        const rows = await db.all(`
            SELECT hp.*, eq.ine, eq.nne, eq.serie,
                   gc.nombre as equipo_tipo,
                   r.nombre as resp_nombre, r.apellido as resp_apellido, r.grado as resp_grado
            ${fromClause} ${whereClause} ORDER BY hp.fecha DESC LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        const data = rows.map(h => {
            const responsable_actual = h.resp_nombre
                ? `${h.resp_grado || ''} ${h.resp_nombre} ${h.resp_apellido.toUpperCase()}`.trim()
                : 'SIN ASIGNAR';

            return {
                ...h,
                ine: h.ine,
                serie: h.serie,
                nne: h.nne,
                responsable_actual,
                equipo_tipo: h.equipo_tipo
            };
        });

        return {
            data,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
}

module.exports = {
    dashboardService: new DashboardService(),
    historialService: new HistorialService()
};
