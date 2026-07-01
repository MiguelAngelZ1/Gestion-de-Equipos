const db = require('../db/database');
const logger = require('../utils/logger');

const ESTADO_DESC = {
  'E/S': 'En servicio',
  'F/S': 'Fuera de servicio',
  'MANT': 'Mantenimiento',
  'PRESTAMO': 'Préstamo',
};

function normalizeKey(key) {
  if (!key || typeof key !== 'string') return '';
  return key.trim().replace(/\s+/g, ' ').toUpperCase();
}

async function isTelegramAuthorized(chatId) {
  if (!chatId) return false;
  const row = await db.get('SELECT chat_id FROM telegram_authorized_users WHERE chat_id = ?', [String(chatId)]);
  return Boolean(row);
}

async function addTelegramAuthorizedChat(chatId, telegramUserId = null) {
  if (!chatId) return;
  await db.run(
    'INSERT OR IGNORE INTO telegram_authorized_users (chat_id, telegram_user_id, authorized_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
    [String(chatId), telegramUserId ? String(telegramUserId) : null]
  );
}

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

async function findEquipos(term) {
  if (!term || !term.trim()) return [];
  const searchTerm = term.trim();
  const searchPattern = `%${searchTerm}%`;

  return db.all(`
    SELECT DISTINCT e.*, u.nombre as ubicacion_nombre, u.ubicacion as ubicacion_desc,
           r.nombre as responsable_nombre, r.apellido as responsable_apellido, r.grado as responsable_grado,
           es.nombre as estado
    FROM equipos e
    LEFT JOIN ubicaciones u ON e.ubicacion_id = u.id
    LEFT JOIN responsables r ON e.responsable_id = r.id
    LEFT JOIN estados es ON e.estado_id = es.id
    LEFT JOIN especificaciones esp ON esp.equipo_id = e.id
    WHERE e.is_deleted = 0
      AND (
        e.serie = ? OR e.nne = ? OR LOWER(e.ine) LIKE LOWER(?) OR LOWER(esp.valor) = LOWER(?)
      )
    ORDER BY e.ine ASC
    LIMIT 15
  `, [searchTerm, searchTerm, searchPattern, searchTerm]);
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
    WHERE e.is_deleted = 0 AND (
      e.serie = ? OR e.nne = ? OR LOWER(e.ine) = LOWER(?)
    )
  `, [searchTerm, searchTerm, searchTerm]);

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
    ORDER BY
      CASE WHEN LOWER(e.ine) = LOWER(?) THEN 0
           WHEN LOWER(e.ine) LIKE LOWER(? || '%') THEN 1
           ELSE 2 END,
      LENGTH(e.ine) ASC
    LIMIT 1
  `, [`%${searchTerm}%`, searchTerm, searchTerm]);

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
    WHERE e.is_deleted = 0 AND LOWER(esp.valor) = LOWER(?)
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

async function getEstado(id) {
  try {
    return db.get('SELECT * FROM estados WHERE id = ?', [id]);
  } catch (err) {
    logger.error({ err }, '[DB] getEstado error');
    throw new Error('Error al obtener estado: ' + (err.message || ''));
  }
}

async function createEstado(nombre, colorHex) {
  try {
    const result = await db.run('INSERT INTO estados (nombre, color_hex) VALUES (?, ?)', [nombre, colorHex || '#10b981']);
    return { id: result.lastID, nombre, color_hex: colorHex || '#10b981' };
  } catch (err) {
    logger.error({ err }, '[DB] createEstado error');
    throw new Error('Error al crear estado: ' + (err.message || ''));
  }
}

async function isEstadoInUse(id) {
  const row = await db.get('SELECT COUNT(*) as total FROM equipos WHERE estado_id = ?', [id]);
  return (row?.total || 0) > 0;
}

