import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Server, Laptop, Smartphone, Wifi, Link2, Trash2, Router, Monitor, Antenna, Activity, Network } from 'lucide-react';
import { createPortal } from 'react-dom';

interface TopologyMapProps {
  nodes: any[];
  gatewayIp?: string | null;
  links?: { from: string; to: string }[];
  linkingFrom?: string | null;
  draggable?: boolean;
  compactCards?: boolean;
  noChrome?: boolean;
  positions?: Record<string, { x: number; y: number }>;
  onPositionChange?: (ip: string, pos: { x: number; y: number }) => void;
  onSelectNode: (node: any) => void;
  onRemove?: (ip: string) => void;
  onChangeIcon?: (ip: string, rol: string) => void;
  onStartLink?: (ip: string) => void;
  onClearLinks?: () => void;
  onUnlink?: (from: string, to: string) => void;
  onPing?: (ip: string) => void;
  onTracert?: (ip: string) => void;
}

const ROLES = ['GATEWAY','SWITCH','AP','ANTENA','ROUTER','VOIP','NOTEBOOK','DESKTOP'];

const TopologyMap: React.FC<TopologyMapProps> = ({ nodes, gatewayIp, links = [], linkingFrom = null, draggable = false, compactCards = false, noChrome = false, positions = {}, onPositionChange, onSelectNode, onRemove, onChangeIcon, onStartLink, onClearLinks, onUnlink, onPing, onTracert }) => {
  const gatewayNode = nodes.find(n => n.ip === gatewayIp || n.rol === 'GATEWAY');
  const infraNodes = nodes.filter(n => n !== gatewayNode && (n.rol === 'SWITCH' || n.rol === 'AP' || n.rol === 'ROUTER' || n.es_infraestructura));
  const endpointNodes = nodes.filter(n => n !== gatewayNode && !infraNodes.includes(n));

  const getNodeIcon = (rol: string, fab = '') => {
    const r = (rol || '').toUpperCase(); const f = (fab||'').toLowerCase();
    if (r === 'GATEWAY' || f.includes('fortinet')) return <Shield className="w-5 h-5 text-amber-400" />;
    if (r === 'SWITCH' || f.includes('cisco')) return <Server className="w-5 h-5 text-cyan-400" />;
    if (r === 'ROUTER') return <Router className="w-5 h-5 text-sky-400" />;
    if (r === 'AP' || f.includes('ubiquiti')) return <Wifi className="w-5 h-5 text-emerald-400" />;
    if (r === 'ANTENA') return <Antenna className="w-5 h-5 text-lime-400" />;
    if (r === 'VOIP') return <Smartphone className="w-5 h-5 text-indigo-400" />;
    if (r === 'NOTEBOOK') return <Laptop className="w-5 h-5 text-zinc-300" />;
    if (r === 'DESKTOP') return <Monitor className="w-5 h-5 text-zinc-300" />;
    return <Laptop className="w-5 h-5 text-zinc-300" />;
  };
  const dot = (estado: string) => {
    const isOn = estado === 'ONLINE', isWarn = estado === 'WARNING', isOff = estado === 'OFFLINE';
    return (
      <span className="relative inline-flex h-2.5 w-2.5">
        {(isOn || isWarn) && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${isOn ? 'bg-emerald-400' : 'bg-amber-400'}`} />}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOn ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]' : isWarn ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]' : isOff ? 'bg-red-500' : 'bg-zinc-600'}`} />
      </span>
    );
  };
  const border = (e: string) => e === 'ONLINE' ? 'border-emerald-500/60 bg-emerald-950/20' : e === 'WARNING' ? 'border-amber-400/60 bg-amber-950/20' : e === 'OFFLINE' ? 'border-red-500/60 bg-red-950/20' : 'border-zinc-800 bg-zinc-900/60';

  const linkedTo = (ip: string) => links.filter(l => l.from === ip || l.to === ip).map(l => l.from === ip ? l.to : l.from);

  const [menu, setMenu] = React.useState<{ x: number; y: number; ip: string } | null>(null);
  React.useEffect(() => {
    const close = () => setMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    return () => { window.removeEventListener('click', close); window.removeEventListener('scroll', close, true); };
  }, []);

  if (nodes.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[320px] bg-zinc-950 border border-dashed border-zinc-800 rounded-2xl p-8 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 grid place-items-center"><Server className="w-6 h-6 text-zinc-600" /></div>
        <p className="text-sm font-semibold text-zinc-300">Mapa vacío</p>
        <p className="text-xs text-zinc-500 text-center max-w-xs">Añade dispositivos desde el escáner (click derecho → Graficar) para armar el diagrama.</p>
      </div>
    );
  }

  const getPos = (ip: string, idx: number) => positions[ip] || { x: 16 + (idx % 5) * 170, y: 16 + Math.floor(idx / 5) * 88 };
  const rectEdge = (cx: number, cy: number, dx: number, dy: number, hw: number, hh: number) => {
    if (dx === 0 && dy === 0) return { x: cx, y: cy };
    const sx = dx !== 0 ? hw / Math.abs(dx) : Infinity;
    const sy = dy !== 0 ? hh / Math.abs(dy) : Infinity;
    const s = Math.min(sx, sy);
    return { x: cx + dx * s, y: cy + dy * s };
  };

  const NodeCard = ({ node, idx }: { node: any; idx: number }) => {
    const isLinking = linkingFrom === node.ip;
    const label = node.alias || node.hostname_actual || node.equipo_ine;
    const small = compactCards;
    const pos = getPos(node.ip, idx);
    const handleSelect = () => {
      if (draggable) { if (linkingFrom) onSelectNode(node); return; }
      onSelectNode(node);
    };
    return (
      <motion.div
        drag={draggable}
        dragMomentum={false}
        dragElastic={0}
        dragTransition={{ power: 0, timeConstant: 0 }}
        style={draggable ? { position: 'absolute' as const, left: pos.x, top: pos.y } : undefined}
        onDragEnd={(_: any, info: any) => {
          if (!draggable || !onPositionChange) return;
          const nx = Math.max(0, pos.x + info.offset.x);
          const ny = Math.max(0, pos.y + info.offset.y);
          onPositionChange(node.ip, { x: nx, y: ny });
        }}
        onTap={handleSelect}
        onClick={handleSelect}
        onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setMenu({ x: e.clientX, y: e.clientY, ip: node.ip }); }}
        whileHover={{ scale: draggable ? 1 : 1.02 }}
        className={`absolute flex flex-col ${small ? 'gap-1 p-2.5' : 'gap-1.5 p-3'} rounded-xl border ${border(node.estado_monitoreo)} ${isLinking ? 'ring-2 ring-cyan-400' : ''} ${small ? 'min-w-[140px] max-w-[155px]' : 'min-w-[170px] max-w-[190px]'} ${draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} select-none shadow-lg`}
        {...(!draggable ? {} : { layout: false })}
      >
        <div className="flex items-center justify-between">
          <div className={`${small ? 'w-7 h-7' : 'w-8 h-8'} rounded-lg bg-zinc-900 border border-zinc-800 grid place-items-center`}>{getNodeIcon(node.rol, node.fabricante_actual)}</div>
          {dot(node.estado_monitoreo)}
        </div>
        <p className={`${small ? 'text-[11px]' : 'text-xs'} font-bold text-white truncate leading-tight`} title={label || node.ip}>{label || node.ip}</p>
        <p className={`${small ? 'text-[10px]' : 'text-[11px]'} font-mono text-zinc-500 truncate`}>{node.ip}</p>
      </motion.div>
    );
  };

  const allNodes = [...(gatewayNode ? [gatewayNode] : []), ...infraNodes, ...endpointNodes];

  const content = draggable ? (
    <div onClick={() => setMenu(null)} className={`group/map relative w-full ${noChrome ? 'flex-1 min-h-[520px] bg-zinc-950' : 'h-[62vh] min-h-[520px] bg-zinc-950 border border-zinc-800 rounded-2xl'} overflow-hidden`}>
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {links.map((l, i) => {
          const a = allNodes.findIndex(n => n.ip === l.from);
          const b = allNodes.findIndex(n => n.ip === l.to);
          if (a === -1 || b === -1) return null;
          const pa = getPos(l.from, a), pb = getPos(l.to, b);
          const w = compactCards ? 155 : 175, h = compactCards ? 72 : 68;
          const hw = w / 2, hh = h / 2;
          const cax = pa.x + hw, cay = pa.y + hh, cbx = pb.x + hw, cby = pb.y + hh;
          const dx = cbx - cax, dy = cby - cay;
          const s = rectEdge(cax, cay, dx, dy, hw + 4, hh + 4);
          const e = rectEdge(cbx, cby, -dx, -dy, hw + 4, hh + 4);
          return <line key={i} x1={s.x} y1={s.y} x2={e.x} y2={e.y} stroke="#0ea5e9" strokeWidth="1.7" strokeLinecap="round" opacity={0.9} />;
        })}
      </svg>
      {allNodes.map((n, i) => <NodeCard key={n.id} node={n} idx={i} />)}
      {links.map((l, i) => {
        const a = allNodes.findIndex(n => n.ip === l.from);
        const b = allNodes.findIndex(n => n.ip === l.to);
        if (a === -1 || b === -1) return null;
        const pa = getPos(l.from, a), pb = getPos(l.to, b);
        const w = compactCards ? 155 : 175, h = compactCards ? 72 : 68;
        const hw = w / 2, hh = h / 2;
        const cax = pa.x + hw, cay = pa.y + hh, cbx = pb.x + hw, cby = pb.y + hh;
        const mx = (cax + cbx) / 2, my = (cay + cby) / 2;
        return (
          <button
            key={`x-${i}`}
            onClick={e => { e.stopPropagation(); if (onUnlink) onUnlink(l.from, l.to); }}
            onMouseDown={e => e.stopPropagation()}
            className="absolute w-6 h-6 grid place-items-center bg-transparent border-0 text-zinc-300 hover:text-red-400 opacity-0 group-hover/map:opacity-100 hover:!opacity-100 transition-opacity drop-shadow"
            style={{ left: mx - 12, top: my - 32 }}
            title="Desvincular"
          >
            <span className="text-[18px] leading-none font-bold">×</span>
          </button>
        );
      })}
    </div>
  ) : (
    <div onClick={() => setMenu(null)} className="flex-1 min-h-[380px] bg-zinc-950 border border-zinc-800 rounded-2xl p-4 overflow-auto custom-scrollbar">
      <div className="flex flex-wrap gap-3 content-start">
        {allNodes.map(n => {
          const isLinking = linkingFrom === n.ip; const label = n.hostname_actual || n.equipo_ine;
          return (
            <motion.div key={n.id} onClick={() => onSelectNode(n)} onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setMenu({ x: e.clientX, y: e.clientY, ip: n.ip }); }} whileHover={{ scale: 1.02 }} className={`flex flex-col gap-1.5 p-3 rounded-xl border ${border(n.estado_monitoreo)} ${isLinking ? 'ring-2 ring-cyan-400' : ''} min-w-[170px] max-w-[190px] cursor-pointer select-none`}>
              <div className="flex items-center justify-between"><div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 grid place-items-center">{getNodeIcon(n.rol, n.fabricante_actual)}</div>{dot(n.estado_monitoreo)}</div>
              <p className="text-xs font-bold text-white truncate">{label || n.ip}</p><p className="text-[11px] font-mono text-zinc-500 truncate">{n.ip}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
    {content}
    {menu && createPortal(
      (() => {
        const W = 200, H = 160;
        const vw = window.innerWidth, vh = window.innerHeight;
        const left = Math.min(menu.x, vw - W - 8);
        const top = menu.y + H > vh - 12 ? Math.max(8, menu.y - H) : menu.y;
        const node = nodes.find(n => n.ip === menu.ip);
        return (
          <div onClick={e => e.stopPropagation()} style={{ left, top }} className="fixed z-[320] min-w-[200px] bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden p-1">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">{menu.ip}</div>
            <div className="h-px bg-zinc-800 my-1" />
            <div className="px-2 py-1 text-[10px] font-semibold text-zinc-400">Cambiar icono</div>
            <div className="grid grid-cols-4 gap-1 px-1 pb-1">
              {ROLES.map(r => (
                <button key={r} onClick={() => { onChangeIcon?.(menu.ip, r); setMenu(null); }} className={`px-1 py-1.5 rounded-lg text-[9px] font-bold leading-tight ${node?.rol === r ? 'bg-white text-zinc-900' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>{r}</button>
              ))}
            </div>
            <button onClick={() => { onStartLink?.(menu.ip); setMenu(null); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-2"><Link2 className="w-3.5 h-3.5" /> Vincular con otro</button>
            <button onClick={() => { onPing?.(menu.ip); setMenu(null); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-2"><Activity className="w-3.5 h-3.5" /> Ping</button>
            <button onClick={() => { onTracert?.(menu.ip); setMenu(null); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-2"><Network className="w-3.5 h-3.5" /> Tracert</button>
            <button onClick={() => { onRemove?.(menu.ip); setMenu(null); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-400 hover:text-red-300 text-xs font-medium flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" /> Borrar del mapa</button>
          </div>
        );
      })(),
      document.body
    )}
    </>
  );
};

export default TopologyMap;
