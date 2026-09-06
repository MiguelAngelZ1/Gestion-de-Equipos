import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

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

export function useNetworkSocket(
  redId: string | null,
  onNodeChanged?: (evt: NodeChangeEvent) => void,
  onScanProgress?: (evt: ScanProgressEvent) => void,
  onScanCompleted?: (summary: any) => void
) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Estabilizamos los callbacks via ref para no reiniciar la suscripción en cada render
  const onNodeChangedRef = useRef(onNodeChanged);
  const onScanProgressRef = useRef(onScanProgress);
  const onScanCompletedRef = useRef(onScanCompleted);
  useEffect(() => { onNodeChangedRef.current = onNodeChanged; }, [onNodeChanged]);
  useEffect(() => { onScanProgressRef.current = onScanProgress; }, [onScanProgress]);
  useEffect(() => { onScanCompletedRef.current = onScanCompleted; }, [onScanCompleted]);

  useEffect(() => {
    if (!redId) return;

    const socketURL = import.meta.env.VITE_API_URL || window.location.origin.replace(':5300', ':3001');

    const socket = io(socketURL, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('network:subscribe', { redId });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('network:node_changed', (evt: NodeChangeEvent) => {
      onNodeChangedRef.current?.(evt);
    });

    socket.on('network:scan_progress', (evt: ScanProgressEvent) => {
      onScanProgressRef.current?.(evt);
    });

    socket.on('network:scan_completed', (summary: any) => {
      onScanCompletedRef.current?.(summary);
    });

    return () => {
      socket.emit('network:unsubscribe', { redId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [redId]);

  return { isConnected };
}
