import { execFile } from 'child_process';
import { RawProbeResult } from './types';

export interface ArpEntry {
  ip: string;
  mac: string;
  type: 'dynamic' | 'static' | 'unknown';
}

export class ArpProbe {
  /**
   * Lee la tabla ARP del sistema operativo de manera completa.
   * En Windows ejecuta 'arp -a'.
   */
  static async readArpTable(): Promise<Map<string, ArpEntry>> {
    return new Promise((resolve) => {
      const isWin = process.platform === 'win32';
      const cmd = isWin ? 'arp' : 'arp';
      const args = isWin ? ['-a'] : ['-n'];

      execFile(cmd, args, { timeout: 3000 }, (err, stdout) => {
        const table = new Map<string, ArpEntry>();
        if (err || !stdout) {
          resolve(table);
          return;
        }

        const lines = stdout.split('\n');
        // Regex para capturar IP y MAC (Windows o Unix)
        const regex = /([0-9]{1,3}(?:\.[0-9]{1,3}){3})\s+([0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2})\s+(\w+)?/i;

        for (const line of lines) {
          const match = line.match(regex);
          if (!match) continue;

          const ip = match[1].trim();
          const rawMac = match[2].trim().toUpperCase().replace(/-/g, ':');
          const entryType = (match[3] || '').trim().toLowerCase();

          // Ignorar broadcast y multicast L2/L3
          if (rawMac === 'FF:FF:FF:FF:FF:FF' || rawMac === '00:00:00:00:00:00') continue;
          if (ip.startsWith('224.') || ip.startsWith('239.') || ip.endsWith('.255')) continue;

          table.set(ip, {
            ip,
            mac: rawMac,
            type: entryType.includes('dyn') ? 'dynamic' : entryType.includes('stat') ? 'static' : 'unknown'
          });
        }

        resolve(table);
      });
    });
  }

  /**
   * Comprueba si una IP específica tiene una entrada ARP observable en la tabla actual.
   * Recordatorio V3: La tabla ARP es una caché. No aporta timestamp de antigüedad exacta.
   */
  static async probeIp(ip: string, cachedTable?: Map<string, ArpEntry>): Promise<RawProbeResult> {
    const table = cachedTable || await this.readArpTable();
    const entry = table.get(ip);

    if (entry) {
      return {
        probeType: 'ARP',
        targetIp: ip,
        success: true,
        rttMs: null, // ARP en userspace no mide RTT directamente
        detail: `Entrada ARP presente (${entry.type})`,
        metadata: {
          mac: entry.mac,
          entryType: entry.type
        }
      };
    }

    return {
      probeType: 'ARP',
      targetIp: ip,
      success: false,
      rttMs: null,
      detail: 'Sin entrada en tabla ARP local'
    };
  }
}
