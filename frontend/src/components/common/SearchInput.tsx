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
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={placeholder || "Buscar"}
        className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40 focus:bg-white/[0.07] transition-all text-white text-sm font-medium placeholder:text-slate-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={disabled}
      />
    </div>
  );
};

export default SearchInput;
