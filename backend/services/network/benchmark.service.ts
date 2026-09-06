import { IcmpProbe } from './probes/icmp.probe';
import { TcpConnectProbe } from './probes/tcp.probe';
import { ArpProbe } from './probes/arp.probe';

export interface BenchmarkMetrics {
  targetCidr: string;
  totalIps: number;
  concurrencyLimit: number;
  timeoutMs: number;
  durationMs: number;
  ipsPerSecond: number;
  activeHostsFound: number;
  memoryBeforeRssMb: number;
  memoryAfterRssMb: number;
  memoryDeltaMb: number;
}

export class NetworkBenchmarkService {
  /**
   * Ejecuta una prueba de rendimiento empírica estática para establecer la línea base
   * de velocidad, consumo de memoria y tasa de paquetes sin optimizaciones prematuras.
   */
  static async runBenchmark(
    ipList: string[],
    concurrencyLimit = 16,
    timeoutMs = 750
  ): Promise<BenchmarkMetrics> {
    const memBefore = process.memoryUsage().rss / (1024 * 1024);
    const startTime = Date.now();
    let activeHosts = 0;

    // 1. Lectura inicial de tabla ARP
    const arpTable = await ArpProbe.readArpTable();

    // 2. Ejecución controlada por lotes (concurrencia fija)
    for (let i = 0; i < ipList.length; i += concurrencyLimit) {
      const chunk = ipList.slice(i, i + concurrencyLimit);

      await Promise.all(
        chunk.map(async (ip) => {
          // Sondeo dual estático: ICMP + TCP Connect a puerto 445
          const hasArp = arpTable.has(ip);
          const icmp = await IcmpProbe.probeIp(ip, timeoutMs);
          let tcpOk = false;
          if (!icmp.success) {
            const tcp = await TcpConnectProbe.probePort(ip, 445, timeoutMs);
            tcpOk = tcp.success;
          }

          if (hasArp || icmp.success || tcpOk) {
            activeHosts++;
          }
        })
      );
    }

    const durationMs = Math.max(1, Date.now() - startTime);
    const memAfter = process.memoryUsage().rss / (1024 * 1024);

    return {
      targetCidr: `${ipList[0] || 'N/A'} (Muestra de ${ipList.length} IPs)`,
      totalIps: ipList.length,
      concurrencyLimit,
      timeoutMs,
      durationMs,
      ipsPerSecond: Math.round((ipList.length / (durationMs / 1000)) * 10) / 10,
      activeHostsFound: activeHosts,
      memoryBeforeRssMb: Math.round(memBefore * 10) / 10,
      memoryAfterRssMb: Math.round(memAfter * 10) / 10,
      memoryDeltaMb: Math.round((memAfter - memBefore) * 10) / 10
    };
  }
}
