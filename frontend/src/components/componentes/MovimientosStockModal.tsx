import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, History, ArrowUpRight, ArrowDownLeft, Server, ClipboardList } from 'lucide-react';
import { apiRequest } from '../../services/api';

const MovimientosStockModal = ({ isOpen, componente, onClose }) => {
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMovimientos = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`/componentes/movimientos/${componente.id}`);
      setMovimientos(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && componente?.id) {
      fetchMovimientos();
    }
  }, [isOpen, componente]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && componente && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md h-[100dvh]"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={e => e.stopPropagation()}
            className="bg-[#1C1C1E] border border-white/5 rounded-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl"
          >
            <div className="p-4 border-b border-white/5 flex items-center gap-3 shrink-0">
              <History className="w-5 h-5 text-[#e4e2e4] shrink-0" />
              <div className="min-w-0">
                <h2 className="text-[16px] font-semibold text-[#e4e2e4] leading-none truncate">Historial de Stock</h2>
                <p className="text-xs text-[#c4c5d9] mt-0.5 truncate">{componente.nombre} · S/N: {componente.serie || 'N/A'}</p>
              </div>
              <button onClick={onClose} className="ml-auto w-8 h-8 grid place-items-center rounded-full hover:bg-white/5 text-[#c4c5d9]"><X className="w-4 h-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar overscroll-contain" style={{ overscrollBehavior: 'contain' }}>
              {loading ? (
                <div className="space-y-2">
                   {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse" />)}
                </div>
              ) : movimientos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <ClipboardList className="w-8 h-8 text-zinc-600 mb-3" />
                  <p className="font-semibold text-zinc-50">Sin movimientos</p>
                  <p className="text-sm text-zinc-500 mt-1">No hay movimientos registrados para este repuesto</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {movimientos.map((mov, idx) => (
                    <motion.div
                      key={mov.id || idx}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03, ...{ type: 'spring' as const, stiffness: 400, damping: 30 } }}
                      className="flex items-center justify-between gap-3 p-3 bg-[#131315] border border-white/5 rounded-xl"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0 grid place-items-center">
                          {mov.tipo === 'ENTRADA'
                            ? <ArrowUpRight className="w-5 h-5 text-zinc-400" />
                            : <ArrowDownLeft className="w-5 h-5 text-zinc-400" />
                          }
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#131315]" style={{ background: mov.tipo === 'ENTRADA' ? '#22c55e' : '#ef4444' }} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-semibold text-[#c4c5d9] uppercase tracking-wide">{mov.tipo}</span>
                            <span className="text-[11px] text-zinc-500">
                              {new Date(mov.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[#e4e2e4] text-sm font-medium leading-tight truncate">{mov.notas || 'Sin descripción'}</p>
                          {mov.equipo_id && (
                             <div className="flex items-center gap-1.5 mt-1 text-zinc-400 text-[11px]">
                                <Server className="w-3 h-3 text-zinc-500 shrink-0" />
                                <span className="truncate">Destino: {mov.equipo_tipo} ({mov.equipo_id})</span>
                             </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-base font-semibold text-[#e4e2e4]">
                          {mov.tipo === 'ENTRADA' ? '+' : '-'}{mov.cantidad}
                        </div>
                        <p className="text-[10px] text-zinc-500">unids</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/5 flex justify-end shrink-0">
              <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-[#c4c5d9] hover:text-white">Cerrar</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default MovimientosStockModal;
