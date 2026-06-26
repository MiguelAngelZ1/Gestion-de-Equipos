const db = require('../db/database');

async function countByUbicacion(searchTerm) {
  return db.all(`
    SELECT u.nombre, COUNT(e.id) as total
    FROM equipos e
    JOIN ubicaciones u ON e.ubicacion_id = u.id
    WHERE e.is_deleted = 0 AND u.nombre LIKE ?
    GROUP BY u.id
    ORDER BY total DESC
  `, [`%${searchTerm}%`]);
}

async function countByEstado(searchTerm) {
  return db.all(`
    SELECT es.nombre, COUNT(e.id) as total
    FROM equipos e
    JOIN estados es ON e.estado_id = es.id
    WHERE e.is_deleted = 0 AND es.nombre LIKE ?
    GROUP BY es.id
    ORDER BY total DESC
  `, [`%${searchTerm}%`]);
}

async function countByResponsable(searchTerm) {
  return db.all(`
    SELECT r.nombre, r.apellido, r.grado, COUNT(e.id) as total
    FROM equipos e
    JOIN responsables r ON e.responsable_id = r.id
    WHERE e.is_deleted = 0 AND (r.nombre LIKE ? OR r.apellido LIKE ?)
    GROUP BY r.id
    ORDER BY total DESC
  `, [`%${searchTerm}%`, `%${searchTerm}%`]);
}

async function getTotalEquipos() {
  const row = await db.get('SELECT COUNT(*) as total FROM equipos WHERE is_deleted = 0');
  return row.total;
}

async function findEquipo(term) {
  if (!term || !term.trim()) return null;
  const searchTerm = term.trim();

  let equipo = await db.get(`
    SELECT e.*, u.nombre as ubicacion_nombre, u.ubicacion as ubicacion_desc,
           r.nombre as responsable_nombre, r.apellido as responsable_apellido, r.grado as responsable_grado,
           es.nombre as estado
    FROM equipos e
    LEFT JOIN ubicaciones u ON e.ubicacion_id = u.id
    LEFT JOIN responsables r ON e.responsable_id = r.id
    LEFT JOIN estados es ON e.estado_id = es.id
    WHERE e.is_deleted = 0 AND (e.serie = ? OR e.nne = ?)
    LIMIT 1
  `, [searchTerm, searchTerm]);

  if (equipo) return equipo;

  equipo = await db.get(`
    SELECT e.*, u.nombre as ubicacion_nombre, u.ubicacion as ubicacion_desc,
           r.nombre as responsable_nombre, r.apellido as responsable_apellido, r.grado as responsable_grado,
           es.nombre as estado
    FROM equipos e
    LEFT JOIN ubicaciones u ON e.ubicacion_id = u.id
    LEFT JOIN responsables r ON e.responsable_id = r.id
    LEFT JOIN estados es ON e.estado_id = es.id
    WHERE e.is_deleted = 0 AND e.ine LIKE ?
    LIMIT 1
  `, [`%${searchTerm}%`]);

  if (equipo) return equipo;

  equipo = await db.get(`
    SELECT e.*, u.nombre as ubicacion_nombre, u.ubicacion as ubicacion_desc,
           r.nombre as responsable_nombre, r.apellido as responsable_apellido, r.grado as responsable_grado,
           es.nombre as estado
    FROM equipos e
    JOIN especificaciones esp ON esp.equipo_id = e.id
    LEFT JOIN ubicaciones u ON e.ubicacion_id = u.id
    LEFT JOIN responsables r ON e.responsable_id = r.id
    LEFT JOIN estados es ON e.estado_id = es.id
    WHERE e.is_deleted = 0 AND esp.valor = ?
    LIMIT 1
  `, [searchTerm]);

  return equipo || null;
}

async function getEspecificaciones(equipoId, claveFilter = null) {
  if (claveFilter) {
    return db.all(
      'SELECT clave, valor FROM especificaciones WHERE equipo_id = ? AND (clave = ? OR clave LIKE ?) ORDER BY id ASC',
      [equipoId, claveFilter, `%${claveFilter}%`]
    );
  }
  return db.all(
    'SELECT clave, valor FROM especificaciones WHERE equipo_id = ? ORDER BY id ASC',
    [equipoId]
  );
}