async function updateEstado(id, nombre, colorHex) {
  try {
    const sets = [];
    const params = [];
    if (nombre !== undefined && nombre !== null) { sets.push('nombre = ?'); params.push(nombre); }
    if (colorHex !== undefined && colorHex !== null) { sets.push('color_hex = ?'); params.push(colorHex); }
    if (sets.length === 0) return;
    params.push(id);
    await db.run('UPDATE estados SET ' + sets.join(', ') + ' WHERE id = ?', params);
  } catch (err) {
    logger.error({ err }, '[DB] updateEstado error');
    throw new Error('Error al actualizar estado: ' + (err.message || ''));
  }
}

async function deleteEstado(id) {
  try {
    if (await isEstadoInUse(id)) {
      throw new Error('No se puede eliminar: el estado está asignado a uno o más equipos');
    }
    const result = await db.run('DELETE FROM estados WHERE id = ?', [id]);
    if (result.changes === 0) {
      throw new Error('No se pudo eliminar: el registro no existe');
    }
    return true;
  } catch (err) {
    if (err.message.startsWith('No se puede eliminar') || err.message.startsWith('No se pudo eliminar')) throw err;
    logger.error({ err }, '[DB] deleteEstado error');
    throw new Error('Error al eliminar estado: ' + (err.message || ''));
  }
}

async function getUbicacion(id) {
  try {
    return db.get('SELECT * FROM ubicaciones WHERE id = ?', [id]);
  } catch (err) {
    logger.error({ err }, '[DB] getUbicacion error');
    throw new Error('Error al obtener ubicación: ' + (err.message || ''));
  }
}

async function createUbicacion(nombre, ubicacion) {
  try {
    const result = await db.run('INSERT INTO ubicaciones (nombre, ubicacion) VALUES (?, ?)', [nombre, ubicacion || null]);
    return { id: result.lastID, nombre, ubicacion: ubicacion || null };
  } catch (err) {
    logger.error({ err }, '[DB] createUbicacion error');
    throw new Error('Error al crear ubicación: ' + (err.message || ''));
  }
}

async function isUbicacionInUse(id) {
  const row = await db.get('SELECT COUNT(*) as total FROM equipos WHERE ubicacion_id = ?', [id]);
  return (row?.total || 0) > 0;
}

async function updateUbicacion(id, nombre, ubicacion) {
  try {
    const sets = [];
    const params = [];
    if (nombre !== undefined && nombre !== null) { sets.push('nombre = ?'); params.push(nombre); }
    if (ubicacion !== undefined && ubicacion !== null) { sets.push('ubicacion = ?'); params.push(ubicacion); }
    if (sets.length === 0) return;
    params.push(id);
    await db.run('UPDATE ubicaciones SET ' + sets.join(', ') + ' WHERE id = ?', params);
  } catch (err) {
    logger.error({ err }, '[DB] updateUbicacion error');
    throw new Error('Error al actualizar ubicación: ' + (err.message || ''));
  }
}

async function deleteUbicacion(id) {
  try {
    if (await isUbicacionInUse(id)) {
      throw new Error('No se puede eliminar: la ubicación está asignada a uno o más equipos');
    }
    const result = await db.run('DELETE FROM ubicaciones WHERE id = ?', [id]);
    if (result.changes === 0) {
      throw new Error('No se pudo eliminar: el registro no existe');
    }
    return true;
  } catch (err) {
    if (err.message.startsWith('No se puede eliminar') || err.message.startsWith('No se pudo eliminar')) throw err;
    logger.error({ err }, '[DB] deleteUbicacion error');
    throw new Error('Error al eliminar ubicación: ' + (err.message || ''));
  }
}

async function listGruposComodidad() {
  try {
    return db.all('SELECT id, nombre FROM grupos_comodidad ORDER BY nombre ASC');
  } catch (err) {
    logger.error({ err }, '[DB] listGruposComodidad error');
    throw new Error('Error al listar grupos de comodidad: ' + (err.message || ''));
  }
}

