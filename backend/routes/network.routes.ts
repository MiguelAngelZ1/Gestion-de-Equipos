const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { PERMISOS } = require('../config/constants');
const { verificarAutenticacion, requirePermission } = require('../middleware/auth.middleware');
const { ipamLimiter } = require('../utils/rateLimiter');
import { DiscoveryEngine } from '../services/network/discovery.engine';
import { NetworkMonitorEngine } from '../services/network/monitor.engine';
import { ReconciliationService } from '../services/network/reconciliation.service';
import { CanaryProbe } from '../services/network/probes/canary.probe';
import { NetworkBenchmarkService } from '../services/network/benchmark.service';

/**
 * Middleware para validar que la red existe y el usuario tiene acceso
 */
async function validarRedId(req: any, res: any, next: any) {
  try {
    const redId = req.params.redId;
    if (!redId) return res.status(400).json({ error: 'Parámetro redId requerido.' });
    if (String(redId).startsWith('auto-')) return next();
    const red = await db.get('SELECT id FROM redes WHERE id = ?', [redId]);
    if (!red) return res.status(404).json({ error: 'La red especificada no existe.' });
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/network/redes/:redId/dispositivos
 * Lista los dispositivos descubiertos y monitoreados con su cruce de inventario
 */
router.get(
  '/redes/:redId/dispositivos',
  verificarAutenticacion,
  validarRedId,
  async (req: any, res: any, next: any) => {
    try {
      const redId = req.params.redId;
      const dispositivos = await db.all(
        `SELECT d.*, 
                e.id as equipo_id, e.ine as equipo_ine, e.serie as equipo_serie,
                gc.nombre as equipo_tipo,
                COALESCE(u.nombre, u.ubicacion) as equipo_ubicacion,
                TRIM(COALESCE(r.grado, '') || ' ' || COALESCE(r.nombre, '') || ' ' || COALESCE(r.apellido, '')) as equipo_responsable,
                est.nombre as equipo_estado, est.color_hex as equipo_color
         FROM dispositivos_red d
         LEFT JOIN interfaces_red ir ON d.interfaz_id = ir.id
         LEFT JOIN equipos e ON ir.equipo_id = e.id AND e.is_deleted = 0
         LEFT JOIN grupos_comodidad gc ON e.categoria_id = gc.id
         LEFT JOIN ubicaciones u ON e.ubicacion_id = u.id
         LEFT JOIN responsables r ON e.responsable_id = r.id
         LEFT JOIN estados est ON e.estado_id = est.id
         WHERE d.red_id = ?
         ORDER BY d.ip ASC`,
        [redId]
      );

      res.json(dispositivos);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/network/redes/:redId/scan
 * Dispara un barrido de descubrimiento asíncrono con control de concurrencia y streaming WebSocket
 */
router.post(
  '/redes/:redId/scan',
  ipamLimiter,
  verificarAutenticacion,
  requirePermission(PERMISOS.IPAM.SCAN),
  validarRedId,
  async (req: any, res: any, next: any) => {
    try {
      const redId = req.params.redId;
      const io = req.app.get('io');

      // Iniciar el escaneo en segundo plano para no bloquear la respuesta HTTP
      DiscoveryEngine.scanSubnet(redId, { io }).catch((err: any) => {
        if (io) {
          io.to(`network:${redId}`).emit('network:scan_error', { redId, message: err.message });
        }
      });

      res.status(202).json({
        message: 'Descubrimiento de red iniciado en segundo plano.',
        redId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/network/redes/:redId/eventos
 * Consulta el historial de eventos de la red (cambios de IP, MACs, caídas, etc.)
 */
router.get(
  '/redes/:redId/eventos',
  verificarAutenticacion,
  requirePermission(PERMISOS.IPAM.VER),
  validarRedId,
  async (req: any, res: any, next: any) => {
    try {
      const redId = req.params.redId;
      const limit = Math.min(100, parseInt(req.query.limit || '50', 10));
      const eventos = await db.all(
        `SELECT * FROM eventos_red WHERE red_id = ? ORDER BY creado_en DESC LIMIT ?`,
        [redId, limit]
      );
      res.json(eventos);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/network/vincular
 * Vincula un nodo descubierto con un equipo de inventario
 */
router.post(
  '/vincular',
  ipamLimiter,
  verificarAutenticacion,
  requirePermission(PERMISOS.IPAM.ASIGNAR),
  async (req: any, res: any, next: any) => {
    try {
      const { dispositivoId, equipoId } = req.body;
      if (!dispositivoId || !equipoId) {
        return res.status(400).json({ error: 'dispositivoId y equipoId son obligatorios.' });
      }

      await ReconciliationService.linkToEquipo(dispositivoId, equipoId);
      res.json({ success: true, message: 'Dispositivo vinculado al inventario correctamente.' });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/dispositivos/:id/alias',
  ipamLimiter,
  verificarAutenticacion,
  requirePermission(PERMISOS.IPAM.ASIGNAR),
  async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params;
      const { alias } = req.body;
      await ReconciliationService.updateAlias(id, alias);
      const updated = await db.get('SELECT * FROM dispositivos_red WHERE id = ?', [id]);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/tracert/:ip',
  verificarAutenticacion,
  requirePermission(PERMISOS.IPAM.VER),
  async (req: any, res: any, next: any) => {
    try {
      const ip = String(req.params.ip || '').trim();
      if (!ip) return res.status(400).json({ error: 'IP requerida.' });
      const { execFile } = require('child_process');
      const isWin = process.platform === 'win32';
      const cmd = isWin ? 'tracert' : 'traceroute';
      const args = isWin ? ['-d', '-h', '15', ip] : ['-m', '15', '-n', ip];
      execFile(cmd, args, { timeout: 15000, encoding: 'utf8' }, (err: any, stdout: string, stderr: string) => {
        if (err && !stdout) return res.status(500).json({ error: stderr || err.message, output: '' });
        res.json({ ip, output: stdout || stderr });
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/ping/:ip',
  verificarAutenticacion,
  requirePermission(PERMISOS.IPAM.VER),
  async (req: any, res: any, next: any) => {
    try {
      const ip = String(req.params.ip || '').trim();
      if (!ip) return res.status(400).json({ error: 'IP requerida.' });
      const { execFile } = require('child_process');
      const isWin = process.platform === 'win32';
      const fast = req.query.fast === '1' || req.query.single === '1';
      const args = isWin ? (fast ? ['-n', '1', '-w', '800', ip] : ['-n', '4', ip]) : (fast ? ['-c', '1', '-W', '1', ip] : ['-c', '4', ip]);
      execFile('ping', args, { timeout: fast ? 2000 : 10000, encoding: 'utf8' }, (_err: any, stdout: string, stderr: string) => {
        const output = (stdout || stderr || '').trim();
        if (!output) return res.status(500).json({ error: 'Sin salida de ping' });
        res.json({ ip, output });
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/ping-stream/:ip',
  verificarAutenticacion,
  requirePermission(PERMISOS.IPAM.VER),
  async (req: any, res: any, next: any) => {
    try {
      const ip = String(req.params.ip || '').trim();
      if (!ip || !/^[\d.]+$/.test(ip)) return res.status(400).json({ error: 'IP requerida.' });
      const { execFile } = require('child_process');
      const isWin = process.platform === 'win32';
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('X-Accel-Buffering', 'no');
      res.write(`Haciendo ping a ${ip} con 32 bytes de datos:\n`);
      let closed = false;
      req.on('close', () => { closed = true; try { res.end(); } catch {} });
      const tick = () => {
        if (closed) return;
        const args = isWin ? ['-n', '1', '-w', '1000', ip] : ['-c', '1', '-W', '1', ip];
        execFile('ping', args, { timeout: 2000, encoding: 'utf8' }, (_e: any, stdout: string, stderr: string) => {
          if (closed) return;
          const out = (stdout || stderr || '').trim();
          const line = out.split('\n').find(l => /Respuesta|Reply|bytes=|TTL|tiempo|time/i.test(l)) || (out.includes('100%') || out.includes('perdidos') || /100% packet loss|unreachable/i.test(out) ? 'Tiempo de espera agotado para esta solicitud.' : out.split('\n').pop() || '');
          try { res.write((line.trim() ? line.trim() : 'Sin respuesta') + '\n'); } catch {}
        });
      };
      tick();
      const iv = setInterval(tick, 1000);
      req.on('close', () => clearInterval(iv));
    } catch (error) { next(error); }
  }
);

router.get(
  '/mi-red',
  verificarAutenticacion,
  async (req: any, res: any, next: any) => {
    try {
      const raw = (req.ip || req.socket.remoteAddress || '').toString();
      let ip = raw.replace('::ffff:', '').split(',')[0].trim();
      const isV4 = (s: string) => /^(\d{1,3}\.){3}\d{1,3}$/.test(s) && s.split('.').every(n => { const v = Number(n); return v >= 0 && v <= 255; });
      const isLoopback = (s: string) => s.startsWith('127.') || s === '::1' || s === '::ffff:127.0.0.1';
      if (!isV4(ip) || isLoopback(ip)) {
        const os = require('os');
        const ifaces = os.networkInterfaces();
        let fallback: string | null = null;
        for (const addrs of Object.values(ifaces) as any) {
          for (const a of addrs || []) {
            if (a.family === 'IPv4' && !a.internal && isV4(a.address)) { fallback = a.address; break; }
          }
          if (fallback) break;
        }
        if (fallback) ip = fallback;
        else return res.status(400).json({ error: 'No se pudo detectar la red del cliente. Agregue manualmente.' });
      }
      const parts = ip.split('.').map(Number);
      const segmento = `${parts[0]}.${parts[1]}.${parts[2]}.0`;
      const mascara = '255.255.255.0';
      const gateway = `${parts[0]}.${parts[1]}.${parts[2]}.1`;
      res.json({ ip, segmento, mascara, cidr: 24, gateway, dns: '8.8.8.8' });
    } catch (error) { next(error); }
  }
);

/**
 * GET /api/network/canary
 * Comprobación de salud multi-vectorial del servidor de monitorización
 */
router.get(
  '/canary',
  verificarAutenticacion,
  requirePermission(PERMISOS.IPAM.VER),
  async (req: any, res: any, next: any) => {
    try {
      const gateway = req.query.gateway as string | undefined;
      const health = await CanaryProbe.checkHealth(gateway);
      res.json(health);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/network/benchmark
 * Ejecuta una prueba de rendimiento estática para medir tiempos y memoria
 */
router.post(
  '/benchmark',
  ipamLimiter,
  verificarAutenticacion,
  requirePermission(PERMISOS.IPAM.SCAN),
  async (req: any, res: any, next: any) => {
    try {
      const { ips, concurrencyLimit, timeoutMs } = req.body;
      if (!Array.isArray(ips) || ips.length === 0) {
        return res.status(400).json({ error: 'Se requiere un arreglo de IPs para el benchmark.' });
      }

      const metrics = await NetworkBenchmarkService.runBenchmark(ips, concurrencyLimit, timeoutMs);
      res.json(metrics);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/network/telemetria
 * Retorna telemetría del scheduler encadenado
 */
router.get(
  '/telemetria',
  verificarAutenticacion,
  requirePermission(PERMISOS.IPAM.VER),
  async (req: any, res: any, next: any) => {
    try {
      res.json(NetworkMonitorEngine.getTelemetry());
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
