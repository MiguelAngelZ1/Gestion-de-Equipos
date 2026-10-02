// Puerto de backend/services/componentes.service.ts.
import type { Db } from '../db';

interface Deps {
  createSoporteTicket: (data: any) => Promise<unknown>;
  checkStock: (componenteId: unknown, nombre: string, cantidad: number) => Promise<unknown>;
}

export function componentesService(db: Db, deps: Deps) {
  return {
    async getComponentes(query: any) {
      const { q } = query;
      let sql = `
            SELECT c.*,
                   (SELECT SUM(cantidad) FROM movimientos_stock WHERE repuesto_id = c.id AND tipo = 'ENTRADA') as total_ingresado
            FROM componentes_repuestos c
            WHERE 1=1
        `;
      const params: any[] = [];
      if (q && q.trim() !== '') {
        const search = `%${q.trim()}%`;
        sql += ` AND (LOWER(nombre) LIKE LOWER(?) OR LOWER(nne) LIKE LOWER(?) OR LOWER(serie) LIKE LOWER(?))`;
        params.push(search, search, search);
      }
      sql += ' ORDER BY fecha_ingreso DESC';
      const componentes = await db.all(sql, params);
      return Promise.all(
        componentes.map(async (comp: any) => {
          const specs = await db.all('SELECT * FROM especificaciones_repuestos WHERE repuesto_id = ?', [comp.id]);
          return { ...comp, especificaciones: specs, total_ingresado: comp.total_ingresado || 0 };
        })
      );
    },

    async createOrUpdateComponente(data: any) {
      const { id, nombre, nne, serie, cantidad, estado, especificaciones, equipo_id } = data;
      let cantidadAnterior = 0;
      if (id) {
        const oldComp = await db.get('SELECT cantidad FROM componentes_repuestos WHERE id = ?', [parseInt(id)]);
        if (oldComp) cantidadAnterior = oldComp.cantidad;
      }
      let compId = id;
      if (id) {
        await db.run('UPDATE componentes_repuestos SET nombre = ?, nne = ?, serie = ?, cantidad = ?, estado = ?, equipo_id = ? WHERE id = ?', [
          nombre, nne, serie, parseInt(cantidad), estado, equipo_id || null, parseInt(id),
        ]);
      } else {
        const result = await db.run('INSERT INTO componentes_repuestos (nombre, nne, serie, cantidad, estado, equipo_id) VALUES (?, ?, ?, ?, ?, ?)', [
          nombre, nne, serie, parseInt(cantidad), estado, equipo_id || null,
        ]);
        compId = result.lastID;
      }
      await db.run('DELETE FROM especificaciones_repuestos WHERE repuesto_id = ?', [compId]);
      if (especificaciones && Array.isArray(especificaciones)) {
        for (const spec of especificaciones) {
          if (spec.clave && spec.valor) {
            await db.run('INSERT INTO especificaciones_repuestos (repuesto_id, clave, valor) VALUES (?, ?, ?)', [compId, spec.clave, spec.valor]);
          }
        }
      }
      const diff = id ? parseInt(cantidad) - cantidadAnterior : parseInt(cantidad);
      if (diff !== 0) {
        await db.run('INSERT INTO movimientos_stock (repuesto_id, tipo, cantidad, notas) VALUES (?, ?, ?, ?)', [
          compId, diff > 0 ? 'ENTRADA' : 'SALIDA', Math.abs(diff), id ? 'Ajuste manual de stock' : 'Ingreso inicial',
        ]);
      }
      return { id: compId };
    },

    async deleteComponente(id: unknown) {
      return db.run('DELETE FROM componentes_repuestos WHERE id = ?', [parseInt(String(id))]);
    },

    async deleteBulkComponentes(ids: unknown[]) {
      if (!Array.isArray(ids) || ids.length === 0) return { count: 0 };
      const placeholders = ids.map(() => '?').join(',');
      const result = await db.run(`DELETE FROM componentes_repuestos WHERE id IN (${placeholders})`, ids.map((id) => parseInt(String(id))));
      return { count: result.changes };
    },

    async instalarComponente(data: any) {
      const { equipo_id, repuesto_id, nombre, nne, serie, especificaciones, registrar_soporte, notas_soporte, tipo_instalacion, target_spec_id } = data;
      const equipo = await db.get(
        `SELECT e.*, r.nombre, r.apellido, r.grado FROM equipos e LEFT JOIN responsables r ON e.responsable_id = r.id WHERE e.id = ?`,
        [equipo_id]
      );
      if (!equipo) throw new Error('Equipo no encontrado');
      const responsableReal = equipo.nombre ? `${equipo.grado || ''} ${equipo.nombre} ${equipo.apellido.toUpperCase()}`.trim() : 'Servicio Técnico';

      await db.beginTransaction();
      try {
        if (repuesto_id) {
          const repuesto = await db.get('SELECT cantidad FROM componentes_repuestos WHERE id = ?', [parseInt(repuesto_id)]);
          if (!repuesto || repuesto.cantidad < 1) throw new Error('Stock insuficiente');
          await db.run('UPDATE componentes_repuestos SET cantidad = cantidad - 1 WHERE id = ?', [parseInt(repuesto_id)]);
          await db.run("INSERT INTO movimientos_stock (repuesto_id, tipo, cantidad, equipo_id, notas) VALUES (?, 'SALIDA', 1, ?, 'Instalación')", [
            parseInt(repuesto_id),
            equipo_id,
          ]);
        }

        const specStringValue = serie || 'Instalado';
        let newSpecId = target_spec_id;
        if (tipo_instalacion === 'REEMPLAZAR') {
          await db.run('UPDATE especificaciones SET valor = ? WHERE id = ?', [specStringValue, parseInt(target_spec_id)]);
          await db.run('UPDATE componentes_instalados SET especificacion_id = NULL WHERE especificacion_id = ?', [parseInt(target_spec_id)]);
        } else {
          const result = await db.run('INSERT INTO especificaciones (equipo_id, clave, valor) VALUES (?, ?, ?)', [equipo_id, nombre, specStringValue]);
          newSpecId = result.lastID;
        }

        const instalacion = await db.run(
          'INSERT INTO componentes_instalados (equipo_id, repuesto_id, especificacion_id, nombre, nne, serie) VALUES (?, ?, ?, ?, ?, ?)',
          [equipo_id, repuesto_id ? parseInt(repuesto_id) : null, newSpecId, nombre, nne, serie]
        );
        await db.run("INSERT INTO historial_personal (equipo_id, responsable, evento, notas) VALUES (?, ?, 'INSTALACION_COMPONENTE', ?)", [
          equipo_id, responsableReal, `Se instaló: ${nombre}`,
        ]);

        if (registrar_soporte) {
          try {
            const tareaDescripcion = `INSTALACIÓN DE REPUESTO: ${nombre}${nne ? ` (NNE: ${nne})` : ''}${serie ? ` (S/N: ${serie})` : ''}. ${notas_soporte || ''}`.trim();
            await deps.createSoporteTicket({ equipo_id, tarea_realizada: tareaDescripcion, tipo_falla: 'Hardware / Cambio de Componente', costo_estimado: 0 });
          } catch (supportErr) {
            console.error('[componentes] Error al crear ticket de soporte automático', supportErr);
          }
        }

        await db.commit();
        return { id: instalacion.lastID };
      } catch (error) {
        await db.rollback();
        throw error;
      }
    },

    async getComponentesInstalados(equipo_id: string) {
      const specs = await db.all('SELECT * FROM especificaciones WHERE equipo_id = ?', [equipo_id]);
      const instalados = await db.all('SELECT * FROM componentes_instalados WHERE equipo_id = ?', [equipo_id]);
      return specs.map((spec: any) => {
        const comp = instalados.find((c: any) => c.especificacion_id === spec.id);
        if (comp) {
          return { ui_id: `matched_${spec.id}`, nombre: spec.clave, valor: spec.valor, tipo_item: 'TRAZABLE', serie: comp.serie, especificacion_padre_id: spec.id };
        }
        return { ui_id: `base_${spec.id}`, nombre: spec.clave, valor: spec.valor || 'S/D', tipo_item: 'GENERICO', especificacion_padre_id: spec.id };
      });
    },

    async getMovimientosStock(repuesto_id: unknown) {
      return db.all(
        `SELECT m.*, e.ine, gc.nombre as equipo_tipo
            FROM movimientos_stock m
            LEFT JOIN equipos e ON m.equipo_id = e.id
            LEFT JOIN grupos_comodidad gc ON e.categoria_id = gc.id
            WHERE m.repuesto_id = ?
            ORDER BY m.fecha DESC`,
        [parseInt(String(repuesto_id))]
      );
    },
  };
}