async function getGrupoComodidad(id) {
  try {
    return db.get('SELECT * FROM grupos_comodidad WHERE id = ?', [id]);
  } catch (err) {
    logger.error({ err }, '[DB] getGrupoComodidad error');
    throw new Error('Error al obtener grupo de comodidad: ' + (err.message || ''));
  }
}

async function createGrupoComodidad(nombre) {
  try {
    const result = await db.run('INSERT INTO grupos_comodidad (nombre) VALUES (?)', [nombre]);
    return { id: result.lastID, nombre };
  } catch (err) {
    logger.error({ err }, '[DB] createGrupoComodidad error');
    throw new Error('Error al crear grupo de comodidad: ' + (err.message || ''));
  }
}

async function isGrupoComodidadInUse(id) {
  const row = await db.get('SELECT COUNT(*) as total FROM equipos WHERE categoria_id = ?', [id]);
  return (row?.total || 0) > 0;
}

async function updateGrupoComodidad(id, nombre) {
  try {
    const sets = [];
    const params = [];
    if (nombre !== undefined && nombre !== null) { sets.push('nombre = ?'); params.push(nombre); }
    if (sets.length === 0) return;
    params.push(id);
    await db.run('UPDATE grupos_comodidad SET ' + sets.join(', ') + ' WHERE id = ?', params);
  } catch (err) {
    logger.error({ err }, '[DB] updateGrupoComodidad error');
    throw new Error('Error al actualizar grupo de comodidad: ' + (err.message || ''));
  }
}

async function deleteGrupoComodidad(id) {
  try {
    if (await isGrupoComodidadInUse(id)) {
      throw new Error('No se puede eliminar: el grupo de comodidad está asignado a uno o más equipos');
    }
    const result = await db.run('DELETE FROM grupos_comodidad WHERE id = ?', [id]);
    if (result.changes === 0) {
      throw new Error('No se pudo eliminar: el registro no existe');
    }
    return true;
  } catch (err) {
    if (err.message.startsWith('No se puede eliminar') || err.message.startsWith('No se pudo eliminar')) throw err;
    logger.error({ err }, '[DB] deleteGrupoComodidad error');
    throw new Error('Error al eliminar grupo de comodidad: ' + (err.message || ''));
  }
}

async function listGrados() {
  try {
    return db.all('SELECT id, abreviatura, grado_completo FROM grados ORDER BY grado_completo ASC');
  } catch (err) {
    logger.error({ err }, '[DB] listGrados error');
    throw new Error('Error al listar grados: ' + (err.message || ''));
  }
}

async function getGrado(id) {
  try {
    return db.get('SELECT * FROM grados WHERE id = ?', [id]);
  } catch (err) {
    logger.error({ err }, '[DB] getGrado error');
    throw new Error('Error al obtener grado: ' + (err.message || ''));
  }
}

async function createGrado(abreviatura, gradoCompleto) {
  try {
    const result = await db.run('INSERT INTO grados (abreviatura, grado_completo) VALUES (?, ?)', [abreviatura, gradoCompleto]);
    return { id: result.lastID, abreviatura, grado_completo: gradoCompleto };
  } catch (err) {
    logger.error({ err }, '[DB] createGrado error');
    throw new Error('Error al crear grado: ' + (err.message || ''));
  }
}

async function isGradoInUse(id) {
  const row = await db.get('SELECT COUNT(*) as total FROM responsables WHERE grado_id = ?', [id]);
  return (row?.total || 0) > 0;
}

async function updateGrado(id, abreviatura, gradoCompleto) {
  try {
    const sets = [];
    const params = [];
    if (abreviatura !== undefined && abreviatura !== null) { sets.push('abreviatura = ?'); params.push(abreviatura); }
    if (gradoCompleto !== undefined && gradoCompleto !== null) { sets.push('grado_completo = ?'); params.push(gradoCompleto); }
    if (sets.length === 0) return;
    params.push(id);
    await db.run('UPDATE grados SET ' + sets.join(', ') + ' WHERE id = ?', params);
  } catch (err) {
    logger.error({ err }, '[DB] updateGrado error');
    throw new Error('Error al actualizar grado: ' + (err.message || ''));
  }
}

