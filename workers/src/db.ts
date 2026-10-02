// Wrapper D1 con la misma interfaz que backend/db/database.ts (all/get/run).
// Todo el SQL del backend usa placeholders `?`, que D1 acepta nativo.
export interface QueryResult {
  rows: any[];
  changes: number;
  lastID?: number;
}

export function createDb(d1: D1Database) {
  async function query(sql: string, params: any[] = []): Promise<QueryResult> {
    const stmt = d1.prepare(sql).bind(...params);
    const isSelect = /^\s*(SELECT|PRAGMA|WITH)\b/i.test(sql);
    if (isSelect) {
      const res = await stmt.all();
      return { rows: res.results ?? [], changes: 0 };
    }
    const res = await stmt.run();
    return {
      rows: [],
      changes: res.meta.changes ?? 0,
      lastID: res.meta.last_row_id ? Number(res.meta.last_row_id) : undefined,
    };
  }

  return {
    async query(sql: string, params: any[] = []) {
      return query(sql, params);
    },
    async all(sql: string, params: any[] = []) {
      return (await query(sql, params)).rows;
    },
    // Replica database.ts: agrega LIMIT 1 si no lo trae.
    async get(sql: string, params: any[] = []) {
      let clean = sql.trim().replace(/;$/, '');
      if (!/\bLIMIT\b/i.test(clean)) clean += ' LIMIT 1';
      const { rows } = await query(clean, params);
      return rows[0] ?? null;
    },
    async run(sql: string, params: any[] = []) {
      const { changes, lastID } = await query(sql, params);
      return { changes, lastID };
    },
    // D1 no tiene transacciones interactivas (sin BEGIN con lecturas intermedias).
    // Los writes se ejecutan secuenciales con await; riesgo de escritura parcial
    // solo ante error a mitad de flujo (uso personal, aceptado; ver decisión #16).
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
  };
}

export type Db = ReturnType<typeof createDb>;
