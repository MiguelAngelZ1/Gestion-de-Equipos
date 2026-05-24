import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, History, ArrowUpRight, ArrowDownLeft, Calendar, Tag, Server, ClipboardList } from 'lucide-react';
import { apiRequest } from '../../services/api';

const MovimientosStockModal = ({ isOpen, componente, onClose }) => {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && componente?.id) {
      fetchMovimientos();
    }
  }, [isOpen, componente]);

  const fetchMovimientos = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`/componentes/movimientos/${componente.id}`);
      setMovimientos(data);
    } catch (error) {
      console.error("Error fetching movimientos de stock:", error);
    } finally {
      setLoading(false);
    }
  };

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
            className="bg-[#0b1120] border border-white/10 shadow-2xl rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none"></div>
            
            <div className="p-5 sm:p-6 border-b border-white/5 flex justify-between items-center shrink-0 relative z-10 bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-500/20 p-2.5 rounded-2xl border border-indigo-500/20">
                  <History className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight leading-tight">Historial de Stock</h2>
                  <p className="text-slate-400 text-[10px] sm:text-xs font-medium mt-1">{componente.nombre} <span className="opacity-40 ml-1">S/N: {componente.serie || 'N/A'}</span></p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all border border-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar relative z-10">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                   <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
                   <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Cargando Trazabilidad...</p>
                </div>
              ) : movimientos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <ClipboardList className="w-16 h-16 text-slate-700 mb-4 opacity-50" />
                  <p className="text-slate-400 font-medium">No hay movimientos registrados para este componente.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {movimientos.map((mov, idx) => (
                    <div 
                      key={mov.id || idx}
                      className="group flex items-center justify-between p-5 bg-white/5 hover:bg-white/[0.08] border border-white/5 hover:border-white/10 rounded-3xl transition-all"
                    >
                      <div className="flex items-center gap-5">
                        <div className={`p-3 rounded-2xl border ${
                          mov.tipo === 'ENTRADA' 
                            ? 'bg-emerald-500/10 border-emerald-500/20' 
                            : 'bg-rose-500/10 border-rose-500/20'
                        }`}>
                          {mov.tipo === 'ENTRADA' 
                            ? <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                            : <ArrowDownLeft className="w-5 h-5 text-rose-400" />
                          }
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                              mov.tipo === 'ENTRADA' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                            }`}>
                              {mov.tipo}
                            </span>
                            <span className="text-xs text-slate-500 font-bold">
                              {new Date(mov.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-white font-bold leading-tight">{mov.notas || 'Sin descripción'}</p>
                          {mov.equipo_id && (
                             <div className="flex items-center gap-2 mt-2 text-indigo-400/80 text-[10px] font-bold uppercase tracking-widest">
                                <Server className="w-3 h-3" />
                                Destino: {mov.equipo_tipo} ({mov.equipo_id})
                             </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-black ${
                          mov.tipo === 'ENTRADA' ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {mov.tipo === 'ENTRADA' ? '+' : '-'}{mov.cantidad}
                        </div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">unidades</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-8 border-t border-white/5 flex justify-center shrink-0 bg-[#0b1120] z-20">
              <button 
                onClick={onClose}
                className="bg-white/5 hover:bg-white/10 text-white font-black px-12 py-4 rounded-2xl border border-white/10 transition-all cursor-pointer text-sm tracking-widest uppercase"
              >
                Cerrar Historial
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