async function deleteGrado(id) {
  try {
    if (await isGradoInUse(id)) {
      throw new Error('No se puede eliminar: el grado está asignado a uno o más responsables');
    }
    const result = await db.run('DELETE FROM grados WHERE id = ?', [id]);
    if (result.changes === 0) {
      throw new Error('No se pudo eliminar: el registro no existe');
    }
    return true;
  } catch (err) {
    if (err.message.startsWith('No se puede eliminar') || err.message.startsWith('No se pudo eliminar')) throw err;
    logger.error({ err }, '[DB] deleteGrado error');
    throw new Error('Error al eliminar grado: ' + (err.message || ''));
  }
}

async function listRepuestos() {
  try {
    return db.all(`SELECT cr.*,
      (SELECT COUNT(*) FROM especificaciones_repuestos er WHERE er.repuesto_id = cr.id) as specs_count
      FROM componentes_repuestos cr ORDER BY cr.nombre ASC`);
  } catch (err) {
    logger.error({ err }, '[DB] listRepuestos error');
    throw new Error('Error al listar repuestos: ' + (err.message || ''));
  }
}

async function getRepuesto(id) {
  try {
    return db.get('SELECT * FROM componentes_repuestos WHERE id = ?', [id]);
  } catch (err) {
    logger.error({ err }, '[DB] getRepuesto error');
    throw new Error('Error al obtener repuesto: ' + (err.message || ''));
  }
}

async function createRepuesto(nombre, cantidad) {
  try {
    const result = await db.run('INSERT INTO componentes_repuestos (nombre, cantidad) VALUES (?, ?)', [nombre, parseInt(cantidad, 10) || 0]);
    return { id: result.lastID, nombre, cantidad: parseInt(cantidad, 10) || 0 };
  } catch (err) {
    logger.error({ err }, '[DB] createRepuesto error');
    throw new Error('Error al crear repuesto: ' + (err.message || ''));
  }
}

async function isRepuestoInUse(id) {
  const row = await db.get('SELECT COUNT(*) as total FROM movimientos_stock WHERE repuesto_id = ?', [id]);
  return (row?.total || 0) > 0;
}

async function updateRepuesto(id, nombre, cantidad) {
  try {
    const sets = [];
    const params = [];
    if (nombre !== undefined && nombre !== null) { sets.push('nombre = ?'); params.push(nombre); }
    if (cantidad !== undefined && cantidad !== null) { sets.push('cantidad = ?'); params.push(parseInt(cantidad, 10) || 0); }
    if (sets.length === 0) return;
    params.push(id);
    await db.run('UPDATE componentes_repuestos SET ' + sets.join(', ') + ' WHERE id = ?', params);
  } catch (err) {
    logger.error({ err }, '[DB] updateRepuesto error');
    throw new Error('Error al actualizar repuesto: ' + (err.message || ''));
  }
}

async function generateTicketId() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000 + 1000);
  const ticketId = `ST-${y}${m}${d}-${rand}`;

  const existing = await db.get('SELECT id FROM soporte_tareas WHERE ticket_id = ?', [ticketId]);
  if (existing) {
    return generateTicketId();
  }
  return ticketId;
}

async function listTareasSoporte() {
  try {
    return db.all(`
      SELECT st.*, e.ine as equipo_ine
      FROM soporte_tareas st
      LEFT JOIN equipos e ON st.equipo_id = e.id
      ORDER BY st.fecha DESC
    `);
  } catch (err) {
    logger.error({ err }, '[DB] listTareasSoporte error');
    throw new Error('Error al listar tareas de soporte: ' + (err.message || ''));
  }
}

