import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, XCircle, ShieldCheck, Activity, Clock, Server } from 'lucide-react';

interface EvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: any;
}

const EvidenceModal: React.FC<EvidenceModalProps> = ({ isOpen, onClose, node }) => {
  if (!isOpen || !node) return null;

  const isOnline = node.estado_monitoreo === 'ONLINE';
  const isWarning = node.estado_monitoreo === 'WARNING';
  const isOffline = node.estado_monitoreo === 'OFFLINE';

  return (
    <AnimatePresence>
      <div onClick={onClose} className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
        <motion.div
          onClick={e => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center gap-3">
              <span className="relative inline-flex h-3.5 w-3.5">
                {(isOnline || isWarning) && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>}
                <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]' : isWarning ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]' : isOffline ? 'bg-red-500' : 'bg-zinc-500'}`}></span>
              </span>
              <div>
                <h3 className="text-sm font-bold text-white">
                  {node.alias || node.hostname_actual || node.equipo_ine || node.ip}
                </h3>
                <p className="text-xs text-zinc-400">
                  {node.ip} {node.mac_actual ? `• ${node.mac_actual}` : ''}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 grid place-items-center rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-4 text-xs overflow-y-auto max-h-[70vh]">
            {/* Panel de Estado y Por Qué */}
            <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                Criterio de Determinación de Estado
              </p>
              <div className="mb-2">
                <span className="text-zinc-300">Estado Actual</span>
              </div>
              <p className="text-zinc-300 bg-black/40 p-2.5 rounded-lg border border-zinc-800/60 leading-relaxed">
                {isOnline &&
                  'El dispositivo fue marcado ONLINE al confirmar respuesta afirmativa en la pila de red (L2 ARP, L3 ICMP o L4 TCP Connect).'}
                {isWarning &&
                  `El nodo no respondió en el último sondeo (${node.fallos_consecutivos} fallo consecutivo). Se encuentra en estado preventivo de histeresis antes de declarar caída.`}
                {isOffline &&
                  `El nodo acumuló ${node.fallos_consecutivos} fallos consecutivos con el Gateway local operativo. Se certifica estado OFFLINE.`}
              </p>
            </div>

            {/* Cuadrícula de Evidencias */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Vectores de Comprobación
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-zinc-400 font-medium">Capa 2 (ARP)</span>
                    {node.mac_actual ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-zinc-600" />
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-300 truncate">
                    {node.mac_actual ? node.mac_actual : 'Sin entrada en tabla'}
                  </p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-zinc-400 font-medium">Latencia (RTT)</span>
                    <Activity className="w-4 h-4 text-cyan-400" />
                  </div>
                  <p className="text-[11px] text-zinc-300">
                    {node.latencia_actual_ms !== null ? `${node.latencia_actual_ms} ms` : 'No medible'}
                  </p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-zinc-400 font-medium">Fabricante / OUI</span>
                    <Server className="w-4 h-4 text-indigo-400" />
                  </div>
                  <p className="text-[11px] text-zinc-300 truncate">
                    {node.fabricante_actual || 'Desconocido'}
                  </p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-zinc-400 font-medium">Tipo de MAC</span>
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                  </div>
                  <p className="text-[11px] text-zinc-300">
                    {node.tipo_mac === 'LOCAL_ADMINISTERED' ? 'LAA (Local Admin)' : 'Universal (IEEE)'}
                  </p>
                </div>
              </div>
            </div>



            {/* Línea de Tiempo */}
            <div className="flex items-center justify-between text-zinc-500 text-[11px] pt-1">
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Último visto: {node.ultimo_visto_online ? new Date(node.ultimo_visto_online).toLocaleTimeString() : 'Nunca'}</span>
              <span>Fallos: {node.fallos_consecutivos || 0}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default EvidenceModal;
