import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../services/api';

export interface NodeChangeEvent {
  dispositivoId: string;
  ip: string;
  mac?: string;
  hostname?: string;
  estadoAnterior: string;
  nuevoEstado: string;
  fallosConsecutivos: number;
  latenciaMs: number | null;
  summary: string;
  timestamp: string;
}

export interface ScanProgressEvent {
  redId: string;
  scanned: number;
  total: number;
  percentage: number;
  found: number;
}

// Versión polling (nube): el Worker no tiene Socket.IO. Misma interfaz pública
// para no tocar los consumidores. El sondeo LAN en vivo solo existe en local;
// aquí se detectan cambios de estado entre pasadas (cada 15s).
const POLL_MS = 15000;

export function useNetworkSocket(
  redId: string | null,
  onNodeChanged?: (evt: NodeChangeEvent) => void,
  onScanProgress?: (evt: ScanProgressEvent) => void,
  onScanCompleted?: (summary: any) => void
) {
  const [isConnected, setIsConnected] = useState(false);

  const onNodeChangedRef = useRef(onNodeChanged);
  useEffect(() => { onNodeChangedRef.current = onNodeChanged; }, [onNodeChanged]);
  // onScanProgress/onScanCompleted se aceptan por compatibilidad pero no se
  // disparan en la nube (el scan responde 501 "solo red local").
  void onScanProgress;
  void onScanCompleted;

  const prevRef = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    if (!redId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      try {
        const rows: any[] = await apiRequest(`/network/redes/${redId}/dispositivos`);
        if (cancelled) return;
        setIsConnected(true);
        const prev = prevRef.current;
        const next = new Map<string, any>();
        for (const d of rows || []) {
          next.set(d.id, d);
          const old = prev.get(d.id);
          if (old && old.estado_monitoreo !== d.estado_monitoreo) {
            onNodeChangedRef.current?.({
              dispositivoId: d.id,
              ip: d.ip,
              mac: d.mac_actual,
              hostname: d.hostname_actual,
              estadoAnterior: old.estado_monitoreo,
              nuevoEstado: d.estado_monitoreo,
              fallosConsecutivos: d.fallos_consecutivos ?? 0,
              latenciaMs: d.latencia_actual_ms ?? null,
              summary: `${d.ip}: ${old.estado_monitoreo} → ${d.estado_monitoreo}`,
              timestamp: new Date().toISOString(),
            });
          }
        }
        prevRef.current = next;
      } catch {
        if (!cancelled) setIsConnected(false);
      }
    };

    prevRef.current = new Map();
    poll();
    timer = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [redId]);

  return { isConnected };
}
