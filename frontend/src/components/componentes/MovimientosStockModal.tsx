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
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring' as const, stiffness: 400, damping: 30 }}
            className="bg-[#0b1120] border border-white/10 shadow-2xl rounded-2xl sm:rounded-[2rem] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />

            <div className="p-4 sm:p-5 border-b border-white/5 flex justify-between items-center shrink-0 relative z-10 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-500/20 p-2 rounded-xl border border-indigo-500/20">
                  <History className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight">Historial de Stock</h2>
                  <p className="text-slate-400 text-[10px] sm:text-xs font-medium mt-0.5">{componente.nombre} <span className="opacity-40 ml-1">S/N: {componente.serie || 'N/A'}</span></p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all border border-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar relative z-10">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
                   <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Cargando Trazabilidad...</p>
                </div>
              ) : movimientos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <ClipboardList className="w-10 h-10 text-slate-700 mb-3 opacity-40" />
                  <p className="text-slate-400 font-medium text-sm">No hay movimientos registrados para este componente.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {movimientos.map((mov, idx) => (
                    <motion.div
                      key={mov.id || idx}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03, ...{ type: 'spring' as const, stiffness: 400, damping: 30 } }}
                      className="flex items-center justify-between p-3 sm:p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] rounded-xl sm:rounded-2xl transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 sm:p-2.5 rounded-xl border ${
                          mov.tipo === 'ENTRADA'
                            ? 'bg-emerald-500/10 border-emerald-500/20'
                            : 'bg-rose-500/10 border-rose-500/20'
                        }`}>
                          {mov.tipo === 'ENTRADA'
                            ? <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                            : <ArrowDownLeft className="w-4 h-4 text-rose-400" />
                          }
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                              mov.tipo === 'ENTRADA' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                            }`}>
                              {mov.tipo}
                            </span>
                            <span className="text-[11px] text-slate-500 font-bold">
                              {new Date(mov.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-white font-bold leading-tight text-sm">{mov.notas || 'Sin descripción'}</p>
                          {mov.equipo_id && (
                             <div className="flex items-center gap-1.5 mt-1.5 text-indigo-400/80 text-[10px] font-bold uppercase tracking-widest">
                                <Server className="w-3 h-3" />
                                Destino: {mov.equipo_tipo} ({mov.equipo_id})
                             </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <div className={`text-lg sm:text-xl font-black ${
                          mov.tipo === 'ENTRADA' ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {mov.tipo === 'ENTRADA' ? '+' : '-'}{mov.cantidad}
                        </div>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">unids</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 sm:p-5 border-t border-white/5 flex justify-center shrink-0 bg-[#0b1120] z-20">
              <button
                onClick={onClose}
                className="bg-white/5 hover:bg-white/10 text-white font-black px-8 py-3 rounded-xl border border-white/10 transition-all cursor-pointer text-sm tracking-widest uppercase"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default MovimientosStockModal;
