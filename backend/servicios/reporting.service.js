const { IS_DELETED_VAL } = require('../prismaClient');
const prisma = require('../prismaClient');

class ReportingService {
    async getInventarioCompleto(id = null) {
        const where = {
            is_deleted: IS_DELETED_VAL
        };

        if (id && id !== "null" && id !== "undefined") {
            where.id = id;
        }

        const equipos = await prisma.equipos.findMany({
            where,
            include: {
                grupos_comodidad: true,
                estados: true,
                ubicaciones: true,
                responsables: true,
                especificaciones: true
            },
            orderBy: { ine: 'asc' }
        });

        return equipos.map(e => {
            const r = e.responsables;
            const responsable = r ? 
                `${r.grado || ''} ${r.nombre} ${r.apellido.toUpperCase()}`.trim() : 
                'SIN ASIGNAR';

            return {
                ...e,
                tipo: e.grupos_comodidad?.nombre,
                estado: e.estados?.nombre,
                ubicacion: e.ubicaciones?.nombre,
                responsable,
                especificaciones: e.especificaciones || []
            };
        });
    }
}

module.exports = new ReportingService();
