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
let stopping = false;

async function startBotWithRetry() {
  const maxRetries = 5;
  let delay = 4000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await bot.telegram.deleteWebhook({ drop_pending_updates: true });
      await bot.launch();
      logger.info('[TelegramBot] Bot iniciado correctamente');
      return;
    } catch (err) {
      const isConflict = err?.response?.error_code === 409 || (err?.message && err.message.includes('409'));

      if (isConflict && attempt < maxRetries) {
        logger.warn({ attempt, delayMs: delay }, '[TelegramBot] Conflicto 409, reintentando...');
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
      } else {
        logger.error({ err, attempt }, '[TelegramBot] Error al iniciar');
        return;
      }
    }
  }
}

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

  startBotWithRetry();

  return bot;
}

function stopBot() {
  if (bot && !stopping) {
    stopping = true;
    bot.stop('SIGTERM');
    logger.info('[TelegramBot] Bot detenido');
  }
}

process.on('SIGTERM', () => {
  stopBot();
});
process.on('SIGINT', () => {
  stopBot();
});

module.exports = { initBot, stopBot };
