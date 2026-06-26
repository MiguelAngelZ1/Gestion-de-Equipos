const { Telegraf } = require('telegraf');
const logger = require('../utils/logger');
const { handleMessage } = require('./handlers');

let bot = null;

function initBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    logger.warn('[TelegramBot] TELEGRAM_BOT_TOKEN no configurado. Bot deshabilitado.');
    return null;
  }

  bot = new Telegraf(token);

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
