// Merge solo-usuarios: seed (local, viaja en USB) -> APPDATA (instalacion de campo).
// Upsert por `usuario` (clave natural), gana updated_at mas nuevo, NUNCA borra.
// Uso: node merge-portable-users.js <seed.db> <destino.db>
// No aborta el arranque: ante error loguea y sale 1; iniciar.bat continua igual.
const fs = require('fs');
const path = require('path');

const seedPath = process.argv[2] || process.env.SEED_DB;
const destPath = process.argv[3] || process.env.APPDATA_DB;
const logPath = destPath ? path.join(path.dirname(destPath), 'merge-portable-users.log') : null;

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  if (logPath) { try { fs.appendFileSync(logPath, line + '\n'); } catch (_) {} }
}

if (!seedPath || !destPath || !fs.existsSync(seedPath) || !fs.existsSync(destPath)) {
  log(`SKIP: seed o destino inexistente (seed=${seedPath} dest=${destPath})`);
  process.exit(0); // primera vez: iniciar.bat ya copio el seed completo, nada que fusionar
}

let sqlite3;
try {
  sqlite3 = require('sqlite3');
} catch (e) {
  try { sqlite3 = require(path.join(__dirname, '..', 'node_modules', 'sqlite3')); }
  catch (_) { log('ERROR: modulo sqlite3 no encontrado'); process.exit(1); }
}

const get = (db, sql, p = []) => new Promise((res, rej) => db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));
const all = (db, sql, p = []) => new Promise((res, rej) => db.all(sql, p, (e, r) => (e ? rej(e) : res(r))));
const run = (db, sql, p = []) => new Promise((res, rej) => db.run(sql, p, function (e) { e ? rej(e) : res(this); }));

(async () => {
  // Backup one-time por dia antes del primer merge
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const bak = `${destPath}.bak-${day}`;
  if (!fs.existsSync(bak)) { fs.copyFileSync(destPath, bak); log(`backup: ${bak}`); }

  const seed = new sqlite3.Database(seedPath, sqlite3.OPEN_READONLY);
  const dest = new sqlite3.Database(destPath);
  try {
    await run(dest, 'PRAGMA busy_timeout=5000;');
    const cols = (await all(dest, 'PRAGMA table_info(usuarios)')).map((c) => c.name);
    const seedCols = new Set((await all(seed, 'PRAGMA table_info(usuarios)')).map((c) => c.name));
    const shared = cols.filter((c) => seedCols.has(c));
    const dataCols = shared.filter((c) => c !== 'id' && c !== 'usuario'); // id/usuario: identidad
    const seedUsers = await all(seed, `SELECT ${shared.map((c) => `"${c}"`).join(',')} FROM usuarios`);
    let inserted = 0, updated = 0, skipped = 0;
    await run(dest, 'BEGIN IMMEDIATE;');
    try {
      for (const s of seedUsers) {
        const d = await get(dest, 'SELECT * FROM usuarios WHERE usuario = ?', [s.usuario]);
        if (!d) {
          // email podria chocar con otro usuario de campo: no pisar, avisar
          if (s.email && (await get(dest, 'SELECT id FROM usuarios WHERE email = ?', [s.email]))) {
            skipped++; log(`SKIP insert ${s.usuario}: email en uso por otro usuario de campo`); continue;
          }
          await run(dest,
            `INSERT INTO usuarios (${shared.map((c) => `"${c}"`).join(',')}) VALUES (${shared.map(() => '?').join(',')})`,
            shared.map((c) => s[c]));
          inserted++;
        } else if ((s.updated_at || '') > (d.updated_at || '')) {
          if (s.email && s.email !== d.email && (await get(dest, 'SELECT id FROM usuarios WHERE email = ? AND usuario <> ?', [s.email, s.usuario]))) {
            skipped++; log(`SKIP update ${s.usuario}: email en uso por otro usuario de campo`); continue;
          }
          await run(dest,
            `UPDATE usuarios SET ${dataCols.map((c) => `"${c}"=?`).join(',')} WHERE usuario=?`,
            [...dataCols.map((c) => s[c]), s.usuario]);
          updated++;
        }
      }
      await run(dest, 'COMMIT;');
    } catch (e) { try { await run(dest, 'ROLLBACK;'); } catch (_) {} throw e; }
    log(`OK: insertados=${inserted} actualizados=${updated} omitidos=${skipped} (seed=${seedUsers.length})`);
  } catch (e) {
    log(`ERROR: ${e.message}`);
    process.exit(1);
  } finally { seed.close(); dest.close(); }
})();
