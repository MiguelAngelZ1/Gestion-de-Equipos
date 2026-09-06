import { execFile } from 'child_process';
import { RawProbeResult } from './types';

export class IcmpProbe {
  /**
   * Ejecuta un ping ICMP único con timeout estricto.
   * Extrae el tiempo de ida y vuelta (RTT en ms) si está disponible.
   */
  static async probeIp(ip: string, timeoutMs = 750): Promise<RawProbeResult> {
    return new Promise((resolve) => {
      const isWin = process.platform === 'win32';
      const args = isWin
        ? ['-n', '1', '-w', String(timeoutMs), ip]
        : ['-c', '1', '-W', String(Math.max(1, Math.round(timeoutMs / 1000))), ip];

      const startTime = process.hrtime.bigint();

      execFile('ping', args, { timeout: timeoutMs + 500 }, (error, stdout) => {
        const endTime = process.hrtime.bigint();
        const wallRttMs = Number((endTime - startTime) / 1000000n);

        if (error || !stdout) {
          resolve({
            probeType: 'ICMP',
            targetIp: ip,
            success: false,
            rttMs: null,
            detail: 'Sin respuesta ICMP (timeout o paquete descartado)'
          });
          return;
        }

        // Intento de parseo de RTT del output de ping (Windows: tiempo=Xms o tiempo<1ms; Unix: time=X.X ms)
        let parsedRtt: number | null = null;
        const timeMatch = stdout.match(/(?:tiempo|time)[=<](\d+(?:\.\d+)?)\s*ms/i);
        if (timeMatch && timeMatch[1]) {
          parsedRtt = Math.round(parseFloat(timeMatch[1]));
        } else {
          parsedRtt = Math.max(1, wallRttMs);
        }

        // En Windows, verificar si stdout indica "Host de destino inaccesible" o "Tiempo de espera agotado"
        const isFailureText = stdout.includes('inaccesible') ||
          stdout.includes('agotado') ||
          stdout.includes('100% loss') ||
          stdout.includes('100% de perdidos');

        if (isFailureText) {
          resolve({
            probeType: 'ICMP',
            targetIp: ip,
            success: false,
            rttMs: null,
            detail: 'ICMP reportó host inaccesible o tiempo agotado'
          });
          return;
        }

        resolve({
          probeType: 'ICMP',
          targetIp: ip,
          success: true,
          rttMs: parsedRtt,
          detail: `Echo reply recibido (${parsedRtt} ms)`
        });
      });
    });
  }
}
