import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { getEventStyle } from '../../utils/historialEventos';

const HistorialDetalleModal = ({ isOpen, evento, onClose }: any) => {
  if (typeof document === 'undefined') return null;

  const style = evento ? getEventStyle(evento.evento) : null;

  return createPortal(
    <AnimatePresence>
      {isOpen && evento && style && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md h-[100dvh] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
        >
          <motion.div initial={{ opacity: 0, scale: 0.97, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 8 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }} onClick={e => e.stopPropagation()} className="bg-[#1C1C1E] border border-white/5 rounded-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
            <div className="p-4 border-b border-white/5 flex items-center gap-3 shrink-0">
              <span className="material-symbols-outlined text-[#e4e2e4] text-[24px]">history</span>
              <div className="min-w-0">
                <h2 className="text-[16px] font-semibold text-[#e4e2e4] leading-none truncate">{evento.ine || 'Equipo sin INE'}</h2>
                <p className="text-xs text-[#c4c5d9] mt-0.5">{style.label}</p>
              </div>
              <button onClick={onClose} className="ml-auto w-8 h-8 grid place-items-center rounded-full hover:bg-white/5 text-[#c4c5d9]"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar overscroll-contain space-y-4" style={{ overscrollBehavior: 'contain' }}>
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-2 space-y-3">
                  <div className="bg-[#131315] border border-white/5 rounded-xl p-4 space-y-3">
                    <div><p className="text-[10px] font-semibold text-[#c4c5d9] uppercase tracking-wide">Tipo de Equipo</p><p className="text-sm font-semibold text-[#e4e2e4]">{evento.equipo_tipo || 'Sin Tipo'}</p></div>
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
                      <div><p className="text-[10px] font-semibold text-[#c4c5d9] uppercase">NNE</p><p className="text-xs font-semibold text-[#e4e2e4] truncate">{evento.nne || '-'}</p></div>
                      <div><p className="text-[10px] font-semibold text-[#c4c5d9] uppercase">Serie</p><p className="text-xs font-semibold text-[#e4e2e4] truncate">{evento.serie || '-'}</p></div>
                    </div>
                    <div className="pt-3 border-t border-white/5"><p className="text-[10px] font-semibold text-[#c4c5d9] uppercase">Responsable Actual</p><p className="text-xs font-semibold text-[#e4e2e4]">{evento.responsable_actual || 'SIN ASIGNAR'}</p></div>
                    <div className="pt-3 border-t border-white/5"><p className="text-[10px] font-semibold text-[#c4c5d9] uppercase">Registrado Por</p><p className="text-xs font-semibold text-[#e4e2e4]">{evento.responsable || '-'}</p></div>
                    <div className="pt-3 border-t border-white/5"><p className="text-[10px] font-semibold text-[#c4c5d9] uppercase">Fecha</p><p className="text-xs font-semibold text-[#e4e2e4]">{new Date(evento.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })} · {new Date(evento.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p></div>
                    <div className="pt-3 border-t border-white/5"><p className="text-[10px] font-semibold text-[#c4c5d9] uppercase mb-1.5">Evento</p><span className="inline-flex px-2.5 py-1 bg-white text-zinc-900 text-[10px] font-semibold rounded-lg uppercase tracking-wide">{style.label}</span></div>
                  </div>
                </div>
                <div className="lg:col-span-3">
                  <div className="bg-[#131315] border border-white/5 rounded-xl p-4 h-full">
                    <div className="flex items-center gap-2 mb-3"><span className="w-1.5 h-1.5 rounded-full" style={{ background: style.color }} /><h4 className="text-xs font-bold tracking-wide text-[#e4e2e4]">DETALLE DEL MOVIMIENTO</h4></div>
                    <p className="text-sm text-[#c4c5d9] whitespace-pre-wrap leading-relaxed">{evento.notas || 'Sin notas.'}</p>
                  </div>
                </div>
              </div>
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

export default HistorialDetalleModal;
