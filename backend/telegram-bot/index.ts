const { Telegraf, Markup } = require('telegraf');
const logger = require('../utils/logger');
const { handleMessage } = require('./handlers');
const { mainMenu, helpText } = require('./menus');

const mainKeyboard = Markup.keyboard([
  ['1️⃣ Cantidad', '2️⃣ Contraseñas', '3️⃣ Red'],
  ['4️⃣ Hardware', '5️⃣ Info completa', '6️⃣ Buscar'],
  ['7️⃣ Listados', '8️⃣ Ayuda', '0️⃣ Salir'],
]).resize();

let bot = null;

function initBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    logger.warn('[TelegramBot] TELEGRAM_BOT_TOKEN no configurado. Bot deshabilitado.');
    return null;
  }

  bot = new Telegraf(token);

  bot.start(async (ctx) => {
    try {
      await ctx.reply(mainMenu(), { parse_mode: 'Markdown', ...mainKeyboard });
    } catch (err) {
      logger.error({ err, chatId: ctx.chat.id }, '[TelegramBot] /start error');
    }
  });

  bot.help(async (ctx) => {
    try {
      await ctx.reply(helpText(), { parse_mode: 'Markdown', ...mainKeyboard });
    } catch (err) {
      logger.error({ err, chatId: ctx.chat.id }, '[TelegramBot] /help error');
    }
  });

  bot.on('text', async (ctx) => {
    try {
      await handleMessage(ctx);
    } catch (err) {
      logger.error({ err, chatId: ctx.chat.id }, '[TelegramBot] Error no manejado');
    }
  });

  bot.launch().then(() => {
    logger.info('[TelegramBot] Bot iniciado correctamente');
  }).catch((err) => {
    logger.error({ err }, '[TelegramBot] Error al iniciar');
  });

  return bot;
}

function stopBot() {
  if (bot) {
    bot.stop('SIGTERM');
    logger.info('[TelegramBot] Bot detenido');
  }
}

module.exports = { initBot, stopBot };
