import * as net from 'net';
import { RawProbeResult, TcpStatus } from './types';

export class TcpConnectProbe {
  /**
   * Ejecuta una sonda TCP Connect (3-Way Handshake estándar de userspace).
   * Mide RTT de forma precisa con hrtime o Date.now().
   * Captura explícitamente ECONNREFUSED (RST recibido).
   */
  static async probePort(ip: string, port: number, timeoutMs = 750): Promise<RawProbeResult> {
    return new Promise((resolve) => {
      const startTime = process.hrtime.bigint();
      const socket = new net.Socket();
      let finished = false;

      const finish = (success: boolean, status: TcpStatus, detail: string) => {
        if (finished) return;
        finished = true;
        const endTime = process.hrtime.bigint();
        const rttMs = Number((endTime - startTime) / 1000000n);

        socket.destroy();

        resolve({
          probeType: 'TCP_CONNECT',
          targetIp: ip,
          targetPort: port,
          success,
          rttMs: success ? Math.max(1, rttMs) : null,
          detail,
          metadata: {
            tcpStatus: status
          }
        });
      };

      socket.setTimeout(timeoutMs);

      socket.on('connect', () => {
        finish(true, 'ACCEPTED', `Puerto ${port} abierto (conexión TCP establecida)`);
      });

      socket.on('timeout', () => {
        finish(false, 'TIMEOUT', `Timeout (${timeoutMs} ms) en puerto ${port}`);
      });

      socket.on('error', (err: any) => {
        if (err.code === 'ECONNREFUSED') {
          // RST recibido: la pila de red está activa, pero el puerto está cerrado o un firewall intermedio lo rechazó
          finish(
            true,
            'REFUSED_RST',
            `Rechazo activo (RST) en puerto ${port}. Pila IP activa (host o firewall intermedio)`
          );
        } else if (err.code === 'EHOSTUNREACH' || err.code === 'ENETUNREACH') {
          finish(false, 'HOST_UNREACHABLE', `Host o red inalcanzable (${err.code})`);
        } else {
          finish(false, 'ERROR', `Error de socket: ${err.message || err.code}`);
        }
      });

      try {
        socket.connect(port, ip);
      } catch (err: any) {
        finish(false, 'ERROR', `Excepción al iniciar socket: ${err.message}`);
      }
    });
  }

  /**
   * Sondea una lista de puertos estándar en secuencia o concurrencia limitada
   * hasta encontrar la primera respuesta activa o agotar la lista.
   */
  static async probePorts(
    ip: string,
    ports: number[] = [445, 135, 80, 443, 22],
    timeoutMs = 750
  ): Promise<RawProbeResult[]> {
    const results: RawProbeResult[] = [];
    for (const port of ports) {
      const res = await this.probePort(ip, port, timeoutMs);
      results.push(res);
      // Si un puerto respondió positivamente (ACCEPTED o REFUSED_RST), tenemos evidencia L4
      if (res.success) {
        break;
      }
    }
    return results;
  }
}
