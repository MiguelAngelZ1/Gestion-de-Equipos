import React, { useState, useEffect } from 'react';
import { Play, RotateCw, AlertCircle, Cpu, Laptop, Smartphone, Printer, Server, Edit2, Activity, Network, MapPinned, Copy, ChevronRight, Bookmark } from 'lucide-react';
import ConfirmModal from '../common/ConfirmModal';
import SearchInput from '../common/SearchInput';
import Select from '../common/Select';
import { createPortal } from 'react-dom';

interface ScannerTableProps {
  nodes: any[];
  isScanning: boolean;
  scanProgress: { scanned: number; total: number; percentage: number; found: number } | null;
  onStartScan: () => void;
  onRename: (node: any, alias: string) => void;
  onPing: (ip: string) => void;
  onTracert: (ip: string) => void;
  onGraph: (node: any) => void;
  onReserve?: (node: any, notas: string) => void;
}

const ScannerTable: React.FC<ScannerTableProps> = ({
  nodes,
  isScanning,
  scanProgress,
  onStartScan,
  onRename,
  onPing,
  onTracert,
  onGraph,
  onReserve
}) => {
  const [search, setSearch] = useState('');
  const [filterState, setFilterState] = useState('');
  const [menu, setMenu] = useState<{ x: number; y: number; node: any } | null>(null);
  const [showCopy, setShowCopy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [reserveNode, setReserveNode] = useState<any | null>(null);
  const [reserveText, setReserveText] = useState('');

  useEffect(() => {
    const close = () => { setMenu(null); setShowCopy(false); };
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    return () => { window.removeEventListener('click', close); window.removeEventListener('scroll', close, true); };
  }, []);

  const startEdit = (node: any) => { setEditingId(node.id); setEditingValue(node.alias || node.hostname_actual || ''); };
  const commitEdit = (node: any) => { if (editingId === node.id) { onRename(node, editingValue.trim()); setEditingId(null); } };
  const cancelEdit = () => setEditingId(null);

  const filtered = nodes.filter((n) => {
    const q = search.toLowerCase();
    const displayName = (n.alias || n.hostname_actual || n.equipo_ine || '').toLowerCase();
    const matchSearch =
      n.ip.includes(q) ||
      displayName.includes(q) ||
      (n.mac_actual || '').toLowerCase().includes(q) ||
      (n.fabricante_actual || '').toLowerCase().includes(q);
    const matchFilter = !filterState || filterState === 'ALL' || n.estado_monitoreo === filterState;
    return matchSearch && matchFilter;
  });

  const getRoleIcon = (rol: string, fabricante?: string) => {
    const r = (rol || '').toUpperCase();
    const f = (fabricante || '').toLowerCase();
    if (r === 'GATEWAY' || f.includes('fortinet')) return <Server className="w-4 h-4 text-amber-400" />;
    if (r === 'SWITCH' || f.includes('cisco')) return <Server className="w-4 h-4 text-cyan-400" />;
    if (r === 'VOIP' || f.includes('grandstream') || f.includes('yealink')) return <Smartphone className="w-4 h-4 text-indigo-400" />;
    if (r === 'PRINTER') return <Printer className="w-4 h-4 text-emerald-400" />;
    if (r === 'POSIBLE_VIRTUAL') return <Cpu className="w-4 h-4 text-purple-400" />;
    return <Laptop className="w-4 h-4 text-zinc-400" />;
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="p-3 border-b border-zinc-800 bg-zinc-900/40 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onStartScan}
            disabled={isScanning}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-zinc-950 text-xs font-bold transition-all shadow-md cursor-pointer disabled:cursor-not-allowed"
          >
            {isScanning ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            {isScanning ? 'Escaneando...' : 'Escanear Red'}
          </button>
        </div>
        <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
          <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar IP, MAC, nombre, fabricante..." className="w-full max-w-xs" />
          <div className="w-36 shrink-0">
            <Select value={filterState} onChange={(e) => setFilterState(e.target.value)} options={[{ value: 'ALL', label: 'Todos' }, { value: 'ONLINE', label: 'En línea' }, { value: 'WARNING', label: 'Inestable' }, { value: 'OFFLINE', label: 'Desconectado' }, { value: 'UNKNOWN', label: 'Desconocido' }]} placeholder="Estado" />
          </div>
        </div>
      </div>
      {isScanning && scanProgress && (
        <div className="p-3 bg-zinc-900 border-b border-zinc-800">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-zinc-400 font-medium">Progreso: {scanProgress.scanned} de {scanProgress.total} IPs analizadas ({scanProgress.found} activos)</span>
            <span className="text-cyan-400 font-bold">{scanProgress.percentage}%</span>
          </div>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-cyan-400 transition-all duration-300 rounded-full" style={{ width: `${scanProgress.percentage}%` }} /></div>
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-zinc-900/80 sticky top-0 z-10 border-b border-zinc-800 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-3 w-12 text-center">Estado</th>
              <th className="py-2.5 px-3">Nombre / Hostname</th>
              <th className="py-2.5 px-3">IP</th>
              <th className="py-2.5 px-3">Dirección MAC</th>
              <th className="py-2.5 px-3">Fabricante</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900 text-zinc-300">
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="py-12 text-center text-zinc-500"><AlertCircle className="w-6 h-6 mx-auto mb-2 text-zinc-600" />No se encontraron dispositivos con los criterios actuales.</td></tr>
            ) : (
              filtered.map((node) => {
                const isOnline = node.estado_monitoreo === 'ONLINE';
                const isWarning = node.estado_monitoreo === 'WARNING';
                const isOffline = node.estado_monitoreo === 'OFFLINE';
                const displayName = node.alias || node.hostname_actual || 'Desconocido';
                return (
                  <tr
                    key={node.id}
                    onClick={(e) => { e.stopPropagation(); setMenu({ x: e.clientX, y: e.clientY, node }); }}
                    className="hover:bg-zinc-900/50 transition-colors group cursor-pointer"
                  >
                    <td className="py-2.5 px-3 text-center">
                      <span className="relative inline-flex h-2.5 w-2.5">
                        {(isOnline || isWarning) && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>}
                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOnline ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]' : isWarning ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)]' : isOffline ? 'bg-red-500' : 'bg-zinc-600'}`} title={isOnline ? 'En línea' : isWarning ? 'Inestable' : isOffline ? 'Desconectado' : 'Desconocido'}></span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-white">
                      {editingId === node.id ? (
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          {getRoleIcon(node.rol, node.fabricante_actual)}
                          <input
                            autoFocus
                            value={editingValue}
                            onChange={e => setEditingValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') commitEdit(node); if (e.key === 'Escape') cancelEdit(); }}
                            onBlur={() => commitEdit(node)}
                            className="bg-zinc-800 border border-cyan-500 rounded-lg px-2 py-1 text-xs text-white w-[200px] focus:outline-none"
                            placeholder="Nombre..."
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">{getRoleIcon(node.rol, node.fabricante_actual)}<span className="truncate max-w-[220px]" title={displayName}>{displayName}</span></div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-zinc-200">{node.ip}</td>
                    <td className="py-2.5 px-3 font-mono text-zinc-400">{node.mac_actual || '-'}</td>
                    <td className="py-2.5 px-3 text-zinc-400 truncate max-w-[180px]" title={node.fabricante_actual || 'Desconocido'}>{node.fabricante_actual || 'Desconocido'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <ConfirmModal
        isOpen={!!reserveNode}
        title="Marcar como reservada"
        confirmText="Reservar"
        cancelText="Cancelar"
        type="info"
        onClose={() => setReserveNode(null)}
        onConfirm={() => {
          if (!reserveText.trim()) return;
          onReserve?.(reserveNode, reserveText.trim());
          setReserveNode(null);
        }}
      >
        <div className="space-y-3 text-left">
          <p className="text-sm text-zinc-400">IP <span className="font-mono text-white">{reserveNode?.ip}</span> — escribe el nombre libre</p>
          <input
            autoFocus
            value={reserveText}
            onChange={e => setReserveText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && reserveText.trim()) { onReserve?.(reserveNode, reserveText.trim()); setReserveNode(null); } if (e.key === 'Escape') setReserveNode(null); }}
            placeholder="Ej: Puerta de Enlace"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
          />
        </div>
      </ConfirmModal>
      {menu && createPortal(
        (() => {
          const W = 192, H = 230;
          const vw = window.innerWidth, vh = window.innerHeight;
          const left = Math.min(menu.x, vw - W - 8);
          const top = menu.y + H > vh - 12 ? Math.max(8, menu.y - H) : menu.y;
          const copy = (t: string) => { if (t) navigator.clipboard?.writeText(t).catch(() => {}); };
          const subLeft = left + W + 160 > vw;
          return (
        <div onClick={(e) => e.stopPropagation()} style={{ left, top }} className="fixed z-[300] min-w-[180px] bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-visible p-1">
          <div className="relative">
            <button onClick={(e) => { e.stopPropagation(); setShowCopy(v => !v); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-2 justify-between"><span className="flex items-center gap-2"><Copy className="w-3.5 h-3.5" /> Copiar</span><ChevronRight className={`w-3 h-3 opacity-60 transition-transform ${showCopy ? 'rotate-90' : ''}`} /></button>
            {showCopy && (
              <div className={`absolute top-0 ${subLeft ? 'right-full mr-1' : 'left-full ml-1'} bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-1 min-w-[150px] z-[301]`}>
                <button onClick={() => { copy(menu.node.ip); setMenu(null); setShowCopy(false); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-zinc-300 hover:text-white text-xs font-medium">IP</button>
                <button onClick={() => { copy(menu.node.mac_actual || ''); setMenu(null); setShowCopy(false); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-zinc-300 hover:text-white text-xs font-medium">Dirección MAC</button>
              </div>
            )}
          </div>
          <button onClick={() => { const n = menu.node; setMenu(null); startEdit(n); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-2"><Edit2 className="w-3.5 h-3.5" /> Cambiar nombre</button>
          <button onClick={() => { onPing(menu.node.ip); setMenu(null); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-2"><Activity className="w-3.5 h-3.5" /> Ping</button>
          <button onClick={() => { onTracert(menu.node.ip); setMenu(null); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-2"><Network className="w-3.5 h-3.5" /> Tracert</button>
          <button onClick={() => { onGraph(menu.node); setMenu(null); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-2"><MapPinned className="w-3.5 h-3.5" /> Graficar en mapa</button>
          {onReserve && <button onClick={() => { const n = menu.node; setMenu(null); setReserveNode(n); setReserveText(''); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-amber-300 hover:text-amber-200 text-xs font-medium flex items-center gap-2"><Bookmark className="w-3.5 h-3.5" /> Marcar como reservada</button>}
        </div>
          );
        })(),
        document.body
      )}
    </div>
  );
};

export default ScannerTable;
