import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, User, FileText, Send, Loader2 } from 'lucide-react';

const spring = { type: 'spring' as const, stiffness: 400, damping: 30 };

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

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div key="loan-modal-overlay" className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <motion.div
            key="loan-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={!isSaving ? onClose : undefined}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          <motion.div
            key="loan-modal-content"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={spring}
            className="relative w-full max-w-lg bg-slate-900 border border-white/20 rounded-2xl sm:rounded-[2rem] shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-white/5 bg-gradient-to-br from-indigo-500/10 to-transparent shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-white">Registrar Préstamo</h2>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">
                      Equipo: <span className="text-indigo-400">{equipo?.ine}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  disabled={isSaving}
                  className={`p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto custom-scrollbar">
              {/* Solicitante */}
              <div className={`space-y-1.5 ${isSaving ? 'opacity-50' : ''}`}>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                  <User className="w-3 h-3" /> Solicitante <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  disabled={isSaving}
                  placeholder="Nombre de la persona o área..."
                  value={formData.solicitante}
                  onChange={(e) => setFormData({...formData, solicitante: e.target.value})}
                  className={`w-full bg-white/5 border ${errors.solicitante ? 'border-rose-500/50 bg-rose-500/5' : 'border-white/10 focus:border-indigo-500/50'} text-white rounded-xl py-2.5 px-3.5 outline-none transition-all placeholder:text-slate-600 font-medium text-sm`}
                />
                {errors.solicitante && <p className="text-rose-400 text-[10px] font-bold uppercase tracking-wider ml-1">{errors.solicitante}</p>}
              </div>

              {/* Motivo */}
              <div className={`space-y-1.5 ${isSaving ? 'opacity-50' : ''}`}>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                  <FileText className="w-3 h-3" /> Motivo del Préstamo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  disabled={isSaving}
                  placeholder="Ej: Presentación de proyecto, Mantenimiento temporal..."
                  value={formData.motivo}
                  onChange={(e) => setFormData({...formData, motivo: e.target.value})}
                  className={`w-full bg-white/5 border ${errors.motivo ? 'border-rose-500/50 bg-rose-500/5' : 'border-white/10 focus:border-indigo-500/50'} text-white rounded-xl py-2.5 px-3.5 outline-none transition-all placeholder:text-slate-600 font-medium text-sm`}
                />
                {errors.motivo && <p className="text-rose-400 text-[10px] font-bold uppercase tracking-wider ml-1">{errors.motivo}</p>}
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`space-y-1.5 ${isSaving ? 'opacity-50' : ''}`}>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" /> DESDE <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    disabled={isSaving}
                    value={formData.fecha_prestamo}
                    onChange={(e) => setFormData({...formData, fecha_prestamo: e.target.value})}
                    className={`w-full bg-white/5 border ${errors.fecha_prestamo ? 'border-rose-500/50 bg-rose-500/5' : 'border-white/10 focus:border-indigo-500/50'} text-white rounded-xl py-2.5 px-3.5 outline-none transition-all cursor-pointer [color-scheme:dark] text-sm`}
                  />
                  {errors.fecha_prestamo && <p className="text-rose-400 text-[10px] font-bold uppercase tracking-wider ml-1">{errors.fecha_prestamo}</p>}
                </div>
                <div className={`space-y-1.5 ${isSaving ? 'opacity-50' : ''}`}>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" /> HASTA
                  </label>
                  <input
                    type="date"
                    disabled={isSaving}
                    value={formData.fecha_devolucion_estimada}
                    onChange={(e) => setFormData({...formData, fecha_devolucion_estimada: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 focus:border-indigo-500/50 text-white rounded-xl py-2.5 px-3.5 outline-none transition-all cursor-pointer [color-scheme:dark] text-sm"
                  />
                </div>
              </div>

              {/* Notas */}
              <div className={`space-y-1.5 ${isSaving ? 'opacity-50' : ''}`}>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Notas adicionales (Opcional)</label>
                <textarea
                  rows={3}
                  disabled={isSaving}
                  placeholder="Detalles sobre el estado actual o condiciones..."
                  value={formData.notas}
                  onChange={(e) => setFormData({...formData, notas: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 focus:border-indigo-500/50 text-white rounded-xl py-2.5 px-3.5 outline-none transition-all placeholder:text-slate-600 font-medium resize-none text-sm"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 flex gap-2.5 sticky bottom-0 bg-slate-900 pb-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className={`flex-1 bg-white/5 hover:bg-white/10 text-slate-400 py-2.5 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all border border-white/5 ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className={`flex-[2] bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all shadow-[0_0_24px_rgba(79,70,229,0.3)] flex items-center justify-center gap-2 ${isSaving ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Procesando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Registrar
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default LoanModal;
