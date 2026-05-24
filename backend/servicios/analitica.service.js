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
            console.error("❌ Error en getDashboardSummary (SQL):", error);
            throw error;
        }
    }
}

class HistorialService {
    async getHistorial(query) {
        // Mantenemos Prisma en HistorialService por ahora, pero extraemos IS_DELETED_VAL localmente
        const prisma = require('../prismaClient');
        const IS_DELETED_VAL = prisma.IS_DELETED_VAL;
        const { q } = query;
        
        let searchCondition = {
            equipos: { is_deleted: IS_DELETED_VAL }
        };

        if (q && q.trim() !== "") {
            const searchStr = q.trim();
            searchCondition = {
                AND: [
                    searchCondition,
                    {
                        OR: [
                            { responsable: { contains: searchStr } },
                            { evento: { contains: searchStr } },
                            { notas: { contains: searchStr } },
                            { equipos: { ine: { contains: searchStr } } },
                            { equipos: { serie: { contains: searchStr } } },
                            { equipos: { nne: { contains: searchStr } } },
                            { equipos: { grupos_comodidad: { nombre: { contains: searchStr } } } },
                            { equipos: { responsables: { apellido: { contains: searchStr } } } },
                            { equipos: { especificaciones: { some: { 
                                OR: [
                                    { clave: { contains: searchStr } },
                                    { valor: { contains: searchStr } }
                                ]
                            } } } }
                        ]
                    }
                ]
            };
        }

        const historial = await prisma.historial_personal.findMany({
            where: searchCondition,
            orderBy: { fecha: 'desc' },
            take: 200,
            include: {
                equipos: {
                    include: {
                        grupos_comodidad: true,
                        responsables: true
                    }
                }
            }
        });

        return historial.map(h => {
            const r = h.equipos?.responsables;
            const responsable_actual = r ? 
                `${r.grado || ''} ${r.nombre} ${r.apellido.toUpperCase()}`.trim() : 
                'SIN ASIGNAR';

            return {
                ...h,
                ine: h.equipos?.ine,
                serie: h.equipos?.serie,
                nne: h.equipos?.nne,
                responsable_actual,
                equipo_tipo: h.equipos?.grupos_comodidad?.nombre
            };
        });
    }
}

module.exports = {
    dashboardService: new DashboardService(),
    historialService: new HistorialService()
};
