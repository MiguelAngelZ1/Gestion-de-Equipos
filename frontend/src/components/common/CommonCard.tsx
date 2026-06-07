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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      layoutId={layoutId}
      onClick={onClick}
      className={`bg-[#1e293b]/60 hover:bg-[#1e293b]/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/10 ${compact ? 'p-3.5' : 'p-5'} flex flex-row gap-0 transition-colors group cursor-pointer h-full relative ${isSelected ? 'ring-2 ring-indigo-500/50 bg-[#1e293b]/90' : ''}`}
    >
      {selectable && (
        <div 
          onClick={(e) => { e.stopPropagation(); if (onSelect) onSelect(); }}
          className="flex flex-col items-center justify-start shrink-0 pr-2 pt-0.5 min-w-[44px] min-h-[44px]"
        >
          <div className={`p-2.5 rounded-lg transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-[0_0_10px_rgba(79,70,229,0.4)]' : 'bg-white/5 text-slate-500 hover:text-indigo-400'}`}>
            {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
      {badge && badgeAbsolute && (
        <div className="absolute top-4 right-4 z-20">
           <span 
             className={`text-[9px] uppercase tracking-[0.1em] font-black px-2 py-1 rounded-lg border shadow-sm ${!badgeColor.startsWith('#') ? `${badgeColor} border-white/5` : ''}`}
             style={badgeColor.startsWith('#') ? {
               backgroundColor: `${badgeColor}15`,
               color: badgeColor,
               borderColor: `${badgeColor}33`
             } : {}}
           >
             {badge}
           </span>
        </div>
      )}

      <div className={`${compact ? 'mb-2' : 'mb-4'} space-y-3`}>
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={`bg-indigo-500/10 ${compact ? 'p-2' : 'p-3'} rounded-xl border border-indigo-500/20 shrink-0 ${badgeAbsolute ? 'mt-4' : ''}`}>
              <Icon className={`${compact ? 'w-4 h-4' : 'w-6 h-6'} text-indigo-400`} />
            </div>
          )}
          <div className={`min-w-0 flex-1 ${badgeAbsolute ? 'mt-4' : ''}`}>
            <h3 className={`text-white font-black tracking-tighter ${compact ? 'text-sm' : 'text-lg'} leading-[1.1] break-words line-clamp-2`} title={title}>
              {title}
            </h3>
          </div>
        </div>
        {badge && !badgeAbsolute && (
          <div className="flex">
             <span 
               className={`${compact ? 'text-[8px] py-1 px-2' : 'text-[10px] py-1.5 px-3'} uppercase tracking-[0.15em] font-black rounded-lg border shadow-lg ${!badgeColor.startsWith('#') ? `${badgeColor} border-white/5` : ''}`}
               style={badgeColor.startsWith('#') ? {
                 backgroundColor: `${badgeColor}15`, // 15 es ~8% de opacidad en hex
                 color: badgeColor,
                 borderColor: `${badgeColor}33` // 33 es ~20% de opacidad en hex
               } : {}}
             >
               {badge}
             </span>
          </div>
        )}
      </div>

      <div className={`${compact ? 'space-y-1 mb-2' : 'space-y-3 mb-5'} flex-1`}>
        {children}
      </div>

      {/* Footer Actions */}
      <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2 mt-auto">
        {onView && (
          <button 
            onClick={(e) => { e.stopPropagation(); onView(); }}
            className={`bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 font-bold ${compact ? 'px-2.5 py-1.5 rounded-lg' : 'px-4 py-2 rounded-xl'} transition-all border border-indigo-500/20 cursor-pointer flex items-center justify-center gap-2 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-transparent active:scale-95`}
          >
            <Eye className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
            <span className={`${compact ? 'text-[9px]' : 'text-[10px]'} uppercase tracking-widest`}>Detalles</span>
          </button>
        )}
        
        <div className="flex items-center gap-1.5">
          {onHistory && (
            <button 
              onClick={(e) => { e.stopPropagation(); onHistory(); }}
              className={`bg-white/5 hover:bg-white/10 text-slate-300 ${compact ? 'p-1.5 rounded-lg' : 'p-2 rounded-xl'} transition-all border border-transparent hover:border-white/10 cursor-pointer flex items-center justify-center`}
              aria-label="Historial"
              title="Historial de Movimientos"
            >
              <History className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} aria-hidden="true" />
            </button>
          )}
          {onEdit && (
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className={`bg-white/5 hover:bg-white/10 text-slate-300 ${compact ? 'p-1.5 rounded-lg' : 'p-2 rounded-xl'} transition-all border border-transparent hover:border-white/10 cursor-pointer flex items-center justify-center`}
              aria-label={`Editar ${title}`}
              title="Editar"
            >
              <Edit2 className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} aria-hidden="true" />
            </button>
          )}
          {onDelete && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className={`bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 ${compact ? 'p-1.5 rounded-lg' : 'p-2 rounded-xl'} transition-all border border-transparent hover:border-rose-500/20 cursor-pointer flex items-center justify-center`}
              aria-label={`Eliminar ${title}`}
              title="Eliminar"
            >
              <Trash2 className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  </motion.div>
  );
};

export default CommonCard;
