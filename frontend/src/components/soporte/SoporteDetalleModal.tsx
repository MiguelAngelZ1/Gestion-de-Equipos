import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, Calendar, ClipboardList, User, X, Hash, AlertCircle, DollarSign, MapPin } from 'lucide-react';

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
          className="fixed inset-0 z-[200] flex items-center justify-center p-5 sm:p-6 bg-black/85 backdrop-blur-md h-[100dvh] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0b1120] border border-white/20 shadow-[0_0_80px_rgba(0,0,0,0.8)] rounded-3xl sm:rounded-[2.5rem] w-full max-w-3xl relative overflow-hidden flex flex-col max-h-[calc(100dvh-40px)]"
          >
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-br from-indigo-600/20 to-transparent pointer-events-none"></div>
            
            {/* Header */}
            <div className="p-4 sm:p-6 pb-4 border-b border-white/5 shrink-0 relative z-10 flex justify-between items-center">
               <div className="flex flex-row items-center gap-3 pr-10">
                  <div className="bg-indigo-500/10 p-2.5 rounded-2xl border border-indigo-500/20 shrink-0 shadow-[0_0_20px_rgba(79,70,229,0.2)]">
                     <Wrench className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight uppercase">
                        {tarea.ine || 'Equipo sin INE'}
                    </h2>
                    <p className="text-indigo-400 text-[10px] font-black tracking-[0.2em] uppercase mt-1 opacity-80">
                        Nro. Ticket: {tarea.ticket_id}
                    </p>
                  </div>
               </div>
               <button 
                  onClick={onClose}
                  className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-slate-400 hover:text-white transition-all cursor-pointer group"
               >
                  <X className="w-4 h-4 group-hover:scale-110" />
               </button>
            </div>

            {/* Content */}
            <div className="p-5 sm:p-6 flex-1 overflow-y-auto custom-scrollbar relative z-10">
               <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {/* Info Panel (Columna Izquierda - Más ancha para evitar recortes) */}
                  <div className="lg:col-span-2 space-y-4">
                     <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-5 shadow-inner">
                        <div className="space-y-1.5">
                           <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                              <MapPin className="w-3 h-3 text-indigo-400" /> Ubicación del Equipo
                           </p>
                           <p className="text-white font-black text-base">{tarea.equipo_ubicacion || 'Central'}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                           <div className="space-y-1">
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">NNE</p>
                              <p className="text-white font-bold text-xs truncate" title={tarea.nne}>{tarea.nne || 'S/D'}</p>
                           </div>
                           <div className="space-y-1">
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Nro. Serie</p>
                              <p className="text-white font-bold text-xs truncate" title={tarea.serie}>{tarea.serie || 'S/D'}</p>
                           </div>
                        </div>

                        <div className="space-y-1 pt-4 border-t border-white/5">
                           <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                              <User className="w-3 h-3 text-indigo-400" /> Responsable
                           </p>
                           <p className="text-white font-bold text-sm leading-tight">{tarea.responsable_completo || tarea.responsable}</p>
                        </div>


                        <div className="space-y-1 pt-4 border-t border-white/5">
                           <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                              <Calendar className="w-3 h-3 text-indigo-400" /> Fecha de Registro
                           </p>
                           <p className="text-white font-bold text-sm">
                              {new Date(tarea.fecha.split('T')[0] + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                           </p>
                        </div>

                        <div className="pt-4 border-t border-white/5">
                           <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-2">
                              <AlertCircle className="w-3 h-3 text-indigo-400" /> Tipo de Tarea
                           </p>
                           <span className="inline-block px-3 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] font-black rounded-lg border border-indigo-500/20 uppercase tracking-wider">
                              {tarea.tipo_falla || 'PREVENTIVO'}
                           </span>
                        </div>
                     </div>
                  </div>

                  {/* Detalle Panel (Columna Derecha - Proporcionalmente más pequeña) */}
                  <div className="lg:col-span-3">
                     <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-3xl p-6 h-full shadow-lg">
                        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-indigo-500/10">
                           <ClipboardList className="w-5 h-5 text-indigo-400" />
                           <h4 className="text-lg font-black text-white tracking-tight uppercase">Informe Técnico</h4>
                        </div>
                        <div className="text-slate-300 whitespace-pre-wrap leading-relaxed text-sm italic font-medium">
                           {tarea.tarea_realizada || 'No se registró descripción de la tarea.'}
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/5 shrink-0 bg-[#0b1120] z-20 flex justify-end">
               <button 
                  onClick={onClose}
                  className="bg-white/5 hover:bg-white/10 text-white font-black px-8 py-3 rounded-xl transition-all border border-white/10 hover:border-white/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] cursor-pointer text-xs uppercase tracking-widest"
               >
                  Cerrar Bitácora
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
