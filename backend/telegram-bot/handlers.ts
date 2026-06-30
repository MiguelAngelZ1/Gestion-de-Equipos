const { Markup } = require('telegraf');
const logger = require('../utils/logger');
const { getSession, setState, resetSession, STATES } = require('./session');
const {
  mainMenu, subMenuCantidad, subMenuContrasenas, subMenuRed, subMenuHardware,
  subMenuListados, helpText, formatEquipoCard,
  ubicacionesList, estadosList, responsablesList,
} = require('./menus');
const q = require('./queries');


const mainKeyboard = Markup.keyboard([
  ['1️⃣ Cantidad', '2️⃣ Contraseñas', '3️⃣ Red'],
  ['4️⃣ Hardware', '5️⃣ Info completa', '6️⃣ Buscar'],
  ['7️⃣ Listados', '8️⃣ Ayuda', '0️⃣ Salir'],
]).resize();

const cantidadKeyboard = Markup.keyboard([
  ['1️⃣ Por ubicación', '2️⃣ Por estado'],
  ['3️⃣ Por responsable', '4️⃣ Total general'],
  ['0️⃣ 🔙 Volver'],
]).resize();

const contrasenasKeyboard = Markup.keyboard([
  ['1️⃣ PASS ADMIN', '2️⃣ PASS ESTANDAR'],
  ['3️⃣ PASS BIOS', '4️⃣ PASS RUSTDESK'],
  ['5️⃣ CUENTA ADMIN', '6️⃣ CUENTA ESTANDAR'],
  ['7️⃣ Todas las credenciales', '0️⃣ 🔙 Volver'],
]).resize();

const redKeyboard = Markup.keyboard([
  ['1️⃣ Datos red', '2️⃣ Buscar IP'],
  ['3️⃣ MAC', '4️⃣ Todo red'],
  ['0️⃣ 🔙 Volver'],
]).resize();

const hardwareKeyboard = Markup.keyboard([
  ['1️⃣ Procesador', '2️⃣ RAM'],
  ['3️⃣ Disco', '4️⃣ SO'],
  ['5️⃣ Todo HW', '0️⃣ 🔙 Volver'],
]).resize();

const listadosKeyboard = Markup.keyboard([
  ['1️⃣ Por ubicación', '2️⃣ Por responsable'],
  ['3️⃣ Por estado', '0️⃣ 🔙 Volver'],
]).resize();

const backKeyboard = Markup.keyboard([['0️⃣ 🔙 Volver']]).resize();

const verMasKeyboard = Markup.keyboard([
  ['1️⃣ Ver más', '2️⃣ Salir'],
]).resize();

const resultKeyboard = Markup.keyboard([
  ['1️⃣ Seguir consultando', '2️⃣ Salir'],
]).resize();

async function createEstadoKeyboard() {
  const estados = await q.listEstados();
  const keys = estados.map(e => q.ESTADO_DESC[e.nombre] || e.nombre);
  const rows = [];
  for (let i = 0; i < keys.length; i += 2) rows.push(keys.slice(i, i + 2));
  rows.push(['0️⃣ 🔙 Volver']);
  return Markup.keyboard(rows).resize();
}

async function createUbicacionKeyboard() {
  const ubicaciones = await q.listUbicaciones();
  const keys = ubicaciones.map(u => u.nombre);
  const rows = [];
  for (let i = 0; i < keys.length; i += 2) rows.push(keys.slice(i, i + 2));
  rows.push(['0️⃣ 🔙 Volver']);
  return Markup.keyboard(rows).resize();
}

async function createResponsableKeyboard() {
  const responsables = await q.listResponsables();
  const keys = responsables.map(r => `${r.grado ? r.grado + ' ' : ''}${r.nombre} ${r.apellido}`);
  const rows = [];
  for (let i = 0; i < keys.length; i += 2) rows.push(keys.slice(i, i + 2));
  rows.push(['0️⃣ 🔙 Volver']);
  return Markup.keyboard(rows).resize();
}

async function isAllowed(chatId) {
  const allowed = process.env.TELEGRAM_ALLOWED_USERS;
  const allowedChats = allowed
    ? allowed.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  if (allowedChats.includes(String(chatId))) return true;

  try {
    return await q.isTelegramAuthorized(chatId);
  } catch {
    return false;
  }
}

