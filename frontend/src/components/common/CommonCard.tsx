import { Eye, Edit2, Trash2, Square, CheckSquare, History, Calendar } from 'lucide-react';

interface Props {
  icon?: any;
  title: string;
  badge?: string;
  badgeColor?: string;
  children?: React.ReactNode;
  onView?: () => void;
  onEdit?: (() => void) | null;
  onDelete?: (() => void) | null;
  onClick?: () => void;
  selectable?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  onHistory?: () => void;
  onLoan?: () => void;
  layoutId?: string;
  badgeAbsolute?: boolean;
  compact?: boolean;
}

export default function CommonCard({ icon: Icon, title, badge, badgeColor, children, onView, onEdit, onDelete, onClick, selectable, isSelected, onSelect, onHistory, onLoan }: Props) {
  return (
    <div onClick={onClick} className={`rounded-xl border p-4 flex flex-col gap-3 cursor-pointer transition-colors ${isSelected ? 'bg-white border-white text-zinc-900' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && <div className="relative shrink-0 grid place-items-center"><Icon className={`w-5 h-5 ${isSelected ? 'text-zinc-900' : 'text-zinc-400'}`} />{badge && badgeColor && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2" style={{ background: badgeColor, borderColor: isSelected ? '#fff' : '#18181b' }} />}</div>}
          <h3 className={`text-sm font-semibold truncate ${isSelected ? 'text-zinc-900' : 'text-zinc-50'}`} title={title}>{title}</h3>
        </div>
        {selectable && (
          <button onClick={e => { e.stopPropagation(); onSelect?.(); }} className={`w-7 h-7 grid place-items-center shrink-0 ${isSelected ? 'text-zinc-900' : 'text-zinc-500 hover:text-zinc-300'}`}>
            {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
          </button>
        )}
      </div>
      <div className={`space-y-1 text-sm ${isSelected ? 'text-zinc-600' : 'text-zinc-400'}`}>{children}</div>
      <div className={`pt-3 border-t flex items-center justify-between ${isSelected ? 'border-zinc-200' : 'border-zinc-800'}`}>
        <div className="flex items-center gap-3">
          {onView ? <button onClick={e => { e.stopPropagation(); onView(); }} className={`inline-flex items-center gap-1.5 text-xs font-semibold ${isSelected ? 'text-zinc-900' : 'text-[#c4c5d9] hover:text-white'}`}><Eye className="w-3.5 h-3.5" /> Ver</button> : <span />}
          {onLoan && <button onClick={e => { e.stopPropagation(); onLoan(); }} className={`inline-flex items-center gap-1.5 text-xs font-semibold ${isSelected ? 'text-zinc-700' : 'text-[#c4c5d9] hover:text-white'}`}><Calendar className="w-3.5 h-3.5" /> Prestar</button>}
        </div>
        <div className="flex items-center gap-1">
          {onHistory && <button onClick={e => { e.stopPropagation(); onHistory(); }} className={`w-8 h-8 grid place-items-center ${isSelected ? 'text-zinc-700' : 'text-[#c4c5d9] hover:text-white'}`}><History className="w-4 h-4" /></button>}
          {onEdit && <button onClick={e => { e.stopPropagation(); onEdit(); }} className={`w-8 h-8 grid place-items-center ${isSelected ? 'text-zinc-700' : 'text-[#c4c5d9] hover:text-white'}`}><Edit2 className="w-4 h-4" /></button>}
          {onDelete && <button onClick={e => { e.stopPropagation(); onDelete(); }} className="w-8 h-8 grid place-items-center text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>}
        </div>
      </div>
    </div>
  );
}
