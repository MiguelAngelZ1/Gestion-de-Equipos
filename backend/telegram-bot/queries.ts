const db = require('../db/database');

const ESTADO_DESC = {
  'E/S': 'En servicio',
  'F/S': 'Fuera de servicio',
  'MANT': 'Mantenimiento',
  'PRESTAMO': 'Préstamo',
};

const ESTADO_SYNONYMS = {
  'en servicio': 'E/S',
  'servicio': 'E/S',
  'operativo': 'E/S',
  'funcionando': 'E/S',
  'es': 'E/S',
  'e/s': 'E/S',
  'fuera de servicio': 'F/S',
  'fuera servicio': 'F/S',
  'fs': 'F/S',
  'f/s': 'F/S',
  'roto': 'F/S',
  'averiado': 'F/S',
  'baja': 'F/S',
  'mantenimiento': 'MANT',
  'mant': 'MANT',
  'reparacion': 'MANT',
  'reparación': 'MANT',
  'en reparacion': 'MANT',
  'prestamo': 'PRESTAMO',
  'préstamo': 'PRESTAMO',
  'prestado': 'PRESTAMO',
};

async function countByUbicacion(searchTerm) {
  return db.all(`
    SELECT u.nombre, COUNT(e.id) as total
    FROM equipos e
    JOIN ubicaciones u ON e.ubicacion_id = u.id
    WHERE e.is_deleted = 0 AND LOWER(u.nombre) LIKE LOWER(?)
    GROUP BY u.id
    ORDER BY total DESC
  `, [`%${searchTerm}%`]);
}

async function countByEstado(searchTerm) {
  const code = resolverEstado(searchTerm);
  return db.all(`
    SELECT es.nombre, COUNT(e.id) as total
    FROM equipos e
    JOIN estados es ON e.estado_id = es.id
    WHERE e.is_deleted = 0 AND (LOWER(es.nombre) LIKE LOWER(?) OR LOWER(es.nombre) LIKE LOWER(?))
    GROUP BY es.id
    ORDER BY total DESC
  `, [`%${searchTerm}%`, `%${code}%`]);
}

async function countByResponsable(searchTerm) {
  return db.all(`
    SELECT r.nombre, r.apellido, r.grado, COUNT(e.id) as total
    FROM equipos e
    JOIN responsables r ON e.responsable_id = r.id
    WHERE e.is_deleted = 0 AND (LOWER(r.nombre) LIKE LOWER(?) OR LOWER(r.apellido) LIKE LOWER(?))
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
    WHERE e.is_deleted = 0 AND LOWER(e.ine) LIKE LOWER(?)
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
      'SELECT clave, valor FROM especificaciones WHERE equipo_id = ? AND (clave = ? OR LOWER(clave) LIKE LOWER(?)) ORDER BY id ASC',
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
    WHERE e.is_deleted = 0 AND LOWER(u.nombre) LIKE LOWER(?)
    ORDER BY e.ine ASC
  `, [`%${ubicacionNombre}%`]);
}

async function getEquiposByEstado(estadoNombre) {
  const code = resolverEstado(estadoNombre);
  return db.all(`
    SELECT e.ine, e.nne, e.serie, u.nombre as ubicacion
    FROM equipos e
    JOIN estados es ON e.estado_id = es.id
    LEFT JOIN ubicaciones u ON e.ubicacion_id = u.id
    WHERE e.is_deleted = 0 AND (LOWER(es.nombre) LIKE LOWER(?) OR LOWER(es.nombre) LIKE LOWER(?))
    ORDER BY e.ine ASC
  `, [`%${estadoNombre}%`, `%${code}%`]);
}

async function getEquiposByResponsable(searchTerm) {
  return db.all(`
    SELECT e.ine, e.nne, e.serie, u.nombre as ubicacion
    FROM equipos e
    JOIN responsables r ON e.responsable_id = r.id
    LEFT JOIN ubicaciones u ON e.ubicacion_id = u.id
    WHERE e.is_deleted = 0 AND (LOWER(r.nombre) LIKE LOWER(?) OR LOWER(r.apellido) LIKE LOWER(?))
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
        LOWER(e.ine) LIKE LOWER(?) OR LOWER(e.nne) LIKE LOWER(?) OR LOWER(e.serie) LIKE LOWER(?)
        OR LOWER(u.nombre) LIKE LOWER(?) OR LOWER(r.nombre) LIKE LOWER(?) OR LOWER(r.apellido) LIKE LOWER(?) OR LOWER(r.grado) LIKE LOWER(?)
        OR EXISTS (
          SELECT 1 FROM especificaciones esp
          WHERE esp.equipo_id = e.id AND (LOWER(esp.clave) LIKE LOWER(?) OR LOWER(esp.valor) LIKE LOWER(?))
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
      AND (esp.clave IN ('IP', 'ip', 'DIRECCION IP', 'DIRECCIÓN IP') OR LOWER(esp.clave) LIKE LOWER('%ip%'))
      AND LOWER(esp.valor) LIKE LOWER(?)
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
  return db.all("SELECT id, nombre FROM estados ORDER BY nombre ASC");
}

function resolverEstado(term) {
  const lower = term.toLowerCase().trim();
  return ESTADO_SYNONYMS[lower] || term;
}

function estadosConDescripcion() {
  return Object.entries(ESTADO_DESC).map(([codigo, desc]) => `${codigo} (${desc})`).join('\n');
}

module.exports = {
  countByUbicacion, countByEstado, countByResponsable, getTotalEquipos,
  findEquipo, getEspecificaciones,
  getEquiposByUbicacion, getEquiposByEstado, getEquiposByResponsable,
  searchAll, searchByIP,
  listUbicaciones, listResponsables, listEstados,
  estadosConDescripcion, ESTADO_DESC,
};