function promptWithBack(text) {
  return text + '\n\n0️⃣ 🔙 Volver';
}

function normalizeButtonInput(text) {
  return text.replace(/️⃣.*$/, '').trim();
}

function normalizeKey(text) {
  if (!text || typeof text !== 'string') return '';
  return text.trim().replace(/\s+/g, ' ').toUpperCase();
}

function formatPagedText(title, lines) {
  return `${title}\n\n${lines.join('\n')}`;
}

function getPageLines(lines, page, pageSize = 10) {
  const start = (page - 1) * pageSize;
  return lines.slice(start, start + pageSize);
}

async function handlePagedNext(ctx, chatId, session) {
  const pagedLines = session.pagedLines || [];
  const pagedTitle = session.pagedTitle || '';
  const currentPage = session.pagedPage || 1;
  const nextPage = currentPage + 1;
  const nextLines = getPageLines(pagedLines, nextPage);

  if (nextLines.length === 0) {
    setState(chatId, STATES.RESULT);
    return ctx.reply('No hay más resultados.\n\n1️⃣ Seguir consultando\n2️⃣ Salir', { parse_mode: 'Markdown', ...resultKeyboard });
  }

  const hasMore = pagedLines.length > nextPage * 10;
  if (hasMore) {
    setState(chatId, STATES.RESULT, { pagedLines, pagedTitle, pagedPage: nextPage });
    return ctx.reply(formatPagedText(pagedTitle, nextLines), { parse_mode: 'Markdown', ...verMasKeyboard });
  }

  setState(chatId, STATES.RESULT);
  return ctx.reply(`${formatPagedText(pagedTitle, nextLines)}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`, { parse_mode: 'Markdown', ...resultKeyboard });
}

async function handleMessage(ctx) {
  const chatId = ctx.chat.id;
  const raw = (ctx.message.text || '').trim();
  const text = normalizeButtonInput(raw);

  const authorized = await isAllowed(chatId);
  const session = getSession(chatId);

  if (!authorized) {
    if (session.awaitingType === 'invite_password') {
      return handleAwaitingInput(ctx, chatId, text, session);
    }

    if (process.env.TELEGRAM_INVITE_PASSWORD) {
      setState(chatId, STATES.AWAITING_INPUT, { awaitingType: 'invite_password', inviteAttempts: session.inviteAttempts || 0 });
      return ctx.reply(
        promptWithBack('🔐 No estás autorizado. Ingresá la clave de invitación para continuar:'),
        { ...backKeyboard }
      );
    }

    return ctx.reply('⛔ No tenés permiso para usar este bot.');
  }

  const lower = text.toLowerCase();

  if (['menu', 'menú', 'volver', 'atras', 'atrás'].includes(lower)) {
    setState(chatId, STATES.MAIN_MENU);
    return ctx.reply(mainMenu(), { parse_mode: 'Markdown', ...mainKeyboard });
  }

  if (lower === 'salir') {
    resetSession(chatId);
    return ctx.reply('¡Hasta luego! Mandame un mensaje cuando me necesites.', backKeyboard);
  }

  if (session.state === STATES.IDLE) {
    setState(chatId, STATES.MAIN_MENU);
    return ctx.reply(mainMenu(), { parse_mode: 'Markdown', ...mainKeyboard });
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
    if (text === '1' && session.pagedLines && session.pagedPage) {
      return handlePagedNext(ctx, chatId, session);
    }
    if (text === '1' || text === '0') {
      setState(chatId, STATES.MAIN_MENU);
      return ctx.reply(mainMenu(), { parse_mode: 'Markdown', ...mainKeyboard });
    }
    if (text === '2') {
      resetSession(chatId);
      return ctx.reply('¡Hasta luego! Mandame un mensaje cuando me necesites.', backKeyboard);
    }
    return ctx.reply('Respondé con 1 para seguir consultando o 2 para salir.', resultKeyboard);
  }
}

