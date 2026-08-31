import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Package, Plus, CheckCircle2, AlertCircle, Info, ArrowRight, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiRequest } from '../../services/api';

const InstalarRepuestoModal = ({ isOpen, onClose, equipo, onInstalled }) => {
    const [step, setStep] = useState(1);
    const [search, setSearch] = useState("");
    const [repuestos, setRepuestos] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Step 1 State
    const [repuestoSeleccionado, setRepuestoSeleccionado] = useState(null);
    
    // Step 2 State
    const [tipoInstalacion, setTipoInstalacion] = useState("AGREGAR"); // AGREGAR | REEMPLAZAR
    const [targetSpecId, setTargetSpecId] = useState(null);
    const [especificacionesBase, setEspecificacionesBase] = useState([]);
    
    const [registrarSoporte, setRegistrarSoporte] = useState(true);
    const [notasSoporte, setNotasSoporte] = useState("");
    
    const [instalando, setInstalando] = useState(false);
    const [error, setError] = useState(null);

    const fetchEspecificacionesBase = async () => {
        try {
            const data = await apiRequest(`/componentes/instalados/${equipo.id}`);
            const unicasSpecsMap = new Map();
            data.forEach(item => {
                if (item.especificacion_padre_id) {
                    unicasSpecsMap.set(item.especificacion_padre_id, item);
                }
            });
            setEspecificacionesBase(Array.from(unicasSpecsMap.values()));
        } catch {
            // silent
        }
    };

    const fetchRepuestos = async () => {
        setLoading(true);
        try {
            const data = await apiRequest('/componentes');
            setRepuestos(data.filter(r => r.cantidad > 0));
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setRepuestoSeleccionado(null);
            setTipoInstalacion("AGREGAR");
            setTargetSpecId(null);
            setError(null);
            
            fetchRepuestos();
            fetchEspecificacionesBase();
        }
    }, [isOpen]);

    const handleInstalar = async () => {
        if (!repuestoSeleccionado) return;
        if (tipoInstalacion === "REEMPLAZAR" && !targetSpecId) {
            setError("Debe seleccionar qué línea de la Ficha Técnica desea reemplazar.");
            return;
        }

        setInstalando(true);
        setError(null);
        try {
            const payload = {
                equipo_id: equipo.id,
                repuesto_id: repuestoSeleccionado.id,
                nombre: repuestoSeleccionado.nombre,
                nne: repuestoSeleccionado.nne,
                serie: repuestoSeleccionado.serie,
                especificaciones: repuestoSeleccionado.especificaciones,
                tipo_instalacion: tipoInstalacion,
                target_spec_id: targetSpecId,
                registrar_soporte: registrarSoporte,
                notas_soporte: notasSoporte
            };

            await apiRequest('/componentes/instalar', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (onInstalled) onInstalled();
            onClose();
        } catch (err) {
            setError(err.message || "Error al instalar el componente");
        } finally {
            setInstalando(false);
        }
    };

    const filteredRepuestos = repuestos.filter(r => 
        r.nombre.toLowerCase().includes(search.toLowerCase()) ||
        (r.serie && r.serie.toLowerCase().includes(search.toLowerCase()))
    );

    useEffect(() => {
        if (!isOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [isOpen]);

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <motion.div initial={{ opacity: 0, scale: 0.97, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 8 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }} onClick={e => e.stopPropagation()} className="bg-[#1C1C1E] border border-white/5 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-white/5 flex items-center gap-3 shrink-0">
                            <span className="material-symbols-outlined text-[#e4e2e4] text-[24px]">{step === 1 ? 'search' : 'package_2'}</span>
                            <div className="min-w-0">
                                <h2 className="text-[16px] font-semibold text-[#e4e2e4] leading-none">{step === 1 ? 'Paso 1: Seleccionar' : 'Paso 2: Acción'}</h2>
                            </div>
                            <button onClick={onClose} className="ml-auto w-8 h-8 grid place-items-center rounded-full hover:bg-white/5 text-[#c4c5d9]">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar overscroll-contain" style={{ overscrollBehavior: 'contain' }} onWheel={e => e.stopPropagation()}>
                            {error && (
                                <div className="p-3 bg-[#ffb4ab]/10 border border-[#ffb4ab]/15 rounded-xl flex items-center gap-2 text-[#ffb4ab] text-xs font-semibold">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    {error}
                                </div>
                            )}

                            {step === 1 ? (
                                <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                        <input 
                                            type="text"
                                            placeholder="Buscar repuesto disponible..."
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-indigo-500/50 transition-all font-medium"
                                        />
                                    </div>

                                    {/* Lista */}
                                    <div className="grid gap-3">
                                        {loading ? (
                                            <div className="py-12 text-center text-sm text-zinc-500">Cargando inventario...</div>
                                        ) : filteredRepuestos.length === 0 ? (
                                            <div className="py-12 text-center bg-[#131315] rounded-xl border border-dashed border-white/5 text-zinc-500 text-xs">No hay repuestos disponibles en stock.</div>
                                        ) : (
                                            filteredRepuestos.map(repuesto => (
                                                <button key={repuesto.id} onClick={() => setRepuestoSeleccionado(repuesto)} className={`w-full flex items-center justify-between p-3 border rounded-xl transition-colors text-left ${repuestoSeleccionado?.id === repuesto.id ? 'bg-white/5 border-[#b8c3ff]/30' : 'bg-[#131315] border-white/5 hover:border-white/10'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${repuestoSeleccionado?.id === repuesto.id ? 'bg-[#b8c3ff] text-[#1C1C1E]' : 'bg-white/5 text-zinc-400'}`}><Package className="w-4 h-4" /></div>
                                                        <div>
                                                            <p className="text-xs font-semibold text-[#e4e2e4]">{repuesto.nombre}</p>
                                                            <p className="text-[10px] text-zinc-500">{repuesto.cantidad} en stock</p>
                                                        </div>
                                                    </div>
                                                    {repuestoSeleccionado?.id === repuesto.id && <CheckCircle2 className="w-5 h-5 text-[#b8c3ff]" />}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                                    <div className="bg-[#131315] border border-white/5 p-4 rounded-xl flex justify-between items-center">
                                        <div>
                                            <p className="text-[10px] font-semibold text-[#c4c5d9] uppercase tracking-wide mb-1">Repuesto Asignado</p>
                                            <h3 className="text-sm font-semibold text-[#e4e2e4]">{repuestoSeleccionado.nombre}</h3>
                                            <p className="text-zinc-500 font-mono text-[11px] mt-0.5">{repuestoSeleccionado.serie || 'S/N —'}</p>
                                        </div>
                                        <div className="w-8 h-8 rounded-lg bg-white/5 grid place-items-center"><Package className="w-4 h-4 text-zinc-400" /></div>
                                    </div>
                                    <div className="space-y-3">
                                        <h3 className="text-[11px] font-bold tracking-wide text-[#e4e2e4] flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#b8c3ff]" />DESTINO EN FICHA TÉCNICA</h3>
                                        <div className="grid gap-2">
                                            <button onClick={() => { setTipoInstalacion("AGREGAR"); setTargetSpecId(null); }} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${tipoInstalacion === "AGREGAR" ? 'bg-white/5 border-[#b8c3ff]/30' : 'bg-[#131315] border-white/5 hover:border-white/10'}`}>
                                                <span className="flex items-center gap-3 text-xs font-semibold text-[#e4e2e4]"><span className={`w-8 h-8 rounded-lg grid place-items-center ${tipoInstalacion === "AGREGAR" ? 'bg-[#b8c3ff] text-[#1C1C1E]' : 'bg-white/5 text-zinc-400'}`}><Plus className="w-4 h-4" /></span>Añadir Nuevo a Ficha Base</span>
                                                {tipoInstalacion === "AGREGAR" && <CheckCircle2 className="w-4 h-4 text-[#b8c3ff]" />}
                                            </button>
                                            <button onClick={() => { setTipoInstalacion("REEMPLAZAR"); }} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${tipoInstalacion === "REEMPLAZAR" ? 'bg-white/5 border-[#b8c3ff]/30' : 'bg-[#131315] border-white/5 hover:border-white/10'}`}>
                                                <span className="flex items-center gap-3 text-xs font-semibold text-[#e4e2e4]"><span className={`w-8 h-8 rounded-lg grid place-items-center ${tipoInstalacion === "REEMPLAZAR" ? 'bg-[#b8c3ff] text-[#1C1C1E]' : 'bg-white/5 text-zinc-400'}`}><RefreshCw className="w-4 h-4" /></span>Reemplazar Existente</span>
                                                {tipoInstalacion === "REEMPLAZAR" && <CheckCircle2 className="w-4 h-4 text-[#b8c3ff]" />}
                                            </button>
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {tipoInstalacion === "REEMPLAZAR" && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                                                <div className="p-3 bg-[#131315] border border-white/5 rounded-xl space-y-2">
                                                    <span className="text-[10px] text-[#c4c5d9] font-semibold uppercase tracking-wide block">Seleccione qué ítem retirará:</span>
                                                    <div className="grid gap-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1 overscroll-contain" style={{ overscrollBehavior: 'contain' }}>
                                                        {especificacionesBase.map(spec => (
                                                            <button key={`spec_${spec.especificacion_padre_id}`} onClick={() => setTargetSpecId(spec.especificacion_padre_id)} className={`w-full p-3 rounded-xl border text-left flex items-center justify-between ${targetSpecId === spec.especificacion_padre_id ? 'bg-white/5 border-[#b8c3ff]/30' : 'bg-[#1C1C1E] border-white/5 hover:border-white/10'}`}>
                                                                <div><p className="text-xs font-semibold text-[#e4e2e4]">{spec.nombre}</p><p className="text-[11px] text-zinc-500 truncate max-w-[240px]">{spec.valor}</p></div>
                                                                <span className={`w-4 h-4 rounded-full border grid place-items-center ${targetSpecId === spec.especificacion_padre_id ? 'border-[#b8c3ff] bg-[#b8c3ff]/20' : 'border-white/15'}`}>{targetSpecId === spec.especificacion_padre_id && <span className="w-2 h-2 bg-[#b8c3ff] rounded-full" />}</span>
                                                            </button>
                                                        ))}
                                                        {especificacionesBase.length === 0 && <div className="text-center p-3 text-zinc-500 text-xs bg-[#1C1C1E] rounded-lg border border-white/5">Sin componentes para reemplazar.</div>}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    <div className="pt-3 border-t border-white/5 space-y-3">
                                        <label className="flex items-center gap-3 p-3 bg-[#131315] border border-white/5 rounded-xl cursor-pointer hover:border-white/10 transition-colors">
                                            <span className={`w-5 h-5 rounded-md border grid place-items-center ${registrarSoporte ? 'bg-[#b8c3ff] border-[#b8c3ff] text-[#1C1C1E]' : 'border-white/15 text-transparent'}`}>{registrarSoporte && <CheckCircle2 className="w-3.5 h-3.5" />}</span>
                                            <input type="checkbox" className="hidden" checked={registrarSoporte} onChange={e => setRegistrarSoporte(e.target.checked)} />
                                            <div><p className="text-xs font-semibold text-[#e4e2e4]">Vincular con Tarea de Soporte</p><p className="text-[10px] text-zinc-500">Crea un ticket automático atado al responsable.</p></div>
                                        </label>
                                        <AnimatePresence>
                                            {registrarSoporte && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                    <div className="pt-1">
                                                        <label className="text-[10px] font-semibold text-[#c4c5d9] uppercase tracking-wide">Notas técnicas (opcional)</label>
                                                        <textarea id="notasSoporte" value={notasSoporte} onChange={e => setNotasSoporte(e.target.value)} rows={2} className="mt-1.5 w-full bg-[#131315] border border-white/5 rounded-xl px-3 py-2.5 text-sm text-[#e4e2e4] focus:outline-none focus:border-[#b8c3ff]/40 placeholder:text-zinc-600 resize-none" placeholder="Ej: Se instaló RAM para CAD..." />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                        <div className="p-4 border-t border-white/5 flex justify-end gap-2 shrink-0">
                            {step === 1 ? (
                                <>
                                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-[#c4c5d9] hover:text-white">Cancelar</button>
                                    <button disabled={!repuestoSeleccionado} onClick={() => setStep(2)} className={`px-4 py-2 text-sm font-semibold inline-flex items-center gap-2 ${!repuestoSeleccionado ? 'text-zinc-600 cursor-not-allowed' : 'text-white hover:text-white'}`}>Siguiente <ArrowRight className="w-4 h-4" /></button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => { setStep(1); setError(null); }} className="px-4 py-2 text-sm font-semibold text-[#c4c5d9] hover:text-white">Atrás</button>
                                    <button disabled={instalando} onClick={handleInstalar} className="px-4 py-2 text-sm font-semibold text-white inline-flex items-center gap-2 disabled:opacity-50">{instalando ? 'Aplicando...' : 'Confirmar'} <CheckCircle2 className="w-4 h-4" /></button>
                                </>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default InstalarRepuestoModal;
