import { describe, it, expect } from 'vitest';
import { OuiResolver } from '../services/network/probes/oui.resolver';
import { EvidenceEngine } from '../services/network/evidence.engine';
import { NetworkStateMachine } from '../services/network/state.machine';
import { RawProbeResult } from '../services/network/probes/types';

describe('Capa de Red V3 - Unit Tests', () => {

  describe('OuiResolver', () => {
    it('normaliza direcciones MAC en diversos formatos a XX:XX:XX:XX:XX:XX', () => {
      expect(OuiResolver.normalizeMac('00-09-0f-aa-bb-cc')).toBe('00:09:0F:AA:BB:CC');
      expect(OuiResolver.normalizeMac('00090faabbcc')).toBe('00:09:0F:AA:BB:CC');
      expect(OuiResolver.normalizeMac('invalid_mac')).toBeNull();
    });

    it('distingue correctamente direcciones LAA (Locally Administered) de Universales', () => {
      // 02:xx:xx... tiene el bit U/L activo (bit 1 de octeto 0 = 1) -> LAA
      const resLocal = OuiResolver.resolve('02:09:0F:11:22:33');
      expect(resLocal.tipoMac).toBe('LOCAL_ADMINISTERED');
      expect(resLocal.fabricante).toContain('LAA');

      // 00:09:0F... es Universal -> Fortinet
      const resFortinet = OuiResolver.resolve('00:09:0F:11:22:33');
      expect(resFortinet.tipoMac).toBe('UNIVERSAL');
      expect(resFortinet.fabricante).toBe('Fortinet, Inc.');
      expect(resFortinet.rolSugerido).toBe('GATEWAY');
    });

    it('identifica tarjetas de red virtuales sin catalogar al equipo como VM al 100%', () => {
      const resVm = OuiResolver.resolve('00:50:56:11:22:33'); // VMware
      expect(resVm.isVirtualNic).toBe(true);
      expect(resVm.fabricante).toBe('VMware, Inc.');
      expect(resVm.rolSugerido).toBe('POSIBLE_VIRTUAL');
    });
  });

  describe('EvidenceEngine', () => {
    it('pondera un rechazo activo TCP RST como evidencia MEDIA y no como host 100% infalible', () => {
      const rawResults: RawProbeResult[] = [
        {
          probeType: 'TCP_CONNECT',
          targetIp: '10.2.61.100',
          targetPort: 445,
          success: true,
          rttMs: 2,
          metadata: { tcpStatus: 'REFUSED_RST' }
        },
        {
          probeType: 'ICMP',
          targetIp: '10.2.61.100',
          success: false,
          rttMs: null
        }
      ];

      const evidenceSet = EvidenceEngine.evaluate('10.2.61.100', rawResults, {
        isLocalSubnet: true,
        canaryHealthy: true
      });

      expect(evidenceSet.positiveCount).toBe(1);
      expect(evidenceSet.hasL4Activity).toBe(true);
      const rstEvidence = evidenceSet.evidences.find(e => e.name.includes('RST'));
      expect(rstEvidence).toBeDefined();
      expect(rstEvidence?.confidence).toBe('MEDIUM');
    });
  });

  describe('NetworkStateMachine', () => {
    it('transiciona a ONLINE ante evidencia afirmativa y resetea fallos consecutivos', () => {
      const evidenceSet = {
        targetIp: '10.2.61.100',
        evaluatedAt: new Date(),
        evidences: [],
        hasL2Presence: true,
        hasL3Response: true,
        hasL4Activity: true,
        positiveCount: 2,
        minRttMs: 1,
        summary: 'ICMP y ARP confirmados'
      };

      const result = NetworkStateMachine.transition({
        currentState: 'UNKNOWN',
        consecutiveFailures: 2,
        evidenceSet,
        canaryHealthy: true
      });

      expect(result.nextState).toBe('ONLINE');
      expect(result.consecutiveFailures).toBe(0);
      expect(result.stateChanged).toBe(true);
    });

    it('aplica histeresis: 1 fallo pasa a WARNING, y 3 fallos consecutivos pasan a OFFLINE', () => {
      const zeroEvidences = {
        targetIp: '10.2.61.100',
        evaluatedAt: new Date(),
        evidences: [],
        hasL2Presence: false,
        hasL3Response: false,
        hasL4Activity: false,
        positiveCount: 0,
        minRttMs: null,
        summary: 'Sin respuestas'
      };

      // 1er fallo
      const r1 = NetworkStateMachine.transition({
        currentState: 'ONLINE',
        consecutiveFailures: 0,
        evidenceSet: zeroEvidences,
        canaryHealthy: true,
        offlineThreshold: 3
      });
      expect(r1.nextState).toBe('WARNING');
      expect(r1.consecutiveFailures).toBe(1);

      // 2do fallo
      const r2 = NetworkStateMachine.transition({
        currentState: 'WARNING',
        consecutiveFailures: 1,
        evidenceSet: zeroEvidences,
        canaryHealthy: true,
        offlineThreshold: 3
      });
      expect(r2.nextState).toBe('WARNING');
      expect(r2.consecutiveFailures).toBe(2);

      // 3er fallo consecutivo -> OFFLINE
      const r3 = NetworkStateMachine.transition({
        currentState: 'WARNING',
        consecutiveFailures: 2,
        evidenceSet: zeroEvidences,
        canaryHealthy: true,
        offlineThreshold: 3
      });
      expect(r3.nextState).toBe('OFFLINE');
      expect(r3.consecutiveFailures).toBe(3);
      expect(r3.eventToEmit?.type).toBe('CAIDA');
    });

    it('protección Canary: NO declara OFFLINE si el Canary del servidor reporta degradación', () => {
      const zeroEvidences = {
        targetIp: '10.2.61.100',
        evaluatedAt: new Date(),
        evidences: [],
        hasL2Presence: false,
        hasL3Response: false,
        hasL4Activity: false,
        positiveCount: 0,
        minRttMs: null,
        summary: 'Sin respuestas'
      };

      const result = NetworkStateMachine.transition({
        currentState: 'ONLINE',
        consecutiveFailures: 2,
        evidenceSet: zeroEvidences,
        canaryHealthy: false, // Servidor desconectado de su gateway
        offlineThreshold: 3
      });

      expect(result.nextState).toBe('WARNING');
      expect(result.reason).toContain('Evaluación de caída suspendida');
    });

    it('respeta el estado de MAINTENANCE y no emite alertas de caída', () => {
      const zeroEvidences = {
        targetIp: '10.2.61.100',
        evaluatedAt: new Date(),
        evidences: [],
        hasL2Presence: false,
        hasL3Response: false,
        hasL4Activity: false,
        positiveCount: 0,
        minRttMs: null,
        summary: 'Sin respuestas'
      };

      const result = NetworkStateMachine.transition({
        currentState: 'MAINTENANCE',
        consecutiveFailures: 5,
        evidenceSet: zeroEvidences,
        canaryHealthy: true
      });

      expect(result.nextState).toBe('MAINTENANCE');
      expect(result.stateChanged).toBe(false);
    });
  });
});
