module.exports = {
  version: 1,
  name: 'initial_schema',

  up: async (db, run, all) => {
    const isPG = !!db.client?.pool;
    
    // Funcion para verificar si una columna existe
    const tableInfo = async (table) => {
      if (isPG) {
        // PostgreSQL: usar information_schema
        const result = await all(
          `SELECT column_name as name FROM information_schema.columns 
           WHERE table_name = $1 AND table_schema = 'public'`,
          [table]
        );
        return result || [];
      } else {
        // SQLite: usar PRAGMA
        const result = await all(`PRAGMA table_info(${table})`);
        return result || [];
      }
    };
    
    const hasCol = (cols, name) => cols.some((c) => c.name === name);

    // --- Core tables ---
    if (isPG) {
      // PostgreSQL: usar SERIAL en lugar de AUTOINCREMENT
      await run(`CREATE TABLE IF NOT EXISTS equipos (
        id TEXT PRIMARY KEY,
        ine TEXT NOT NULL,
        nne TEXT,
        serie TEXT,
        categoria_id INTEGER,
        ubicacion_id INTEGER,
        responsable_id INTEGER,
        estado_id INTEGER,
        is_deleted INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);
    } else {
      // SQLite
      await run(`CREATE TABLE IF NOT EXISTS equipos (
        id TEXT PRIMARY KEY,
        ine TEXT NOT NULL,
        nne TEXT,
        serie TEXT,
        categoria_id INTEGER,
        ubicacion_id INTEGER,
        responsable_id INTEGER,
        estado_id INTEGER,
        is_deleted INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
    }

    const equiposCols = await tableInfo('equipos');
    if (!hasCol(equiposCols, 'nne')) await run(`ALTER TABLE equipos ADD COLUMN nne TEXT`);
    if (!hasCol(equiposCols, 'is_deleted')) await run(`ALTER TABLE equipos ADD COLUMN is_deleted INTEGER DEFAULT 0`);
    if (!hasCol(equiposCols, 'updated_at')) {
      if (isPG) {
        await run(`ALTER TABLE equipos ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
      } else {
        await run(`ALTER TABLE equipos ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
      }
    }

    // Usuarios
    if (isPG) {
      await run(`CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        usuario TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        rol TEXT DEFAULT 'USER',
        permisos_json TEXT DEFAULT '[]',
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);
    } else {
      await run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        rol TEXT DEFAULT 'USER',
        permisos_json TEXT DEFAULT '[]',
        last_login DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
    }

    const userCols = await tableInfo('usuarios');
    if (!hasCol(userCols, 'rol')) await run(`ALTER TABLE usuarios ADD COLUMN rol TEXT DEFAULT 'USER'`);
    if (!hasCol(userCols, 'permisos_json')) await run(`ALTER TABLE usuarios ADD COLUMN permisos_json TEXT DEFAULT '[]'`);

    // Soporte tareas
    if (isPG) {
      await run(`CREATE TABLE IF NOT EXISTS soporte_tareas (
        id SERIAL PRIMARY KEY,
        ticket_id TEXT NOT NULL UNIQUE,
        equipo_id TEXT NOT NULL,
        responsable TEXT NOT NULL,
        tarea_realizada TEXT NOT NULL,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        tipo_falla TEXT,
        costo_estimado REAL DEFAULT 0,
        FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE
      )`);
    } else {
      await run(`CREATE TABLE IF NOT EXISTS soporte_tareas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id TEXT NOT NULL UNIQUE,
        equipo_id TEXT NOT NULL,
        responsable TEXT NOT NULL,
        tarea_realizada TEXT NOT NULL,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        tipo_falla TEXT,
        costo_estimado REAL DEFAULT 0,
        FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE
      )`);
    }

    const soporteCols = await tableInfo('soporte_tareas');
    if (!hasCol(soporteCols, 'updated_at')) {
      if (isPG) {
        await run(`ALTER TABLE soporte_tareas ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
      } else {
        await run(`ALTER TABLE soporte_tareas ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
      }
    }
    if (!hasCol(soporteCols, 'costo_estimado')) await run(`ALTER TABLE soporte_tareas ADD COLUMN costo_estimado REAL DEFAULT 0`);

    // --- Support tables ---
    if (isPG) {
      await run(`CREATE TABLE IF NOT EXISTS componentes_repuestos (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        cantidad INTEGER DEFAULT 0
      )`);

      await run(`CREATE TABLE IF NOT EXISTS componentes_instalados (
        id SERIAL PRIMARY KEY,
        equipo_id TEXT NOT NULL,
        nombre TEXT NOT NULL,
        fecha_instalacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      await run(`CREATE TABLE IF NOT EXISTS responsables (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        apellido TEXT NOT NULL,
        activo INTEGER DEFAULT 1,
        grado TEXT,
        grado_id INTEGER
      )`);

      await run(`CREATE TABLE IF NOT EXISTS ubicaciones (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL UNIQUE,
        ubicacion TEXT
      )`);

      await run(`CREATE TABLE IF NOT EXISTS estados (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL UNIQUE,
        color_hex TEXT DEFAULT '#10b981'
      )`);

      await run(`CREATE TABLE IF NOT EXISTS grados (
        id SERIAL PRIMARY KEY,
        abreviatura TEXT NOT NULL UNIQUE,
        grado_completo TEXT NOT NULL
      )`);

      await run(`CREATE TABLE IF NOT EXISTS grupos_comodidad (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL UNIQUE
      )`);
    } else {
      await run(`CREATE TABLE IF NOT EXISTS componentes_repuestos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        cantidad INTEGER DEFAULT 0
      )`);

      await run(`CREATE TABLE IF NOT EXISTS componentes_instalados (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        equipo_id TEXT NOT NULL,
        nombre TEXT NOT NULL,
        fecha_instalacion DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      await run(`CREATE TABLE IF NOT EXISTS responsables (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        apellido TEXT NOT NULL,
        activo INTEGER DEFAULT 1,
        grado TEXT,
        grado_id INTEGER
      )`);

      await run(`CREATE TABLE IF NOT EXISTS ubicaciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE,
        ubicacion TEXT
      )`);

      await run(`CREATE TABLE IF NOT EXISTS estados (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE,
        color_hex TEXT DEFAULT '#10b981'
      )`);

      await run(`CREATE TABLE IF NOT EXISTS grados (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        abreviatura TEXT NOT NULL UNIQUE,
        grado_completo TEXT NOT NULL
      )`);

      await run(`CREATE TABLE IF NOT EXISTS grupos_comodidad (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE
      )`);
    }

    const respCols = await tableInfo('responsables');
    if (!hasCol(respCols, 'grado')) await run(`ALTER TABLE responsables ADD COLUMN grado TEXT`);
    if (!hasCol(respCols, 'grado_id')) await run(`ALTER TABLE responsables ADD COLUMN grado_id INTEGER`);

    const ubCols = await tableInfo('ubicaciones');
    if (!hasCol(ubCols, 'ubicacion')) await run(`ALTER TABLE ubicaciones ADD COLUMN ubicacion TEXT`);

    // --- Functional tables ---
    if (isPG) {
      await run(`CREATE TABLE IF NOT EXISTS prestamos (
        id SERIAL PRIMARY KEY,
        equipo_id TEXT NOT NULL,
        solicitante TEXT NOT NULL,
        motivo TEXT,
        fecha_prestamo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_devolucion_estimada TIMESTAMP,
        fecha_devolucion_real TIMESTAMP,
        estado TEXT DEFAULT 'ACTIVO',
        notas TEXT,
        FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE
      )`);

      await run(`CREATE TABLE IF NOT EXISTS especificaciones (
        id SERIAL PRIMARY KEY,
        equipo_id TEXT NOT NULL,
        clave TEXT NOT NULL,
        valor TEXT NOT NULL,
        FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE
      )`);

      await run(`CREATE TABLE IF NOT EXISTS especificaciones_repuestos (
        id SERIAL PRIMARY KEY,
        repuesto_id INTEGER NOT NULL,
        clave TEXT NOT NULL,
        valor TEXT NOT NULL,
        FOREIGN KEY (repuesto_id) REFERENCES componentes_repuestos(id) ON DELETE CASCADE
      )`);

      await run(`CREATE TABLE IF NOT EXISTS historial_personal (
        id SERIAL PRIMARY KEY,
        equipo_id TEXT NOT NULL,
        responsable TEXT NOT NULL,
        evento TEXT NOT NULL,
        estado_anterior TEXT,
        estado_nuevo TEXT,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notas TEXT,
        FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE
      )`);

      await run(`CREATE TABLE IF NOT EXISTS movimientos_stock (
        id SERIAL PRIMARY KEY,
        repuesto_id INTEGER NOT NULL,
        tipo TEXT NOT NULL,
        cantidad INTEGER NOT NULL,
        equipo_id TEXT,
        soporte_id INTEGER,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notas TEXT,
        FOREIGN KEY (repuesto_id) REFERENCES componentes_repuestos(id) ON DELETE CASCADE
      )`);

      await run(`CREATE TABLE IF NOT EXISTS redes (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        segmento TEXT NOT NULL,
        mascara TEXT NOT NULL,
        gateway TEXT,
        dns TEXT,
        vlan INTEGER
      )`);

      await run(`CREATE TABLE IF NOT EXISTS ips_reservadas (
        id SERIAL PRIMARY KEY,
        red_id TEXT NOT NULL,
        ip TEXT NOT NULL,
        notas TEXT,
        FOREIGN KEY (red_id) REFERENCES redes(id) ON DELETE CASCADE
      )`);

      // --- System tables ---
      await run(`CREATE TABLE IF NOT EXISTS mensajes_admin (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER,
        remitente TEXT,
        mensaje TEXT NOT NULL,
        leido INTEGER DEFAULT 0,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      await run(`CREATE TABLE IF NOT EXISTS alertas_notificaciones (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER,
        titulo TEXT NOT NULL,
        mensaje TEXT NOT NULL,
        tipo TEXT DEFAULT 'sistema',
        leido INTEGER DEFAULT 0,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      await run(`CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER,
        subscription_json TEXT NOT NULL,
        device_info TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      await run(`CREATE TABLE IF NOT EXISTS sync_metadata (
        id SERIAL PRIMARY KEY,
        clave TEXT UNIQUE,
        valor TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      await run(`CREATE TABLE IF NOT EXISTS recuperacion_claves (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        codigo TEXT NOT NULL,
        expires TIMESTAMP NOT NULL
      )`);

      await run(`CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        revoked INTEGER DEFAULT 0
      )`);

      await run(`CREATE TABLE IF NOT EXISTS sync_logs (
        id SERIAL PRIMARY KEY,
        tipo TEXT,
        direccion TEXT,
        equipos_creados INTEGER DEFAULT 0,
        equipos_actualizados INTEGER DEFAULT 0,
        equipos_eliminados INTEGER DEFAULT 0,
        errores TEXT,
        exitoso INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);
    } else {
      // SQLite versions
      await run(`CREATE TABLE IF NOT EXISTS prestamos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        equipo_id TEXT NOT NULL,
        solicitante TEXT NOT NULL,
        motivo TEXT,
        fecha_prestamo DATETIME DEFAULT CURRENT_TIMESTAMP,
        fecha_devolucion_estimada DATETIME,
        fecha_devolucion_real DATETIME,
        estado TEXT DEFAULT 'ACTIVO',
        notas TEXT,
        FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE
      )`);

      await run(`CREATE TABLE IF NOT EXISTS especificaciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        equipo_id TEXT NOT NULL,
        clave TEXT NOT NULL,
        valor TEXT NOT NULL,
        FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE
      )`);

      await run(`CREATE TABLE IF NOT EXISTS especificaciones_repuestos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repuesto_id INTEGER NOT NULL,
        clave TEXT NOT NULL,
        valor TEXT NOT NULL,
        FOREIGN KEY (repuesto_id) REFERENCES componentes_repuestos(id) ON DELETE CASCADE
      )`);

      await run(`CREATE TABLE IF NOT EXISTS historial_personal (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        equipo_id TEXT NOT NULL,
        responsable TEXT NOT NULL,
        evento TEXT NOT NULL,
        estado_anterior TEXT,
        estado_nuevo TEXT,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        notas TEXT,
        FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE
      )`);

      await run(`CREATE TABLE IF NOT EXISTS movimientos_stock (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repuesto_id INTEGER NOT NULL,
        tipo TEXT NOT NULL,
        cantidad INTEGER NOT NULL,
        equipo_id TEXT,
        soporte_id INTEGER,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        notas TEXT,
        FOREIGN KEY (repuesto_id) REFERENCES componentes_repuestos(id) ON DELETE CASCADE
      )`);

      await run(`CREATE TABLE IF NOT EXISTS redes (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        segmento TEXT NOT NULL,
        mascara TEXT NOT NULL,
        gateway TEXT,
        dns TEXT,
        vlan INTEGER
      )`);

      await run(`CREATE TABLE IF NOT EXISTS ips_reservadas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        red_id TEXT NOT NULL,
        ip TEXT NOT NULL,
        notas TEXT,
        FOREIGN KEY (red_id) REFERENCES redes(id) ON DELETE CASCADE
      )`);

      // --- System tables ---
      await run(`CREATE TABLE IF NOT EXISTS mensajes_admin (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER,
        remitente TEXT,
        mensaje TEXT NOT NULL,
        leido INTEGER DEFAULT 0,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      await run(`CREATE TABLE IF NOT EXISTS alertas_notificaciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER,
        titulo TEXT NOT NULL,
        mensaje TEXT NOT NULL,
        tipo TEXT DEFAULT 'sistema',
        leido INTEGER DEFAULT 0,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      await run(`CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER,
        subscription_json TEXT NOT NULL,
        device_info TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      await run(`CREATE TABLE IF NOT EXISTS sync_metadata (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clave TEXT UNIQUE,
        valor TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      await run(`CREATE TABLE IF NOT EXISTS recuperacion_claves (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        codigo TEXT NOT NULL,
        expires DATETIME NOT NULL
      )`);

      await run(`CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        revoked INTEGER DEFAULT 0
      )`);

      await run(`CREATE TABLE IF NOT EXISTS sync_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT,
        direccion TEXT,
        equipos_creados INTEGER DEFAULT 0,
        equipos_actualizados INTEGER DEFAULT 0,
        equipos_eliminados INTEGER DEFAULT 0,
        errores TEXT,
        exitoso INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }

    // --- Indices ---
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_especificaciones_equipo_id ON especificaciones(equipo_id)',
      'CREATE INDEX IF NOT EXISTS idx_historial_personal_equipo_id ON historial_personal(equipo_id)',
      'CREATE INDEX IF NOT EXISTS idx_movimientos_stock_repuesto_id ON movimientos_stock(repuesto_id)',
      'CREATE INDEX IF NOT EXISTS idx_especificaciones_repuestos_repuesto_id ON especificaciones_repuestos(repuesto_id)',
      'CREATE INDEX IF NOT EXISTS idx_componentes_instalados_equipo_id ON componentes_instalados(equipo_id)',
      'CREATE INDEX IF NOT EXISTS idx_soporte_tareas_equipo_id ON soporte_tareas(equipo_id)',
      'CREATE INDEX IF NOT EXISTS idx_prestamos_equipo_id ON prestamos(equipo_id)',
    ];
    for (const idx of indexes) {
      await run(idx);
    }
  },

  down: async (db, run) => {
    const tables = [
      '_migrations',
      'sync_logs',
      'refresh_tokens',
      'recuperacion_claves',
      'sync_metadata',
      'push_subscriptions',
      'alertas_notificaciones',
      'mensajes_admin',
      'ips_reservadas',
      'redes',
      'movimientos_stock',
      'historial_personal',
      'especificaciones_repuestos',
      'especificaciones',
      'prestamos',
      'grupos_comodidad',
      'grados',
      'estados',
      'ubicaciones',
      'responsables',
      'componentes_instalados',
      'componentes_repuestos',
      'soporte_tareas',
      'usuarios',
      'equipos',
    ];
    for (const table of tables) {
      await run(`DROP TABLE IF EXISTS ${table}`);
    }
  },
};
