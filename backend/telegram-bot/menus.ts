const q = require('./queries');

const MD_SPECIAL = /[_*[\]()~`>#+\-=|{}.!]/g;
function esc(text) {
  if (!text || typeof text !== 'string') return '';
  return text.replace(MD_SPECIAL, '\\$&');
}

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
    `💻 *${esc(equipo.ine)}*`,
    ``,
    `📍 *Ubicación:* ${esc(equipo.ubicacion_nombre || 'Sin asignar')}`,
  ];
  const responsable = [equipo.responsable_grado, equipo.responsable_nombre, equipo.responsable_apellido]
    .filter(Boolean).join(' ');
  lines.push(`👤 *Responsable:* ${esc(responsable || 'Sin asignar')}`);
  lines.push(`📌 *Estado:* ${esc(estadoStr)}`);

  if (equipo.nne && equipo.nne !== '-') lines.push(`🔖 *NNE:* ${esc(equipo.nne)}`);
  if (equipo.serie && equipo.serie !== '-') lines.push(`🔖 *Serie:* ${esc(equipo.serie)}`);

  if (specs && specs.length > 0) {
    lines.push(``, `📋 *Especificaciones:*`);
    for (const spec of specs) {
      lines.push(`  • *${esc(spec.clave)}:* ${esc(spec.valor)}`);
    }
  }

  return lines.join('\n');
}

function ubicacionesList(ubicaciones) {
  return '📍 *Ubicaciones:*\n' + ubicaciones.map(u => `  • ${esc(u.nombre)}`).join('\n');
}

function estadosList(estados) {
  return '📌 *Estados disponibles:*\n' + estados.map(e => {
    const desc = q.ESTADO_DESC[e.nombre];
    return desc ? `  • ${esc(e.nombre)} (${esc(desc)})` : `  • ${esc(e.nombre)}`;
  }).join('\n');
}

function responsablesList(responsables) {
  return '👤 *Responsables:*\n' + responsables.map(r =>
    `  • ${esc(r.grado ? r.grado + ' ' : '')}${esc(r.nombre)} ${esc(r.apellido)}`
  ).join('\n');
}

function subMenuConfiguracion() {
  return (
    '⚙️ *Configuración*\n\n' +
    'Elegí una opción:\n\n' +
    '1️⃣  Estados\n' +
    '2️⃣  Ubicaciones\n' +
    '3️⃣  Grupos de comodidad\n' +
    '4️⃣  Grados\n' +
    '5️⃣  Repuestos\n' +
    '6️⃣  Tareas de soporte\n' +
    '7️⃣  Equipos\n' +
    '0️⃣  🔙 Volver'
  );
}

function subMenuConfigEntity(entityName) {
  return (
    `⚙️ *Configuración — ${esc(entityName)}*\n\n` +
    '1️⃣  Listar\n' +
    '2️⃣  Crear\n' +
    '3️⃣  Editar\n' +
    '4️⃣  Eliminar\n' +
    '0️⃣  🔙 Volver'
  );
}

function entityListTitle(entityName, count) {
  return `📋 *${esc(entityName)} (${count}):*`;
}

function formatEstado(estado) {
  return `🟢 ${esc(estado.nombre)} (color: ${esc(estado.color_hex || 'N/A')})`;
}

function formatUbicacion(ubicacion) {
  let result = `📍 ${esc(ubicacion.nombre)}`;
  if (ubicacion.ubicacion) {
    result += ` — ${esc(ubicacion.ubicacion)}`;
  }
  return result;
}

function formatGrupoComodidad(grupo) {
  return `📁 ${esc(grupo.nombre)}`;
}

function formatGrado(grado) {
  return `🎖️ ${esc(grado.abreviatura)} — ${esc(grado.grado_completo)}`;
}

function formatRepuesto(repuesto) {
  return `🔧 ${esc(repuesto.nombre)} — Cant: ${repuesto.cantidad || 0}${repuesto.specs_count ? ` (${repuesto.specs_count} espec.)` : ''}`;
}

function formatEquipo(e) {
  let result = `💻 ${esc(e.ine)}`;
  if (e.serie) result += ` — ${esc(e.serie)}`;
  result += ` [${esc(e.estado || '?')}]`;
  if (e.ubicacion) result += ` 📍${esc(e.ubicacion)}`;
  return result;
}

function formatTareaSoporte(t) {
  const fecha = t.fecha ? new Date(t.fecha).toLocaleDateString('es-AR') : '?';
  const costo = t.costo_estimado ? ` $${t.costo_estimado}` : '';
  return `🎫 ${esc(t.ticket_id)} — ${esc(t.equipo_ine || t.equipo_id)} — ${esc(t.responsable)}${costo} [${fecha}]`;
}

function createConfigPrompt(entityName, action) {
  if (action === 'listar') return '';
  if (action === 'eliminar') {
    return `⚠️ Ingresá el ID del ${esc(entityName)} que querés eliminar:`;
  }

  if (action === 'editar') {
    if (entityName === 'Estado') {
      return (
        `✏️ Ingresá los datos del Estado que estás editando.\n\n` +
        `Formato: ID, Nombre, Color HEX (opcional)\n` +
        `Ejemplo: 1, Activo, #00ff00`
      );
    }
    if (entityName === 'Ubicación') {
      return (
        `✏️ Ingresá los datos de la Ubicación que estás editando.\n\n` +
        `Formato: ID, Nombre, Descripción (opcional)\n` +
        `Ejemplo: 1, Oficina Central, Edificio Principal Piso 3`
      );
    }
    if (entityName === 'Grado') {
      return (
        `✏️ Ingresá los datos del Grado que estás editando.\n\n` +
        `Formato: ID, Abreviatura, Nombre completo\n` +
        `Ejemplo: 1, TC, Teniente Coronel`
      );
    }
  if (entityName === 'Grupo de comodidad') {
    return (
      `✏️ Ingresá los datos del Grupo de comodidad que estás editando.\n\n` +
      `Formato: ID, Nombre\n` +
      `Ejemplo: 1, Oficina`
    );
  }
  if (entityName === 'Repuesto') {
    return (
      `✏️ Ingresá los datos del Repuesto que estás editando.\n\n` +
      `Formato: ID, Nombre, Cantidad (opcional)\n` +
      `Ejemplo: 1, Mouse óptico, 15`
    );
  }
  if (entityName === 'Tarea de soporte') {
    return (
      `✏️ Ingresá los datos de la Tarea de soporte que estás editando.\n\n` +
      `Formato: ID, Responsable, Tarea realizada, Tipo de falla (opcional), Costo estimado (opcional)\n` +
      `Ejemplo: 1, Juan Pérez, Cambio de disco SSD, Falla hardware, 500`
    );
  }
  if (entityName === 'Equipo') {
    return (
      `✏️ Ingresá los datos del Equipo que estás editando.\n\n` +
      `Formato: ID, INE, NNE (opcional), Serie (opcional), Categoría, Ubicación, Responsable, Estado\n` +
      `Ejemplo: 1, PC-001, NNE-123, SN-456, Oficina, Edif Principal, Juan Pérez, Activo`
    );
  }
  }

  if (entityName === 'Estado') {
    return (
      `✏️ Ingresá los datos del nuevo Estado.\n\n` +
      `Formato: Nombre, Color HEX (opcional)\n` +
      `Ejemplo: Activo, #00ff00`
    );
  }
  if (entityName === 'Ubicación') {
    return (
      `✏️ Ingresá los datos de la nueva Ubicación.\n\n` +
      `Formato: Nombre, Descripción (opcional)\n` +
      `Ejemplo: Oficina Central, Edificio Principal Piso 3`
    );
  }
  if (entityName === 'Grado') {
    return (
      `✏️ Ingresá los datos del nuevo Grado.\n\n` +
      `Formato: Abreviatura, Nombre completo\n` +
      `Ejemplo: TC, Teniente Coronel`
    );
  }
  if (entityName === 'Grupo de comodidad') {
    return (
      `✏️ Ingresá el nombre del nuevo Grupo de comodidad:\n\n` +
      `Ejemplo: Oficina`
    );
  }
  if (entityName === 'Repuesto') {
    return (
      `✏️ Ingresá los datos del nuevo Repuesto.\n\n` +
      `Formato: Nombre, Cantidad (opcional)\n` +
      `Ejemplo: Mouse óptico, 15`
    );
  }
  if (entityName === 'Tarea de soporte') {
    return (
      `✏️ Ingresá los datos de la nueva Tarea de soporte.\n\n` +
      `El *ticket_id* se genera automáticamente.\n\n` +
      `Formato: INE/Serie del equipo, Responsable, Tarea realizada, Tipo de falla (opcional), Costo estimado (opcional)\n` +
      `Ejemplo: PC-001, Juan Pérez, Cambio de disco SSD, Falla hardware, 500`
    );
  }
  if (entityName === 'Equipo') {
    return (
      `✏️ Ingresá los datos del nuevo Equipo.\n\n` +
      `El *ID* se genera automáticamente (UUID).\n\n` +
      `Formato: INE, NNE (opcional), Serie (opcional), Categoría, Ubicación, Responsable, Estado\n` +
      `Ejemplo: PC-001, NNE-123, SN-456, Oficina, Edif Principal, Juan Pérez, Activo`
    );
  }

  return `✏️ Ingresá los datos del ${esc(entityName)}:`;
}