async function handleMainMenu(ctx, chatId, text) {
  switch (text) {
    case '1':
      setState(chatId, STATES.SUB_MENU, { subMenu: 'cantidad' });
      return ctx.reply(subMenuCantidad(), { parse_mode: 'Markdown', ...cantidadKeyboard });
    case '2':
      setState(chatId, STATES.SUB_MENU, { subMenu: 'contrasenas' });
      return ctx.reply(subMenuContrasenas(), { parse_mode: 'Markdown', ...contrasenasKeyboard });
    case '3':
      setState(chatId, STATES.SUB_MENU, { subMenu: 'red' });
      return ctx.reply(subMenuRed(), { parse_mode: 'Markdown', ...redKeyboard });
    case '4':
      setState(chatId, STATES.SUB_MENU, { subMenu: 'hardware' });
      return ctx.reply(subMenuHardware(), { parse_mode: 'Markdown', ...hardwareKeyboard });
    case '5':
      setState(chatId, STATES.AWAITING_INPUT, { awaitingType: 'info_completa' });
      return ctx.reply(promptWithBack('🔍 Decime el número de serie, INE o NNE del equipo:'), { ...backKeyboard });
    case '6':
      setState(chatId, STATES.AWAITING_INPUT, { awaitingType: 'busqueda_libre' });
      return ctx.reply(promptWithBack('🔍 Decime qué querés buscar (texto libre: nombre, IP, usuario, etc.):'), { ...backKeyboard });
    case '7':
      setState(chatId, STATES.SUB_MENU, { subMenu: 'listados' });
      return ctx.reply(subMenuListados(), { parse_mode: 'Markdown', ...listadosKeyboard });
    case '8':
      return ctx.reply(helpText(), { parse_mode: 'Markdown', ...mainKeyboard });
    case '0':
      resetSession(chatId);
      return ctx.reply('¡Hasta luego! Mandame un mensaje cuando me necesites.', backKeyboard);
    default:
      return ctx.reply('❌ Opción no válida. Elegí un número del 1 al 8, o 0 para salir.');
  }
}

async function handleSubMenu(ctx, chatId, text, session) {
  if (text === '0') {
    setState(chatId, STATES.MAIN_MENU);
    return ctx.reply(mainMenu(), { parse_mode: 'Markdown', ...mainKeyboard });
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
        { parse_mode: 'Markdown', ...resultKeyboard }
      );
    } catch (err) {
      logger.error({ err }, '[TelegramBot] getTotalEquipos error');
      return ctx.reply('❌ Error al consultar la base de datos.');
    }
  }

  if (text === '1') {
    setState(chatId, STATES.AWAITING_INPUT, { awaitingType: 'cantidad_ubicacion' });
    const kb = await createUbicacionKeyboard();
    return ctx.reply(
      promptWithBack('📍 Decime el nombre de la ubicación:'),
      { parse_mode: 'Markdown', ...kb }
    );
  }

  if (text === '2') {
    setState(chatId, STATES.AWAITING_INPUT, { awaitingType: 'cantidad_estado' });
    const kb = await createEstadoKeyboard();
    return ctx.reply(
      promptWithBack('📌 Decime el estado:\n\n' + estadosList(await q.listEstados())),
      { parse_mode: 'Markdown', ...kb }
    );
  }

  if (text === '3') {
    setState(chatId, STATES.AWAITING_INPUT, { awaitingType: 'cantidad_responsable' });
    const kb = await createResponsableKeyboard();
    return ctx.reply(
      promptWithBack('👤 Decime el nombre o apellido del responsable:'),
      { parse_mode: 'Markdown', ...kb }
    );
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
  if (!tipo) return ctx.reply('❌ Opción no válida. Elegí 1-7 o 0 para volver.');

  setState(chatId, STATES.AWAITING_INPUT, { awaitingType: 'credencial', credencialTipo: tipo });

  const prompt = tipo === 'TODAS'
    ? promptWithBack('🔍 Decime el número de serie, INE o NNE del equipo:')
    : promptWithBack(`🔍 Decime el número de serie, INE o NNE para buscar el *${tipo}*:`);

  return ctx.reply(prompt, { parse_mode: 'Markdown', ...backKeyboard });
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
  return ctx.reply(promptWithBack(opt.prompt), { parse_mode: 'Markdown', ...backKeyboard });
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
  return ctx.reply(promptWithBack(opt.prompt), { parse_mode: 'Markdown', ...backKeyboard });
}

