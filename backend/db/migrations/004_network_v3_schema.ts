module.exports = {
  version: 4,
  name: 'network_v3_schema',

  up: async (db: any, run: any, all: any) => {
    const isPG = !!db.client?.pool;

    if (isPG) {
      // --- POSTGRESQL NATIVO ---

      // 1. Interfaces de Red de Equipos
      await run(`
        CREATE TABLE IF NOT EXISTS interfaces_red (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          equipo_id TEXT NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
          mac TEXT NOT NULL,
          tipo_interfaz TEXT NOT NULL DEFAULT 'ETHERNET',
          nombre_adaptador TEXT,
          es_principal BOOLEAN DEFAULT FALSE,
          creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT uq_interface_equipo_mac UNIQUE (equipo_id, mac)
        )
      `);
      await run(`CREATE INDEX IF NOT EXISTS idx_interfaces_mac ON interfaces_red(mac)`);

      // 2. Dispositivos de Red (Nodos de monitoreo por segmento)
      await run(`
        CREATE TABLE IF NOT EXISTS dispositivos_red (
          id TEXT PRIMARY KEY,
          red_id TEXT NOT NULL REFERENCES redes(id) ON DELETE CASCADE,
          ip TEXT NOT NULL,
          mac_actual TEXT,
          hostname_actual TEXT,
          fabricante_actual TEXT,
          tipo_mac TEXT DEFAULT 'UNIVERSAL',
          interfaz_id UUID REFERENCES interfaces_red(id) ON DELETE SET NULL,
          rol TEXT DEFAULT 'ENDPOINT',
          estado_monitoreo TEXT NOT NULL DEFAULT 'UNKNOWN',
          fallos_consecutivos INTEGER NOT NULL DEFAULT 0,
          latencia_actual_ms INTEGER,
          primer_descubrimiento TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          ultimo_visto_online TIMESTAMPTZ,
          inicio_estado_actual TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          ultimo_cambio_estado TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          es_infraestructura BOOLEAN DEFAULT FALSE,
          es_ignorado BOOLEAN DEFAULT FALSE,
          notas TEXT,
          CONSTRAINT uq_dispositivos_red_segmento_ip UNIQUE (red_id, ip)
        )
      `);
      await run(`CREATE INDEX IF NOT EXISTS idx_disp_red_estado ON dispositivos_red(red_id, estado_monitoreo)`);
      await run(`CREATE INDEX IF NOT EXISTS idx_disp_red_mac ON dispositivos_red(mac_actual)`);

      // 3. Observaciones de Red (Buffer de evidencias)
      await run(`
        CREATE TABLE IF NOT EXISTS observaciones_red (
          id BIGSERIAL PRIMARY KEY,
          dispositivo_id TEXT NOT NULL REFERENCES dispositivos_red(id) ON DELETE CASCADE,
          fecha TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          evidencias JSONB NOT NULL,
          latencia_ms INTEGER,
          canary_ok BOOLEAN NOT NULL DEFAULT TRUE
        )
      `);
      await run(`CREATE INDEX IF NOT EXISTS idx_obs_disp_fecha ON observaciones_red(dispositivo_id, fecha DESC)`);

      // 4. Eventos de Red
      await run(`
        CREATE TABLE IF NOT EXISTS eventos_red (
          id BIGSERIAL PRIMARY KEY,
          red_id TEXT NOT NULL REFERENCES redes(id) ON DELETE CASCADE,
          dispositivo_id TEXT REFERENCES dispositivos_red(id) ON DELETE SET NULL,
          tipo_evento TEXT NOT NULL,
          severidad TEXT NOT NULL DEFAULT 'INFO',
          descripcion TEXT NOT NULL,
          detalles_json JSONB,
          leido BOOLEAN DEFAULT FALSE,
          creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await run(`CREATE INDEX IF NOT EXISTS idx_eventos_red_fecha ON eventos_red(red_id, creado_en DESC)`);

      // 5. Métricas de Disponibilidad
      await run(`
        CREATE TABLE IF NOT EXISTS metricas_disponibilidad (
          id BIGSERIAL PRIMARY KEY,
          dispositivo_id TEXT NOT NULL REFERENCES dispositivos_red(id) ON DELETE CASCADE,
          inicio_caida TIMESTAMPTZ NOT NULL,
          fin_caida TIMESTAMPTZ,
          duracion_segundos INTEGER
        )
      `);
      await run(`CREATE INDEX IF NOT EXISTS idx_metricas_disp_disp ON metricas_disponibilidad(dispositivo_id, inicio_caida DESC)`);

    } else {
      // --- SQLITE (Compatibilidad fallback) ---
      await run(`
        CREATE TABLE IF NOT EXISTS interfaces_red (
          id TEXT PRIMARY KEY,
          equipo_id TEXT NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
          mac TEXT NOT NULL,
          tipo_interfaz TEXT NOT NULL DEFAULT 'ETHERNET',
          nombre_adaptador TEXT,
          es_principal INTEGER DEFAULT 0,
          creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (equipo_id, mac)
        )
      `);

      await run(`
        CREATE TABLE IF NOT EXISTS dispositivos_red (
          id TEXT PRIMARY KEY,
          red_id TEXT NOT NULL REFERENCES redes(id) ON DELETE CASCADE,
          ip TEXT NOT NULL,
          mac_actual TEXT,
          hostname_actual TEXT,
          fabricante_actual TEXT,
          tipo_mac TEXT DEFAULT 'UNIVERSAL',
          interfaz_id TEXT REFERENCES interfaces_red(id) ON DELETE SET NULL,
          rol TEXT DEFAULT 'ENDPOINT',
          estado_monitoreo TEXT NOT NULL DEFAULT 'UNKNOWN',
          fallos_consecutivos INTEGER NOT NULL DEFAULT 0,
          latencia_actual_ms INTEGER,
          primer_descubrimiento DATETIME DEFAULT CURRENT_TIMESTAMP,
          ultimo_visto_online DATETIME,
          inicio_estado_actual DATETIME DEFAULT CURRENT_TIMESTAMP,
          ultimo_cambio_estado DATETIME DEFAULT CURRENT_TIMESTAMP,
          es_infraestructura INTEGER DEFAULT 0,
          es_ignorado INTEGER DEFAULT 0,
          notas TEXT,
          UNIQUE (red_id, ip)
        )
      `);

      await run(`
        CREATE TABLE IF NOT EXISTS observaciones_red (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          dispositivo_id TEXT NOT NULL REFERENCES dispositivos_red(id) ON DELETE CASCADE,
          fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
          evidencias TEXT NOT NULL,
          latencia_ms INTEGER,
          canary_ok INTEGER DEFAULT 1
        )
      `);

      await run(`
        CREATE TABLE IF NOT EXISTS eventos_red (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          red_id TEXT NOT NULL REFERENCES redes(id) ON DELETE CASCADE,
          dispositivo_id TEXT REFERENCES dispositivos_red(id) ON DELETE SET NULL,
          tipo_evento TEXT NOT NULL,
          severidad TEXT NOT NULL DEFAULT 'INFO',
          descripcion TEXT NOT NULL,
          detalles_json TEXT,
          leido INTEGER DEFAULT 0,
          creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await run(`
        CREATE TABLE IF NOT EXISTS metricas_disponibilidad (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          dispositivo_id TEXT NOT NULL REFERENCES dispositivos_red(id) ON DELETE CASCADE,
          inicio_caida DATETIME NOT NULL,
          fin_caida DATETIME,
          duracion_segundos INTEGER
        )
      `);
    }
  },

  down: async (db: any, run: any) => {
    await run(`DROP TABLE IF EXISTS metricas_disponibilidad`);
    await run(`DROP TABLE IF EXISTS eventos_red`);
    await run(`DROP TABLE IF EXISTS observaciones_red`);
    await run(`DROP TABLE IF EXISTS dispositivos_red`);
    await run(`DROP TABLE IF EXISTS interfaces_red`);
  }
};
