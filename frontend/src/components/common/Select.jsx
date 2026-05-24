import React from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Componente Select Global estandarizado.
 * @param {Object} props - Propiedades del componente.
 * @param {string} props.value - Valor seleccionado.
 * @param {function} props.onChange - Handler para el cambio de valor.
 * @param {Array} props.options - Lista de opciones [{value: '', label: ''}].
 * @param {string} props.placeholder - Texto del placeholder opcional.
 * @param {string} props.className - Clases adicionales.
 * @param {string} props.label - Etiqueta superior opcional.
 * @param {string} props.error - Mensaje de error opcional.
 * @param {React.ReactNode} props.icon - Icono opcional a la izquierda.
 */
const Select = ({ 
  value, 
  onChange, 
  options = [], 
  placeholder, 
  className = "", 
  label, 
  error,
  icon: Icon,
  name,
  required,
  disabled = false,
  ...props 
}) => {
  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      {label && (
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
          {Icon && <Icon className="w-3.5 h-3.5" />}
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      
      <div className="relative group">
        <select
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={`
            w-full bg-[#1e293b] border text-white rounded-xl px-4 py-3 
            focus:outline-none focus:ring-2 focus:ring-indigo-500/50 
            cursor-pointer font-medium appearance-none transition-all
            ${error ? 'border-rose-500/50 bg-rose-500/5' : 'border-white/10 group-hover:border-white/20'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${className}
          `}
          {...props}
        >
          {placeholder && (
            <option value="" disabled className="bg-[#1e293b] text-slate-500">
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option 
              key={opt.value} 
              value={opt.value} 
              className="bg-[#1e293b] text-white py-2"
            >
              {opt.label}
            </option>
          ))}
        </select>
        
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 group-hover:text-white transition-colors">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
      
      {error && (
        <p className="text-rose-400 text-[10px] font-bold uppercase tracking-wider ml-1 animate-in fade-in slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  );
};

export default Select;
