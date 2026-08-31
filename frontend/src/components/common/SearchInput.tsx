import { Search } from 'lucide-react';

export default function SearchInput({ value, onChange, placeholder = "Buscar...", className = "", disabled = false }: any) {
  return (
    <div className={`relative inline-block w-auto ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
      <input value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} size={placeholder.length}
        className={`w-auto min-w-0 pl-10 pr-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 outline-none focus:border-zinc-700 focus:bg-zinc-800 transition-colors text-sm placeholder:text-zinc-500 field-sizing-content max-w-full ${disabled ? 'opacity-50' : ''}`} />
    </div>
  );
}
