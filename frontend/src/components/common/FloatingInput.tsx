import React, { useState, useId } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface FloatingInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  icon?: React.ReactNode;
  error?: boolean;
  containerClassName?: string;
}

const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ label, icon, error, containerClassName = '', className = '', type, ...props }, ref) => {
    const id = useId();
    const [focused, setFocused] = useState(false);
    const [hasValue, setHasValue] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const isFloating = focused || hasValue;
    const isPassword = type === 'password';

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(e.target.value.length > 0);
      props.onChange?.(e);
    };

    return (
      <div className={`relative group ${containerClassName}`}>
        {/* Icon */}
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-slate-400 group-focus-within:text-cyan-400 transition-colors pointer-events-none">
            {icon}
          </div>
        )}

        {/* Input wrapper */}
        <div className="relative">
          <input
            ref={ref}
            id={id}
            type={isPassword && showPassword ? 'text' : type}
            className={`w-full bg-transparent border rounded-xl outline-none transition-all duration-300 text-white font-medium placeholder-transparent ${
              icon ? 'pl-12' : 'pl-4'
            } ${isPassword ? 'pr-12' : 'pr-4'} py-4 ${
              error
                ? 'border-rose-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20'
                : 'border-white/15 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'
            } ${className}`}
            placeholder={label}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={handleChange}
            {...props}
          />

          {/* Floating label */}
          <label
            htmlFor={id}
            className={`absolute left-4 transition-all duration-300 pointer-events-none font-semibold ${
              icon ? 'left-12' : 'left-4'
            } ${
              isFloating
                ? 'top-[-10px] text-[11px] tracking-wide bg-black px-1.5'
                : 'top-1/2 -translate-y-1/2 text-sm'
            } ${
              error
                ? 'text-rose-400'
                : isFloating
                ? 'text-cyan-400'
                : 'text-slate-400'
            }`}
          >
            {label}
          </label>

          {/* Password toggle */}
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1 cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>
    );
  }
);

FloatingInput.displayName = 'FloatingInput';

export default FloatingInput;
