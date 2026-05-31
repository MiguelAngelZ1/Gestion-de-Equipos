import React from 'react';
import { Search } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const SearchInput = ({ value, onChange, placeholder = "Buscar...", className = "", disabled = false }: SearchInputProps) => {
  return (
    <div className={`relative inline-block ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={placeholder || "Buscar en el sistema"}
        className={`w-full pl-12 pr-5 py-3 rounded-2xl bg-white/5 border border-white/10 outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white/10 transition-all text-white font-medium placeholder:text-slate-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={disabled}
      />
    </div>
  );
};

export default SearchInput;
