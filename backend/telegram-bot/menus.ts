const q = require('./queries');

function mainMenu() {
  return (
    '🤖 *Bot de Consulta de Equipos*\n\n' +
    'Elegí una opción:\n\n' +
    '1️⃣  Cantidad de equipos\n' +
    '2️⃣  Contraseñas y credenciales\n' +
    '3️⃣  Datos de red\n' +
    '4️⃣  Hardware y sistema\n' +
    '5️⃣  Info completa de un equipo\n' +
    '6️⃣  Buscar (texto libre)\n' +
    '7️⃣  Listados\n' +
    '8️⃣  Ayuda\n' +
    '0️⃣  Salir'
  );
}

function subMenuCantidad() {
  return (
    '📊 *Cantidad de equipos*\n\n' +
    '1️⃣  Por ubicación\n' +
    '2️⃣  Por estado\n' +
    '3️⃣  Por responsable\n' +
    '4️⃣  Total general\n' +
    '0️⃣  🔙 Volver'
  );
}

function subMenuContrasenas() {
  return (
    '🔐 *Contraseñas y credenciales*\n\n' +
    '1️⃣  PASS ADMIN\n' +
    '2️⃣  PASS ESTANDAR\n' +
    '3️⃣  PASS BIOS\n' +
    '4️⃣  PASS RUSTDESK\n' +
    '5️⃣  CUENTA ADMIN\n' +
    '6️⃣  CUENTA ESTANDAR\n' +
    '7️⃣  Todas las credenciales\n' +
    '0️⃣  🔙 Volver'
  );
}

function subMenuRed() {
  return (
    '🌐 *Datos de red*\n\n' +
    '1️⃣  IP y red de un equipo\n' +
    '2️⃣  Buscar equipo por IP\n' +
    '3️⃣  MAC de un equipo\n' +
    '4️⃣  Todos los datos de red\n' +
    '0️⃣  🔙 Volver'
  );
}

function subMenuHardware() {
  return (
    '🖥️ *Hardware y sistema*\n\n' +
    '1️⃣  Procesador\n' +
    '2️⃣  RAM\n' +
    '3️⃣  Disco\n' +
    '4️⃣  Sistema operativo\n' +
    '5️⃣  Todo el hardware\n' +
    '0️⃣  🔙 Volver'
  );
}

function subMenuListados() {
  return (
    '📋 *Listados*\n\n' +
    '1️⃣  Equipos en una ubicación\n' +
    '2️⃣  Equipos de un responsable\n' +
    '3️⃣  Equipos por estado\n' +
    '4️⃣  Todas las ubicaciones\n' +
    '5️⃣  Todos los responsables\n' +
    '0️⃣  🔙 Volver'
  );
}

function helpText() {
  return (
    '🤖 *Ayuda - Bot de Equipos*\n\n' +
    'Este bot te permite consultar la base de datos de equipos ' +
    'desde Telegram.\n\n' +
    'Escribí cualquier mensaje para empezar o usá los botones.\n' +
    'En cualquier momento:\n' +
    '  • *Menú* — volver al menú principal\n' +
    '  • *Salir* — terminar la conversación\n' +
    '  • *0* — volver al menú desde cualquier submenú\n\n' +
    'Los datos se consultan en vivo desde la base de datos.'
  );
}

function formatEquipoCard(equipo, specs) {
  const desc = q.ESTADO_DESC[equipo.estado];
  const estadoStr = desc ? `${equipo.estado} (${desc})` : (equipo.estado || 'N/A');
  const lines = [
    `💻 *${equipo.ine}*`,
    ``,
    `📍 *Ubicación:* ${equipo.ubicacion_nombre || 'Sin asignar'}`,
  ];
  const responsable = [equipo.responsable_grado, equipo.responsable_nombre, equipo.responsable_apellido]
    .filter(Boolean).join(' ');
  lines.push(`👤 *Responsable:* ${responsable || 'Sin asignar'}`);
  lines.push(`📌 *Estado:* ${estadoStr}`);

  if (equipo.nne && equipo.nne !== '-') lines.push(`🔖 *NNE:* ${equipo.nne}`);
  if (equipo.serie && equipo.serie !== '-') lines.push(`🔖 *Serie:* ${equipo.serie}`);

  if (specs && specs.length > 0) {
    lines.push(``, `📋 *Especificaciones:*`);
    for (const spec of specs) {
      lines.push(`  • *${spec.clave}:* ${spec.valor}`);
    }
  }

  return lines.join('\n');
}

function ubicacionesList(ubicaciones) {
  return '📍 *Ubicaciones:*\n' + ubicaciones.map(u => `  • ${u.nombre}`).join('\n');
}

function estadosList(estados) {
  return '📌 *Estados disponibles:*\n' + estados.map(e => {
    const desc = q.ESTADO_DESC[e.nombre];
    return desc ? `  • ${e.nombre} (${desc})` : `  • ${e.nombre}`;
  }).join('\n');
}

function responsablesList(responsables) {
  return '👤 *Responsables:*\n' + responsables.map(r =>
    `  • ${r.grado ? r.grado + ' ' : ''}${r.nombre} ${r.apellido}`
  ).join('\n');
}

module.exports = {
  mainMenu, subMenuCantidad, subMenuContrasenas, subMenuRed, subMenuHardware,
  subMenuListados, helpText, formatEquipoCard,
  ubicacionesList, estadosList, responsablesList,
};
