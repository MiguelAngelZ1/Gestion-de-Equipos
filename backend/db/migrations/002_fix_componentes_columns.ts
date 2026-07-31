const logger = require('../../utils/logger');

module.exports = {
  version: 2,
  name: 'fix_componentes_columns',

  up: async (db, run, all) => {
    const isPG = !!db.client?.pool;

    if (isPG) {
      const tableInfo = async (table) => {
        const result = await all(
          `SELECT column_name as name FROM information_schema.columns 
           WHERE table_name = $1 AND table_schema = 'public'`,
          [table]
        );
        return result || [];
      };
      const hasCol = (cols, name) => cols.some((c) => c.name === name);

      // --- componentes_repuestos: agregar columnas faltantes ---
      const crCols = await tableInfo('componentes_repuestos');
      if (!hasCol(crCols, 'nne')) await run(`ALTER TABLE componentes_repuestos ADD COLUMN nne TEXT`);
      if (!hasCol(crCols, 'serie')) await run(`ALTER TABLE componentes_repuestos ADD COLUMN serie TEXT`);
      if (!hasCol(crCols, 'estado')) await run(`ALTER TABLE componentes_repuestos ADD COLUMN estado TEXT DEFAULT 'Disponible'`);
      if (!hasCol(crCols, 'equipo_id')) await run(`ALTER TABLE componentes_repuestos ADD COLUMN equipo_id INTEGER`);
      if (!hasCol(crCols, 'fecha_ingreso')) await run(`ALTER TABLE componentes_repuestos ADD COLUMN fecha_ingreso TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);

      // --- componentes_instalados: agregar columnas faltantes ---
      const ciCols = await tableInfo('componentes_instalados');
      if (!hasCol(ciCols, 'repuesto_id')) await run(`ALTER TABLE componentes_instalados ADD COLUMN repuesto_id INTEGER`);
      if (!hasCol(ciCols, 'especificacion_id')) await run(`ALTER TABLE componentes_instalados ADD COLUMN especificacion_id INTEGER`);
      if (!hasCol(ciCols, 'nne')) await run(`ALTER TABLE componentes_instalados ADD COLUMN nne TEXT`);
      if (!hasCol(ciCols, 'serie')) await run(`ALTER TABLE componentes_instalados ADD COLUMN serie TEXT`);

      logger.info("[Migrations] Columnas de componentes corregidas");
    }
  }
};
