import * as dgram from 'dgram';
import { RawProbeResult } from './types';

export class NetbiosProbe {
  /**
   * Paquete binario estándar de NetBIOS Node Status Query (RFC 1002).
   * Pregunta por el nombre wildcard '*' (CKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA).
   */
  private static readonly NODE_STATUS_QUERY = Buffer.from([
    0x80, 0x94, // Transaction ID
    0x00, 0x00, // Flags (Query)
    0x00, 0x01, // Questions (1)
    0x00, 0x00, // Answer RRs (0)
    0x00, 0x00, // Authority RRs (0)
    0x00, 0x00, // Additional RRs (0)
    0x20,       // Length of name (32 bytes encoded)
    // 32 bytes encoding wildcard '*'
    0x43, 0x4b, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
    0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
    0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
    0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
    0x00,       // Terminating null
    0x00, 0x21, // Type: NBSTAT (33)
    0x00, 0x01  // Class: IN (1)
  ]);

  /**
   * Envía una consulta NetBIOS Name Service por UDP 137.
   * Si el equipo responde, extrae el nombre NetBIOS del host.
   */
  static async probeIp(ip: string, timeoutMs = 750): Promise<RawProbeResult> {
    return new Promise((resolve) => {
      const socket = dgram.createSocket('udp4');
      const startTime = process.hrtime.bigint();
      let finished = false;

      const finish = (success: boolean, hostname?: string, detail?: string) => {
        if (finished) return;
        finished = true;
        const endTime = process.hrtime.bigint();
        const rttMs = Number((endTime - startTime) / 1000000n);

        try {
          socket.close();
        } catch (_) {}

        resolve({
          probeType: 'NETBIOS',
          targetIp: ip,
          targetPort: 137,
          success,
          rttMs: success ? Math.max(1, rttMs) : null,
          detail: detail || (success ? `Hostname NetBIOS: ${hostname}` : 'Sin respuesta NetBIOS'),
          metadata: {
            hostname
          }
        });
      };

      const timer = setTimeout(() => {
        finish(false, undefined, `Timeout (${timeoutMs} ms) en UDP 137`);
      }, timeoutMs);

      socket.on('message', (msg) => {
        clearTimeout(timer);
        try {
          // El paquete de respuesta contiene el número de nombres en el offset 56
          if (msg.length > 57) {
            const numNames = msg.readUInt8(56);
            if (numNames > 0 && msg.length >= 57 + 18) {
              // El primer nombre ocupa 15 bytes a partir del byte 57
              const rawName = msg.subarray(57, 57 + 15).toString('ascii').trim();
              finish(true, rawName, `Hostname NetBIOS resuelto: ${rawName}`);
              return;
            }
          }
          finish(true, undefined, 'Respuesta NetBIOS recibida (sin nombre legible)');
        } catch (e: any) {
          finish(true, undefined, `Respuesta NetBIOS recibida con error de parseo: ${e.message}`);
        }
      });

      socket.on('error', (err) => {
        clearTimeout(timer);
        finish(false, undefined, `Error UDP NetBIOS: ${err.message}`);
      });

      try {
        socket.send(this.NODE_STATUS_QUERY, 137, ip, (err) => {
          if (err) {
            clearTimeout(timer);
            finish(false, undefined, `Falla al enviar paquete UDP: ${err.message}`);
          }
        });
      } catch (err: any) {
        clearTimeout(timer);
        finish(false, undefined, `Excepción en socket UDP: ${err.message}`);
      }
    });
  }
}
