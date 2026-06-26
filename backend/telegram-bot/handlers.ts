const logger = require('../utils/logger');
const { getSession, setState, resetSession, STATES } = require('./session');
const {
  mainMenu, subMenuCantidad, subMenuContrasenas, subMenuRed, subMenuHardware,
  subMenuListados, helpText, formatEquipoCard,
  ubicacionesList, estadosList, responsablesList,
} = require('./menus');
const q = require('./queries');

const MAX_MSG = 4000;

function isAllowed(chatId) {
  const allowed = process.env.TELEGRAM_ALLOWED_USERS;
  if (!allowed) return true;
  return allowed.split(',').map(s => s.trim()).includes(String(chatId));
}

async function replyOrSplit(ctx, text, opts = {}) {
  if (text.length <= MAX_MSG) {
    return ctx.reply(text, opts);
  }
  for (let i = 0; i < text.length; i += MAX_MSG) {
    const chunk = text.slice(i, i + MAX_MSG);
    const isLast = i + MAX_MSG >= text.length;
    await ctx.reply(isLast ? chunk : chunk + '\n\n(continúa...)', opts);
  }
}

function promptWithBack(text) {
  return text + '\n\n0️⃣ 🔙 Volver al menú principal';
}

async function handleMessage(ctx) {
  const chatId = ctx.chat.id;
  const text = (ctx.message.text || '').trim();

  if (!isAllowed(chatId)) {
    return ctx.reply('⛔ No tenés permiso para usar este bot.');
  }

  const session = getSession(chatId);

  const lower = text.toLowerCase();

  if (['menu', 'menú', 'volver', 'atras', 'atrás'].includes(lower)) {
    setState(chatId, STATES.MAIN_MENU);
    return ctx.reply(mainMenu(), { parse_mode: 'Markdown' });
  }

  if (session.state === STATES.IDLE) {
    setState(chatId, STATES.MAIN_MENU);
    return ctx.reply(mainMenu(), { parse_mode: 'Markdown' });
  }

  if (session.state === STATES.MAIN_MENU) {
    return handleMainMenu(ctx, chatId, text);
  }

  if (session.state === STATES.SUB_MENU) {
    return handleSubMenu(ctx, chatId, text, session);
  }

  if (session.state === STATES.AWAITING_INPUT) {
    return handleAwaitingInput(ctx, chatId, text, session);
  }

  if (session.state === STATES.RESULT) {
    if (text === '1') {
      setState(chatId, STATES.MAIN_MENU);
      return ctx.reply(mainMenu(), { parse_mode: 'Markdown' });
    }
    if (text === '2') {
      resetSession(chatId);
      return ctx.reply('¡Hasta luego! Mandame un mensaje cuando me necesites.');
    }
    return ctx.reply('Respondé con 1 para seguir consultando o 2 para salir.');
  }
}

async function handleMainMenu(ctx, chatId, text) {
  switch (text) {
    case '1':
      setState(chatId, STATES.SUB_MENU, { subMenu: 'cantidad' });
      return ctx.reply(subMenuCantidad(), { parse_mode: 'Markdown' });
    case '2':
      setState(chatId, STATES.SUB_MENU, { subMenu: 'contrasenas' });
      return ctx.reply(subMenuContrasenas(), { parse_mode: 'Markdown' });
    case '3':
      setState(chatId, STATES.SUB_MENU, { subMenu: 'red' });
      return ctx.reply(subMenuRed(), { parse_mode: 'Markdown' });
    case '4':
      setState(chatId, STATES.SUB_MENU, { subMenu: 'hardware' });
      return ctx.reply(subMenuHardware(), { parse_mode: 'Markdown' });
    case '5':
      setState(chatId, STATES.AWAITING_INPUT, { awaitingType: 'info_completa' });
      return ctx.reply(promptWithBack('🔍 Decime el número de serie, INE, NNE o nombre de cuenta del equipo:'));
    case '6':
      setState(chatId, STATES.AWAITING_INPUT, { awaitingType: 'busqueda_libre' });
      return ctx.reply(promptWithBack('🔍 Decime qué querés buscar (texto libre: nombre, IP, usuario, etc.):'));
    case '7':
      setState(chatId, STATES.SUB_MENU, { subMenu: 'listados' });
      return ctx.reply(subMenuListados(), { parse_mode: 'Markdown' });
    case '8':
      return ctx.reply(helpText(), { parse_mode: 'Markdown' });
    case '0':
      resetSession(chatId);
      return ctx.reply('¡Hasta luego! Mandame un mensaje cuando me necesites.');
    default:
      return ctx.reply('❌ Opción no válida. Elegí un número del 1 al 8, o 0 para salir.');
  }
}

