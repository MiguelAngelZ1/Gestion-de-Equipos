// Puerto de backend/services/comunicaciones.service.ts (PrestamosService).
import type { Db } from '../db';

export function prestamosService(db: Db) {
  return {
    async getPrestamos() {
      return db.all(`SELECT p.*, e.ine, e.nne, e.serie FROM prestamos p LEFT JOIN equipos e ON p.equipo_id = e.id ORDER BY p.fecha_prestamo DESC`);
    },

    async crearPrestamo(data: any) {
      const { equipo_id, solicitante, motivo, fecha_prestamo, fecha_devolucion_estimada, notas } = data;
      await db.beginTransaction();
      try {
        const result = await db.run(
          `INSERT INTO prestamos (equipo_id, solicitante, motivo, fecha_prestamo, fecha_devolucion_estimada, notas, estado) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVO')`,
          [
            equipo_id, solicitante, motivo || null,
            fecha_prestamo ? new Date(fecha_prestamo).toISOString() : new Date().toISOString(),
            fecha_devolucion_estimada ? new Date(fecha_devolucion_estimada).toISOString() : null,
            notas || null,
          ]
        );
        const estadoPrestamo = await db.get("SELECT id FROM estados WHERE LOWER(nombre) LIKE '%prestamo%'");
        if (estadoPrestamo) {
          await db.run('UPDATE equipos SET estado_id = ? WHERE id = ?', [estadoPrestamo.id, equipo_id]);
        }
        await db.commit();
        return { id: result.lastID, ...data, estado: 'ACTIVO' };
      } catch (error) {
        await db.rollback();
        throw error;
      }
    },

    async devolverEquipo(id: unknown, estado_id_final: unknown) {
      await db.beginTransaction();
      try {
        const prestamo = await db.get('SELECT * FROM prestamos WHERE id = ?', [parseInt(String(id))]);
        if (!prestamo) throw new Error('Préstamo no encontrado');
        await db.run("UPDATE prestamos SET estado = 'DEVUELTO', fecha_devolucion_real = ? WHERE id = ?", [new Date().toISOString(), parseInt(String(id))]);
        let targetEstadoId = estado_id_final;
        if (!targetEstadoId) {
          const estadoBueno = await db.get("SELECT id FROM estados WHERE LOWER(nombre) LIKE '%servicio%'");
          if (estadoBueno) targetEstadoId = estadoBueno.id;
        }
        if (targetEstadoId) {
          await db.run('UPDATE equipos SET estado_id = ? WHERE id = ?', [targetEstadoId, prestamo.equipo_id]);
        }
        await db.commit();
        return { success: true };
      } catch (error) {
        await db.rollback();
        throw error;
      }
    },

    async devolverBulkEquipos(ids: unknown[], estado_id_final: unknown) {
      if (!Array.isArray(ids) || ids.length === 0) return { count: 0 };
      const parsedIds = ids.map((id) => parseInt(String(id)));
      await db.beginTransaction();
      try {
        const placeholders = parsedIds.map(() => '?').join(',');
        const prestamos = await db.all(`SELECT * FROM prestamos WHERE id IN (${placeholders}) AND estado = 'ACTIVO'`, parsedIds);
        if (prestamos.length === 0) {
          await db.commit();
          return { count: 0 };
        }
        const prestamoIds = prestamos.map((p: any) => p.id);
        const pPlaceholders = prestamoIds.map(() => '?').join(',');
        await db.run(`UPDATE prestamos SET estado = 'DEVUELTO', fecha_devolucion_real = ? WHERE id IN (${pPlaceholders})`, [new Date().toISOString(), ...prestamoIds]);
        let targetEstadoId = estado_id_final;
        if (!targetEstadoId) {
          const estadoBueno = await db.get("SELECT id FROM estados WHERE LOWER(nombre) LIKE '%servicio%'");
          if (estadoBueno) targetEstadoId = estadoBueno.id;
        }
        if (targetEstadoId) {
          const equipoIds = prestamos.map((p: any) => p.equipo_id);
          const ePlaceholders = equipoIds.map(() => '?').join(',');
          await db.run(`UPDATE equipos SET estado_id = ? WHERE id IN (${ePlaceholders})`, [targetEstadoId, ...equipoIds]);
        }
        await db.commit();
        return { count: prestamos.length };
      } catch (error) {
        await db.rollback();
        throw error;
      }
    },

    async deleteBulkPrestamos(ids: unknown[]) {
      if (!Array.isArray(ids) || ids.length === 0) return { count: 0 };
      const parsedIds = ids.map((id) => parseInt(String(id)));
      const placeholders = parsedIds.map(() => '?').join(',');
      const result = await db.run(`DELETE FROM prestamos WHERE id IN (${placeholders})`, parsedIds);
      return { count: result.changes };
    },

    async limpiarHistorial() {
      const result = await db.run("DELETE FROM prestamos WHERE estado = 'DEVUELTO'");
      return { count: result.changes };
    },
  };
}
