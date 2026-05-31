import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Package, Hash, Tag, Activity, Calendar, Server, Info, ArrowRight, History, PlusCircle, Save, ClipboardList } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../context/ToastContext';

const ComponenteDetalleModal = ({ isOpen, onClose, componente, onViewHistory, onQuickStockAdd }) => {
    const [quickStock, setQuickStock] = useState(1);
    const [isSaving, setIsSaving] = useState(false);

    const handleQuickAdd = async () => {
        if (quickStock <= 0) return;
        setIsSaving(true);
        try {
            await onQuickStockAdd(componente.id, quickStock);
            setQuickStock(1);
        } catch (error) {
            console.error("Error en quick add:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && componente && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-5 sm:p-6 bg-black/85 backdrop-blur-md h-[100dvh] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/50"
                    />
                    
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="bg-[#0b1120] border border-white/20 w-full max-w-2xl rounded-3xl sm:rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[calc(100dvh-40px)]"
                    >
                        {/* Header */}
                        <div className="p-5 sm:p-6 border-b border-white/5 bg-white/[0.02] shrink-0 relative z-10">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/20 shrink-0">
                                        <Package className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-white tracking-tight leading-tight">{componente.nombre}</h2>
                                        <div className="flex flex-wrap items-center gap-3 mt-1.5">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                                                componente.cantidad > 5 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                            } border border-white/5`}>
                                                <Activity className="w-3 h-3" /> {componente.cantidad} unidades
                                            </span>
                                            <button 
                                                onClick={() => onViewHistory(componente)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-400 border border-white/5 hover:bg-indigo-500/20 transition-all cursor-pointer"
                                            >
                                                <History className="w-3 h-3" /> Trazabilidad
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-500 group">
                                    <X className="w-5 h-5 group-hover:scale-110" />
                                </button>
                            </div>
                        </div>

                        <div className="p-5 sm:p-6 flex-1 overflow-y-auto custom-scrollbar">
                            <div className="space-y-6">
                                {/* Quick Stock Management */}
                                <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-3xl p-5">
                                   <div className="flex items-center justify-between gap-4">
                                      <div>
                                         <h4 className="text-sm font-black text-white uppercase tracking-wider mb-1">Entrada de Mercadería</h4>
                                         <p className="text-slate-500 text-[10px] font-bold uppercase">Suma unidades al inventario rápidamente</p>
                                      </div>
                                      <div className="flex items-center gap-3 bg-black/40 p-2 rounded-2xl border border-white/5">
                                         <input 
                                            type="number" 
                                            min="1"
                                            value={quickStock}
                                            onChange={(e) => setQuickStock(parseInt(e.target.value))}
                                            className="w-16 bg-transparent text-white font-black text-center focus:outline-none"
                                         />
                                         <button 
                                            onClick={handleQuickAdd}
                                            disabled={isSaving}
                                            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-2.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/20 active:scale-95"
                                         >
                                            <PlusCircle className="w-5 h-5 text-white" />
                                         </button>
                                      </div>
                                   </div>
                                </div>

                                {/* IDs Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-[#1e293b]/30 p-5 rounded-2xl border border-white/5">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                           <Hash className="w-3 h-3 text-indigo-400" /> NNE
                                        </p>
                                        <p className="text-white font-black tracking-tight">{componente.nne || '--'}</p>
                                    </div>
                                    <div className="bg-[#1e293b]/30 p-5 rounded-2xl border border-white/5">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                           <Tag className="w-3 h-3 text-indigo-400" /> NRO SERIE
                                        </p>
                                        <p className="text-white font-black tracking-tight">{componente.serie || '--'}</p>
                                    </div>
                                </div>

                                {/* Metricas */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex items-center justify-between p-5 bg-[#1e293b]/30 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-slate-500/10 rounded-xl">
                                                <Calendar className="w-4 h-4 text-slate-400" />
                                            </div>
                                            <span className="text-xs text-slate-400 font-bold uppercase tracking-tighter">Primer Ingreso</span>
                                        </div>
                                        <span className="text-white font-black text-sm">{new Date(componente.fecha_ingreso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                    </div>

                                    <div className="flex items-center justify-between p-5 bg-[#1e293b]/30 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-indigo-500/10 rounded-xl">
                                                <Info className="w-4 h-4 text-indigo-400" />
                                            </div>
                                            <span className="text-xs text-slate-400 font-bold uppercase tracking-tighter">Estado Físico</span>
                                        </div>
                                        <span className="text-white font-black uppercase tracking-widest text-[10px] px-2 py-1 bg-white/5 rounded-lg border border-white/5">{componente.estado}</span>
                                    </div>
                                </div>

                                {/* Especificaciones Técnicas */}
                                {componente.especificaciones?.length > 0 && (
                                    <div className="space-y-4 pt-6 border-t border-white/5">
                                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <ClipboardList className="w-4 h-4 text-indigo-400" /> Especificaciones Técnicas
                                        </h3>
                                        <div className="grid gap-3">
                                            {componente.especificaciones.map((spec, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5 group hover:border-indigo-500/20 transition-colors">
                                                    <span className="text-xs text-slate-400 font-bold uppercase tracking-tight">{spec.clave}</span>
                                                    <span className="text-white font-black">{spec.valor}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer simple */}
                        <div className="p-4 sm:p-6 border-t border-white/5 bg-[#0b1120] z-20 flex justify-end">
                            <button 
                                onClick={onClose}
                                className="bg-white/5 hover:bg-white/10 text-slate-300 font-bold px-6 py-2.5 rounded-xl transition-all border border-white/10 hover:border-white/20 cursor-pointer text-sm"
                            >
                                Cerrar Detalle
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default ComponenteDetalleModal;
