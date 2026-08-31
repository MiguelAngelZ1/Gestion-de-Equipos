import React, { useEffect } from 'react';
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
      bg: "bg-white/5",
      border: "border-white/5",
      icon: <CheckCircle2 className="w-5 h-5 text-white" />,
      accent: "bg-white"
    },
    error: {
      bg: "bg-white/5",
      border: "border-white/5",
      icon: <AlertCircle className="w-5 h-5 text-white" />,
      accent: "bg-white"
    },
    warning: {
      bg: "bg-white/5",
      border: "border-white/5",
      icon: <AlertCircle className="w-5 h-5 text-white" />,
      accent: "bg-white"
    },
    info: {
      bg: "bg-white/5",
      border: "border-white/5",
      icon: <Info className="w-5 h-5 text-white" />,
      accent: "bg-white"
    }
  };

  const config = configs[type] || configs.info;

  return (
    <div
      className={`pointer-events-auto w-full bg-[#1C1C1E] border ${config.border} rounded-2xl shadow-2xl flex relative overflow-hidden group animate-toast-enter`}
    >
      <div 
        className={`absolute bottom-0 left-0 h-0.5 ${config.accent} opacity-50 animate-toast-progress`}
      />

      <div className="p-4 flex gap-4 items-start w-full">
        <div className={`p-2 rounded-xl ${config.bg} shrink-0`}>
          {config.icon}
        </div>
        
        <div className="flex-1 min-w-0 pr-6">
          <h4 className="text-white font-semibold text-sm tracking-tight">{title}</h4>
          <p className="text-[#c4c5d9] text-xs font-medium leading-relaxed truncate">
            {message}
          </p>
        </div>

        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-[#c4c5d9] hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.accent}`} />
    </div>
  );
};

export default Toast;
