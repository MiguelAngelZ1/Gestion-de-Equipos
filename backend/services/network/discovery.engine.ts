const db = require('../../db/database');
const logger = require('../../utils/logger');
import { IcmpProbe } from './probes/icmp.probe';
import { TcpConnectProbe } from './probes/tcp.probe';
import * as os from 'os';
import { ArpProbe } from './probes/arp.probe';
import { NetbiosProbe } from './probes/netbios.probe';
import { ReconciliationService } from './reconciliation.service';

export interface DiscoveryScanOptions {
  concurrencyLimit?: number;
  timeoutMs?: number;
  io?: any;
}

export class DiscoveryEngine {
  private static activeScans = new Set<string>();

  /**
   * Ejecuta un descubrimiento completo de una subred bajo demanda.
   */
  static async scanSubnet(redId: string, options: DiscoveryScanOptions = {}) {
    const { concurrencyLimit = 24, timeoutMs = 750, io } = options;

    if (this.activeScans.has(redId)) {
      throw new Error(`Ya existe un escaneo en curso para la red ${redId}.`);
    }

    let red: any;
    let segmento: string;
    let mascara: string;
    if (String(redId).startsWith('auto-')) {
      const rest = String(redId).replace('auto-', '');
      const lastDash = rest.lastIndexOf('-');
      const seg = rest.substring(0, lastDash);
      const cidr = rest.substring(lastDash + 1);
      const bits = Number(cidr);
      const maskInt = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
      const intToIp = (i: number) => [(i >>> 24) & 255, (i >>> 16) & 255, (i >>> 8) & 255, i & 255].join('.');
      segmento = seg;
      mascara = intToIp(maskInt);
      red = { id: redId, segmento, mascara };
    } else {
      red = await db.get('SELECT * FROM redes WHERE id = ?', [redId]);
      if (!red) throw new Error('Red no encontrada.');
      segmento = red.segmento;
      mascara = red.mascara;
    }

    this.activeScans.add(redId);
    logger.info({ redId, segmento, mascara }, '[Discovery] Iniciando escaneo de red');

    try {
      const ipList = this.generateSubnetIps(segmento, mascara);
      const totalIps = ipList.length;
      let scannedCount = 0;
      let foundDevices = 0;

      // 1. Lectura inicial de tabla ARP del sistema
      const arpTable = await ArpProbe.readArpTable();

      // 2. Ejecución por lotes
      for (let i = 0; i < ipList.length; i += concurrencyLimit) {
        const chunk = ipList.slice(i, i + concurrencyLimit);

        await Promise.all(
          chunk.map(async (ip) => {
            const arpEntry = arpTable.get(ip);
            const icmp = await IcmpProbe.probeIp(ip, timeoutMs);

            let isResponsive = icmp.success;
            let bestRtt = icmp.rttMs;

            // Si ICMP falló, intentamos TCP Connect rápido a puertos clave
            if (!isResponsive) {
              const tcpResults = await TcpConnectProbe.probePorts(ip, [445, 80, 135, 443], timeoutMs);
              const activeTcp = tcpResults.find(r => r.success);
              if (activeTcp) {
                isResponsive = true;
                bestRtt = activeTcp.rttMs;
              }
            }

            if (isResponsive || arpEntry) {
              foundDevices++;

              let macToUse: string | null = arpEntry?.mac || null;
              if (isResponsive && !macToUse) {
                try {
                  const fresh = await ArpProbe.readArpTable();
                  const freshEntry = fresh.get(ip);
                  if (freshEntry?.mac) macToUse = freshEntry.mac;
                } catch (_) {}
                if (!macToUse) {
                  const localMac = DiscoveryEngine.getLocalMacForIp(ip);
                  if (localMac) macToUse = localMac;
                }
              }

              let hostname: string | null = null;
              const localHostname = DiscoveryEngine.getLocalHostnameForIp(ip);
              if (localHostname) {
                hostname = localHostname;
              } else {
                try {
                  const nb = await NetbiosProbe.probeIp(ip, 1000);
                  if (nb.success && nb.metadata?.hostname) hostname = nb.metadata.hostname;
                } catch (_) {}
                if (!hostname) {
                  try {
                    const { promises: dns } = require('dns');
                    const names: any = await (dns as any).reverse(ip).catch(() => []);
                    if (Array.isArray(names) && names[0]) hostname = String(names[0]).split('.')[0].toUpperCase().slice(0, 32);
                  } catch (_) {}
                }
              }

              await ReconciliationService.reconcileDevice({
                redId,
                ip,
                mac: macToUse,
                hostname,
                rttMs: bestRtt
              });
            }
          })
        );

        scannedCount += chunk.length;
        const percentage = Math.min(100, Math.round((scannedCount / totalIps) * 100));

        // Emitir progreso por WebSocket si Socket.IO está provisto
        if (io) {
          io.to(`network:${redId}`).emit('network:scan_progress', {
            redId,
            scanned: scannedCount,
            total: totalIps,
            percentage,
            found: foundDevices
          });
        }
      }

      logger.info({ redId, totalIps, foundDevices }, '[Discovery] Escaneo finalizado');

      const result = {
        redId,
        totalIps,
        scannedCount,
        foundDevices,
        finishedAt: new Date()
      };

      if (io) {
        io.to(`network:${redId}`).emit('network:scan_completed', result);
      }

      return result;
    } finally {
      this.activeScans.delete(redId);
    }
  }

