import { NetworkNodeState, EvidenceSet, StateTransitionResult } from './probes/types';

export interface StateEvaluationInput {
  currentState: NetworkNodeState;
  consecutiveFailures: number;
  evidenceSet: EvidenceSet;
  canaryHealthy: boolean;
  offlineThreshold?: number; // Por defecto 3 fallos consecutivos
  nodeIdentifier?: string;   // IP o INE para los mensajes de log/evento
}

export class NetworkStateMachine {
  private static readonly DEFAULT_OFFLINE_THRESHOLD = 2;

  /**
   * Función pura de evaluación de transiciones de estado.
   * Totalmente desacoplada de la ejecución de sondas y de la base de datos.
   */
  static transition(input: StateEvaluationInput): StateTransitionResult {
    const {
      currentState,
      consecutiveFailures,
      evidenceSet,
      canaryHealthy,
      offlineThreshold = this.DEFAULT_OFFLINE_THRESHOLD,
      nodeIdentifier = evidenceSet.targetIp
    } = input;

    // 1. Estado de Mantenimiento tiene precedencia administrativa
    if (currentState === 'MAINTENANCE') {
      return {
        previousState: currentState,
        nextState: 'MAINTENANCE',
        consecutiveFailures: 0,
        stateChanged: false,
        reason: 'El nodo se encuentra en mantenimiento administrativo programado.'
      };
    }

    if (evidenceSet.hasL3Response || evidenceSet.hasL4Activity) {
      const stateChanged = currentState !== 'ONLINE';
      return {
        previousState: currentState,
        nextState: 'ONLINE',
        consecutiveFailures: 0,
        stateChanged,
        reason: `Evidencia L3/L4 confirmada: ${evidenceSet.summary}`,
        eventToEmit: stateChanged && currentState !== 'UNKNOWN'
          ? {
              type: 'RECUPERACION',
              severity: 'INFO',
              message: `Dispositivo ${nodeIdentifier} recuperó conectividad (ONLINE).`,
              details: {
                targetIp: evidenceSet.targetIp,
                minRttMs: evidenceSet.minRttMs,
                evidences: evidenceSet.evidences.filter(e => e.positive).map(e => e.name)
              }
            }
          : undefined
      };
    }
    if (evidenceSet.hasL2Presence && evidenceSet.positiveCount > 0) {
      if (evidenceSet.hasL2Presence && !evidenceSet.hasL3Response && !evidenceSet.hasL4Activity) {
        const newFailures = consecutiveFailures + 1;
        if (newFailures < offlineThreshold) {
          return {
            previousState: currentState,
            nextState: 'WARNING' as NetworkNodeState,
            consecutiveFailures: newFailures,
            stateChanged: currentState !== 'WARNING',
            reason: `Solo ARP sin L3/L4 (${newFailures}/${offlineThreshold}) -> WARNING`
          };
        }
        return {
          previousState: currentState,
          nextState: 'OFFLINE' as NetworkNodeState,
          consecutiveFailures: newFailures,
          stateChanged: currentState !== 'OFFLINE',
          reason: `Solo ARP sin L3/L4 (${newFailures}/${offlineThreshold}) -> OFFLINE`,
          eventToEmit: currentState !== 'UNKNOWN' ? { type: 'CAIDA' as const, severity: 'CRITICAL' as const, message: `Dispositivo ${nodeIdentifier} OFFLINE tras ${newFailures} ciclos solo-ARP`, details: { targetIp: evidenceSet.targetIp, consecutiveFailures: newFailures } } : undefined
        };
      }
      return {
        previousState: currentState,
        nextState: currentState === 'ONLINE' ? currentState : 'WARNING',
        consecutiveFailures: 0,
        stateChanged: false,
        reason: `Solo presencia L2 (ARP) sin respuesta L3/L4: se mantiene estado, no se confirma ONLINE`
      };
    }

    // 3. Caso Negativo: Cero evidencias positivas
    // 3.1. Protección Canary: Si el monitor perdió su propio gateway, NO acusar al cliente
    if (!canaryHealthy) {
      return {
        previousState: currentState,
        nextState: currentState === 'ONLINE' ? 'WARNING' : currentState,
        consecutiveFailures,
        stateChanged: false,
        reason: 'Evaluación de caída suspendida: El Canary del servidor reportó degradación de conectividad local.'
      };
    }

    // 3.2. Progresión con Canary saludable
    const newFailures = consecutiveFailures + 1;

    if (newFailures < offlineThreshold) {
      // Estado Intermedio: WARNING / INESTABLE (antirrebote / histeresis)
      const stateChanged = currentState !== 'WARNING';
      return {
        previousState: currentState,
        nextState: 'WARNING',
        consecutiveFailures: newFailures,
        stateChanged,
        reason: `Sin respuesta en sondeo actual (${newFailures}/${offlineThreshold} fallos consecutivos). Estado WARNING.`,
        eventToEmit: stateChanged && currentState === 'ONLINE'
          ? {
              type: 'INESTABILIDAD',
              severity: 'WARNING',
              message: `Dispositivo ${nodeIdentifier} no respondió en ciclo actual. En observación preventiva.`,
              details: {
                targetIp: evidenceSet.targetIp,
                consecutiveFailures: newFailures
              }
            }
          : undefined
      };
    }

    // Umbral de fallos consecutivos alcanzado: OFFLINE confirmado
    const stateChanged = currentState !== 'OFFLINE';
    return {
      previousState: currentState,
      nextState: 'OFFLINE',
      consecutiveFailures: newFailures,
      stateChanged,
      reason: `Caída confirmada tras ${newFailures} fallos consecutivos con Canary local operativo.`,
      eventToEmit: stateChanged && currentState !== 'UNKNOWN'
        ? {
            type: 'CAIDA',
            severity: 'CRITICAL',
            message: `Dispositivo ${nodeIdentifier} declarado OFFLINE (${newFailures} fallos consecutivos).`,
            details: {
              targetIp: evidenceSet.targetIp,
              consecutiveFailures: newFailures,
              lastChecked: evidenceSet.evaluatedAt
            }
          }
        : undefined
    };
  }
}
