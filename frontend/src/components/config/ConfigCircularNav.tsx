import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { overlayFade } from '../../lib/motion';
import { X } from 'lucide-react';

export interface ConfigNavItem {
  id: string;
  label: string;
  icon: any;
}

export function ConfigNavTrigger({
  tabs,
  active,
  onOpen,
}: {
  tabs: ConfigNavItem[];
  active: string;
  onOpen: () => void;
}) {
  const cur = tabs.find((t) => t.id === active);
  const Icon = cur?.icon;
  return (
    <button
      onClick={onOpen}
      className="tap-feedback lg:hidden fixed bottom-20 right-4 z-[60] w-12 h-12 rounded-full flex items-center justify-center bg-zinc-900 border border-zinc-800 shadow-xl"
      aria-haspopup="menu"
      aria-label="Abrir menú de ajustes"
    >
      {Icon && <Icon className="w-5 h-5 text-zinc-100 shrink-0" />}
    </button>
  );
}

export function ConfigCircularNav({
  tabs,
  active,
  open,
  onClose,
  onSelect,
}: {
  tabs: ConfigNavItem[];
  active: string;
  open: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          {...overlayFade}
          onClick={onClose}
          role="menu"
          aria-label="Secciones de ajustes"
          className="lg:hidden fixed inset-0 z-[50] flex items-center justify-center modal-overlay h-[100dvh]"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative aspect-square w-[280px] max-w-[80vw] rounded-full flex items-center justify-center shrink-0"
            style={{
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <button
              onClick={onClose}
              aria-label="Cerrar menú"
              className="absolute aspect-square flex items-center justify-center w-12 h-12 rounded-full bg-white text-zinc-900 z-10 active:scale-95 transition-transform"
            >
              <X className="w-6 h-6" />
            </button>

            {tabs.map((t, i) => {
              const Icon = t.icon;
              const angle = (360 / tabs.length) * i - 90;
              const isActive = t.id === active;
              return (
                <div
                  key={t.id}
                  className="absolute"
                  style={{
                    transform: `rotate(${angle}deg) translate(min(30vw,104px)) rotate(${-angle}deg)`,
                  }}
                >
                  <button
                    role="menuitem"
                    onClick={() => {
                      onSelect(t.id);
                      onClose();
                    }}
                    onMouseEnter={() => setHovered(t.id)}
                    onMouseLeave={() => setHovered(null)}
                    className={`flex flex-col items-center justify-center w-16 h-16 rounded-full transition-colors duration-200 active:scale-95 ${
                      isActive || hovered === t.id
                        ? 'bg-white text-zinc-900'
                        : 'text-zinc-300'
                    }`}
                  >
                    {Icon && <Icon className="w-5 h-5 mb-0.5 shrink-0" />}
                    <span className="text-[9px] font-semibold leading-tight text-center whitespace-nowrap w-auto px-1">
                      {t.label}
                    </span>
                  </button>
                </div>
              );
            })}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}