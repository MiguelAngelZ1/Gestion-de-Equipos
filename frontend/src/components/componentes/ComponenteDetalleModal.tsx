import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Package, History, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ComponenteDetalleModal = ({ isOpen, onClose, componente, onViewHistory, onQuickStockAdd }) => {
    const [quickStock, setQuickStock] = useState(1);
    const [isSaving, setIsSaving] = useState(false);

    const handleQuickAdd = async () => {
        if (quickStock <= 0) return;
        setIsSaving(true);
        try {
            await onQuickStockAdd(componente.id, quickStock);
            setQuickStock(1);
        } catch {
            // silent
        } finally {
            setIsSaving(false);
        }
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && componente && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md h-[100dvh] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.97, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97, y: 8 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        onClick={e => e.stopPropagation()}
                        className="bg-[#1C1C1E] border border-white/5 rounded-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl"
                    >
                        <div className="p-4 border-b border-white/5 flex items-center gap-3 shrink-0">
                            <Package className="w-5 h-5 text-[#e4e2e4] shrink-0" />
                            <div className="min-w-0">
                                <h2 className="text-[16px] font-semibold text-[#e4e2e4] leading-none truncate">{componente.nombre}</h2>
                                <p className="text-xs text-[#c4c5d9] mt-0.5">{componente.cantidad} unidades en stock</p>
                            </div>
                            <button onClick={onClose} className="ml-auto w-8 h-8 grid place-items-center rounded-full hover:bg-white/5 text-[#c4c5d9]"><X className="w-4 h-4" /></button>
                        </div>

                        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar overscroll-contain space-y-4" style={{ overscrollBehavior: 'contain' }}>
                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                                <div className="lg:col-span-2 space-y-3">
                                    <div className="bg-[#131315] border border-white/5 rounded-xl p-4 space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div><p className="text-[10px] font-semibold text-[#c4c5d9] uppercase">NNE</p><p className="text-xs font-semibold text-[#e4e2e4] truncate">{componente.nne || '-'}</p></div>
                                            <div><p className="text-[10px] font-semibold text-[#c4c5d9] uppercase">Serie</p><p className="text-xs font-semibold text-[#e4e2e4] truncate">{componente.serie || '-'}</p></div>
                                        </div>
                                        <div className="pt-3 border-t border-white/5"><p className="text-[10px] font-semibold text-[#c4c5d9] uppercase">Primer ingreso</p><p className="text-xs font-semibold text-[#e4e2e4]">{new Date(componente.fecha_ingreso).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p></div>
                                        <div className="pt-3 border-t border-white/5"><p className="text-[10px] font-semibold text-[#c4c5d9] uppercase">Total ingresado</p><p className="text-xs font-semibold text-[#e4e2e4]">{componente.total_ingresado || componente.cantidad}</p></div>
                                        <div className="pt-3 border-t border-white/5"><p className="text-[10px] font-semibold text-[#c4c5d9] uppercase mb-1.5">Estado</p><span className="inline-flex px-2.5 py-1 bg-white text-zinc-900 text-[10px] font-semibold rounded-lg uppercase tracking-wide">{componente.estado || 'SIN ESTADO'}</span></div>
                                    </div>

                                    <div className="bg-[#131315] border border-white/5 rounded-xl p-4">
                                        <p className="text-[10px] font-semibold text-[#c4c5d9] uppercase tracking-wide mb-2">Entrada de mercadería</p>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="1"
                                                value={quickStock}
                                                onChange={(e) => setQuickStock(parseInt(e.target.value) || 1)}
                                                className="w-20 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 outline-none focus:border-zinc-700 text-sm text-center"
                                            />
                                            <button
                                                onClick={handleQuickAdd}
                                                disabled={isSaving}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-zinc-900 text-xs font-semibold hover:bg-zinc-100 disabled:opacity-50"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Sumar
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="lg:col-span-3">
                                    <div className="bg-[#131315] border border-white/5 rounded-xl p-4 h-full">
                                        <div className="flex items-center gap-2 mb-3"><span className="w-1.5 h-1.5 rounded-full bg-[#b8c3ff]" /><h4 className="text-xs font-bold tracking-wide text-[#e4e2e4]">ESPECIFICACIONES</h4></div>
                                        {componente.especificaciones?.length > 0 ? (
                                            <div className="space-y-1.5">
                                                {componente.especificaciones.map((spec, idx) => (
                                                    <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                                                        <span className="text-[#c4c5d9] truncate">{spec.clave}</span>
                                                        <span className="text-[#e4e2e4] font-semibold truncate">{spec.valor}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-[#c4c5d9]">Sin especificaciones.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-white/5 flex justify-between items-center shrink-0">
                            <button onClick={() => onViewHistory(componente)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#c4c5d9] hover:text-white">
                                <History className="w-4 h-4" /> Trazabilidad
                            </button>
                            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-[#c4c5d9] hover:text-white">Cerrar</button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default ComponenteDetalleModal;