async function getTareaSoporte(id) {
  try {
    return db.get(`
      SELECT st.*, e.ine as equipo_ine
      FROM soporte_tareas st
      LEFT JOIN equipos e ON st.equipo_id = e.id
      WHERE st.id = ?
    `, [id]);
  } catch (err) {
    logger.error({ err }, '[DB] getTareaSoporte error');
    throw new Error('Error al obtener tarea de soporte: ' + (err.message || ''));
  }
}

async function createTareaSoporte(equipoRef, responsable, tareaRealizada, tipoFalla, costoEstimado) {
  try {
    const equipo = await findEquipoByIne(equipoRef);
    if (!equipo) throw new Error('No se encontró un equipo con ese identificador');
    const ticketId = await generateTicketId();
    const costo = parseFloat(costoEstimado) || 0;
    await db.run(
      'INSERT INTO soporte_tareas (ticket_id, equipo_id, responsable, tarea_realizada, tipo_falla, costo_estimado) VALUES (?, ?, ?, ?, ?, ?)',
      [ticketId, equipo.id, responsable, tareaRealizada, tipoFalla || null, costo]
    );
    return { ticket_id: ticketId, equipo_ine: equipo.ine };
  } catch (err) {
    if (err.message.startsWith('No se encontró')) throw err;
    logger.error({ err }, '[DB] createTareaSoporte error');
    throw new Error('Error al crear tarea de soporte: ' + (err.message || ''));
  }
}

async function updateTareaSoporte(id, responsable, tareaRealizada, tipoFalla, costoEstimado) {
  try {
    const sets = [];
    const params = [];
    if (responsable !== undefined && responsable !== null) { sets.push('responsable = ?'); params.push(responsable); }
    if (tareaRealizada !== undefined && tareaRealizada !== null) { sets.push('tarea_realizada = ?'); params.push(tareaRealizada); }
    if (tipoFalla !== undefined && tipoFalla !== null) { sets.push('tipo_falla = ?'); params.push(tipoFalla); }
    if (costoEstimado !== undefined && costoEstimado !== null) { sets.push('costo_estimado = ?'); params.push(parseFloat(costoEstimado) || 0); }
    if (sets.length === 0) return;
    sets.push("updated_at = CURRENT_TIMESTAMP");
    params.push(id);
    await db.run('UPDATE soporte_tareas SET ' + sets.join(', ') + ' WHERE id = ?', params);
  } catch (err) {
    logger.error({ err }, '[DB] updateTareaSoporte error');
    throw new Error('Error al actualizar tarea de soporte: ' + (err.message || ''));
  }
}

async function deleteTareaSoporte(id) {
  try {
    const result = await db.run('DELETE FROM soporte_tareas WHERE id = ?', [id]);
    if (result.changes === 0) {
      throw new Error('No se pudo eliminar: el registro no existe');
    }
    return true;
  } catch (err) {
    if (err.message.startsWith('No se pudo eliminar')) throw err;
    logger.error({ err }, '[DB] deleteTareaSoporte error');
    throw new Error('Error al eliminar tarea de soporte: ' + (err.message || ''));
  }
}

async function findEquipoByIne(term) {
  try {
    const row = await db.get('SELECT id, ine FROM equipos WHERE is_deleted = 0 AND (ine = ? OR serie = ? OR nne = ?) LIMIT 1', [term, term, term]);
    return row || null;
  } catch (err) {
    logger.error({ err }, '[DB] findEquipoByIne error');
    throw new Error('Error al buscar equipo: ' + (err.message || ''));
  }
}

async function _resolveRef(nombre, listFn, label) {
  if (!nombre || !nombre.trim()) return null;
  const items = await listFn();
  const n = nombre.trim();
  const match = items.find(i => i.nombre?.toLowerCase() === n.toLowerCase() || i.abreviatura?.toLowerCase() === n.toLowerCase());
  if (!match) throw new Error(`No se encontró ${label}: "${n}"`);
  return match.id;
}

