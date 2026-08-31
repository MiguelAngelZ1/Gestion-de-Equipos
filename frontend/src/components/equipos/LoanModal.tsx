import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Send, Loader2 } from 'lucide-react';

const InputError = ({ message }: any) => (
  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-[11px] font-medium text-[#ffb4ab] mt-1.5 ml-1">{message}</motion.p>
);

const LoanModal = ({ isOpen, equipo, onClose, onConfirm }) => {
  const [formData, setFormData] = useState({
    solicitante: '',
    motivo: '',
    fecha_prestamo: '',
    fecha_devolucion_estimada: '',
    notas: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        solicitante: '',
        motivo: '',
        fecha_prestamo: new Date().toISOString().split('T')[0],
        fecha_devolucion_estimada: '',
        notas: ''
      });
      setErrors({});
      setIsSaving(false);
    }
  }, [isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.solicitante.trim()) newErrors.solicitante = 'El solicitante es obligatorio';
    if (!formData.motivo.trim()) newErrors.motivo = 'El motivo es obligatorio';
    if (!formData.fecha_prestamo) newErrors.fecha_prestamo = 'La fecha de inicio es obligatoria';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (validate()) {
      setIsSaving(true);
      try {
        await onConfirm(formData);
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={!isSaving ? onClose : undefined} className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.97, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 8 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }} onClick={e => e.stopPropagation()} className="bg-[#1C1C1E] border border-white/5 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center gap-3 shrink-0">
              <span className="material-symbols-outlined text-[#e4e2e4] text-[24px]">calendar_month</span>
              <div className="min-w-0">
                <h2 className="text-[16px] font-semibold text-[#e4e2e4] leading-none">Registrar Préstamo</h2>
                <p className="text-xs text-[#c4c5d9] mt-0.5 truncate">Equipo: <span className="text-[#b8c3ff] font-semibold">{equipo?.ine || equipo?.nne || equipo?.serie || '—'}</span></p>
              </div>
              <button onClick={onClose} disabled={isSaving} className="ml-auto w-8 h-8 grid place-items-center rounded-full hover:bg-white/5 text-[#c4c5d9] disabled:opacity-50">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-4">
              <div className="space-y-4">
                <h3 className="text-xs font-bold tracking-wide text-[#e4e2e4] flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#b8c3ff]" /> INFORMACIÓN DEL PRÉSTAMO</h3>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${errors.solicitante ? 'text-[#ffb4ab]' : 'text-[#c4c5d9]'}`}>Solicitante <span className="text-[#ffb4ab]">*</span></label>
                  <input type="text" disabled={isSaving} placeholder="Nombre de la persona o área..." value={formData.solicitante} onChange={e => setFormData({...formData, solicitante: e.target.value})} className={`w-full bg-[#131315] border text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#b8c3ff]/40 transition-colors placeholder:text-zinc-600 ${errors.solicitante ? 'border-[#ffb4ab]/50 bg-[#ffb4ab]/5' : 'border-white/5'}`} />
                  {errors.solicitante && <InputError message={errors.solicitante} />}
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${errors.motivo ? 'text-[#ffb4ab]' : 'text-[#c4c5d9]'}`}>Motivo del Préstamo <span className="text-[#ffb4ab]">*</span></label>
                  <input type="text" disabled={isSaving} placeholder="Ej: Presentación de proyecto, Mantenimiento temporal..." value={formData.motivo} onChange={e => setFormData({...formData, motivo: e.target.value})} className={`w-full bg-[#131315] border text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#b8c3ff]/40 transition-colors placeholder:text-zinc-600 ${errors.motivo ? 'border-[#ffb4ab]/50 bg-[#ffb4ab]/5' : 'border-white/5'}`} />
                  {errors.motivo && <InputError message={errors.motivo} />}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${errors.fecha_prestamo ? 'text-[#ffb4ab]' : 'text-[#c4c5d9]'}`}>Desde <span className="text-[#ffb4ab]">*</span></label>
                    <input type="date" disabled={isSaving} value={formData.fecha_prestamo} onChange={e => setFormData({...formData, fecha_prestamo: e.target.value})} className={`w-full bg-[#131315] border text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#b8c3ff]/40 transition-colors [color-scheme:dark] ${errors.fecha_prestamo ? 'border-[#ffb4ab]/50 bg-[#ffb4ab]/5' : 'border-white/5'}`} />
                    {errors.fecha_prestamo && <InputError message={errors.fecha_prestamo} />}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-[#c4c5d9]">Hasta</label>
                    <input type="date" disabled={isSaving} value={formData.fecha_devolucion_estimada} onChange={e => setFormData({...formData, fecha_devolucion_estimada: e.target.value})} className="w-full bg-[#131315] border border-white/5 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#b8c3ff]/40 transition-colors [color-scheme:dark]" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-[#c4c5d9]">Notas adicionales (Opcional)</label>
                  <textarea rows={3} disabled={isSaving} placeholder="Detalles sobre el estado actual o condiciones..." value={formData.notas} onChange={e => setFormData({...formData, notas: e.target.value})} className="w-full bg-[#131315] border border-white/5 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#b8c3ff]/40 transition-colors placeholder:text-zinc-600 resize-none" />
                </div>
              </div>
            </form>

            <div className="p-4 border-t border-white/5 flex justify-end gap-2 shrink-0">
              <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-[#c4c5d9] hover:text-white disabled:opacity-50">Cancelar</button>
              <button onClick={handleSubmit} disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-white hover:text-white inline-flex items-center gap-2 disabled:opacity-50">
                {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</> : <><Send className="w-4 h-4" /> Registrar</>}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default LoanModal;
