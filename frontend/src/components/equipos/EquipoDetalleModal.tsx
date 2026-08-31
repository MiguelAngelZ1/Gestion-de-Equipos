import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, MapPin, Tag, X, Package, Plus } from 'lucide-react';
import InstalarRepuestoModal from '../componentes/InstalarRepuestoModal';

const EquipoDetalleModal = ({ isOpen, equipo, estados, onClose, onEquipoUpdated }) => {
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  const userData = JSON.parse(localStorage.getItem("equipos_user_data") || "{}");
  const userRole = (userData.rol || 'USER').toLowerCase();

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    const prevPad = document.body.style.paddingRight;
    const sb = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (sb > 0) document.body.style.paddingRight = `${sb}px`;
    return () => { document.body.style.overflow = prev; document.body.style.paddingRight = prevPad; };
  }, [isOpen]);

  if (typeof document === 'undefined') return null;

  const getStatusColor = (estadoNombre) => {
    const s = (estadoNombre || '').toLowerCase().trim();
    if (s === 'e/s' || s.includes('en servicio') || s.includes('bueno')) return '#22c55e';
    if (s === 'f/s' || s.includes('fuera') || s.includes('malo')) return '#ef4444';
    if (s.includes('mant')) return '#eab308';
    if (s.includes('prest')) return '#f97316';
    const cfg = (estados || []).find(e => e.nombre.toLowerCase() === s);
    if (cfg?.color_hex) return cfg.color_hex;
    return '#71717a';
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && equipo && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.97, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 8 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }} onClick={e => e.stopPropagation()} className="bg-[#1C1C1E] border border-white/5 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center gap-3 shrink-0">
              <span className="material-symbols-outlined text-[#e4e2e4] text-[24px]">inventory_2</span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[16px] font-semibold text-[#e4e2e4] leading-none truncate">{equipo.ine || 'Sin INE'}</h2>
                <p className="text-xs text-[#c4c5d9] mt-0.5">Detalles del equipo</p>
              </div>
              <button onClick={onClose} className="ml-auto w-8 h-8 grid place-items-center rounded-full hover:bg-white/5 text-[#c4c5d9] shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 pt-3 pb-0 shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 bg-[#131315] px-2.5 py-1.5 rounded-lg border border-white/5 text-[10px] font-bold text-[#c4c5d9] uppercase"><Tag className="w-3 h-3 text-zinc-500" />{equipo.tipo || 'S/T'}</span>
                <span className="inline-flex items-center gap-1.5 bg-[#131315] px-2.5 py-1.5 rounded-lg border border-white/5 text-[10px] font-bold text-[#c4c5d9] uppercase"><User className="w-3 h-3 text-zinc-500" />{equipo.responsable || 'S/A'}</span>
                <span className="inline-flex items-center gap-1.5 bg-[#131315] px-2.5 py-1.5 rounded-lg border border-white/5 text-[10px] font-bold text-[#c4c5d9] uppercase"><MapPin className="w-3 h-3 text-zinc-500" />{equipo.ubicacion || 'S/U'}</span>
                {equipo.estado && (() => { const c = getStatusColor(equipo.estado); return <span className="ml-auto w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c }} title={equipo.estado} />; })()}
              </div>
            </div>

            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar overscroll-contain space-y-4" style={{ overscrollBehavior: 'contain' }} onWheel={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#131315] border border-white/5 p-3.5 rounded-xl">
                  <p className="text-[10px] font-semibold text-[#c4c5d9] uppercase tracking-wide mb-1.5">Número Nacional de Equipo (NNE)</p>
                  <p className="font-mono text-xs text-[#e4e2e4] bg-[#1C1C1E] px-3 py-2 rounded-lg border border-white/5 inline-block min-w-[140px]">{equipo.nne || '-'}</p>
                </div>
                <div className="bg-[#131315] border border-white/5 p-3.5 rounded-xl">
                  <p className="text-[10px] font-semibold text-[#c4c5d9] uppercase tracking-wide mb-1.5">Número de Serie (S/N)</p>
                  <p className="font-mono text-xs text-[#e4e2e4] bg-[#1C1C1E] px-3 py-2 rounded-lg border border-white/5 inline-block min-w-[140px] font-semibold">{equipo.serie || '-'}</p>
                </div>
              </div>
              <div className="bg-[#131315] border border-white/5 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#b8c3ff]" />
                    <h4 className="text-xs font-bold tracking-wide text-[#e4e2e4]">FICHA TÉCNICA BASE</h4>
                  </div>
                  {userRole === 'admin' && (
                    <button onClick={() => setIsInstallModalOpen(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#c4c5d9] hover:text-white">
                      <Plus className="w-3.5 h-3.5" /> Instalar Repuesto
                    </button>
                  )}
                </div>
                <div className="p-4">
                  {equipo.especificaciones && equipo.especificaciones.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                      {equipo.especificaciones.map((spec, i) => (
                        <div key={spec.id || `spec-${i}`} className="flex items-center justify-between py-2 border-b border-white/5">
                          <span className="text-[10px] font-semibold text-[#c4c5d9] uppercase">{spec.clave}</span>
                          <span className="text-xs font-semibold text-[#e4e2e4]">{spec.valor}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 flex flex-col items-center justify-center text-center">
                      <Package className="w-7 h-7 mb-2 text-zinc-600" />
                      <p className="text-xs font-medium text-zinc-500">Sin especificaciones técnicas.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>


            <InstalarRepuestoModal isOpen={isInstallModalOpen} onClose={() => setIsInstallModalOpen(false)} equipo={equipo} onInstalled={() => { if (onEquipoUpdated) onEquipoUpdated(); }} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default EquipoDetalleModal;
