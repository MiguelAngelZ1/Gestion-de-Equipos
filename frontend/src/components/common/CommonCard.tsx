import React from 'react';
import { Eye, Edit2, Trash2, Square, CheckSquare, History } from 'lucide-react';
import { motion } from 'framer-motion';

interface CommonCardProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  badge?: string;
  badgeAbsolute?: boolean;
  badgeColor?: string;
  children?: React.ReactNode;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
  layoutId?: string;
  compact?: boolean;
  selectable?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  onHistory?: () => void;
}

const CommonCard = ({
  icon: Icon,
  title,
  badge,
  badgeAbsolute = false,
  badgeColor = "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  children,
  onView,
  onEdit,
  onDelete,
  onClick,
  layoutId,
  compact = false,
  selectable = false,
  isSelected = false,
  onSelect,
  onHistory
}: CommonCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      layoutId={layoutId}
      onClick={onClick}
      className={`bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-3.5 flex flex-row gap-0 transition-all duration-200 group cursor-pointer h-full relative ${
        isSelected ? 'ring-2 ring-indigo-500/40 bg-indigo-500/[0.08] border-indigo-500/20' : ''
      }`}
    >
      {selectable && (
        <div
          onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
          className="flex flex-col items-center justify-start shrink-0 pr-2 pt-0.5 min-w-[44px] min-h-[44px]"
        >
          <div className={`p-2.5 rounded-lg transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-[0_0_10px_rgba(79,70,229,0.3)]' : 'bg-white/5 text-slate-500 hover:text-indigo-400'}`}>
            {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header: Icon + Title + Badge */}
        <div className="flex items-center gap-2.5 mb-2.5">
          {Icon && (
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-indigo-400" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-white font-bold text-sm tracking-tight leading-tight truncate" title={title}>
              {title}
            </h3>
          </div>
          {badge && badgeAbsolute && (
            <span
              className="text-[8px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-md border shrink-0"
              style={badgeColor.startsWith('#') ? {
                backgroundColor: `${badgeColor}15`,
                color: badgeColor,
                borderColor: `${badgeColor}25`
              } : undefined}
            >
              {badge}
            </span>
          )}
        </div>

        {/* Badge (inline, below header) */}
        {badge && !badgeAbsolute && (
          <div className="mb-2.5">
            <span
              className={`text-[8px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-md border ${!badgeColor.startsWith('#') ? badgeColor : ''}`}
              style={badgeColor.startsWith('#') ? {
                backgroundColor: `${badgeColor}15`,
                color: badgeColor,
                borderColor: `${badgeColor}25`
              } : {}}
            >
              {badge}
            </span>
          </div>
        )}

        {/* Children */}
        <div className="flex-1 space-y-1.5">
          {children}
        </div>

        {/* Footer Actions */}
        <div className="pt-2 mt-auto flex items-center justify-between gap-2">
          {onView && (
            <button
              onClick={(e) => { e.stopPropagation(); onView(); }}
              className="bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 font-bold px-3 py-1.5 rounded-lg transition-all border border-indigo-500/20 cursor-pointer flex items-center justify-center gap-1.5 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-transparent active:scale-95"
            >
              <Eye className="w-3 h-3" />
              <span className="text-[9px] uppercase tracking-widest">Ver</span>
            </button>
          )}

          <div className="flex items-center gap-1">
            {onHistory && (
              <button
                onClick={(e) => { e.stopPropagation(); onHistory(); }}
                className="bg-white/5 hover:bg-white/10 text-slate-400 p-1.5 rounded-lg transition-all border border-transparent hover:border-white/10 cursor-pointer"
                aria-label="Historial"
                title="Historial"
              >
                <History className="w-3 h-3" />
              </button>
            )}
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="bg-white/5 hover:bg-white/10 text-slate-400 p-1.5 rounded-lg transition-all border border-transparent hover:border-white/10 cursor-pointer"
                aria-label={`Editar ${title}`}
                title="Editar"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 p-1.5 rounded-lg transition-all border border-transparent hover:border-rose-500/20 cursor-pointer"
                aria-label={`Eliminar ${title}`}
                title="Eliminar"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CommonCard;
