-- Supabase Schema for Control de Equipos 3.0
-- Run this in Supabase SQL Editor

-- Migrations tracking
CREATE TABLE IF NOT EXISTS _migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TIMESTAMP DEFAULT NOW()
);

-- Core tables
CREATE TABLE IF NOT EXISTS equipos (
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
);

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  usuario TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol TEXT DEFAULT 'USER',
  permisos_json TEXT DEFAULT '[]',
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS soporte_tareas (
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
);

CREATE TABLE IF NOT EXISTS componentes_repuestos (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  cantidad INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS componentes_instalados (
  id SERIAL PRIMARY KEY,
  equipo_id TEXT NOT NULL,
  nombre TEXT NOT NULL,
  fecha_instalacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS responsables (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  activo INTEGER DEFAULT 1,
  grado TEXT,
  grado_id INTEGER
);

CREATE TABLE IF NOT EXISTS ubicaciones (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  ubicacion TEXT
);

CREATE TABLE IF NOT EXISTS estados (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  color_hex TEXT DEFAULT '#10b981'
);

CREATE TABLE IF NOT EXISTS grados (
  id SERIAL PRIMARY KEY,
  abreviatura TEXT NOT NULL UNIQUE,
  grado_completo TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS grupos_comodidad (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS prestamos (
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
);

CREATE TABLE IF NOT EXISTS especificaciones (
  id SERIAL PRIMARY KEY,
  equipo_id TEXT NOT NULL,
  clave TEXT NOT NULL,
  valor TEXT NOT NULL,
  FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS especificaciones_repuestos (
  id SERIAL PRIMARY KEY,
  repuesto_id INTEGER NOT NULL,
  clave TEXT NOT NULL,
  valor TEXT NOT NULL,
  FOREIGN KEY (repuesto_id) REFERENCES componentes_repuestos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS historial_personal (
  id SERIAL PRIMARY KEY,
  equipo_id TEXT NOT NULL,
  responsable TEXT NOT NULL,
  evento TEXT NOT NULL,
  estado_anterior TEXT,
  estado_nuevo TEXT,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notas TEXT,
  FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS movimientos_stock (
  id SERIAL PRIMARY KEY,
  repuesto_id INTEGER NOT NULL,
  tipo TEXT NOT NULL,
  cantidad INTEGER NOT NULL,
  equipo_id TEXT,
  soporte_id INTEGER,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notas TEXT,
  FOREIGN KEY (repuesto_id) REFERENCES componentes_repuestos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS redes (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  segmento TEXT NOT NULL,
  mascara TEXT NOT NULL,
  gateway TEXT,
  dns TEXT,
  vlan INTEGER
);

CREATE TABLE IF NOT EXISTS ips_reservadas (
  id SERIAL PRIMARY KEY,
  red_id TEXT NOT NULL,
  ip TEXT NOT NULL,
  notas TEXT,
  FOREIGN KEY (red_id) REFERENCES redes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mensajes_admin (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER,
  remitente TEXT,
  mensaje TEXT NOT NULL,
  leido INTEGER DEFAULT 0,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alertas_notificaciones (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER,
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  tipo TEXT DEFAULT 'sistema',
  leido INTEGER DEFAULT 0,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER,
  subscription_json TEXT NOT NULL,
  device_info TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sync_metadata (
  id SERIAL PRIMARY KEY,
  clave TEXT UNIQUE,
  valor TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recuperacion_claves (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  codigo TEXT NOT NULL,
  expires TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sync_logs (
  id SERIAL PRIMARY KEY,
  tipo TEXT,
  direccion TEXT,
  equipos_creados INTEGER DEFAULT 0,
  equipos_actualizados INTEGER DEFAULT 0,
  equipos_eliminados INTEGER DEFAULT 0,
  errores TEXT,
  exitoso INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_especificaciones_equipo_id ON especificaciones(equipo_id);
CREATE INDEX IF NOT EXISTS idx_historial_personal_equipo_id ON historial_personal(equipo_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_stock_repuesto_id ON movimientos_stock(repuesto_id);
CREATE INDEX IF NOT EXISTS idx_especificaciones_repuestos_repuesto_id ON especificaciones_repuestos(repuesto_id);
CREATE INDEX IF NOT EXISTS idx_componentes_instalados_equipo_id ON componentes_instalados(equipo_id);
CREATE INDEX IF NOT EXISTS idx_soporte_tareas_equipo_id ON soporte_tareas(equipo_id);
CREATE INDEX IF NOT EXISTS idx_prestamos_equipo_id ON prestamos(equipo_id);
