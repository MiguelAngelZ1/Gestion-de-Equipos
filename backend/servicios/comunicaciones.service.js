const { TRUE_VAL, FALSE_VAL } = require('../prismaClient');
const prisma = require('../prismaClient');

class PrestamosService {
    async getPrestamos() {
        return await prisma.prestamos.findMany({
            orderBy: { fecha_prestamo: 'desc' },
            include: {
                equipos: {
                    select: {
                        ine: true,
                        nne: true,
                        serie: true
                    }
                }
            }
        });
    }

    async crearPrestamo(data) {
        const { equipo_id, solicitante, motivo, fecha_prestamo, fecha_devolucion_estimada, notas } = data;

        return await prisma.$transaction(async (tx) => {
            const prestamo = await tx.prestamos.create({
                data: {
                    equipo_id,
                    solicitante,
                    motivo,
                    fecha_prestamo: fecha_prestamo ? new Date(fecha_prestamo) : new Date(),
                    fecha_devolucion_estimada: fecha_devolucion_estimada ? new Date(fecha_devolucion_estimada) : null,
                    notas,
                    estado: 'ACTIVO'
                }
            });

            // Actualizar estado del equipo a PRESTAMO
            const estadoPrestamo = await tx.estados.findFirst({
                where: { nombre: { contains: 'prestamo' } }
            });

            if (estadoPrestamo) {
                await tx.equipos.update({
                    where: { id: equipo_id },
                    data: { estado_id: estadoPrestamo.id }
                });
            }

            return prestamo;
        });
    }

    async devolverEquipo(id, estado_id_final) {
        return await prisma.$transaction(async (tx) => {
            const prestamo = await tx.prestamos.findUnique({
                where: { id: parseInt(id) }
            });

            if (!prestamo) throw new Error('Préstamo no encontrado');

            await tx.prestamos.update({
                where: { id: parseInt(id) },
                data: {
                    estado: 'DEVUELTO',
                    fecha_devolucion_real: new Date()
                }
            });

            let targetEstadoId = estado_id_final;
            if (!targetEstadoId) {
                const estadoBueno = await tx.estados.findFirst({
                    where: { nombre: { contains: 'servicio' } }
                });
                if (estadoBueno) targetEstadoId = estadoBueno.id;
            }

            if (targetEstadoId) {
                await tx.equipos.update({
                    where: { id: prestamo.equipo_id },
                    data: { estado_id: targetEstadoId }
                });
            }

            return { success: true };
        });
    }

    async devolverBulkEquipos(ids, estado_id_final) {
        if (!Array.isArray(ids) || ids.length === 0) return { count: 0 };
        return await prisma.$transaction(async (tx) => {
            const prestamos = await tx.prestamos.findMany({
                where: { id: { in: ids.map(id => parseInt(id)) }, estado: 'ACTIVO' }
            });

            if (prestamos.length === 0) return { count: 0 };

            await tx.prestamos.updateMany({
                where: { id: { in: prestamos.map(p => p.id) } },
                data: {
                    estado: 'DEVUELTO',
                    fecha_devolucion_real: new Date()
                }
            });

            let targetEstadoId = estado_id_final;
            if (!targetEstadoId) {
                const estadoBueno = await tx.estados.findFirst({
                    where: { nombre: { contains: 'servicio' } }
                });
                if (estadoBueno) targetEstadoId = estadoBueno.id;
            }

            if (targetEstadoId) {
                await tx.equipos.updateMany({
                    where: { id: { in: prestamos.map(p => p.equipo_id) } },
                    data: { estado_id: targetEstadoId }
                });
            }

            return { count: prestamos.length };
        });
    }

    async deleteBulkPrestamos(ids) {
        if (!Array.isArray(ids) || ids.length === 0) return { count: 0 };
        const result = await prisma.prestamos.deleteMany({
            where: { id: { in: ids.map(id => parseInt(id)) } }
        });
        return { count: result.count };
    }

    async limpiarHistorial() {
        const result = await prisma.prestamos.deleteMany({
            where: { estado: 'DEVUELTO' }
        });
        return { count: result.count };
    }
}

class MensajeriaService {
    async enviarMensaje(data) {
        const { usuario_id, remitente, mensaje } = data;
        return await prisma.mensajes_admin.create({
            data: {
                usuario_id,
                remitente,
                mensaje
            }
        });
    }

    async getMensajes() {
        return await prisma.mensajes_admin.findMany({
            orderBy: { fecha: 'desc' },
            take: 100
        });
    }

    async marcarLeido(id) {
        return await prisma.mensajes_admin.update({
            where: { id: parseInt(id) },
            data: { leido: TRUE_VAL }
        });
    }

    async marcarTodoLeido() {
        return await prisma.mensajes_admin.updateMany({
            where: { leido: FALSE_VAL },
            data: { leido: TRUE_VAL }
        });
    }

    async eliminarLeidos() {
        return await prisma.mensajes_admin.deleteMany({
            where: { leido: TRUE_VAL }
        });
    }
}

module.exports = {
    prestamosService: new PrestamosService(),
    mensajeriaService: new MensajeriaService()
};
