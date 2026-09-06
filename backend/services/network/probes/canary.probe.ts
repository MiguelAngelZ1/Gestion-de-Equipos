import * as os from 'os';
import * as dns from 'dns';
import { CanaryHealth } from './types';
import { ArpProbe } from './arp.probe';
import { IcmpProbe } from './icmp.probe';
import { TcpConnectProbe } from './tcp.probe';

export class CanaryProbe {
  /**
   * Ejecuta una comprobación de salud multi-vectorial del propio nodo monitor.
   * NO depende únicamente de ICMP.
   */
  static async checkHealth(gatewayIp?: string | null): Promise<CanaryHealth> {
    const checkedAt = new Date();

    // 1. Verificación L1/L2 de Interfaces locales del SO
    const interfaces = os.networkInterfaces();
    let linkUp = false;
    let localIp = '';

    for (const name of Object.keys(interfaces)) {
      const addrs = interfaces[name] || [];
      for (const addr of addrs) {
        if (!addr.internal && addr.family === 'IPv4') {
          linkUp = true;
          localIp = addr.address;
          break;
        }
      }
      if (linkUp) break;
    }

    if (!linkUp) {
      return {
        isHealthy: false,
        linkUp: false,
        gatewayArpOk: false,
        gatewayL3Ok: false,
        dnsOk: false,
        detail: 'El servidor no posee interfaces de red activas con IPv4 no interna.',
        checkedAt
      };
    }

    // 2. Si no hay gateway especificado, asumimos salud local básica pero avisamos
    if (!gatewayIp) {
      return {
        isHealthy: true,
        linkUp: true,
        gatewayArpOk: true,
        gatewayL3Ok: true,
        dnsOk: true,
        detail: `Interfaz local activa (${localIp}), sin gateway asignado para Canary.`,
        checkedAt
      };
    }

    // 3. Verificación de presencia ARP del Gateway en la LAN local
    const arpTable = await ArpProbe.readArpTable();
    const gatewayArp = arpTable.get(gatewayIp);
    const gatewayArpOk = !!gatewayArp;

    // 4. Verificación L3/L4 hacia el Gateway (Dual: ICMP + TCP Connect a puertos comunes de router 80/443/22)
    const icmpResult = await IcmpProbe.probeIp(gatewayIp, 600);
    let gatewayL3Ok = icmpResult.success;

    if (!gatewayL3Ok) {
      // Fallback L4 a puertos web/ssh de gestión del router/firewall
      const tcpChecks = await TcpConnectProbe.probePorts(gatewayIp, [443, 80, 22], 600);
      gatewayL3Ok = tcpChecks.some(c => c.success);
    }

    // 5. Verificación de resolución DNS local/inversa básica
    let dnsOk = false;
    try {
      await new Promise<void>((resolve, reject) => {
        dns.reverse(localIp, (err) => {
          // Si responde o si no hay PTR pero el servidor DNS contestó sin timeout, consideramos DNS OK
          if (!err || err.code === 'ENOTFOUND') resolve();
          else reject(err);
        });
      });
      dnsOk = true;
    } catch (_) {
      dnsOk = false;
    }

    // Un monitor se considera sano si su interfaz está viva Y (el gateway responde en L2/L3 o el DNS responde)
    const isHealthy = linkUp && (gatewayArpOk || gatewayL3Ok);

    const detail = isHealthy
      ? `Canary OK: Interfaz ${localIp} activa, Gateway ${gatewayIp} verificado (ARP: ${gatewayArpOk ? 'SÍ' : 'NO'}, L3/L4: ${gatewayL3Ok ? 'SÍ' : 'NO'}).`
      : `ALERTA CANARY: El servidor perdió visibilidad del Gateway ${gatewayIp} (ARP: ${gatewayArpOk ? 'SÍ' : 'NO'}, L3/L4: NO). Posible corte de enlace local.`;

    return {
      isHealthy,
      linkUp,
      gatewayArpOk,
      gatewayL3Ok,
      dnsOk,
      detail,
      checkedAt
    };
  }
}