function generateUUID() {
  const hex = '0123456789abcdef';
  let uuid = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) uuid += '-';
    else if (i === 14) uuid += '4';
    else if (i === 19) uuid += hex[(Math.random() * 4 | 0) + 8];
    else uuid += hex[Math.random() * 16 | 0];
  }
  return uuid;
}

async function createEquipo(ine, nne, serie, categoriaRef, ubicacionRef, responsableRef, estadoRef) {
  try {
    const categoriaId = await _resolveRef(categoriaRef, listGruposComodidad, 'grupo de comodidad');
    const ubicacionId = await _resolveRef(ubicacionRef, listUbicaciones, 'ubicación');
    const responsableId = await _resolveRef(responsableRef, listResponsables, 'responsable');
    const estadoId = await _resolveRef(estadoRef, listEstados, 'estado');
    const id = generateUUID();
    await db.run(
      'INSERT INTO equipos (id, ine, nne, serie, categoria_id, ubicacion_id, responsable_id, estado_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, ine, nne || null, serie || null, categoriaId, ubicacionId, responsableId, estadoId]
    );
    return { id, ine };
  } catch (err) {
    if (err.message.startsWith('No se encontró')) throw err;
    if (err.message.includes('UNIQUE constraint')) throw new Error(`Ya existe un equipo con INE "${ine}"`);
    logger.error({ err }, '[DB] createEquipo error');
    throw new Error('Error al crear equipo: ' + (err.message || ''));
  }
}

async function updateEquipo(id, ine, nne, serie, categoriaRef, ubicacionRef, responsableRef, estadoRef) {
  try {
    const sets = [];
    const params = [];
    if (ine !== undefined && ine !== null) { sets.push('ine = ?'); params.push(ine); }
    if (nne !== undefined) { sets.push('nne = ?'); params.push(nne || null); }
    if (serie !== undefined) { sets.push('serie = ?'); params.push(serie || null); }
    if (categoriaRef !== undefined && categoriaRef !== null) {
      const categoriaId = await _resolveRef(categoriaRef, listGruposComodidad, 'grupo de comodidad');
      sets.push('categoria_id = ?'); params.push(categoriaId);
    }
    if (ubicacionRef !== undefined && ubicacionRef !== null) {
      const ubicacionId = await _resolveRef(ubicacionRef, listUbicaciones, 'ubicación');
      sets.push('ubicacion_id = ?'); params.push(ubicacionId);
    }
    if (responsableRef !== undefined && responsableRef !== null) {
      const responsableId = await _resolveRef(responsableRef, listResponsables, 'responsable');
      sets.push('responsable_id = ?'); params.push(responsableId);
    }
    if (estadoRef !== undefined && estadoRef !== null) {
      const estadoId = await _resolveRef(estadoRef, listEstados, 'estado');
      sets.push('estado_id = ?'); params.push(estadoId);
    }
    if (sets.length === 0) return;
    sets.push("updated_at = CURRENT_TIMESTAMP");
    params.push(id);
    const result = await db.run('UPDATE equipos SET ' + sets.join(', ') + ' WHERE id = ? AND is_deleted = 0', params);
    if (result.changes === 0) throw new Error('No se encontró el equipo o está eliminado');
  } catch (err) {
    if (err.message.startsWith('No se encontró') || err.message.startsWith('No se encontró el equipo')) throw err;
    if (err.message.includes('UNIQUE constraint')) throw new Error(`Ya existe un equipo con ese INE`);
    logger.error({ err }, '[DB] updateEquipo error');
    throw new Error('Error al actualizar equipo: ' + (err.message || ''));
  }
}

async function deleteEquipo(id) {
  try {
    const result = await db.run('UPDATE equipos SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_deleted = 0', [id]);
    if (result.changes === 0) throw new Error('No se encontró el equipo o ya está eliminado');
    return true;
  } catch (err) {
    if (err.message.startsWith('No se encontró')) throw err;
    logger.error({ err }, '[DB] deleteEquipo error');
    throw new Error('Error al eliminar equipo: ' + (err.message || ''));
  }
}

