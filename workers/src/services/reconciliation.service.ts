// Puerto parcial de backend/services/network/reconciliation.service.ts:
// solo alias por usuario + vinculación (el sondeo reconcileDevice es local-only).
import type { Db } from '../db';

export function reconciliationService(db: Db) {
  return {
    async updateAliasForUser(dispositivoId: string, userId: string, alias: string | null): Promise<void> {
      if (!userId) throw new Error('Usuario requerido.');
      const trimmed = alias ? String(alias).trim().slice(0, 80) : null;
      if (trimmed && trimmed.length < 1) throw new Error('Alias inválido.');
      if (!trimmed) {
        await db.run('DELETE FROM dispositivo_alias_usuario WHERE user_id = ? AND dispositivo_id = ?', [userId, dispositivoId]);
        return;
      }
      // SQLite/D1: INSERT OR REPLACE (el backend usa ON CONFLICT solo en PG).
      await db.run('INSERT OR REPLACE INTO dispositivo_alias_usuario (user_id, dispositivo_id, alias) VALUES (?, ?, ?)', [userId, dispositivoId, trimmed]);
    },

    async linkToEquipo(dispositivoId: string, equipoId: string): Promise<boolean> {
      const node = await db.get('SELECT * FROM dispositivos_red WHERE id = ?', [dispositivoId]);
      if (!node) throw new Error('Dispositivo de red no encontrado.');
      const equipo = await db.get('SELECT id FROM equipos WHERE id = ? AND is_deleted = 0', [equipoId]);
      if (!equipo) throw new Error('Equipo de inventario no encontrado.');
      if (node.mac_actual) {
        const existingIface = await db.get('SELECT id FROM interfaces_red WHERE equipo_id = ? AND mac = ?', [equipoId, node.mac_actual]);
        let ifaceId = existingIface?.id;
        if (!ifaceId) {
          // El backend inserta sin id (TEXT PK sin default): en D1 se genera explícito.
          ifaceId = `if_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
          await db.run(`INSERT INTO interfaces_red (id, equipo_id, mac, tipo_interfaz, es_principal) VALUES (?, ?, ?, 'ETHERNET', 1)`, [ifaceId, equipoId, node.mac_actual]);
        }
        await db.run('UPDATE dispositivos_red SET interfaz_id = ? WHERE id = ?', [ifaceId, dispositivoId]);
      }
      return true;
    },
  };
}