function configDeleteConfirmText(entityName, itemFormatted) {
  return (
    `⚠️ *Confirmar eliminación*\n\n` +
    `${esc(entityName)}: ${esc(itemFormatted)}\n\n` +
    `Escribí "si" para confirmar o 0 para cancelar.`
  );
}

function formatEntityList(entityName, items) {
  const title = entityListTitle(entityName, items.length);
  const formatters = {
    Estado: formatEstado,
    Ubicación: formatUbicacion,
    'Grupo de comodidad': formatGrupoComodidad,
    Grado: formatGrado,
    Repuesto: formatRepuesto,
    'Tarea de soporte': formatTareaSoporte,
    Equipo: formatEquipo,
  };
  const fmt = formatters[entityName] || (item => esc(item.nombre || JSON.stringify(item)));
  const lines = items.map((item, i) => `${i + 1}. ${fmt(item)}`);
  return title + '\n\n' + lines.join('\n');
}

module.exports = {
  mainMenu, subMenuCantidad, subMenuContrasenas, subMenuRed, subMenuHardware,
  subMenuListados, helpText, formatEquipoCard,
  ubicacionesList, estadosList, responsablesList,
  subMenuConfiguracion, subMenuConfigEntity, entityListTitle,
  formatEstado, formatUbicacion, formatGrupoComodidad, formatGrado, formatRepuesto, formatTareaSoporte, formatEquipo,
  createConfigPrompt, configDeleteConfirmText, formatEntityList,
};