async function handleListadosSubMenu(ctx, chatId, text) {
  if (text === '1') {
    setState(chatId, STATES.AWAITING_INPUT, { awaitingType: 'listado_ubicacion' });
    const kb = await createUbicacionKeyboard();
    return ctx.reply(
      promptWithBack('📍 Decime el nombre de la ubicación:'),
      { parse_mode: 'Markdown', ...kb }
    );
  }

  if (text === '2') {
    setState(chatId, STATES.AWAITING_INPUT, { awaitingType: 'listado_responsable' });
    const kb = await createResponsableKeyboard();
    return ctx.reply(
      promptWithBack('👤 Decime el nombre o apellido del responsable:'),
      { parse_mode: 'Markdown', ...kb }
    );
  }

  if (text === '3') {
    setState(chatId, STATES.AWAITING_INPUT, { awaitingType: 'listado_estado' });
    const kb = await createEstadoKeyboard();
    return ctx.reply(
      promptWithBack('📌 Decime el estado:'),
      { parse_mode: 'Markdown', ...kb }
    );
  }

  return ctx.reply('❌ Opción no válida. Elegí 1-3 o 0 para volver.');
}

async function handleAwaitingInput(ctx, chatId, text, session) {
  const { awaitingType, credencialTipo, hardwareClave } = session;

  if (text === '0' && awaitingType !== 'invite_password') {
    setState(chatId, STATES.MAIN_MENU);
    return ctx.reply(mainMenu(), { parse_mode: 'Markdown', ...mainKeyboard });
  }

  try {
    if (awaitingType === 'invite_password') {
      const expected = process.env.TELEGRAM_INVITE_PASSWORD || '';
      const attempts = (session.inviteAttempts || 0) + 1;

      if (text === expected) {
        await q.addTelegramAuthorizedChat(chatId, ctx.from?.id);
        setState(chatId, STATES.MAIN_MENU);
        return ctx.reply('✅ Autorizado correctamente. Bienvenido al bot.', { parse_mode: 'Markdown', ...mainKeyboard });
      }

      if (attempts >= 15) {
        resetSession(chatId);
        return ctx.reply('⛔ Demasiados intentos. Volvé a iniciar cuando tengas la clave correcta.', backKeyboard);
      }

      setState(chatId, STATES.AWAITING_INPUT, {
        awaitingType: 'invite_password',
        inviteAttempts: attempts,
      });
      return ctx.reply(
        `🔐 Clave incorrecta. Tenés ${15 - attempts} intentos restantes.`,
        { parse_mode: 'Markdown', ...backKeyboard }
      );
    }

    if (awaitingType === 'cantidad_ubicacion') {
      const rows = await q.countByUbicacion(text);
      if (rows.length === 0) return ctx.reply(
        promptWithBack('📍 No encontré ubicaciones con ese nombre.'),
        { parse_mode: 'Markdown', ...await createUbicacionKeyboard() }
      );
      const lines = rows.map(r => `📍 *${r.nombre}:* ${r.total} equipos`);
      setState(chatId, STATES.RESULT);
      return ctx.reply(`${lines.join('\n')}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`, { parse_mode: 'Markdown', ...resultKeyboard });
    }

    if (awaitingType === 'cantidad_estado') {
      const rows = await q.countByEstado(text);
      if (rows.length === 0) return ctx.reply(
        promptWithBack('📌 No encontré equipos con ese estado.\n\n' + estadosList(await q.listEstados())),
        { parse_mode: 'Markdown', ...await createEstadoKeyboard() }
      );
      const lines = rows.map(r => {
        const desc = q.ESTADO_DESC[r.nombre];
        const nombre = desc ? `${r.nombre} (${desc})` : r.nombre;
        return `📌 *${nombre}:* ${r.total} equipos`;
      });
      setState(chatId, STATES.RESULT);
      return ctx.reply(`${lines.join('\n')}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`, { parse_mode: 'Markdown', ...resultKeyboard });
    }

    if (awaitingType === 'cantidad_responsable') {
      const rows = await q.countByResponsable(text);
      if (rows.length === 0) return ctx.reply(
        promptWithBack('👤 No encontré responsables con ese nombre.'),
        { parse_mode: 'Markdown', ...await createResponsableKeyboard() }
      );
      const lines = rows.map(r =>
        `👤 *${r.grado ? r.grado + ' ' : ''}${r.nombre} ${r.apellido}:* ${r.total} equipos`
      );
      setState(chatId, STATES.RESULT);
      return ctx.reply(`${lines.join('\n')}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`, { parse_mode: 'Markdown', ...resultKeyboard });
    }

    if (awaitingType === 'credencial') {
      const equipo = await q.findEquipo(text);
      if (!equipo) return ctx.reply(promptWithBack('❌ No encontré ningún equipo con ese identificador.'), backKeyboard);

      const specs = await q.getEspecificaciones(equipo.id);
      const normalizedTarget = normalizeKey(credencialTipo);

      if (credencialTipo === 'TODAS') {
        const credenciales = specs.filter((s) => {
          const key = normalizeKey(s.clave);
          return [
            'CUENTA', 'PASS', 'CONTRASEÑA', 'CLAVE', 'RUSTDESK', 'BIOS', 'USUARIO', 'PASSWORD'
          ].some(fragment => key.includes(fragment));
        });
        const card = `🔐 *${equipo.ine}*\n📍 ${equipo.ubicacion_nombre || '?'}\n\n` +
          (credenciales.length > 0
            ? credenciales.map(s => `*${s.clave}:* ${s.valor}`).join('\n')
            : 'No tiene credenciales registradas.');
        setState(chatId, STATES.RESULT);
        return ctx.reply(`${card}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`, { parse_mode: 'Markdown', ...resultKeyboard });
      }

      const filtered = specs.filter((s) => normalizeKey(s.clave) === normalizedTarget);
      if (filtered.length === 0) {
        setState(chatId, STATES.RESULT);
        return ctx.reply(`❌ El equipo *${equipo.ine}* no tiene *${credencialTipo}* registrado.\n\n1️⃣ Seguir consultando\n2️⃣ Salir`, { parse_mode: 'Markdown', ...resultKeyboard });
      }

      const card = `🔐 *${equipo.ine}* — ${equipo.ubicacion_nombre || '?'}\n\n*${credencialTipo}:* ${filtered[0].valor}`;
      setState(chatId, STATES.RESULT);
      return ctx.reply(`${card}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`, { parse_mode: 'Markdown', ...resultKeyboard });
    }

    if (awaitingType === 'info_completa') {
      let equipo = await q.findEquipo(text);
      if (!equipo) {
        const matches = await q.findEquipos(text);
        if (matches.length === 1) {
          equipo = matches[0];
        } else if (matches.length > 1) {
          const lines = matches.map((e, i) => `${i + 1}. ${e.ine} — ${e.ubicacion || '?'} (${e.estado || '?'})`);
          const title = `🔍 *Se encontraron ${matches.length} equipos para "${text}"*: `;
          setState(chatId, STATES.RESULT);
          return ctx.reply(`${formatPagedText(title, lines)}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`, { parse_mode: 'Markdown', ...resultKeyboard });
        }
      }

      if (!equipo) return ctx.reply(promptWithBack('❌ No encontré ningún equipo con ese identificador.'), backKeyboard);

      const specs = await q.getEspecificaciones(equipo.id);
      const card = formatEquipoCard(equipo, specs);
      setState(chatId, STATES.RESULT);
      return ctx.reply(`${card}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`, { parse_mode: 'Markdown', ...resultKeyboard });
    }

    if (awaitingType === 'buscar_ip') {
      const equipos = await q.searchByIP(text);
      if (equipos.length === 0) return ctx.reply(promptWithBack('🌐 No encontré equipos con esa IP.'), backKeyboard);

      const lines = equipos.map(e => `💻 ${e.ine} — ${e.ubicacion || '?'}\n  IP: ${e.valor}`);
      const unique = [...new Set(lines)];
      setState(chatId, STATES.RESULT);
      return ctx.reply(
        `🌐 *Equipos con IP ${text} (${unique.length}):*\n${unique.join('\n')}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`,
        { parse_mode: 'Markdown', ...resultKeyboard }
      );
    }

    if (awaitingType === 'red_equipo' || awaitingType === 'mac_equipo' || awaitingType === 'red_todo') {
      const equipo = await q.findEquipo(text);
      if (!equipo) return ctx.reply(promptWithBack('❌ No encontré ningún equipo con ese identificador.'), backKeyboard);

      const specs = await q.getEspecificaciones(equipo.id);
      const normalizedKeys = specs.map(s => ({ key: normalizeKey(s.clave), spec: s }));

      const networkKeys = ['IP', 'MASCARA', 'PUERTA DE ENLACE', 'DNS 1', 'DNS 2'];
      const macKeys = ['MAC'];
      const allKeys = [...networkKeys, ...macKeys, 'PUERTO'];

      let filtered;
      if (awaitingType === 'mac_equipo') {
        filtered = normalizedKeys.filter(({ key }) => macKeys.includes(key)).map(({ spec }) => spec);
      } else if (awaitingType === 'red_equipo') {
        filtered = normalizedKeys.filter(({ key }) => networkKeys.includes(key)).map(({ spec }) => spec);
      } else {
        filtered = normalizedKeys.filter(({ key }) => allKeys.includes(key)).map(({ spec }) => spec);
      }

      if (filtered.length === 0) {
        setState(chatId, STATES.RESULT);
        return ctx.reply(`🌐 El equipo *${equipo.ine}* no tiene datos de red registrados.\n\n1️⃣ Seguir consultando\n2️⃣ Salir`, { parse_mode: 'Markdown', ...resultKeyboard });
      }

      const card = `🌐 *${equipo.ine}* — ${equipo.ubicacion_nombre || '?'}\n\n` +
        filtered.map(s => `*${s.clave}:* ${s.valor}`).join('\n');
      setState(chatId, STATES.RESULT);
      return ctx.reply(`${card}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`, { parse_mode: 'Markdown', ...resultKeyboard });
    }

    if (awaitingType === 'hardware') {
      const equipo = await q.findEquipo(text);
      if (!equipo) return ctx.reply(promptWithBack('❌ No encontré ningún equipo con ese identificador.'), backKeyboard);

      const specs = await q.getEspecificaciones(equipo.id);

      if (hardwareClave === 'TODO_HW') {
        const hwKeys = ['PROCESADOR', 'RAM', 'DISCO', 'SO', 'ENTRADAS DE VIDEO'];
        const hwSpecs = specs.filter(s => hwKeys.includes(s.clave));
        if (hwSpecs.length === 0) {
          setState(chatId, STATES.RESULT);
          return ctx.reply(`🖥️ El equipo *${equipo.ine}* no tiene hardware registrado.\n\n1️⃣ Seguir consultando\n2️⃣ Salir`, { parse_mode: 'Markdown', ...resultKeyboard });
        }
        const card = `🖥️ *${equipo.ine}* — ${equipo.ubicacion_nombre || '?'}\n\n` +
          hwSpecs.map(s => `*${s.clave}:* ${s.valor}`).join('\n');
        setState(chatId, STATES.RESULT);
        return ctx.reply(`${card}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`, { parse_mode: 'Markdown', ...resultKeyboard });
      }

      const filtered = specs.filter(s => s.clave === hardwareClave);
      if (filtered.length === 0) {
        setState(chatId, STATES.RESULT);
        return ctx.reply(`🖥️ El equipo *${equipo.ine}* no tiene *${hardwareClave}* registrado.\n\n1️⃣ Seguir consultando\n2️⃣ Salir`, { parse_mode: 'Markdown', ...resultKeyboard });
      }

      setState(chatId, STATES.RESULT);
      return ctx.reply(
        `🖥️ *${equipo.ine}* — ${equipo.ubicacion_nombre || '?'}\n\n*${hardwareClave}:* ${filtered[0].valor}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`,
        { parse_mode: 'Markdown', ...resultKeyboard }
      );
    }

    if (awaitingType === 'listado_ubicacion') {
      const equipos = await q.getEquiposByUbicacion(text);
      if (equipos.length === 0) return ctx.reply(
        promptWithBack('📍 No encontré equipos en esa ubicación.'),
        { parse_mode: 'Markdown', ...await createUbicacionKeyboard() }
      );
      const lines = equipos.map(e => `💻 ${e.ine} — ${e.estado || '?'}`);
      const title = `📍 *Equipos en "${text}" (${equipos.length}):*`;
      if (lines.length > 10) {
        setState(chatId, STATES.RESULT, {
          awaitingType: 'listado_ubicacion',
          pagedLines: lines,
          pagedTitle: title,
          pagedPage: 1,
        });
        return ctx.reply(
          formatPagedText(title, getPageLines(lines, 1)),
          { parse_mode: 'Markdown', ...verMasKeyboard }
        );
      }
      setState(chatId, STATES.RESULT);
      return ctx.reply(
        `${formatPagedText(title, lines)}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`,
        { parse_mode: 'Markdown', ...resultKeyboard }
      );
    }

    if (awaitingType === 'listado_responsable') {
      const equipos = await q.getEquiposByResponsable(text);
      if (equipos.length === 0) return ctx.reply(
        promptWithBack('👤 No encontré equipos de ese responsable.'),
        { parse_mode: 'Markdown', ...await createResponsableKeyboard() }
      );
      const lines = equipos.map(e => `💻 ${e.ine} — ${e.ubicacion || '?'}`);
      const title = `👤 *Equipos de "${text}" (${equipos.length}):*`;
      if (lines.length > 10) {
        setState(chatId, STATES.RESULT, {
          awaitingType: 'listado_responsable',
          pagedLines: lines,
          pagedTitle: title,
          pagedPage: 1,
        });
        return ctx.reply(
          formatPagedText(title, getPageLines(lines, 1)),
          { parse_mode: 'Markdown', ...verMasKeyboard }
        );
      }
      setState(chatId, STATES.RESULT);
      return ctx.reply(
        `${formatPagedText(title, lines)}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`,
        { parse_mode: 'Markdown', ...resultKeyboard }
      );
    }

    if (awaitingType === 'listado_estado') {
      const equipos = await q.getEquiposByEstado(text);
      if (equipos.length === 0) return ctx.reply(
        promptWithBack('📌 No encontré equipos con ese estado.'),
        { parse_mode: 'Markdown', ...await createEstadoKeyboard() }
      );
      const desc = q.ESTADO_DESC[equipos[0].estado] || equipos[0].estado;
      const lines = equipos.map(e => `💻 ${e.ine} — ${e.ubicacion || '?'}`);
      const title = `📌 *Equipos en estado "${desc}" (${equipos.length}):*`;
      if (lines.length > 10) {
        setState(chatId, STATES.RESULT, {
          awaitingType: 'listado_estado',
          pagedLines: lines,
          pagedTitle: title,
          pagedPage: 1,
        });
        return ctx.reply(
          formatPagedText(title, getPageLines(lines, 1)),
          { parse_mode: 'Markdown', ...verMasKeyboard }
        );
      }
      setState(chatId, STATES.RESULT);
      return ctx.reply(
        `${formatPagedText(title, lines)}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`,
        { parse_mode: 'Markdown', ...resultKeyboard }
      );
    }

    if (awaitingType === 'busqueda_libre') {
      const results = await q.searchAll(text);
      if (results.length === 0) return ctx.reply(promptWithBack('❌ No encontré resultados para esa búsqueda.'), backKeyboard);
      const lines = results.map((e, i) =>
        `${i + 1}. ${e.ine} — ${e.ubicacion || '?'} (${e.estado || '?'})`
      );
      const title = `🔍 *Resultados para "${text}" (${results.length}):*`;
      if (lines.length > 10) {
        setState(chatId, STATES.RESULT, {
          awaitingType: 'busqueda_libre',
          pagedLines: lines,
          pagedTitle: title,
          pagedPage: 1,
        });
        return ctx.reply(
          formatPagedText(title, getPageLines(lines, 1)),
          { parse_mode: 'Markdown', ...verMasKeyboard }
        );
      }
      setState(chatId, STATES.RESULT);
      return ctx.reply(
        `${formatPagedText(title, lines)}\n\n1️⃣ Seguir consultando\n2️⃣ Salir`,
        { parse_mode: 'Markdown', ...resultKeyboard }
      );
    }

  } catch (err) {
    logger.error({ err }, '[TelegramBot] handleAwaitingInput error');
    return ctx.reply('❌ Ocurrió un error al procesar tu consulta.');
  }
}

module.exports = { handleMessage };
