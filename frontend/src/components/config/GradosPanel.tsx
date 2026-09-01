import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api';
import { Shield, Plus, Edit2, Trash2, X, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from '../common/ConfirmModal';

const GradosPanel = () => {
    const formRef = React.useRef(null);
    const [grados, setGrados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingNode, setEditingNode] = useState(null);
    const [formData, setFormData] = useState({ abreviatura: '', grado_completo: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);

    const fetchGrados = async () => {
        try { setLoading(true); const data = await apiRequest('/config/grados'); setGrados(data); } catch {} finally { setLoading(false); }
    };
    useEffect(() => { fetchGrados(); }, []);
    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.abreviatura.trim() || !formData.grado_completo.trim() || isSaving) return;
        setIsSaving(true);
        try {
            if (editingNode) await apiRequest(`/config/grados/${editingNode.id}`, { method: 'PUT', body: JSON.stringify(formData) });
            else await apiRequest('/config/grados', { method: 'POST', body: JSON.stringify(formData) });
            setFormData({ abreviatura: '', grado_completo: '' }); setEditingNode(null); fetchGrados();
        } catch {} finally { setIsSaving(false); }
    };
    const handleDelete = async () => {
        try {
            if (selectedIds.length > 0 && !itemToDelete) {
                await apiRequest('/config/grados/bulk', { method: 'DELETE', body: JSON.stringify({ ids: selectedIds }) });
                setGrados(prev => prev.filter(g => !selectedIds.includes(g.id))); setSelectedIds([]);
            } else if (itemToDelete) {
                await apiRequest(`/config/grados/${itemToDelete.id}`, { method: 'DELETE' });
                setGrados(prev => prev.filter(g => g.id !== itemToDelete.id)); setSelectedIds(selectedIds.filter(id => id !== itemToDelete.id));
            }
            setIsDeleteOpen(false); setItemToDelete(null); fetchGrados();
        } catch {}
    };
    const toggleSelectAll = () => { if (selectedIds.length === grados.length) setSelectedIds([]); else setSelectedIds(grados.map(g => g.id)); };
    const toggleSelect = (id) => { if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(v => v !== id)); else setSelectedIds([...selectedIds, id]); };

    return (
        <div className="flex flex-col gap-4 flex-1 min-h-0">
            {selectedIds.length > 0 && (
                <motion.button initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onClick={() => setIsDeleteOpen(true)}
                    className="self-start inline-flex items-center gap-1.5 bg-transparent hover:bg-white/5 text-zinc-400 hover:text-red-400 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                    <Trash2 className="w-4 h-4" /> Eliminar ({selectedIds.length})
                </motion.button>
            )}

            <div ref={formRef} className={`bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center gap-2 ${isSaving ? 'opacity-50' : ''}`}>
                <form onSubmit={handleSave} className="flex items-center gap-2 w-full flex-wrap">
                    <input type="text" disabled={isSaving} value={formData.abreviatura || ''} onChange={(e) => setFormData(prev => ({ ...prev, abreviatura: e.target.value }))} placeholder="Abrev. (ej. Slc)" size={14}
                        className="w-auto field-sizing-content max-w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-600 focus:outline-none transition-colors" required />
                    <input type="text" disabled={isSaving} value={formData.grado_completo || ''} onChange={(e) => setFormData(prev => ({ ...prev, grado_completo: e.target.value }))} placeholder="Nombre completo (ej. Soldado)" size={26}
                        className="w-auto field-sizing-content max-w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-600 focus:outline-none transition-colors" required />
                    <button type="submit" disabled={isSaving} className="inline-flex items-center gap-1.5 bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white px-3 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer">
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {editingNode ? 'Actualizar' : 'Añadir'}
                    </button>
                    {editingNode && (
                        <button type="button" disabled={isSaving} onClick={() => { setEditingNode(null); setFormData({ abreviatura: '', grado_completo: '' }); }}
                            className="w-8 h-8 grid place-items-center rounded-lg bg-transparent hover:bg-white/5 text-zinc-500 hover:text-white transition-colors disabled:opacity-50 cursor-pointer">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </form>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar flex flex-col">
                {loading ? (
                    <div className="flex justify-center py-16"><div className="w-6 h-6 rounded-full border-2 border-zinc-800 border-t-white animate-spin" /></div>
                ) : grados.length === 0 ? (
                    <div className="text-center py-16 bg-zinc-900 border border-dashed border-zinc-800 rounded-xl flex flex-col items-center gap-2">
                        <AlertCircle className="w-6 h-6 text-zinc-600" />
                        <p className="text-sm text-zinc-500">No hay grados registrados.</p>
                    </div>
                ) : (
                    <>
                        <div className="mb-3 flex items-center">
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors">
                                <input type="checkbox" checked={selectedIds.length === grados.length && grados.length > 0} onChange={toggleSelectAll}
                                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-white focus:ring-0 cursor-pointer" />
                                Seleccionar todo
                            </label>
                        </div>
                        <div className="grid grid-cols-3 gap-3 auto-rows-min items-start content-start">
                            <AnimatePresence>
                                {grados.map(grado => (
                                    <motion.div key={grado.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                                        className={`bg-zinc-900 border rounded-xl px-3 py-2.5 flex items-center gap-2 transition-colors h-fit ${selectedIds.includes(grado.id) ? 'border-white bg-white text-zinc-900' : 'border-zinc-800 hover:border-zinc-700'}`}>
                                        <input type="checkbox" checked={selectedIds.includes(grado.id)} onChange={() => toggleSelect(grado.id)}
                                            className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-white focus:ring-0 cursor-pointer shrink-0" />
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <span className={`text-sm font-semibold truncate ${selectedIds.includes(grado.id) ? 'text-zinc-900' : 'text-white'}`}>{grado.grado_completo}</span>
                                            <span className={`text-xs truncate ${selectedIds.includes(grado.id) ? 'text-zinc-600' : 'text-zinc-500'}`}>{grado.abreviatura}</span>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button onClick={() => { setEditingNode(grado); setFormData({ abreviatura: grado.abreviatura, grado_completo: grado.grado_completo }); formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}
                                                className={`w-7 h-7 grid place-items-center rounded-lg bg-transparent hover:bg-white/5 transition-colors ${selectedIds.includes(grado.id) ? 'text-zinc-600 hover:text-zinc-900' : 'text-zinc-500 hover:text-white'}`}>
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => { setItemToDelete(grado); setIsDeleteOpen(true); }}
                                                className={`w-7 h-7 grid place-items-center rounded-lg bg-transparent hover:bg-white/5 transition-colors ${selectedIds.includes(grado.id) ? 'text-zinc-600 hover:text-red-600' : 'text-zinc-500 hover:text-red-400'}`}>
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </>
                )}
            </div>

            <ConfirmModal isOpen={isDeleteOpen} onClose={() => { setIsDeleteOpen(false); setItemToDelete(null); }} onConfirm={handleDelete} title="Eliminar Grado" message={itemToDelete ? `¿Eliminar "${itemToDelete.grado_completo}"?` : `¿Eliminar ${selectedIds.length} grados seleccionados?`} />
        </div>
    );
};
export default GradosPanel;