async function getEquiposByUbicacion(ubicacionNombre) {
  return db.all(`
    SELECT e.ine, e.nne, e.serie, es.nombre as estado
    FROM equipos e
    JOIN ubicaciones u ON e.ubicacion_id = u.id
    LEFT JOIN estados es ON e.estado_id = es.id
    WHERE e.is_deleted = 0 AND u.nombre LIKE ?
    ORDER BY e.ine ASC
  `, [`%${ubicacionNombre}%`]);
}

async function getEquiposByEstado(estadoNombre) {
  return db.all(`
    SELECT e.ine, e.nne, e.serie, u.nombre as ubicacion
    FROM equipos e
    JOIN estados es ON e.estado_id = es.id
    LEFT JOIN ubicaciones u ON e.ubicacion_id = u.id
    WHERE e.is_deleted = 0 AND es.nombre LIKE ?
    ORDER BY e.ine ASC
  `, [`%${estadoNombre}%`]);
}

async function getEquiposByResponsable(searchTerm) {
  return db.all(`
    SELECT e.ine, e.nne, e.serie, u.nombre as ubicacion
    FROM equipos e
    JOIN responsables r ON e.responsable_id = r.id
    LEFT JOIN ubicaciones u ON e.ubicacion_id = u.id
    WHERE e.is_deleted = 0 AND (r.nombre LIKE ? OR r.apellido LIKE ?)
    ORDER BY e.ine ASC
  `, [`%${searchTerm}%`, `%${searchTerm}%`]);
}

async function searchAll(term) {
  const search = `%${term}%`;
  return db.all(`
    SELECT DISTINCT e.id, e.ine, e.nne, e.serie,
           u.nombre as ubicacion, es.nombre as estado
    FROM equipos e
    LEFT JOIN ubicaciones u ON e.ubicacion_id = u.id
    LEFT JOIN responsables r ON e.responsable_id = r.id
    LEFT JOIN grupos_comodidad gc ON e.categoria_id = gc.id
    LEFT JOIN estados es ON e.estado_id = es.id
    WHERE e.is_deleted = 0
      AND (
        e.ine LIKE ? OR e.nne LIKE ? OR e.serie LIKE ?
        OR u.nombre LIKE ? OR r.nombre LIKE ? OR r.apellido LIKE ? OR r.grado LIKE ?
        OR EXISTS (
          SELECT 1 FROM especificaciones esp
          WHERE esp.equipo_id = e.id AND (esp.clave LIKE ? OR esp.valor LIKE ?)
        )
      )
    ORDER BY e.ine ASC
    LIMIT 15
  `, [search, search, search, search, search, search, search, search, search]);
}

async function searchByIP(ip) {
  return db.all(`
    SELECT e.id, e.ine, e.nne, e.serie, u.nombre as ubicacion,
           esp.clave, esp.valor
    FROM equipos e
    JOIN especificaciones esp ON esp.equipo_id = e.id
    LEFT JOIN ubicaciones u ON e.ubicacion_id = u.id
    WHERE e.is_deleted = 0
      AND (esp.clave IN ('IP', 'ip', 'DIRECCION IP', 'DIRECCIÓN IP') OR esp.clave LIKE '%ip%')
      AND esp.valor LIKE ?
    ORDER BY e.ine ASC
    LIMIT 5
  `, [`%${ip}%`]);
}

async function listUbicaciones() {
  return db.all('SELECT id, nombre FROM ubicaciones ORDER BY nombre ASC');
}

async function listResponsables() {
  return db.all("SELECT id, nombre, apellido, grado FROM responsables WHERE activo = 1 ORDER BY apellido ASC");
}

async function listEstados() {
  return db.all("SELECT id, nombre FROM estados WHERE activo = 1 OR activo IS NULL ORDER BY nombre ASC");
}

module.exports = {
  countByUbicacion, countByEstado, countByResponsable, getTotalEquipos,
  findEquipo, getEspecificaciones,
  getEquiposByUbicacion, getEquiposByEstado, getEquiposByResponsable,
  searchAll, searchByIP,
  listUbicaciones, listResponsables, listEstados,
};
