import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Loader2 } from 'lucide-react';

const ConfirmModal = ({ isOpen, title, message, children, onConfirm, onClose, confirmText = "Confirmar", cancelText = "Cancelar", type = "danger", isLoading: manualLoading = false }) => {
  const [internalLoading, setInternalLoading] = React.useState(false);
  const isLoading = manualLoading || internalLoading;
  const titleRef = React.useRef(null);
  const titleId = React.useRef(`confirm-modal-title-${Math.random().toString(36).substr(2, 9)}`);

  React.useEffect(() => {
    if (isOpen) setInternalLoading(false);
  }, [isOpen]);

  const handleConfirm = async () => {
    if (isLoading) return;

    const result = onConfirm();
    if (result instanceof Promise) {
      setInternalLoading(true);
      try {
        await result;
      } finally {
        setInternalLoading(false);
      }
    }
  };

  React.useEffect(() => {
    if (!isOpen) return;
    const container = document.getElementById(titleId.current)?.closest('[role="dialog"]');
    if (!container) return;
    const focusable = container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const handleTab = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTab);
    first?.focus();
    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  if (typeof document === 'undefined') return null;

  const colors = {
    danger: {
      bg: "bg-rose-500/10",
      border: "border-rose-500/20",
      icon: "text-rose-500",
      button: "bg-rose-600 hover:bg-rose-500 shadow-[0_0_20px_rgba(225,29,72,0.3)]",
      gradient: "from-rose-900/20"
    },
    success: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      icon: "text-emerald-500",
      button: "bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]",
      gradient: "from-emerald-900/20"
    },
    warning: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      icon: "text-amber-500",
      button: "bg-amber-600 hover:bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]",
      gradient: "from-amber-900/20"
    },
    info: {
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/20",
      icon: "text-indigo-500",
      button: "bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.3)]",
      gradient: "from-indigo-900/20"
    }
  };

  const style = colors[type] || colors.danger;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={!isLoading ? onClose : undefined}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId.current}
          className="fixed inset-0 z-[200] flex items-center justify-center p-6 sm:p-6 bg-black/85 backdrop-blur-md h-[100dvh] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className={`bg-[#0f1523] border ${style.border} shadow-2xl rounded-3xl w-full max-w-sm relative overflow-hidden flex flex-col max-h-[calc(100dvh-40px)]`}
          >
            <div className={`absolute top-0 left-0 right-0 h-32 bg-gradient-to-br ${style.gradient} to-transparent pointer-events-none`}></div>
            <div className="p-8 relative z-10 flex flex-col items-center text-center">
              <div className={`${style.bg} p-4 rounded-3xl border ${style.border} mb-5`}>
                 <AlertTriangle className={`w-10 h-10 ${style.icon}`} />
              </div>
              <h3 ref={titleRef} id={titleId.current} className="text-2xl font-black text-white tracking-tight mb-3 font-outfit">{title}</h3>
              <div className="w-full mb-8">
                {children || (
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {message}
                  </p>
                )}
              </div>
              <div className="flex w-full gap-3">
                <button 
                  onClick={onClose}
                  disabled={isLoading}
                  className={`flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-2.5 rounded-xl transition-all border border-white/10 hover:border-white/20 text-sm ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {cancelText}
                </button>
                <button 
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className={`flex-1 ${style.button} text-white font-bold py-2.5 rounded-xl transition-all text-sm flex items-center justify-center gap-2 ${isLoading ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      ...
                    </>
                  ) : confirmText}
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

export default ConfirmModal;