async function listEquiposResumen() {
  try {
    return db.all(`
      SELECT e.id, e.ine, e.nne, e.serie, u.nombre as ubicacion, es.nombre as estado
      FROM equipos e
      LEFT JOIN ubicaciones u ON e.ubicacion_id = u.id
      LEFT JOIN estados es ON e.estado_id = es.id
      WHERE e.is_deleted = 0
      ORDER BY e.ine ASC LIMIT 50
    `);
  } catch (err) {
    logger.error({ err }, '[DB] listEquiposResumen error');
    throw new Error('Error al listar equipos: ' + (err.message || ''));
  }
}

async function getEquipoResumen(id) {
  try {
    return db.get(`
      SELECT e.*, u.nombre as ubicacion_nombre, u.ubicacion as ubicacion_desc,
             r.nombre as responsable_nombre, r.apellido as responsable_apellido, r.grado as responsable_grado,
             gc.nombre as categoria, es.nombre as estado, es.color_hex as estado_color
      FROM equipos e
      LEFT JOIN ubicaciones u ON e.ubicacion_id = u.id
      LEFT JOIN responsables r ON e.responsable_id = r.id
      LEFT JOIN grupos_comodidad gc ON e.categoria_id = gc.id
      LEFT JOIN estados es ON e.estado_id = es.id
      WHERE e.id = ? AND e.is_deleted = 0
    `, [id]);
  } catch (err) {
    logger.error({ err }, '[DB] getEquipoResumen error');
    throw new Error('Error al obtener equipo: ' + (err.message || ''));
  }
}

async function deleteRepuesto(id) {
  try {
    if (await isRepuestoInUse(id)) {
      throw new Error('No se puede eliminar: el repuesto tiene movimientos de stock registrados');
    }
    await db.run('DELETE FROM especificaciones_repuestos WHERE repuesto_id = ?', [id]);
    const result = await db.run('DELETE FROM componentes_repuestos WHERE id = ?', [id]);
    if (result.changes === 0) {
      throw new Error('No se pudo eliminar: el registro no existe');
    }
    return true;
  } catch (err) {
    if (err.message.startsWith('No se puede eliminar') || err.message.startsWith('No se pudo eliminar')) throw err;
    logger.error({ err }, '[DB] deleteRepuesto error');
    throw new Error('Error al eliminar repuesto: ' + (err.message || ''));
  }
}

module.exports = {
  countByUbicacion, countByEstado, countByResponsable, getTotalEquipos,
  findEquipo, findEquipos, getEspecificaciones,
  getEquiposByUbicacion, getEquiposByEstado, getEquiposByResponsable,
  searchAll, searchByIP,
  listUbicaciones, listResponsables, listEstados,
  estadosConDescripcion, ESTADO_DESC,
  isTelegramAuthorized, addTelegramAuthorizedChat,
  getEstado, createEstado, updateEstado, deleteEstado, isEstadoInUse,
  getUbicacion, createUbicacion, updateUbicacion, deleteUbicacion, isUbicacionInUse,
  listGruposComodidad, getGrupoComodidad, createGrupoComodidad, updateGrupoComodidad, deleteGrupoComodidad, isGrupoComodidadInUse,
  listGrados, getGrado, createGrado, updateGrado, deleteGrado, isGradoInUse,
  listRepuestos, getRepuesto, createRepuesto, updateRepuesto, deleteRepuesto, isRepuestoInUse,
  generateTicketId, listTareasSoporte, getTareaSoporte, createTareaSoporte, updateTareaSoporte, deleteTareaSoporte, findEquipoByIne,
  createEquipo, updateEquipo, deleteEquipo, listEquiposResumen, getEquipoResumen,
};
