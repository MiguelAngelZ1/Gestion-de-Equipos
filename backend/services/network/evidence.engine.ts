import { RawProbeResult, Evidence, EvidenceSet } from './probes/types';

export interface EvaluationContext {
  isLocalSubnet: boolean;
  canaryHealthy: boolean;
}

export class EvidenceEngine {
  /**
   * Transforma resultados crudos de sondas en un conjunto de evidencias normalizado,
   * ponderado y explicable.
   */
  static evaluate(targetIp: string, rawResults: RawProbeResult[], context: EvaluationContext): EvidenceSet {
    const evidences: Evidence[] = [];
    let hasL2Presence = false;
    let hasL3Response = false;
    let hasL4Activity = false;
    let minRttMs: number | null = null;

    for (const raw of rawResults) {
      if (raw.rttMs !== null) {
        if (minRttMs === null || raw.rttMs < minRttMs) {
          minRttMs = raw.rttMs;
        }
      }

      switch (raw.probeType) {
        case 'ARP': {
          if (raw.success && raw.metadata?.mac) {
            hasL2Presence = true;
            evidences.push({
              name: 'Presencia ARP en Capa 2',
              probeType: 'ARP',
              positive: true,
              // En subred local la presencia ARP es alta; si es remota, ARP no aplica
              confidence: context.isLocalSubnet ? 'HIGH' : 'LOW',
              rttMs: null,
              detail: `MAC ${raw.metadata.mac} observable en tabla ARP local (${raw.metadata.entryType || 'dynamic'})`
            });
          } else {
            evidences.push({
              name: 'Ausencia en tabla ARP',
              probeType: 'ARP',
              positive: false,
              confidence: context.isLocalSubnet ? 'MEDIUM' : 'LOW',
              rttMs: null,
              detail: raw.detail || 'Sin entrada en tabla ARP'
            });
          }
          break;
        }

        case 'ICMP': {
          if (raw.success) {
            hasL3Response = true;
            evidences.push({
              name: 'Respuesta ICMP Echo',
              probeType: 'ICMP',
              positive: true,
              confidence: 'HIGH',
              rttMs: raw.rttMs,
              detail: `Echo reply recibido en ${raw.rttMs} ms`
            });
          } else {
            evidences.push({
              name: 'Sin respuesta ICMP Echo',
              probeType: 'ICMP',
              positive: false,
              // Un fallo de ping tiene baja confianza de offline porque el firewall puede bloquearlo
              confidence: 'LOW',
              rttMs: null,
              detail: 'Sin respuesta ICMP (posible bloqueo por firewall de software o host inactivo)'
            });
          }
          break;
        }

        case 'TCP_CONNECT': {
          const status = raw.metadata?.tcpStatus;
          if (status === 'ACCEPTED') {
            hasL4Activity = true;
            evidences.push({
              name: `Conexión TCP Establecida (Puerto ${raw.targetPort})`,
              probeType: 'TCP_CONNECT',
              positive: true,
              confidence: 'HIGH',
              rttMs: raw.rttMs,
              detail: `Puerto ${raw.targetPort} abierto y aceptando conexiones (${raw.rttMs} ms)`
            });
          } else if (status === 'REFUSED_RST') {
            // Rechazo activo con RST: Pila de red viva, pero puede provenir del host o de un firewall intermedio
            hasL4Activity = true;
            evidences.push({
              name: `Rechazo Activo TCP RST (Puerto ${raw.targetPort})`,
              probeType: 'TCP_CONNECT',
              positive: true,
              confidence: 'MEDIUM',
              rttMs: raw.rttMs,
              detail: `Paquete RST recibido en puerto ${raw.targetPort}. Pila IP activa (host o firewall de segmento)`
            });
          } else {
            evidences.push({
              name: `Sin respuesta TCP en Puerto ${raw.targetPort}`,
              probeType: 'TCP_CONNECT',
              positive: false,
              confidence: 'LOW',
              rttMs: null,
              detail: `Timeout o puerto filtrado en ${raw.targetPort}`
            });
          }
          break;
        }

        case 'NETBIOS': {
          if (raw.success && raw.metadata?.hostname) {
            hasL4Activity = true;
            evidences.push({
              name: 'Respuesta NetBIOS Name Service (UDP 137)',
              probeType: 'NETBIOS',
              positive: true,
              confidence: 'HIGH',
              rttMs: raw.rttMs,
              detail: `Hostname NetBIOS resuelto: "${raw.metadata.hostname}"`
            });
          }
          break;
        }
      }
    }

    const positiveCount = evidences.filter(e => e.positive).length;

    // Generar resumen explicativo en lenguaje técnico claro
    let summary = '';
    if (positiveCount > 0) {
      const positiveDetails = evidences
        .filter(e => e.positive)
        .map(e => `${e.probeType} (${e.confidence})`)
        .join(', ');
      summary = `Actividad confirmada vía: ${positiveDetails}${minRttMs !== null ? ` | RTT mín: ${minRttMs} ms` : ''}`;
    } else {
      summary = 'Todas las sondas fallaron o fueron descartadas silenciosamente.';
    }

    return {
      targetIp,
      evaluatedAt: new Date(),
      evidences,
      hasL2Presence,
      hasL3Response,
      hasL4Activity,
      positiveCount,
      minRttMs,
      summary
    };
  }
}
