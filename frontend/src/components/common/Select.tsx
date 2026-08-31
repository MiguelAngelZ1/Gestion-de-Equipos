import { ChevronDown } from 'lucide-react';

export default function Select({ value, onChange, options = [], placeholder, className = "", label, error, icon: Icon, name, required, disabled = false, ...props }: any) {
  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      {label && <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">{Icon && <Icon className="w-3.5 h-3.5" />}{label} {required && <span className="text-red-500">*</span>}</label>}
      <div className="relative">
        <select name={name} value={value} onChange={onChange} disabled={disabled} required={required}
          className={`w-full bg-zinc-900 border text-sm rounded-xl px-4 py-3 pr-10 focus:outline-none focus:border-zinc-700 appearance-none ${error ? 'border-red-500/50' : 'border-zinc-800'} ${disabled ? 'opacity-50' : ''}`} {...props}>
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map((o: any) => <option key={o.value} value={o.value} className="bg-zinc-900">{o.label}</option>)}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