  /**
   * Genera la lista de direcciones IPv4 útiles para un segmento y máscara
   */
  private static generateSubnetIps(segmento: string, mascara: string): string[] {
    const parseIp = (s: string) => s.split('.').map(Number);
    const ipToInt = (parts: number[]) => parts.reduce((acc, o) => ((acc << 8) + o) >>> 0, 0);
    const intToIp = (i: number) => [(i >>> 24) & 255, (i >>> 16) & 255, (i >>> 8) & 255, i & 255].join('.');

    // Normalizar máscara si viene en formato CIDR /24
    let maskIp = mascara;
    if (mascara.startsWith('/') || /^\d+$/.test(mascara)) {
      const bits = Number(mascara.replace('/', ''));
      const maskInt = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
      maskIp = intToIp(maskInt);
    }

    const netInt = (ipToInt(parseIp(segmento)) & ipToInt(parseIp(maskIp))) >>> 0;
    const totalHosts = (0xffffffff - ipToInt(parseIp(maskIp)) + 1) >>> 0;

    const ips: string[] = [];
    // Omitir dirección de red (i=0) y broadcast (i = totalHosts - 1) si totalHosts > 2
    const start = totalHosts > 2 ? 1 : 0;
    const end = totalHosts > 2 ? totalHosts - 1 : totalHosts;

    for (let i = start; i < end; i++) {
      ips.push(intToIp(netInt + i));
    }

    return ips;
  }

  private static getLocalMacForIp(targetIp: string): string | null {
    try {
      const ifaces = os.networkInterfaces();
      for (const addrs of Object.values(ifaces)) {
        if (!addrs) continue;
        for (const a of addrs) {
          if (a.family === 'IPv4' && a.address === targetIp && a.mac && a.mac !== '00:00:00:00:00:00') {
            return a.mac.toUpperCase();
          }
        }
      }
    } catch (_) {}
    return null;
  }

  private static getLocalHostnameForIp(targetIp: string): string | null {
    try {
      const ifaces = os.networkInterfaces();
      for (const addrs of Object.values(ifaces)) {
        if (!addrs) continue;
        for (const a of addrs) {
          if (a.family === 'IPv4' && a.address === targetIp) {
            return os.hostname().toUpperCase().slice(0, 32);
          }
        }
      }
    } catch (_) {}
    return null;
  }
}
