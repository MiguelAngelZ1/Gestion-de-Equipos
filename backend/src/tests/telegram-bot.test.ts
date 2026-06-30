const db = require('../../db/database');
const q = require('../../telegram-bot/queries');
const { ensureTestSetup } = require('./helpers');

beforeAll(async () => {
  await ensureTestSetup();

  await db.run(
    'INSERT OR IGNORE INTO equipos (id, ine, nne, serie) VALUES (?, ?, ?, ?)',
    ['test-equipo-1', 'INE123', 'NNE123', 'SER123']
  );

  await db.run(
    'INSERT OR IGNORE INTO especificaciones (equipo_id, clave, valor) VALUES (?, ?, ?)',
    ['test-equipo-1', 'IP', '10.0.0.1']
  );

  await db.run(
    'INSERT OR IGNORE INTO telegram_authorized_users (chat_id, telegram_user_id) VALUES (?, ?)',
    ['999999', '12345']
  );
});

describe('Telegram bot queries', () => {
  it('should find equipos using findEquipos by serie, nne, and partial ine', async () => {
    const exactSerie = await q.findEquipos('SER123');
    expect(exactSerie.length).toBeGreaterThanOrEqual(1);
    expect(exactSerie[0].ine).toBe('INE123');

    const exactNne = await q.findEquipos('NNE123');
    expect(exactNne.length).toBeGreaterThanOrEqual(1);
    expect(exactNne[0].ine).toBe('INE123');

    const partialIne = await q.findEquipos('INE12');
    expect(partialIne.length).toBeGreaterThanOrEqual(1);
    expect(partialIne[0].ine).toBe('INE123');
  });

  it('should support DB-backed telegram authorization', async () => {
    const existingAuth = await q.isTelegramAuthorized('999999');
    expect(existingAuth).toBe(true);

    const newChatId = '888888';
    const beforeAuth = await q.isTelegramAuthorized(newChatId);
    expect(beforeAuth).toBe(false);

    await q.addTelegramAuthorizedChat(newChatId, '54321');
    const afterAuth = await q.isTelegramAuthorized(newChatId);
    expect(afterAuth).toBe(true);
  });
});
