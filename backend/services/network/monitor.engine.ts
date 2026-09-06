const db = require('../../db/database');
const logger = require('../../utils/logger');
import { ChainedScheduler } from './chained.scheduler';
import { CanaryProbe } from './probes/canary.probe';
import { ArpProbe } from './probes/arp.probe';
import { IcmpProbe } from './probes/icmp.probe';
import { TcpConnectProbe } from './probes/tcp.probe';
import { EvidenceEngine } from './evidence.engine';
import { NetworkStateMachine } from './state.machine';
import { RawProbeResult } from './probes/types';

export class NetworkMonitorEngine {
  private static scheduler: ChainedScheduler | null = null;
  private static ioInstance: any = null;
  private static cycleIntervalMs = 10000;

  static setIO(io: any) {
    this.ioInstance = io;
  }

  static start(intervalMs = 10000) {
    if (this.scheduler) return;
    this.cycleIntervalMs = intervalMs;

    this.scheduler = new ChainedScheduler(
      'NetworkMonitorEngine',
      this.cycleIntervalMs,
      async () => {
        await this.runCycle();
      }
    );

    this.scheduler.start();
  }

  /**
   * Detiene el demonio de monitorización.
   */
  static stop() {
    if (this.scheduler) {
      this.scheduler.stop();
      this.scheduler = null;
    }
  }

  /**
   * Ejecuta un ciclo único de monitorización sobre todos los dispositivos registrados.
   */
  private static async runCycle() {
    try {
      // 1. Obtener redes activas y sus gateways para comprobación Canary
      const redes = await db.all('SELECT id, gateway FROM redes');
      const primaryGateway = redes.find((r: any) => r.gateway)?.gateway || null;

      // 2. Comprobación Canary Multi-vectorial de salud del servidor
      const canary = await CanaryProbe.checkHealth(primaryGateway);
      if (!canary.isHealthy) {
        logger.warn({ detail: canary.detail }, '[Monitor] Canary degradado: suspendiendo transiciones a OFFLINE');
      }

      // 3. Obtener nodos a monitorizar (no ignorados)
      const nodes = await db.all(`
        SELECT d.*, r.gateway
        FROM dispositivos_red d
        JOIN redes r ON d.red_id = r.id
        WHERE d.es_ignorado = FALSE
      `);

      if (nodes.length === 0) return;

      // 4. Lectura única y rápida de tabla ARP
      const arpTable = await ArpProbe.readArpTable();

      // 5. Sondeo concurrente limitado (16 hosts simultáneos)
      const concurrencyLimit = 16;
      for (let i = 0; i < nodes.length; i += concurrencyLimit) {
        const chunk = nodes.slice(i, i + concurrencyLimit);

        await Promise.all(
          chunk.map(async (node: any) => {
            await this.probeAndEvaluateNode(node, arpTable, canary.isHealthy);
          })
        );
      }
    } catch (err: any) {
      logger.error({ err: err?.message || err }, '[Monitor] Error en ciclo de monitorización');
    }
  }

  /**
   * Ejecuta las sondas, construye el EvidenceSet y transiciona el nodo.
   */
  private static async probeAndEvaluateNode(node: any, arpTable: Map<string, any>, canaryHealthy: boolean) {
    const rawResults: RawProbeResult[] = [];

    // Sonda 1: ARP
    const arpResult = await ArpProbe.probeIp(node.ip, arpTable);
    rawResults.push(arpResult);

    // Sonda 2: ICMP Echo
    const icmpResult = await IcmpProbe.probeIp(node.ip, 700);
    rawResults.push(icmpResult);

    // Sonda 3: TCP Connect a puertos representativos
    if (!icmpResult.success) {
      const tcpChecks = await TcpConnectProbe.probePorts(node.ip, [445, 135, 80], 700);
      rawResults.push(...tcpChecks);
    }

    // Evaluación en EvidenceEngine
    const evidenceSet = EvidenceEngine.evaluate(node.ip, rawResults, {
      isLocalSubnet: true,
      canaryHealthy
    });

    // Transición en StateMachine
    const transition = NetworkStateMachine.transition({
      currentState: node.estado_monitoreo,
      consecutiveFailures: node.fallos_consecutivos,
      evidenceSet,
      canaryHealthy,
      offlineThreshold: 2,
      nodeIdentifier: `${node.hostname_actual || node.ip}`
    });

    // Si hubo cambio de estado o si se debe actualizar telemetría
    const now = new Date().toISOString();

    if (transition.stateChanged || transition.nextState === 'ONLINE') {
      await db.run(
        `UPDATE dispositivos_red
         SET estado_monitoreo = ?,
             fallos_consecutivos = ?,
             latencia_actual_ms = ?,
             ultimo_visto_online = CASE WHEN ? = 'ONLINE' THEN CURRENT_TIMESTAMP ELSE ultimo_visto_online END,
             ultimo_cambio_estado = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE ultimo_cambio_estado END,
             inicio_estado_actual = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE inicio_estado_actual END
         WHERE id = ?`,
        [
          transition.nextState,
          transition.consecutiveFailures,
          evidenceSet.minRttMs,
          transition.nextState,
          transition.stateChanged,
          transition.stateChanged,
          node.id
        ]
      );

      // Si cayó a OFFLINE: Registrar inicio de indisponibilidad
      if (transition.stateChanged && transition.nextState === 'OFFLINE') {
        await db.run(
          'INSERT INTO metricas_disponibilidad (dispositivo_id, inicio_caida) VALUES (?, CURRENT_TIMESTAMP)',
          [node.id]
        );
      }

      // Si recuperó a ONLINE desde OFFLINE: Cerrar periodo de caída
      if (transition.stateChanged && transition.nextState === 'ONLINE' && node.estado_monitoreo === 'OFFLINE') {
        const openPeriod = await db.get(
          'SELECT id, inicio_caida FROM metricas_disponibilidad WHERE dispositivo_id = ? AND fin_caida IS NULL ORDER BY inicio_caida DESC',
          [node.id]
        );
        if (openPeriod) {
          const inicio = new Date(openPeriod.inicio_caida).getTime();
          const duracionSec = Math.max(0, Math.round((Date.now() - inicio) / 1000));
          await db.run(
            'UPDATE metricas_disponibilidad SET fin_caida = CURRENT_TIMESTAMP, duracion_segundos = ? WHERE id = ?',
            [duracionSec, openPeriod.id]
          );
        }
      }

      // Registrar evento si corresponde
      if (transition.eventToEmit) {
        await db.run(
          `INSERT INTO eventos_red (red_id, dispositivo_id, tipo_evento, severidad, descripcion, detalles_json)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            node.red_id,
            node.id,
            transition.eventToEmit.type,
            transition.eventToEmit.severity,
            transition.eventToEmit.message,
            JSON.stringify(transition.eventToEmit.details || {})
          ]
        );
      }

      // Emitir cambio de estado por Socket.IO en tiempo real
      if (this.ioInstance) {
        this.ioInstance.to(`network:${node.red_id}`).emit('network:node_changed', {
          dispositivoId: node.id,
          ip: node.ip,
          mac: node.mac_actual,
          hostname: node.hostname_actual,
          estadoAnterior: node.estado_monitoreo,
          nuevoEstado: transition.nextState,
          fallosConsecutivos: transition.consecutiveFailures,
          latenciaMs: evidenceSet.minRttMs,
          summary: evidenceSet.summary,
          timestamp: now
        });
      }
    }
  }

  static getTelemetry() {
    return this.scheduler ? this.scheduler.getTelemetry() : { isRunning: false };
  }
}
