/**
 * Obtiene todos los equipos junto con sus especificaciones.
 * Funciona tanto para SQLite como para PostgreSQL.
 */
async function obtenerEquiposCompletos(db: any, esPostgres: boolean, since: string | null = null) {
  let equipos;

  if (esPostgres) {
    const query = since
      ? `SELECT * FROM equipos WHERE updated_at > $1 ORDER BY id`
      : `SELECT * FROM equipos ORDER BY id`;
    const params = since ? [since] : [];
    const result = await db.query(query, params);
    equipos = result.rows;
  } else {
    equipos = await new Promise<any[]>((resolve, reject) => {
      const query = since
        ? `SELECT * FROM equipos WHERE updated_at > ? ORDER BY id`
        : `SELECT * FROM equipos ORDER BY id`;
      const params = since ? [since] : [];
      db.all(query, params, (err: any, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  if (equipos.length === 0) return [];

  let allSpecs;
  if (esPostgres) {
    const ids = equipos.map(e => e.id);
    const result = await db.query(
      `SELECT * FROM especificaciones WHERE equipo_id = ANY($1)`,
      [ids]
    );
    allSpecs = result.rows;
  } else {
    const ids = equipos.map(e => e.id);
    const placeholders = ids.map(() => '?').join(',');
    allSpecs = await new Promise<any[]>((resolve, reject) => {
      db.all(
        `SELECT * FROM especificaciones WHERE equipo_id IN (${placeholders})`,
        ids,
        (err: any, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  const specsByEquipo = {};
  for (const spec of allSpecs) {
    if (!specsByEquipo[spec.equipo_id]) specsByEquipo[spec.equipo_id] = [];
    specsByEquipo[spec.equipo_id].push({ clave: spec.clave, valor: spec.valor });
  }

  return equipos.map(equipo => ({
    ...equipo,
    especificaciones: specsByEquipo[equipo.id] || [],
  }));
}

module.exports = {
  obtenerEquiposCompletos,
};
