import { AlertCircle, ArrowRight, History, Package, Server, Trash2, UserCheck, Wrench } from 'lucide-react';

const EVENT_STYLES: Record<string, { color: string; icon: any }> = {
  FALLA_REPORTADA: { color: '#ef4444', icon: AlertCircle },
  CAMBIO_DE_ESTADO: { color: '#8b5cf6', icon: History },
  CAMBIO_DE_UBICACION: { color: '#06b6d4', icon: Server },
  BAJA_EQUIPO: { color: '#ef4444', icon: Trash2 },
  RESTAURACION_EQUIPO: { color: '#14b8a6', icon: UserCheck },
  ASIGNACION: { color: '#22c55e', icon: UserCheck },
  CAMBIO_DE_CARGO: { color: '#6366f1', icon: ArrowRight },
  SOPORTE_MANTENIMIENTO: { color: '#3b82f6', icon: Wrench },
  SOPORTE_TECNICO: { color: '#3b82f6', icon: Wrench },
  MANTENIMIENTO_ACTUALIZADO: { color: '#6366f1', icon: Wrench },
  INSTALACION_COMPONENTE: { color: '#f59e0b', icon: Package },
  RETIRO_COMPONENTE: { color: '#71717a', icon: Trash2 },
};

export function getEventStyle(evento: string) {
  const style = EVENT_STYLES[evento] || { color: '#71717a', icon: History };
  return { ...style, label: (evento || 'EVENTO').replace(/_/g, ' ') };
}
