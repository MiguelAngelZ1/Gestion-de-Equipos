import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api';
import { Activity, Plus, Edit2, Trash2, X, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from '../common/ConfirmModal';

const EstadosPanel = () => {
    const formRef = React.useRef(null);
    const [estados, setEstados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingNode, setEditingNode] = useState(null);
    const [formData, setFormData] = useState({ nombre: '', color_hex: '#10b981' });
    const [isSaving, setIsSaving] = useState(false);
    // Deletion states
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);

    const fetchEstados = async () => {
        try {
            setLoading(true);
            const data = await apiRequest('/config/estados');
            setEstados(data);
        } catch (error) {
            console.error("Error fetching estados:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEstados();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.nombre.trim() || !formData.color_hex || isSaving) return;

        setIsSaving(true);
        try {
            if (editingNode) {
                await apiRequest(`/config/estados/${editingNode.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                });
            } else {
                await apiRequest('/config/estados', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
            }
            setFormData({ nombre: '', color_hex: '#10b981' });
            setEditingNode(null);
            fetchEstados();
        } catch (error) {
            console.error("Error saving estado:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        try {
            if (selectedIds.length > 0 && !itemToDelete) {
                await apiRequest('/config/estados/bulk', {
                    method: 'DELETE',
                    body: JSON.stringify({ ids: selectedIds })
                });
                // Actualización optimista bulk
                setEstados(prev => prev.filter(e => !selectedIds.includes(e.id)));
                setSelectedIds([]);
            } else if (itemToDelete) {
                await apiRequest(`/config/estados/${itemToDelete.id}`, {
                    method: 'DELETE'
                });
                // Actualización optimista single
                setEstados(prev => prev.filter(e => e.id !== itemToDelete.id));
                setSelectedIds(selectedIds.filter(id => id !== itemToDelete.id));
            }
            setIsDeleteOpen(false);
            setItemToDelete(null);
            fetchEstados(); // Sincronizar
        } catch (error) {
            console.error("Error deleting estado:", error);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === estados.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(estados.map(e => e.id));
        }
    };

    const toggleSelect = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(v => v !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    return (
        <div className="flex flex-col lg:h-full">
            {selectedIds.length > 0 && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => setIsDeleteOpen(true)}
                    className="mb-4 bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border border-rose-500/30 w-auto shrink-0 justify-center"
                >
                    <Trash2 className="w-4 h-4" /> Eliminar ({selectedIds.length})
                </motion.button>
            )}

            <div ref={formRef} className={`sm:bg-white/5 sm:border border-white/10 sm:p-5 sm:rounded-2xl mb-4 ${isSaving ? 'opacity-50' : ''}`}>
                <form onSubmit={handleSave} className="flex flex-col sm:flex-row gap-3">
                    <input 
                        type="text"
                        disabled={isSaving}
                        value={formData.nombre || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                        placeholder="Ej. 'Mantenimiento'"
                        className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 focus:outline-none transition-colors"
                        required
                    />
                    <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-xl px-4 py-2.5">
                        <input
                            type="color"
                            disabled={isSaving}
                            value={formData.color_hex || '#10b981'}
                            onChange={(e) => setFormData(prev => ({ ...prev, color_hex: e.target.value }))}
                            className={`w-8 h-8 rounded border-none cursor-pointer bg-transparent ${isSaving ? 'cursor-not-allowed' : ''}`}
                            title="Color Visual"
                        />
                        <span className="text-xs text-slate-400 font-mono uppercase w-16 text-center">{formData.color_hex || '#10b981'}</span>
                    </div>

                    <div className="flex gap-3 items-center">
                        <button 
                            type="submit"
                            disabled={isSaving}
                            className={`flex-1 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${isSaving ? 'opacity-80 cursor-not-allowed' : 'active:scale-95'}`}
                        >
                            {isSaving ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                            ) : (
                                editingNode ? 'Actualizar' : <><Plus className="w-4 h-4" /> Añadir</>
                            )}
                        </button>
                        {editingNode && (
                            <button 
                                type="button"
                                disabled={isSaving}
                                onClick={() => { setEditingNode(null); setFormData({ nombre: '', color_hex: '#10b981' }); }}
                                className={`bg-slate-700/50 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </form>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar sm:bg-black/20 sm:rounded-2xl sm:border border-white/5 py-2 sm:p-4">
                {loading ? (
                    <div className="flex justify-center py-10 opacity-50"><Activity className="w-8 h-8 animate-pulse text-indigo-400" /></div>
                ) : estados.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 flex flex-col items-center gap-3">
                        <AlertCircle className="w-8 h-8 opacity-50" />
                        <p className="text-sm font-medium">No hay estados registrados.</p>
                    </div>
                ) : (
                    <>
                        <div className="mb-4 flex items-center pl-2">
                           <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-400 hover:text-white transition-colors">
                              <input 
                                type="checkbox" 
                                checked={selectedIds.length === estados.length && estados.length > 0}
                                onChange={toggleSelectAll}
                                className="w-4 h-4 rounded border-white/10 bg-black/30 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer"
                              />
                              Seleccionar Todo
                           </label>
                        </div>
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3">
                            <AnimatePresence>
                                {estados.map(estado => (
                                    <motion.div 
                                        key={estado.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className={`bg-white/5 border p-4 rounded-2xl flex items-start gap-3 justify-between group transition-all ${selectedIds.includes(estado.id) ? 'border-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.2)]' : 'border-white/10 hover:border-indigo-500/30'}`}
                                        style={{ borderLeftColor: estado.color_hex, borderLeftWidth: '4px' }}
                                    >
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedIds.includes(estado.id)}
                                                onChange={() => toggleSelect(estado.id)}
                                                className="w-4 h-4 rounded border-white/10 bg-black/30 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer shrink-0 mt-0.5"
                                            />
                                            <div 
                                              className="w-3 h-3 rounded-full shadow-sm shrink-0 mt-1" 
                                              style={{ backgroundColor: estado.color_hex, boxShadow: `0 0 10px ${estado.color_hex}` }} 
                                            />
                                            <span className="text-sm font-bold text-white tracking-widest uppercase break-words leading-tight flex-1 whitespace-normal">{estado.nombre}</span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                            <button 
                                                onClick={() => { 
                                                    setEditingNode(estado); 
                                                    setFormData({ nombre: estado.nombre, color_hex: estado.color_hex });
                                                    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                }}
                                                className="p-1.5 min-w-0 bg-white/5 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400 rounded-lg transition-all"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button 
                                                onClick={() => { setItemToDelete(estado); setIsDeleteOpen(true); }}
                                                className="p-1.5 min-w-0 bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition-all"
                                            >
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

            <ConfirmModal 
                isOpen={isDeleteOpen}
                onClose={() => { setIsDeleteOpen(false); setItemToDelete(null); }}
                onConfirm={handleDelete}
                title="Eliminar Estado"
                message={itemToDelete 
                    ? `¿Estás seguro que deseas eliminar el estado "${itemToDelete.nombre}"?`
                    : `¿Estás seguro que deseas eliminar los ${selectedIds.length} elementos seleccionados?`
                }
            />
        </div>
    );
};

export default EstadosPanel;
