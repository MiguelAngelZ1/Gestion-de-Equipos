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
    '0️⃣  🔙 Volver al menú principal'
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
    '0️⃣  🔙 Volver al menú principal'
  );
}

function subMenuRed() {
  return (
    '🌐 *Datos de red*\n\n' +
    '1️⃣  IP y red de un equipo\n' +
    '2️⃣  Buscar equipo por IP\n' +
    '3️⃣  MAC de un equipo\n' +
    '4️⃣  Todos los datos de red\n' +
    '0️⃣  🔙 Volver al menú principal'
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
    '0️⃣  🔙 Volver al menú principal'
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
    '0️⃣  🔙 Volver al menú principal'
  );
}

function helpText() {
  return (
    '🤖 *Ayuda - Bot de Equipos*\n\n' +
    'Este bot te permite consultar la base de datos de equipos ' +
    'desde Telegram.\n\n' +
    'Simplemente escribí "hola", "ey", "menú" o cualquier ' +
    'mensaje para empezar.\n\n' +
    'Navegá por los menúes eligiendo el número de la opción.\n' +
    'En cualquier momento podés escribir:\n' +
    '  • "menú" — volver al menú principal\n' +
    '  • "salir" — terminar la conversación\n\n' +
    'Los datos se consultan en vivo desde la base de datos.'
  );
}

function formatEquipoCard(equipo, specs) {
  const lines = [
    `💻 *${equipo.ine}*`,
    ``,
    `📍 *Ubicación:* ${equipo.ubicacion_nombre || 'Sin asignar'}`,
  ];
  const responsable = [equipo.responsable_grado, equipo.responsable_nombre, equipo.responsable_apellido]
    .filter(Boolean).join(' ');
  lines.push(`👤 *Responsable:* ${responsable || 'Sin asignar'}`);
  lines.push(`📌 *Estado:* ${equipo.estado || 'N/A'}`);

  if (equipo.nne && equipo.nne !== '-') lines.push(`🔖 *NNE:* ${equipo.nne}`);
  if (equipo.serie && equipo.serie !== '-') lines.push(`🔖 *Serie:* ${equipo.serie}`);

  if (specs && specs.length > 0) {
    lines.push(``, `📋 *Especificaciones:*`);
    for (const spec of specs) {
      const val = spec.valor;
      lines.push(`  • *${spec.clave}:* ${val}`);
    }
  }

  return lines.join('\n');
}

function formatEquipoCompact(equipo) {
  return `💻 ${equipo.ine} — ${equipo.ubicacion || '?'} (${equipo.estado || '?'})`;
}

function ubicacionesList(ubicaciones) {
  return '📍 *Ubicaciones:* ' + ubicaciones.map(u => u.nombre).join(', ');
}

function estadosList(estados) {
  return '📌 *Estados:* ' + estados.map(e => e.nombre).join(', ');
}

function responsablesList(responsables) {
  return '👤 *Responsables:* ' + responsables.map(r =>
    (r.grado ? r.grado + ' ' : '') + r.nombre + ' ' + r.apellido
  ).join(', ');
}

module.exports = {
  mainMenu, subMenuCantidad, subMenuContrasenas, subMenuRed, subMenuHardware,
  subMenuListados, helpText, formatEquipoCard, formatEquipoCompact,
  ubicacionesList, estadosList, responsablesList,
};
