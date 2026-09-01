import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Save, Package, Activity, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Select from '../common/Select';

const ComponenteFormModal = ({ isOpen, onClose, onSave, initialData }) => {
    const [nombre, setNombre] = useState('');
    const [nne, setNne] = useState('');
    const [serie, setSerie] = useState('');
    const [cantidad, setCantidad] = useState(0);
    const [estado, setEstado] = useState('NUEVO');
    const [especificaciones, setEspecificaciones] = useState<{clave: string; valor: string}[]>([]);
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

    const handleSpecChange = (index: number, field: 'clave' | 'valor', val: string) => {
        const newSpecs = [...especificaciones];
        newSpecs[index][field] = val;
        setEspecificaciones(newSpecs);
    };

    const handleRemoveSpec = (index: number) => {
        setEspecificaciones(especificaciones.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving) return;
        setIsSaving(true);
        try {
            await onSave({
                id: initialData?.id,
                nombre, nne, serie, cantidad, estado, especificaciones
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={!isSaving ? onClose : undefined}
                    className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
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
                        <h2 className="text-[16px] font-semibold text-[#e4e2e4] leading-none">{initialData?.id ? 'Editar Repuesto' : 'Cargar Repuesto'}</h2>
                        <p className="text-xs text-[#c4c5d9] mt-0.5">Completa los datos del inventario de stock.</p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="ml-auto w-8 h-8 grid place-items-center rounded-full hover:bg-white/5 text-[#c4c5d9] disabled:opacity-50"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form id="componente-form" onSubmit={handleSubmit} className="p-4 overflow-y-auto custom-scrollbar overscroll-contain flex-1 space-y-4" style={{ overscrollBehavior: 'contain' }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={isSaving ? 'opacity-50' : ''}>
                            <label className="block text-xs font-semibold mb-1.5 text-[#c4c5d9]">Nombre del Componente <span className="text-[#ffb4ab]">*</span></label>
                            <input
                                required
                                disabled={isSaving}
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                className="w-full bg-[#131315] border border-white/5 text-[#e4e2e4] placeholder:text-zinc-600 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#b8c3ff]/40 text-sm"
                                placeholder="Ej: Disco Duro SSD 1TB"
                            />
                        </div>

                        <Select
                            label="Estado de la Pieza"
                            icon={Activity}
                            disabled={isSaving}
                            value={estado}
                            onChange={(e: any) => setEstado(e.target.value)}
                            options={[
                                { value: "NUEVO", label: "NUEVO (EN CAJA)" },
                                { value: "USADO", label: "USADO (OPERATIVO)" },
                                { value: "DAÑADO", label: "DAÑADO / REPARAR" },
                                { value: "SCRAP", label: "SCRAP (PARA BAJA)" }
                            ]}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className={isSaving ? 'opacity-50' : ''}>
                            <label className="block text-xs font-semibold mb-1.5 text-[#c4c5d9]">NNE</label>
                            <input
                                disabled={isSaving}
                                value={nne}
                                onChange={(e) => setNne(e.target.value)}
                                className="w-full bg-[#131315] border border-white/5 text-[#e4e2e4] placeholder:text-zinc-600 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#b8c3ff]/40 text-sm"
                                placeholder="NNE-XXXX"
                            />
                        </div>
                        <div className={isSaving ? 'opacity-50' : ''}>
                            <label className="block text-xs font-semibold mb-1.5 text-[#c4c5d9]">Nro. de Serie</label>
                            <input
                                disabled={isSaving}
                                value={serie}
                                onChange={(e) => setSerie(e.target.value)}
                                className="w-full bg-[#131315] border border-white/5 text-[#e4e2e4] placeholder:text-zinc-600 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#b8c3ff]/40 text-sm"
                                placeholder="SN-XXXX"
                            />
                        </div>
                        <div className={isSaving ? 'opacity-50' : ''}>
                            <label className="block text-xs font-semibold mb-1.5 text-[#c4c5d9]">Cantidad en Stock <span className="text-[#ffb4ab]">*</span></label>
                            <input
                                type="number"
                                required
                                min="0"
                                disabled={isSaving}
                                value={cantidad}
                                onChange={(e) => setCantidad(Number(e.target.value))}
                                className="w-full bg-[#131315] border border-white/5 text-[#e4e2e4] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#b8c3ff]/40 text-sm"
                            />
                        </div>
                    </div>

                    <div className="pt-3 border-t border-white/5 space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="block text-xs font-semibold text-[#c4c5d9]">Especificaciones Técnicas</label>
                            <button
                                type="button"
                                disabled={isSaving}
                                onClick={handleAddSpec}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#c4c5d9] hover:text-white disabled:opacity-50"
                            >
                                <Plus className="w-3.5 h-3.5" /> Añadir
                            </button>
                        </div>

                        <div className="space-y-2">
                            {especificaciones.map((spec, idx) => (
                                <div key={idx} className={`flex gap-2 items-center ${isSaving ? 'opacity-50' : ''}`}>
                                    <div className="grid grid-cols-2 gap-2 flex-1">
                                        <input
                                            disabled={isSaving}
                                            value={spec.clave}
                                            onChange={(e) => handleSpecChange(idx, 'clave', e.target.value)}
                                            className="bg-[#131315] border border-white/5 text-[#e4e2e4] placeholder:text-zinc-600 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#b8c3ff]/40 text-sm"
                                            placeholder="Clave"
                                        />
                                        <input
                                            disabled={isSaving}
                                            value={spec.valor}
                                            onChange={(e) => handleSpecChange(idx, 'valor', e.target.value)}
                                            className="bg-[#131315] border border-white/5 text-[#e4e2e4] placeholder:text-zinc-600 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#b8c3ff]/40 text-sm"
                                            placeholder="Valor"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        disabled={isSaving}
                                        onClick={() => handleRemoveSpec(idx)}
                                        className="w-8 h-8 grid place-items-center text-red-400 hover:text-red-300 disabled:opacity-50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {especificaciones.length === 0 && (
                                <p className="text-xs text-zinc-500">Sin especificaciones adicionales.</p>
                            )}
                        </div>
                    </div>
                </form>

                <div className="p-4 border-t border-white/5 flex justify-end gap-2 shrink-0">
                    <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-[#c4c5d9] hover:text-white disabled:opacity-50">Cancelar</button>
                    <button type="submit" form="componente-form" disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-white inline-flex items-center gap-2 disabled:opacity-50">
                        {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Procesando...</> : <><Save className="w-4 h-4" />{initialData?.id ? 'Guardar Cambios' : 'Registrar'}</>}
                    </button>
                </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default ComponenteFormModal;
