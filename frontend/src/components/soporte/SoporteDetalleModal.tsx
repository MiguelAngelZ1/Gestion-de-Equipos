import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, Calendar, ClipboardList, User, X, Hash, AlertCircle, DollarSign, MapPin } from 'lucide-react';

const spring = { type: 'spring' as const, stiffness: 400, damping: 30 };

const SoporteDetalleModal = ({ isOpen, tarea, onClose }) => {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && tarea && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md h-[100dvh] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 0 }}
            transition={spring}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0b1120] border border-white/20 shadow-[0_0_80px_rgba(0,0,0,0.8)] rounded-2xl sm:rounded-[2rem] w-full max-w-3xl relative overflow-hidden flex flex-col max-h-[calc(100dvh-40px)]"
          >
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-br from-indigo-600/20 to-transparent pointer-events-none"></div>
            
            {/* Header */}
            <div className="p-3 sm:p-5 pb-3 border-b border-white/5 shrink-0 relative z-10 flex justify-between items-center">
               <div className="flex flex-row items-center gap-2.5 pr-10">
                  <div className="bg-indigo-500/10 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border border-indigo-500/20 shrink-0 shadow-[0_0_20px_rgba(79,70,229,0.2)]">
                     <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-xl font-black text-white tracking-tight leading-tight uppercase">
                        {tarea.ine || 'Equipo sin INE'}
                    </h2>
                    <p className="text-indigo-400 text-[9px] sm:text-[10px] font-black tracking-[0.15em] uppercase mt-0.5 opacity-80">
                        Ticket: {tarea.ticket_id}
                    </p>
                  </div>
               </div>
               <button 
                  onClick={onClose}
                  className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-slate-400 hover:text-white transition-all cursor-pointer group"
               >
                  <X className="w-3.5 h-3.5 group-hover:scale-110" />
               </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-5 flex-1 overflow-y-auto custom-scrollbar relative z-10">
               <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                  {/* Info Panel */}
                  <div className="lg:col-span-2 space-y-3">
                     <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4 shadow-inner">
                        <div className="space-y-1">
                           <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 text-indigo-400" /> Ubicación
                           </p>
                           <p className="text-white font-black text-sm">{tarea.equipo_ubicacion || 'Central'}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
                           <div className="space-y-0.5">
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">NNE</p>
                              <p className="text-white font-bold text-[11px] truncate" title={tarea.nne}>{tarea.nne || 'S/D'}</p>
                           </div>
                           <div className="space-y-0.5">
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Serie</p>
                              <p className="text-white font-bold text-[11px] truncate" title={tarea.serie}>{tarea.serie || 'S/D'}</p>
                           </div>
                        </div>

                        <div className="space-y-1 pt-3 border-t border-white/5">
                           <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                              <User className="w-3 h-3 text-indigo-400" /> Responsable
                           </p>
                           <p className="text-white font-bold text-xs leading-tight">{tarea.responsable_completo || tarea.responsable}</p>
                        </div>

                        <div className="space-y-1 pt-3 border-t border-white/5">
                           <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                              <Calendar className="w-3 h-3 text-indigo-400" /> Fecha
                           </p>
                           <p className="text-white font-bold text-xs">
                              {new Date(tarea.fecha.split('T')[0] + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                           </p>
                        </div>

                        <div className="pt-3 border-t border-white/5">
                           <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                              <AlertCircle className="w-3 h-3 text-indigo-400" /> Tipo
                           </p>
                           <span className="inline-block px-2.5 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] font-black rounded-lg border border-indigo-500/20 uppercase tracking-wider">
                              {tarea.tipo_falla || 'PREVENTIVO'}
                           </span>
                        </div>
                     </div>
                  </div>

                  {/* Detalle Panel */}
                  <div className="lg:col-span-3">
                     <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4 h-full shadow-lg">
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-indigo-500/10">
                           <ClipboardList className="w-4 h-4 text-indigo-400" />
                           <h4 className="text-sm font-black text-white tracking-tight uppercase">Informe Técnico</h4>
                        </div>
                        <div className="text-slate-300 whitespace-pre-wrap leading-relaxed text-xs italic font-medium">
                           {tarea.tarea_realizada || 'No se registró descripción de la tarea.'}
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Footer */}
            <div className="p-3 sm:p-4 border-t border-white/5 shrink-0 bg-[#0b1120] z-20 flex justify-end">
               <button 
                  onClick={onClose}
                  className="bg-white/5 hover:bg-white/10 text-white font-black px-6 py-2.5 rounded-xl transition-all border border-white/10 hover:border-white/20 cursor-pointer text-[10px] sm:text-xs uppercase tracking-widest"
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

export default SoporteDetalleModal;