async function handleSubMenu(ctx, chatId, text, session) {
  if (text === '0') {
    setState(chatId, STATES.MAIN_MENU);
    return ctx.reply(mainMenu(), { parse_mode: 'Markdown' });
  }

  switch (session.subMenu) {
    case 'cantidad':
      return handleCantidadSubMenu(ctx, chatId, text);
    case 'contrasenas':
      return handleContrasenasSubMenu(ctx, chatId, text);
    case 'red':
      return handleRedSubMenu(ctx, chatId, text);
    case 'hardware':
      return handleHardwareSubMenu(ctx, chatId, text);
    case 'listados':
      return handleListadosSubMenu(ctx, chatId, text);
    default:
      return ctx.reply('❌ Opción no válida.');
  }
}

async function handleCantidadSubMenu(ctx, chatId, text) {
  if (text === '4') {
    try {
      const total = await q.getTotalEquipos();
      setState(chatId, STATES.RESULT);
      return ctx.reply(
        `📊 *Total de equipos activos:* ${total}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      logger.error({ err }, '[TelegramBot] getTotalEquipos error');
      return ctx.reply('❌ Error al consultar la base de datos.');
    }
  }

  if (text === '1') {
    setState(chatId, STATES.AWAITING_INPUT, { awaitingType: 'cantidad_ubicacion' });
    try {
      const ubicaciones = await q.listUbicaciones();
      return ctx.reply(promptWithBack('📍 Decime el nombre de la ubicación:\n\n' + ubicacionesList(ubicaciones)));
    } catch { }
    return ctx.reply(promptWithBack('📍 Decime el nombre de la ubicación:'));
  }

  if (text === '2') {
    setState(chatId, STATES.AWAITING_INPUT, { awaitingType: 'cantidad_estado' });
    try {
      const estados = await q.listEstados();
      return ctx.reply(promptWithBack('📌 Decime el estado:\n\n' + estadosList(estados)));
    } catch { }
    return ctx.reply(promptWithBack('📌 Decime el estado:'));
  }

  if (text === '3') {
    setState(chatId, STATES.AWAITING_INPUT, { awaitingType: 'cantidad_responsable' });
    try {
      const responsables = await q.listResponsables();
      return ctx.reply(promptWithBack('👤 Decime el nombre o apellido del responsable:\n\n' + responsablesList(responsables)));
    } catch { }
    return ctx.reply(promptWithBack('👤 Decime el nombre o apellido del responsable:'));
  }

  return ctx.reply('❌ Opción no válida. Elegí 1-4 o 0 para volver.');
}

async function handleContrasenasSubMenu(ctx, chatId, text) {
  const map = {
    '1': 'PASS ADMIN',
    '2': 'PASS ESTANDAR',
    '3': 'PASS BIOS',
    '4': 'PASS RUSTDESK',
    '5': 'CUENTA ADMIN',
    '6': 'CUENTA ESTANDAR',
    '7': 'TODAS',
  };

  const tipo = map[text];
  if (!tipo) return ctx.reply('❌ Opción no válida. Elegí 1-7.');

  setState(chatId, STATES.AWAITING_INPUT, { awaitingType: 'credencial', credencialTipo: tipo });

  const prompt = tipo === 'TODAS'
    ? promptWithBack('🔍 Decime el número de serie, INE, NNE o nombre de cuenta del equipo:')
    : promptWithBack(`🔍 Decime el número de serie, INE, NNE o nombre de cuenta para buscar el *${tipo}*:`);

  return ctx.reply(prompt, { parse_mode: 'Markdown' });
}

async function handleRedSubMenu(ctx, chatId, text) {
  const map = {
    '1': { type: 'red_equipo', prompt: '🔍 Decime el número de serie, INE o NNE del equipo:' },
    '2': { type: 'buscar_ip', prompt: '🌐 Decime la dirección IP (ej: "10.22.16.7"):' },
    '3': { type: 'mac_equipo', prompt: '🔍 Decime el número de serie, INE o NNE del equipo:' },
    '4': { type: 'red_todo', prompt: '🔍 Decime el número de serie, INE o NNE del equipo:' },
  };

  const opt = map[text];
  if (!opt) return ctx.reply('❌ Opción no válida. Elegí 1-4 o 0 para volver.');

  setState(chatId, STATES.AWAITING_INPUT, { awaitingType: opt.type });
  return ctx.reply(promptWithBack(opt.prompt));
}

async function handleHardwareSubMenu(ctx, chatId, text) {
  const map = {
    '1': { clave: 'PROCESADOR', prompt: '🔍 Decime el número de serie, INE o NNE para ver el *PROCESADOR*:' },
    '2': { clave: 'RAM', prompt: '🔍 Decime el número de serie, INE o NNE para ver la *RAM*:' },
    '3': { clave: 'DISCO', prompt: '🔍 Decime el número de serie, INE o NNE para ver el *DISCO*:' },
    '4': { clave: 'SO', prompt: '🔍 Decime el número de serie, INE o NNE para ver el *SO*:' },
    '5': { clave: 'TODO_HW', prompt: '🔍 Decime el número de serie, INE o NNE para ver todo el *hardware*:' },
  };

  const opt = map[text];
  if (!opt) return ctx.reply('❌ Opción no válida. Elegí 1-5 o 0 para volver.');

  setState(chatId, STATES.AWAITING_INPUT, { awaitingType: 'hardware', hardwareClave: opt.clave });
  return ctx.reply(promptWithBack(opt.prompt), { parse_mode: 'Markdown' });
}

async function handleListadosSubMenu(ctx, chatId, text) {
  if (text === '4') {
    try {
      const ubicaciones = await q.listUbicaciones();
      const lines = ubicaciones.map((u, i) => `${i + 1}. ${u.nombre}`);
      setState(chatId, STATES.RESULT);
      return ctx.reply(
        `📍 *Ubicaciones:*\n${lines.join('\n')}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      logger.error({ err }, '[TelegramBot] listUbicaciones error');
      return ctx.reply('❌ Error al consultar.');
    }
  }

  if (text === '5') {
    try {
      const responsables = await q.listResponsables();
      const lines = responsables.map((r, i) =>
        `${i + 1}. ${r.grado ? r.grado + ' ' : ''}${r.nombre} ${r.apellido}`
      );
      setState(chatId, STATES.RESULT);
      return ctx.reply(
        `👤 *Responsables:*\n${lines.join('\n')}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      logger.error({ err }, '[TelegramBot] listResponsables error');
      return ctx.reply('❌ Error al consultar.');
    }
  }

  if (text === '1') {
    setState(chatId, STATES.AWAITING_INPUT, { awaitingType: 'listado_ubicacion' });
    try {
      const ubicaciones = await q.listUbicaciones();
      return ctx.reply(promptWithBack('📍 Decime el nombre de la ubicación:\n\n' + ubicacionesList(ubicaciones)));
    } catch { }
    return ctx.reply(promptWithBack('📍 Decime el nombre de la ubicación:'));
  }

  if (text === '2') {
    setState(chatId, STATES.AWAITING_INPUT, { awaitingType: 'listado_responsable' });
    try {
      const responsables = await q.listResponsables();
      return ctx.reply(promptWithBack('👤 Decime el nombre o apellido del responsable:\n\n' + responsablesList(responsables)));
    } catch { }
    return ctx.reply(promptWithBack('👤 Decime el nombre o apellido del responsable:'));
  }

  if (text === '3') {
    setState(chatId, STATES.AWAITING_INPUT, { awaitingType: 'listado_estado' });
    try {
      const estados = await q.listEstados();
      return ctx.reply(promptWithBack('📌 Decime el estado:\n\n' + estadosList(estados)));
    } catch { }
    return ctx.reply(promptWithBack('📌 Decime el estado:'));
  }

  return ctx.reply('❌ Opción no válida. Elegí 1-5 o 0 para volver.');
}

async function handleAwaitingInput(ctx, chatId, text, session) {
  const { awaitingType, credencialTipo, hardwareClave } = session;

  if (text === '0') {
    setState(chatId, STATES.MAIN_MENU);
    return ctx.reply(mainMenu(), { parse_mode: 'Markdown' });
  }

  try {
    if (awaitingType === 'cantidad_ubicacion') {
      const rows = await q.countByUbicacion(text);
      if (rows.length === 0) return ctx.reply(promptWithBack('📍 No encontré ubicaciones con ese nombre.'));
      const lines = rows.map(r => `📍 *${r.nombre}:* ${r.total} equipos`);
      setState(chatId, STATES.RESULT);
      return ctx.reply(`${lines.join('\n')}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`, { parse_mode: 'Markdown' });
    }

    if (awaitingType === 'cantidad_estado') {
      const rows = await q.countByEstado(text);
      if (rows.length === 0) return ctx.reply(promptWithBack('📌 No encontré equipos con ese estado.'));
      const lines = rows.map(r => `📌 *${r.nombre}:* ${r.total} equipos`);
      setState(chatId, STATES.RESULT);
      return ctx.reply(`${lines.join('\n')}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`, { parse_mode: 'Markdown' });
    }

    if (awaitingType === 'cantidad_responsable') {
      const rows = await q.countByResponsable(text);
      if (rows.length === 0) return ctx.reply(promptWithBack('👤 No encontré responsables con ese nombre.'));
      const lines = rows.map(r =>
        `👤 *${r.grado ? r.grado + ' ' : ''}${r.nombre} ${r.apellido}:* ${r.total} equipos`
      );
      setState(chatId, STATES.RESULT);
      return ctx.reply(`${lines.join('\n')}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`, { parse_mode: 'Markdown' });
    }

    if (awaitingType === 'credencial') {
      const equipo = await q.findEquipo(text);
      if (!equipo) return ctx.reply(promptWithBack('❌ No encontré ningún equipo con ese identificador.'));

      const specs = await q.getEspecificaciones(equipo.id);

      if (credencialTipo === 'TODAS') {
        const credenciales = specs.filter(s =>
          s.clave.includes('CUENTA') || s.clave.includes('PASS') ||
          s.clave.includes('CONTRASEÑA') || s.clave.includes('CLAVE') ||
          s.clave.includes('RUSTDESK') || s.clave.includes('BIOS') ||
          s.clave.includes('USUARIO')
        );
        const card = `🔐 *${equipo.ine}*\n📍 ${equipo.ubicacion_nombre || '?'}\n\n` +
          (credenciales.length > 0
            ? credenciales.map(s => `*${s.clave}:* ${s.valor}`).join('\n')
            : 'No tiene credenciales registradas.');
        setState(chatId, STATES.RESULT);
        return ctx.reply(`${card}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`, { parse_mode: 'Markdown' });
      }

      const filtered = specs.filter(s => s.clave === credencialTipo);
      if (filtered.length === 0) {
        return ctx.reply(`❌ El equipo *${equipo.ine}* no tiene *${credencialTipo}* registrado.`, { parse_mode: 'Markdown' });
      }

      const card = `🔐 *${equipo.ine}* — ${equipo.ubicacion_nombre || '?'}\n\n*${credencialTipo}:* ${filtered[0].valor}`;
      setState(chatId, STATES.RESULT);
      return ctx.reply(`${card}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`, { parse_mode: 'Markdown' });
    }

    if (awaitingType === 'info_completa') {
      const equipo = await q.findEquipo(text);
      if (!equipo) return ctx.reply(promptWithBack('❌ No encontré ningún equipo con ese identificador.'));

      const specs = await q.getEspecificaciones(equipo.id);
      const card = formatEquipoCard(equipo, specs);
      setState(chatId, STATES.RESULT);
      return ctx.reply(`${card}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`, { parse_mode: 'Markdown' });
    }

    if (awaitingType === 'buscar_ip') {
      const equipos = await q.searchByIP(text);
      if (equipos.length === 0) return ctx.reply(promptWithBack('🌐 No encontré equipos con esa IP.'));

      const lines = equipos.map(e => `💻 ${e.ine} — ${e.ubicacion || '?'}\n  IP: ${e.valor}`);
      const unique = [...new Set(lines)];
      setState(chatId, STATES.RESULT);
      return ctx.reply(
        `🌐 *Equipos con IP ${text}:*\n${unique.join('\n')}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`,
        { parse_mode: 'Markdown' }
      );
    }

    if (awaitingType === 'red_equipo' || awaitingType === 'mac_equipo' || awaitingType === 'red_todo') {
      const equipo = await q.findEquipo(text);
      if (!equipo) return ctx.reply(promptWithBack('❌ No encontré ningún equipo con ese identificador.'));

      const specs = await q.getEspecificaciones(equipo.id);
      const redKeys = ['IP', 'ip', 'MASCARA', 'PUERTA DE ENLACE', 'DNS 1', 'DNS 2', 'MAC', 'PUERTO'];
      const redSpecs = specs.filter(s => redKeys.includes(s.clave));

      if (redSpecs.length === 0) {
        return ctx.reply(`🌐 El equipo *${equipo.ine}* no tiene datos de red registrados.`, { parse_mode: 'Markdown' });
      }

      const card = `🌐 *${equipo.ine}* — ${equipo.ubicacion_nombre || '?'}\n\n` +
        redSpecs.map(s => `*${s.clave}:* ${s.valor}`).join('\n');
      setState(chatId, STATES.RESULT);
      return ctx.reply(`${card}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`, { parse_mode: 'Markdown' });
    }

    if (awaitingType === 'hardware') {
      const equipo = await q.findEquipo(text);
      if (!equipo) return ctx.reply(promptWithBack('❌ No encontré ningún equipo con ese identificador.'));

      const specs = await q.getEspecificaciones(equipo.id);

      if (hardwareClave === 'TODO_HW') {
        const hwKeys = ['PROCESADOR', 'RAM', 'DISCO', 'SO', 'ENTRADAS DE VIDEO'];
        const hwSpecs = specs.filter(s => hwKeys.includes(s.clave));
        if (hwSpecs.length === 0) {
          return ctx.reply(`🖥️ El equipo *${equipo.ine}* no tiene hardware registrado.`, { parse_mode: 'Markdown' });
        }
        const card = `🖥️ *${equipo.ine}* — ${equipo.ubicacion_nombre || '?'}\n\n` +
          hwSpecs.map(s => `*${s.clave}:* ${s.valor}`).join('\n');
        setState(chatId, STATES.RESULT);
        return ctx.reply(`${card}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`, { parse_mode: 'Markdown' });
      }

      const filtered = specs.filter(s => s.clave === hardwareClave);
      if (filtered.length === 0) {
        return ctx.reply(`🖥️ El equipo *${equipo.ine}* no tiene *${hardwareClave}* registrado.`, { parse_mode: 'Markdown' });
      }

      setState(chatId, STATES.RESULT);
      return ctx.reply(
        `🖥️ *${equipo.ine}* — ${equipo.ubicacion_nombre || '?'}\n\n*${hardwareClave}:* ${filtered[0].valor}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`,
        { parse_mode: 'Markdown' }
      );
    }

    if (awaitingType === 'listado_ubicacion') {
      const equipos = await q.getEquiposByUbicacion(text);
      if (equipos.length === 0) return ctx.reply(promptWithBack('📍 No encontré equipos en esa ubicación.'));
      const lines = equipos.map(e => `💻 ${e.ine} — ${e.estado || '?'}`);
      setState(chatId, STATES.RESULT);
      return ctx.reply(
        `📍 *Equipos en "${text}":*\n${lines.join('\n')}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`,
        { parse_mode: 'Markdown' }
      );
    }

    if (awaitingType === 'listado_responsable') {
      const equipos = await q.getEquiposByResponsable(text);
      if (equipos.length === 0) return ctx.reply(promptWithBack('👤 No encontré equipos de ese responsable.'));
      const lines = equipos.map(e => `💻 ${e.ine} — ${e.ubicacion || '?'}`);
      setState(chatId, STATES.RESULT);
      return ctx.reply(
        `👤 *Equipos de "${text}":*\n${lines.join('\n')}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`,
        { parse_mode: 'Markdown' }
      );
    }

    if (awaitingType === 'listado_estado') {
      const equipos = await q.getEquiposByEstado(text);
      if (equipos.length === 0) return ctx.reply(promptWithBack('📌 No encontré equipos con ese estado.'));
      const lines = equipos.map(e => `💻 ${e.ine} — ${e.ubicacion || '?'}`);
      setState(chatId, STATES.RESULT);
      return ctx.reply(
        `📌 *Equipos en estado "${text}":*\n${lines.join('\n')}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`,
        { parse_mode: 'Markdown' }
      );
    }

    if (awaitingType === 'busqueda_libre') {
      const results = await q.searchAll(text);
      if (results.length === 0) return ctx.reply(promptWithBack('❌ No encontré resultados para esa búsqueda.'));
      const lines = results.map((e, i) =>
        `${i + 1}. ${e.ine} — ${e.ubicacion || '?'} (${e.estado || '?'})`
      );
      setState(chatId, STATES.RESULT);
      return ctx.reply(`🔍 *Resultados para "${text}":*\n${lines.join('\n')}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`, { parse_mode: 'Markdown' });
    }

  } catch (err) {
    logger.error({ err }, '[TelegramBot] handleAwaitingInput error');
    return ctx.reply('❌ Ocurrió un error al procesar tu consulta.');
  }
}

module.exports = { handleMessage };
