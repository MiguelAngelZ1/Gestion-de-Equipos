const db = require('../db/database');

class PrestamosService {
    async getPrestamos() {
        return await db.all(`
            SELECT p.*, e.ine, e.nne, e.serie
            FROM prestamos p
            LEFT JOIN equipos e ON p.equipo_id = e.id
            ORDER BY p.fecha_prestamo DESC
        `);
    }

    async crearPrestamo(data) {
        const { equipo_id, solicitante, motivo, fecha_prestamo, fecha_devolucion_estimada, notas } = data;

        await db.beginTransaction();
        try {
            const result = await db.run(
                `INSERT INTO prestamos (equipo_id, solicitante, motivo, fecha_prestamo, fecha_devolucion_estimada, notas, estado)
                 VALUES (?, ?, ?, ?, ?, ?, 'ACTIVO')`,
                [
                    equipo_id,
                    solicitante,
                    motivo || null,
                    fecha_prestamo ? new Date(fecha_prestamo).toISOString() : new Date().toISOString(),
                    fecha_devolucion_estimada ? new Date(fecha_devolucion_estimada).toISOString() : null,
                    notas || null
                ]
            );

            const estadoPrestamo = await db.get("SELECT id FROM estados WHERE LOWER(nombre) LIKE '%prestamo%'");
            if (estadoPrestamo) {
                await db.run("UPDATE equipos SET estado_id = ? WHERE id = ?", [estadoPrestamo.id, equipo_id]);
            }

            await db.commit();
            return { id: result.lastID, ...data, estado: 'ACTIVO' };
        } catch (error) {
            await db.rollback();
            throw error;
        }
    }

    async devolverEquipo(id, estado_id_final) {
        await db.beginTransaction();
        try {
            const prestamo = await db.get("SELECT * FROM prestamos WHERE id = ?", [parseInt(id)]);
            if (!prestamo) throw new Error('Préstamo no encontrado');

            await db.run(
                "UPDATE prestamos SET estado = 'DEVUELTO', fecha_devolucion_real = ? WHERE id = ?",
                [new Date().toISOString(), parseInt(id)]
            );

            let targetEstadoId = estado_id_final;
            if (!targetEstadoId) {
                const estadoBueno = await db.get("SELECT id FROM estados WHERE LOWER(nombre) LIKE '%servicio%'");
                if (estadoBueno) targetEstadoId = estadoBueno.id;
            }

            if (targetEstadoId) {
                await db.run("UPDATE equipos SET estado_id = ? WHERE id = ?", [targetEstadoId, prestamo.equipo_id]);
            }

            await db.commit();
            return { success: true };
        } catch (error) {
            await db.rollback();
            throw error;
        }
    }

    async devolverBulkEquipos(ids, estado_id_final) {
        if (!Array.isArray(ids) || ids.length === 0) return { count: 0 };
        const parsedIds = ids.map(id => parseInt(id));

        await db.beginTransaction();
        try {
            const placeholders = parsedIds.map(() => '?').join(',');
            const prestamos = await db.all(
                `SELECT * FROM prestamos WHERE id IN (${placeholders}) AND estado = 'ACTIVO'`,
                parsedIds
            );

            if (prestamos.length === 0) {
                await db.commit();
                return { count: 0 };
            }

            const prestamoIds = prestamos.map(p => p.id);
            const pPlaceholders = prestamoIds.map(() => '?').join(',');
            await db.run(
                `UPDATE prestamos SET estado = 'DEVUELTO', fecha_devolucion_real = ? WHERE id IN (${pPlaceholders})`,
                [new Date().toISOString(), ...prestamoIds]
            );

            let targetEstadoId = estado_id_final;
            if (!targetEstadoId) {
                const estadoBueno = await db.get("SELECT id FROM estados WHERE LOWER(nombre) LIKE '%servicio%'");
                if (estadoBueno) targetEstadoId = estadoBueno.id;
            }

            if (targetEstadoId) {
                const equipoIds = prestamos.map(p => p.equipo_id);
                const ePlaceholders = equipoIds.map(() => '?').join(',');
                await db.run(
                    `UPDATE equipos SET estado_id = ? WHERE id IN (${ePlaceholders})`,
                    [targetEstadoId, ...equipoIds]
                );
            }

            await db.commit();
            return { count: prestamos.length };
        } catch (error) {
            await db.rollback();
            throw error;
        }
    }

    async deleteBulkPrestamos(ids) {
        if (!Array.isArray(ids) || ids.length === 0) return { count: 0 };
        const parsedIds = ids.map(id => parseInt(id));
        const placeholders = parsedIds.map(() => '?').join(',');
        const result = await db.run(`DELETE FROM prestamos WHERE id IN (${placeholders})`, parsedIds);
        return { count: result.changes };
    }

    async limpiarHistorial() {
        const result = await db.run("DELETE FROM prestamos WHERE estado = 'DEVUELTO'");
        return { count: result.changes };
    }
}

class MensajeriaService {
    async enviarMensaje(data) {
        const { usuario_id, remitente, mensaje } = data;
        const result = await db.run(
            "INSERT INTO mensajes_admin (usuario_id, remitente, mensaje) VALUES (?, ?, ?)",
            [usuario_id || null, remitente || null, mensaje]
        );
        return { id: result.lastID, ...data };
    }

    async getMensajes() {
        return await db.all("SELECT * FROM mensajes_admin ORDER BY fecha DESC LIMIT 100");
    }

    async marcarLeido(id) {
        await db.run("UPDATE mensajes_admin SET leido = 1 WHERE id = ?", [parseInt(id)]);
        return { success: true };
    }

    async marcarTodoLeido() {
        await db.run("UPDATE mensajes_admin SET leido = 1 WHERE leido = 0");
        return { success: true };
    }

    async eliminarLeidos() {
        const result = await db.run("DELETE FROM mensajes_admin WHERE leido = 1");
        return { count: result.changes };
    }
}

module.exports = {
    prestamosService: new PrestamosService(),
    mensajeriaService: new MensajeriaService()
};
