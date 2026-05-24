import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Loader2 } from 'lucide-react';

const EquipoDeleteModal = ({ isOpen, equipo, onClose, onConfirm }) => {
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) setIsSaving(false);
  }, [isOpen]);

  const handleDelete = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onConfirm(equipo.id);
    } finally {
      setIsSaving(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && equipo && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={!isSaving ? onClose : undefined}
          className="fixed inset-0 z-[120] flex items-center justify-center p-5 sm:p-6 bg-black/85 backdrop-blur-md h-[100dvh] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0f1523] border border-rose-500/20 shadow-[0_0_50px_rgba(244,63,94,0.15)] rounded-3xl w-full max-w-sm relative overflow-hidden flex flex-col max-h-[calc(100dvh-40px)] overflow-y-auto"
          >
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-rose-900/20 to-transparent pointer-events-none"></div>
            <div className="p-8 relative z-10 flex flex-col items-center text-center">
              <div className="bg-rose-500/10 p-4 rounded-3xl border border-rose-500/20 mb-5">
                 <AlertTriangle className="w-10 h-10 text-rose-500" />
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight mb-3">Eliminar Equipo</h3>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                ¿Estás totalmente seguro que deseas eliminar permanentemente el equipo <span className="text-white font-bold bg-white/5 px-2 py-0.5 rounded border border-white/10">{equipo.ine}</span> del sistema?
              </p>
              <div className="flex w-full gap-3">
                <button 
                  onClick={onClose}
                  disabled={isSaving}
                  className={`flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-2.5 rounded-xl transition-all border border-white/10 hover:border-white/20 text-sm ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={isSaving}
                  className={`flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl transition-all shadow-[0_0_20px_rgba(225,29,72,0.3)] text-sm flex items-center justify-center gap-2 ${isSaving ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      ...
                    </>
                  ) : 'Eliminar'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default EquipoDeleteModal;
