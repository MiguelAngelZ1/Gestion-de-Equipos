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

    // Initial Fetch
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
        } catch (err) {
            console.error("Error fetching especificaciones:", err);
        }
    };

    const fetchRepuestos = async () => {
        setLoading(true);
        try {
            const data = await apiRequest('/componentes');
            setRepuestos(data.filter(r => r.cantidad > 0));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

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

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-5 sm:p-6 bg-black/85 backdrop-blur-md h-[100dvh] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="bg-[#0f172a] border border-white/20 w-full max-w-xl rounded-3xl sm:rounded-[2rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[calc(100dvh-40px)]"
                    >
                        {/* Header Dinámico basado en Paso */}
                        <div className="p-5 sm:p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02] shrink-0">
                            <div className="flex items-center gap-4">
                                <div className={`p-2.5 rounded-2xl shadow-lg shrink-0 ${step === 1 ? 'bg-indigo-600 shadow-indigo-600/20' : 'bg-emerald-600 shadow-emerald-600/20'}`}>
                                    {step === 1 ? <Search className="w-5 h-5 text-white" /> : <Package className="w-5 h-5 text-white" />}
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-white tracking-tight leading-tight">
                                        {step === 1 ? "Paso 1: Seleccionar" : "Paso 2: Acción"}
                                    </h2>
                                    <p className="text-slate-400 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mt-0.5">Equipo: <span className="text-indigo-400">{equipo.ine}</span></p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-500 group">
                                <X className="w-5 h-5 group-hover:scale-110" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
                            {error && (
                                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400 text-sm font-bold">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            {step === 1 ? (
                                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                                    {/* Buscador */}
                                    <div className="relative group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
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
                                            <div className="py-20 text-center text-slate-500 italic">Cargando inventario...</div>
                                        ) : filteredRepuestos.length === 0 ? (
                                            <div className="py-20 text-center bg-white/5 rounded-3xl border border-dashed border-white/10 italic text-slate-500 text-sm">
                                                No hay repuestos disponibles en stock.
                                            </div>
                                        ) : (
                                            filteredRepuestos.map(repuesto => (
                                                <button 
                                                    key={repuesto.id}
                                                    onClick={() => setRepuestoSeleccionado(repuesto)}
                                                    className={`group flex items-center justify-between p-4 border rounded-2xl transition-all text-left ${
                                                        repuestoSeleccionado?.id === repuesto.id 
                                                        ? 'bg-indigo-600/20 border-indigo-500/50' 
                                                        : 'bg-white/5 hover:bg-white/10 border-white/5'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`p-2 rounded-xl transition-colors ${repuestoSeleccionado?.id === repuesto.id ? 'bg-indigo-500 text-white' : 'bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                                                            <Package className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-white font-bold text-sm tracking-tight">{repuesto.nombre}</h4>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{repuesto.ine || 'Sin INE'}</span>
                                                                <span className="text-slate-700 text-[10px]">|</span>
                                                                <span className="text-[9px] text-indigo-400/70 font-bold uppercase">{repuesto.cantidad} en stock</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className={`transition-opacity ${repuestoSeleccionado?.id === repuesto.id ? 'opacity-100' : 'opacity-0'}`}>
                                                        <CheckCircle2 className="w-6 h-6 text-indigo-500" />
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                    
                                    <div className="bg-emerald-600/10 border border-emerald-500/20 p-6 rounded-3xl flex justify-between items-center">
                                        <div>
                                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Repuesto Asignado</p>
                                            <h3 className="text-xl font-black text-white">{repuestoSeleccionado.nombre}</h3>
                                            <p className="text-slate-400 font-mono text-[10px] mt-1">{repuestoSeleccionado.serie || 'S/N: No especificado'}</p>
                                        </div>
                                        <div className="p-3 bg-white/5 rounded-2xl ring-1 ring-white/10">
                                            <Package className="w-6 h-6 text-emerald-400" />
                                        </div>
                                    </div>

                                    {/* Opciones 1 a 1 */}
                                    <div className="space-y-4">
                                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                            Destino en Ficha Técnica
                                        </h3>
                                        
                                        <div className="grid gap-3">
                                            <button 
                                                onClick={() => { setTipoInstalacion("AGREGAR"); setTargetSpecId(null); }}
                                                className={`flex items-center justify-between p-5 rounded-[1.8rem] border transition-all ${
                                                    tipoInstalacion === "AGREGAR"
                                                    ? 'bg-emerald-600/20 border-emerald-500/50 shadow-lg shadow-emerald-600/10' 
                                                    : 'bg-white/[0.03] border-white/5 hover:bg-white/5'
                                                }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2 rounded-xl transition-colors ${tipoInstalacion === "AGREGAR" ? 'bg-emerald-600 text-white' : 'bg-white/10 text-slate-400'}`}>
                                                        <Plus className="w-5 h-5" />
                                                    </div>
                                                    <div className="text-left font-bold text-white uppercase tracking-wider text-[10px]">Añadir Nuevo a Ficha Base</div>
                                                </div>
                                                {tipoInstalacion === "AGREGAR" && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                                            </button>

                                            <button 
                                                onClick={() => { setTipoInstalacion("REEMPLAZAR"); }}
                                                className={`flex items-center justify-between p-5 rounded-[1.8rem] border transition-all ${
                                                    tipoInstalacion === "REEMPLAZAR"
                                                    ? 'bg-amber-600/20 border-amber-500/50 shadow-lg shadow-amber-600/10' 
                                                    : 'bg-white/[0.03] border-white/5 hover:bg-white/5'
                                                }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2 rounded-xl transition-colors ${tipoInstalacion === "REEMPLAZAR" ? 'bg-amber-600 text-white' : 'bg-white/10 text-slate-400'}`}>
                                                        <RefreshCw className="w-5 h-5" />
                                                    </div>
                                                    <div className="text-left font-bold text-white uppercase tracking-wider text-[10px]">Reemplazar Existente</div>
                                                </div>
                                                {tipoInstalacion === "REEMPLAZAR" && <CheckCircle2 className="w-5 h-5 text-amber-400" />}
                                            </button>
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {tipoInstalacion === "REEMPLAZAR" && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                                                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                                                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest pl-1 block">Seleccione qué ítem de la máquina retirará:</span>
                                                    <div className="grid gap-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                                                        {especificacionesBase.map(spec => (
                                                            <button 
                                                                key={`spec_${spec.especificacion_padre_id}`}
                                                                onClick={() => setTargetSpecId(spec.especificacion_padre_id)}
                                                                className={`w-full group p-4 rounded-xl border transition-all text-left flex items-center justify-between ${
                                                                    targetSpecId === spec.especificacion_padre_id 
                                                                    ? 'bg-amber-500/20 border-amber-500/50 shadow-lg' 
                                                                    : 'bg-white/[0.02] border-white/[0.05] hover:border-white/20'
                                                                }`}
                                                            >
                                                                <div>
                                                                    <div className="text-xs font-black text-white uppercase tracking-tight">{spec.nombre}</div>
                                                                    <div className="text-[10px] text-slate-400 mt-1 truncate max-w-[250px]">{spec.valor}</div>
                                                                </div>
                                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${targetSpecId === spec.especificacion_padre_id ? 'border-amber-400 bg-amber-400/20' : 'border-white/20 group-hover:border-white/50'}`}>
                                                                    {targetSpecId === spec.especificacion_padre_id && <div className="w-2 h-2 bg-amber-400 rounded-full" />}
                                                                </div>
                                                            </button>
                                                        ))}
                                                        {especificacionesBase.length === 0 && (
                                                            <div className="text-center p-4 text-slate-500 text-[10px] italic bg-black/20 rounded-xl">No hay componentes en la ficha pase para reemplazar. Por favor Añádelo.</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Sección de Soporte Técnico */}
                                    <div className="pt-4 border-t border-white/5 space-y-4">
                                        <label className="flex items-center gap-3 p-4 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20 rounded-2xl cursor-pointer transition-all group">
                                            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                                                registrarSoporte ? 'bg-indigo-500 border-indigo-500' : 'border-indigo-500/30'
                                            }`}>
                                                {registrarSoporte && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                            </div>
                                            <input 
                                                type="checkbox" 
                                                className="hidden" 
                                                checked={registrarSoporte}
                                                onChange={(e) => setRegistrarSoporte(e.target.checked)}
                                            />
                                            <div>
                                                <p className="text-[11px] font-black text-white uppercase tracking-tight">Vincular con Tarea de Soporte</p>
                                                <p className="text-[9px] text-indigo-400/60 font-bold uppercase">Esto creará un ticket automático atado al responsable.</p>
                                            </div>
                                        </label>

                                        <AnimatePresence>
                                            {registrarSoporte && (
                                                <motion.div 
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden space-y-4"
                                                >
                                                    <div className="space-y-2 flex flex-col pt-2">
                                                        <label htmlFor="notasSoporte" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Notas Opcionales Técnicas del Mantenimiento</label>
                                                        <textarea 
                                                            id="notasSoporte"
                                                            value={notasSoporte}
                                                            onChange={(e) => setNotasSoporte(e.target.value)}
                                                            rows="2"
                                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50 transition-all font-medium text-xs resize-none"
                                                            placeholder="Ej: Se instaló la nueva RAM para soportar software CAD..."
                                                        ></textarea>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        <div className="p-4 sm:p-6 border-t border-white/5 bg-white/[0.01] shrink-0">
                            <div className="flex justify-end gap-3">
                                {step === 1 ? (
                                    <>
                                        <button 
                                            onClick={onClose} 
                                            className="bg-white/5 hover:bg-white/10 text-slate-300 font-bold px-6 py-2.5 rounded-xl transition-all border border-white/10 hover:border-white/20 cursor-pointer text-sm"
                                        >
                                            Cancelar
                                        </button>
                                        <button 
                                            disabled={!repuestoSeleccionado}
                                            onClick={() => setStep(2)}
                                            className={`px-8 py-2.5 rounded-xl font-bold transition-all shadow-xl flex items-center justify-center gap-2 text-sm ${
                                                !repuestoSeleccionado ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 active:scale-95 cursor-pointer'
                                            }`}
                                        >
                                            Siguiente <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button 
                                            onClick={() => { setStep(1); setError(null); }} 
                                            className="bg-white/5 hover:bg-white/10 text-slate-300 font-bold px-6 py-2.5 rounded-xl transition-all border border-white/10 hover:border-white/20 cursor-pointer text-sm"
                                        >
                                            Atrás
                                        </button>
                                        <button 
                                            disabled={instalando}
                                            onClick={handleInstalar}
                                            className={`px-8 py-2.5 rounded-xl font-bold transition-all shadow-xl flex items-center justify-center gap-2 text-sm ${
                                                instalando ? 'bg-emerald-600/50 cursor-not-allowed text-white/50' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 active:scale-95 cursor-pointer'
                                            }`}
                                        >
                                            {instalando ? 'Aplicando...' : 'Confirmar'} <CheckCircle2 className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default InstalarRepuestoModal;
