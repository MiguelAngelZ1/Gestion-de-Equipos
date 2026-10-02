// Puerto de backend/services/config.service.ts.
// Diferencias D1: tamaño de BD no consultable in-worker (se informa "D1 (nube)");
// VACUUM/ANALYZE no soportados en D1 (se omiten, la limpieza sí corre).
import type { Db } from '../db';

export function configService(db: Db) {
  return {
    async getGruposComodidad() {
      return db.all('SELECT * FROM grupos_comodidad ORDER BY nombre ASC');
    },
    async createGrupoComodidad(nombre: string) {
      const result = await db.run('INSERT INTO grupos_comodidad (nombre) VALUES (?)', [nombre]);
      return db.get('SELECT * FROM grupos_comodidad WHERE id = ?', [result.lastID]);
    },
    async updateGrupoComodidad(id: unknown, nombre: string) {
      await db.run('UPDATE grupos_comodidad SET nombre = ? WHERE id = ?', [nombre, id]);
      return db.get('SELECT * FROM grupos_comodidad WHERE id = ?', [id]);
    },
    async deleteGrupoComodidad(id: unknown) {
      await db.run('DELETE FROM grupos_comodidad WHERE id = ?', [id]);
      return { success: true };
    },
    async deleteBulkGruposComodidad(ids: unknown[]) {
      const placeholders = ids.map(() => '?').join(',');
      await db.run(`DELETE FROM grupos_comodidad WHERE id IN (${placeholders})`, ids);
      return { success: true };
    },

    async getGrados() {
      return db.all('SELECT * FROM grados ORDER BY id ASC');
    },
    async createGrado(abreviatura: string, grado_completo: string) {
      const result = await db.run('INSERT INTO grados (abreviatura, grado_completo) VALUES (?, ?)', [abreviatura, grado_completo]);
      return db.get('SELECT * FROM grados WHERE id = ?', [result.lastID]);
    },
    async updateGrado(id: unknown, abreviatura: string, grado_completo: string) {
      await db.run('UPDATE grados SET abreviatura = ?, grado_completo = ? WHERE id = ?', [abreviatura, grado_completo, id]);
      return db.get('SELECT * FROM grados WHERE id = ?', [id]);
    },
    async deleteGrado(id: unknown) {
      await db.run('DELETE FROM grados WHERE id = ?', [id]);
      return { success: true };
    },
    async deleteBulkGrados(ids: unknown[]) {
      const placeholders = ids.map(() => '?').join(',');
      await db.run(`DELETE FROM grados WHERE id IN (${placeholders})`, ids);
      return { success: true };
    },

    async getEstados() {
      return db.all('SELECT * FROM estados ORDER BY nombre ASC');
    },
    async createEstado(nombre: string, color_hex: string) {
      const result = await db.run('INSERT INTO estados (nombre, color_hex) VALUES (?, ?)', [nombre, color_hex]);
      return db.get('SELECT * FROM estados WHERE id = ?', [result.lastID]);
    },
    async updateEstado(id: unknown, nombre: string, color_hex: string) {
      await db.run('UPDATE estados SET nombre = ?, color_hex = ? WHERE id = ?', [nombre, color_hex, id]);
      return db.get('SELECT * FROM estados WHERE id = ?', [id]);
    },
    async deleteEstado(id: unknown) {
      await db.run('DELETE FROM estados WHERE id = ?', [id]);
      return { success: true };
    },
    async deleteBulkEstados(ids: unknown[]) {
      const placeholders = ids.map(() => '?').join(',');
      await db.run(`DELETE FROM estados WHERE id IN (${placeholders})`, ids);
      return { success: true };
    },

    async getUbicaciones() {
      return db.all('SELECT * FROM ubicaciones ORDER BY nombre ASC');
    },
    async createUbicacion(nombre: string) {
      const result = await db.run('INSERT INTO ubicaciones (nombre, ubicacion) VALUES (?, ?)', [nombre, nombre]);
      return db.get('SELECT * FROM ubicaciones WHERE id = ?', [result.lastID]);
    },
    async updateUbicacion(id: unknown, nombre: string) {
      await db.run('UPDATE ubicaciones SET nombre = ?, ubicacion = ? WHERE id = ?', [nombre, nombre, id]);
      return db.get('SELECT * FROM ubicaciones WHERE id = ?', [id]);
    },
    async deleteUbicacion(id: unknown) {
      await db.run('DELETE FROM ubicaciones WHERE id = ?', [id]);
      return { success: true };
    },
    async deleteBulkUbicaciones(ids: unknown[]) {
      const placeholders = ids.map(() => '?').join(',');
      await db.run(`DELETE FROM ubicaciones WHERE id IN (${placeholders})`, ids);
      return { success: true };
    },

    async getSystemStats() {
      const counts = await Promise.all([
        db.get('SELECT COUNT(*) as count FROM equipos WHERE is_deleted = ?', [0]),
        db.get('SELECT COUNT(*) as count FROM equipos WHERE is_deleted = ?', [1]),
        db.get('SELECT COUNT(*) as count FROM componentes_repuestos'),
        db.get('SELECT COUNT(*) as count FROM movimientos_stock'),
        db.get('SELECT COUNT(*) as count FROM soporte_tareas'),
      ]);
      return {
        databaseSize: 'D1 (nube)',
        counts: { equipos: counts[0].count, papelera: counts[1].count, repuestos: counts[2].count, movimientos: counts[3].count, soporte: counts[4].count },
        engine: 'D1 (nube)',
      };
    },

    async getTrashItems() {
      const items = await db.all(
        `SELECT e.*,
                   gc.nombre as tipo,
                   r.nombre as resp_nombre, r.apellido as resp_apellido, r.grado as resp_grado,
                   u.nombre as ubi_nombre
            FROM equipos e
            LEFT JOIN grupos_comodidad gc ON e.categoria_id = gc.id
            LEFT JOIN responsables r ON e.responsable_id = r.id
            LEFT JOIN ubicaciones u ON e.ubicacion_id = u.id
            WHERE e.is_deleted = ?
            ORDER BY e.updated_at DESC`,
        [1]
      );
      return items.map((e: any) => {
        const resp = e.resp_nombre ? `${e.resp_grado || ''} ${e.resp_nombre} ${e.resp_apellido.toUpperCase()}`.trim() : 'SIN ASIGNAR';
        return { id: e.id, ine: e.ine, nne: e.nne, serie: e.serie, tipo: e.tipo, responsable: resp, ubicacion: e.ubi_nombre, fecha_eliminacion: e.updated_at };
      });
    },

    async restoreEquipo(id: string) {
      await db.run('UPDATE equipos SET is_deleted = ?, updated_at = ? WHERE id = ?', [0, new Date().toISOString(), id]);
      await db.run('INSERT INTO historial_personal (equipo_id, responsable, evento, notas) VALUES (?, ?, ?, ?)', [
        id,
        'SISTEMA',
        'RESTAURACION_EQUIPO',
        'El equipo ha sido recuperado de la papelera',
      ]);
      return { success: true };
    },

    async deleteFromTrash(id: string) {
      await db.run('DELETE FROM especificaciones WHERE equipo_id = ?', [id]);
      await db.run('DELETE FROM historial_personal WHERE equipo_id = ?', [id]);
      await db.run('DELETE FROM soporte_tareas WHERE equipo_id = ?', [id]);
      await db.run('DELETE FROM componentes_instalados WHERE equipo_id = ?', [id]);
      await db.run('UPDATE movimientos_stock SET equipo_id = NULL WHERE equipo_id = ?', [id]);
      await db.run('UPDATE componentes_repuestos SET equipo_id = NULL WHERE equipo_id = ?', [id]);
      await db.run('DELETE FROM equipos WHERE id = ?', [id]);
      return { success: true };
    },

    async purgeTrash() {
      const trashItems = await db.all('SELECT id FROM equipos WHERE is_deleted = ?', [1]);
      const ids = trashItems.map((item: any) => item.id);
      if (ids.length === 0) return { success: true, count: 0 };
      const svc = configService(db);
      for (const id of ids) {
        await svc.deleteFromTrash(id);
      }
      return { success: true, count: ids.length };
    },

    async optimizeDatabase() {
      await db.run('DELETE FROM especificaciones WHERE equipo_id IS NOT NULL AND equipo_id NOT IN (SELECT id FROM equipos)');
      await db.run('DELETE FROM historial_personal WHERE equipo_id IS NOT NULL AND equipo_id NOT IN (SELECT id FROM equipos)');
      await db.run('DELETE FROM soporte_tareas WHERE equipo_id IS NOT NULL AND equipo_id NOT IN (SELECT id FROM equipos)');
      await db.run('DELETE FROM componentes_instalados WHERE equipo_id IS NOT NULL AND equipo_id NOT IN (SELECT id FROM equipos)');
      // D1 no soporta VACUUM/ANALYZE: la limpieza de huérfanos sí corre.
      return { success: true };
    },
  };
}
