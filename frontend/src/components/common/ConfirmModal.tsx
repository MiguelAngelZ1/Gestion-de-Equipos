import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message?: string;
  children?: React.ReactNode;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'success' | 'warning' | 'info';
  isLoading?: boolean;
}

const ConfirmModal = ({ isOpen, title, message, children, onConfirm, onClose, confirmText = "Confirmar", cancelText = "Cancelar", type = "danger", isLoading: manualLoading = false }: ConfirmModalProps) => {
  const [internalLoading, setInternalLoading] = React.useState(false);
  const isLoading = manualLoading || internalLoading;
  const titleRef = React.useRef(null);
  const [titleId] = React.useState(() => `confirm-modal-title-${Math.random().toString(36).substr(2, 9)}`);

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
    const container = document.getElementById(titleId)?.closest('[role="dialog"]');
    if (!container) return;
    const focusable = container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const handleTab = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          (last as HTMLElement)?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          (first as HTMLElement)?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTab);
    (first as HTMLElement)?.focus();
    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen, titleId]);

  if (typeof document === 'undefined') return null;

  const colors = {
    danger: {
      bg: "bg-white/5",
      border: "border-white/5",
      icon: "text-white",
      button: "text-red-400 hover:text-red-300",
      gradient: "from-white/5"
    },
    success: {
      bg: "bg-white/5",
      border: "border-white/5",
      icon: "text-white",
      button: "text-white hover:text-white",
      gradient: "from-white/5"
    },
    warning: {
      bg: "bg-white/5",
      border: "border-white/5",
      icon: "text-white",
      button: "text-white hover:text-white",
      gradient: "from-white/5"
    },
    info: {
      bg: "bg-white/5",
      border: "border-white/5",
      icon: "text-white",
      button: "text-white hover:text-white",
      gradient: "from-white/5"
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
          aria-labelledby={titleId}
          className="fixed inset-0 z-[200] flex items-center justify-center p-6 sm:p-6 bg-black/85 backdrop-blur-md h-[100dvh] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className={`bg-[#1C1C1E] border border-white/5 shadow-2xl rounded-2xl w-full max-w-xs relative overflow-hidden flex flex-col max-h-[calc(100dvh-40px)]`}
          >
            <div className={`absolute top-0 left-0 right-0 h-24 bg-gradient-to-br ${style.gradient} to-transparent pointer-events-none`}></div>
            <div className="p-5 relative z-10 flex flex-col items-start text-left">
                <AlertTriangle className="w-5 h-5 text-zinc-500 absolute top-5 left-5" />
                <h3 ref={titleRef} id={titleId} className="text-lg font-bold text-white tracking-tight mb-2 font-outfit pt-6">{title}</h3>
               <div className="w-full mb-6 sm:mb-8 text-left">
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
                  className={`flex-1 bg-transparent text-[#c4c5d9] hover:text-white font-bold py-2.5 transition-colors text-sm ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {cancelText}
                </button>
                <button 
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className={`flex-1 bg-transparent ${style.button} font-bold py-2.5 transition-colors text-sm flex items-center justify-center gap-2 ${isLoading ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'}`}
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
