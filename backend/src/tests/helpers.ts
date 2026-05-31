const path = require('path');
const fs = require('fs');

let initialized = false;

async function ensureTestSetup() {
  if (initialized) return;
  initialized = true;

  const dbPath = process.env.DB_PATH || path.resolve(__dirname, '../../test-data/test.db');

  for (const file of [dbPath, dbPath + '-wal', dbPath + '-shm']) {
    try { fs.unlinkSync(file); } catch (e) { /* ok */ }
  }

  const db = require('../../db/database');
  await db.connect();

  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash('testpass123', 10);
  await db.run(
    "INSERT OR IGNORE INTO usuarios (usuario, email, password_hash, rol) VALUES (?, ?, ?, ?)",
    ['testadmin', 'test@example.com', hash, 'admin']
  );
}

module.exports = { ensureTestSetup };
