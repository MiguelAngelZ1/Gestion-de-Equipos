import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const Toast = ({ title, message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4500); // Duración balanceada (ni muy largo ni muy corto)
    return () => clearTimeout(timer);
  }, [onClose]);

  const configs = {
    success: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
      accent: "bg-emerald-500"
    },
    error: {
      bg: "bg-rose-500/10",
      border: "border-rose-500/20",
      icon: <AlertCircle className="w-5 h-5 text-rose-500" />,
      accent: "bg-rose-500"
    },
    warning: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      icon: <AlertCircle className="w-5 h-5 text-amber-500" />,
      accent: "bg-amber-500"
    },
    info: {
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/20",
      icon: <Info className="w-5 h-5 text-indigo-400" />,
      accent: "bg-indigo-500"
    }
  };

  const config = configs[type] || configs.info;

  return (
    <motion.div
      initial={{ opacity: 0, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95, transition: { duration: 0.2 } }}
      className={`pointer-events-auto w-full bg-[#1e293b]/90 backdrop-blur-xl border ${config.border} rounded-2xl shadow-2xl flex relative overflow-hidden group`}
    >
      {/* Barra de progreso de cierre */}
      <motion.div 
        initial={{ width: "100%" }}
        animate={{ width: "0%" }}
        transition={{ duration: 4.5, ease: "linear" }}
        className={`absolute bottom-0 left-0 h-0.5 ${config.accent} opacity-50`}
      />

      <div className="p-4 flex gap-4 items-start w-full">
        <div className={`p-2 rounded-xl ${config.bg} shrink-0`}>
          {config.icon}
        </div>
        
        <div className="flex-1 min-w-0 pr-6">
          <h4 className="text-white font-black text-sm tracking-tight">{title}</h4>
          <p className="text-slate-400 text-xs font-medium leading-relaxed truncate">
            {message}
          </p>
        </div>

        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Decorative accent side */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.accent}`} />
    </motion.div>
  );
};

export default Toast;
