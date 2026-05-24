import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Save, Package, Tag, Hash, Activity, Calendar, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../context/ToastContext';
import Select from '../common/Select';

const ComponenteFormModal = ({ isOpen, onClose, onSave, initialData }) => {
    const [nombre, setNombre] = useState('');
    const [nne, setNne] = useState('');
    const [serie, setSerie] = useState('');
    const [cantidad, setCantidad] = useState(0);
    const [estado, setEstado] = useState('NUEVO');
    const [especificaciones, setEspecificaciones] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (initialData && Object.keys(initialData).length > 0) {
            setNombre(initialData.nombre || '');
            setNne(initialData.nne || '');
            setSerie(initialData.serie || '');
            setCantidad(initialData.cantidad || 0);
            setEstado(initialData.estado || 'NUEVO');
            setEspecificaciones(initialData.especificaciones || []);
        } else {
            setNombre('');
            setNne('');
            setSerie('');
            setCantidad(0);
            setEstado('NUEVO');
            setEspecificaciones([]);
        }
        setIsSaving(false);
    }, [initialData, isOpen]);

    const handleAddSpec = () => {
        setEspecificaciones([...especificaciones, { clave: '', valor: '' }]);
    };

    const handleSpecChange = (index, field, val) => {
        const newSpecs = [...especificaciones];
        newSpecs[index][field] = val;
        setEspecificaciones(newSpecs);
    };

    const handleRemoveSpec = (index) => {
        setEspecificaciones(especificaciones.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSaving) return;
        
        setIsSaving(true);
        try {
            await onSave({
                id: initialData?.id,
                nombre,
                nne,
                serie,
                cantidad: parseInt(cantidad),
                estado,
                especificaciones
            });
        } finally {
            setIsSaving(false);
        }
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-5 sm:p-6 bg-black/85 backdrop-blur-md h-[100dvh] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={!isSaving ? onClose : undefined}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="bg-[#1e293b] border border-white/20 w-full max-w-2xl rounded-3xl sm:rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[calc(100dvh-40px)]"
                    >
                {/* Header */}
                <div className="p-5 sm:p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02] shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shrink-0">
                            <Package className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white tracking-tight leading-tight">
                                {initialData?.id ? 'Editar Repuesto' : 'Cargar Repuesto'}
                            </h2>
                            <p className="hidden sm:block text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-none mt-1">Inventario de Stock</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        disabled={isSaving}
                        className={`p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-400 ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                    {/* Campos Principales */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Nombre del Componente</label>
                            <div className={`flex items-center gap-3 bg-black/20 rounded-2xl px-4 border border-white/5 focus-within:border-indigo-500/30 transition-all ${isSaving ? 'opacity-50' : ''}`}>
                                <Package className="w-4 h-4 text-slate-400" />
                                <input 
                                    required
                                    disabled={isSaving}
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                    className="w-full bg-transparent text-white py-4 focus:outline-none font-medium placeholder:text-slate-600"
                                    placeholder="Ej: Disco Duro SSD 1TB"
                                />
                            </div>
                        </div>

                            <Select
                                label="Estado de la Pieza"
                                icon={Activity}
                                disabled={isSaving}
                                value={estado}
                                onChange={(e) => setEstado(e.target.value)}
                                options={[
                                    { value: "NUEVO", label: "NUEVO (EN CAJA)" },
                                    { value: "USADO", label: "USADO (OPERATIVO)" },
                                    { value: "DAÑADO", label: "DAÑADO / REPARAR" },
                                    { value: "SCRAP", label: "SCRAP (PARA BAJA)" }
                                ]}
                            />
                    </div>

                    {/* Identificadores */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">NNE</label>
                            <input 
                                disabled={isSaving}
                                value={nne}
                                onChange={(e) => setNne(e.target.value)}
                                className={`w-full bg-black/20 border border-white/5 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500/30 transition-all font-medium text-sm ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                                placeholder="NNE-XXXX"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">NRO SERIE</label>
                            <input 
                                disabled={isSaving}
                                value={serie}
                                onChange={(e) => setSerie(e.target.value)}
                                className={`w-full bg-black/20 border border-white/5 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500/30 transition-all font-medium text-sm ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                                placeholder="SN-XXXX"
                            />
                        </div>
                    </div>

                    <div className="space-y-2 max-w-[200px]">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Cantidad en Stock</label>
                        <div className={`flex items-center gap-3 bg-black/20 rounded-2xl px-4 border border-white/5 ${isSaving ? 'opacity-50' : ''}`}>
                            <Hash className="w-4 h-4 text-slate-400" />
                            <input 
                                type="number"
                                required
                                min="0"
                                disabled={isSaving}
                                value={cantidad}
                                onChange={(e) => setCantidad(e.target.value)}
                                className="w-full bg-transparent text-white py-4 focus:outline-none font-bold"
                            />
                        </div>
                    </div>

                    {/* Especificaciones Dinámicas */}
                    <div className="space-y-4 pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                                <Tag className="w-4 h-4 text-indigo-400" /> Especificaciones Técnicas
                            </h3>
                            <button 
                                type="button"
                                disabled={isSaving}
                                onClick={handleAddSpec}
                                className={`text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/5 rounded-lg hover:bg-indigo-500/10 ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                                <Plus className="w-3.5 h-3.5" /> Añadir Parámetro
                            </button>
                        </div>

                        <div className="space-y-3">
                            {especificaciones.map((spec, idx) => (
                                <div key={idx} className="flex gap-3 items-center">
                                    <div className={`grid grid-cols-2 gap-3 flex-1 ${isSaving ? 'opacity-50' : ''}`}>
                                        <input 
                                            disabled={isSaving}
                                            value={spec.clave}
                                            onChange={(e) => handleSpecChange(idx, 'clave', e.target.value)}
                                            className="bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/30 font-medium"
                                            placeholder="Clave (Ej: Capacidad)"
                                        />
                                        <input 
                                            disabled={isSaving}
                                            value={spec.valor}
                                            onChange={(e) => handleSpecChange(idx, 'valor', e.target.value)}
                                            className="bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/30 font-medium"
                                            placeholder="Valor (Ej: 500 GB)"
                                        />
                                    </div>
                                    <button 
                                        type="button"
                                        disabled={isSaving}
                                        onClick={() => handleRemoveSpec(idx)}
                                        className={`p-3 text-slate-500 hover:text-rose-400 transition-colors ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {especificaciones.length === 0 && (
                                <p className="text-center py-4 text-slate-600 text-xs italic">No hay especificaciones adicionales.</p>
                            )}
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="p-4 sm:p-6 border-t border-white/5 flex flex-row justify-end gap-3 bg-black/10">
                    <button 
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className={`bg-white/5 hover:bg-white/10 text-slate-300 font-bold px-6 py-2.5 rounded-xl transition-all border border-white/10 hover:border-white/20 text-sm ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSubmit}
                        disabled={isSaving}
                        className={`bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-2.5 rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] flex items-center justify-center gap-2 text-sm ${isSaving ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Procesando...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                {initialData?.id ? 'Guardar Cambios' : 'Registrar'}
                            </>
                        )}
                    </button>
                </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default ComponenteFormModal;
