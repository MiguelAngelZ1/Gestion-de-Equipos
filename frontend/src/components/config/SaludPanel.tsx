import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api';
import { Activity, Database, Trash2, RotateCcw, HardDrive, RefreshCw, User, MapPin, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../common/ConfirmModal';

const SaludPanel = () => {
    const { showToast } = useToast();
    const [stats, setStats] = useState(null);
    const [trash, setTrash] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [isPurgeOpen, setIsPurgeOpen] = useState(false);
    const [isOptimizeOpen, setIsOptimizeOpen] = useState(false);

    const fetchData = async () => {
        try {
            const [statsData, trashData] = await Promise.all([apiRequest('/mantenimiento/stats'), apiRequest('/mantenimiento/trash')]);
            setStats(statsData); setTrash(trashData);
        } catch {} finally { setLoading(false); }
    };
    useEffect(() => { fetchData(); }, []);
    const handleOptimize = async () => {
        setIsOptimizeOpen(false);
        try { setActionLoading(true); await apiRequest('/mantenimiento/optimize', { method: 'POST' }); showToast("Sistema Optimizado", "Base reorganizada.", "success"); await fetchData(); }
        catch { showToast("Error", "No se pudo optimizar.", "error"); } finally { setActionLoading(false); }
    };
    const handleRestore = async (id) => {
        setTrash(prev => prev.filter(item => item.id !== id));
        try { await apiRequest(`/mantenimiento/restore/${id}`, { method: 'POST' }); showToast("Restaurado", "Registro activo.", "success"); await fetchData(); }
        catch { showToast("Error", "No se pudo restaurar.", "error"); await fetchData(); }
    };
    const handleDeleteIndividual = async (id) => {
        setTrash(prev => prev.filter(item => item.id !== id));
        try { await apiRequest(`/mantenimiento/delete/${id}`, { method: 'DELETE' }); showToast("Eliminado", "Borrado permanente.", "success"); await fetchData(); }
        catch { showToast("Error", "No se pudo eliminar.", "error"); await fetchData(); }
    };
    const handlePurge = async () => {
        setIsPurgeOpen(false);
        try { setActionLoading(true); await apiRequest('/mantenimiento/purge', { method: 'DELETE' }); showToast("Papelera Vaciada", "Registros eliminados.", "success"); await fetchData(); }
        catch { showToast("Error", "No se pudo vaciar.", "error"); } finally { setActionLoading(false); }
    };

    if (loading) return <div className="flex justify-center py-16"><div className="w-6 h-6 rounded-full border-2 border-zinc-800 border-t-white animate-spin" /></div>;

    return (
        <div className="flex flex-col gap-4 flex-1 min-h-0">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between gap-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-zinc-500" /> Almacenamiento
                    <span className="text-zinc-600 font-medium normal-case tracking-normal">{stats?.engine || 'SQLITE'}</span>
                </h3>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 mb-1">Espacio en Disco</p>
                    <p className="text-xl font-bold text-white">{stats?.databaseSize || '0 MB'}</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 mb-1">Registros Totales</p>
                    <p className="text-xl font-bold text-white">{(stats?.counts?.equipos || 0) + (stats?.counts?.repuestos || 0) + (stats?.counts?.soporte || 0)}</p>
                </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold text-white">Optimización Inteligente</p>
                    <p className="text-xs text-zinc-500">Reorganiza índices y recupera espacio.</p>
                </div>
                <button onClick={() => setIsOptimizeOpen(true)} className="inline-flex items-center gap-1.5 bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0">
                    <Zap className="w-4 h-4" /> Ejecutar
                </button>
            </div>

            <div className="flex-1 min-h-0 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                        <Trash2 className="w-4 h-4 text-zinc-500" /> Papelera
                        <span className="text-zinc-600 font-medium normal-case tracking-normal">{trash.length} elementos</span>
                    </h3>
                    {trash.length > 0 && (
                        <button onClick={() => setIsPurgeOpen(true)} className="inline-flex items-center gap-1.5 bg-transparent hover:bg-white/5 text-zinc-500 hover:text-red-400 text-xs font-medium px-2 py-1 rounded-lg transition-colors cursor-pointer">
                            Vaciar todo
                        </button>
                    )}
                </div>

                {trash.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 bg-zinc-900 border border-dashed border-zinc-800 rounded-xl">
                        <p className="text-sm text-zinc-500">Papelera limpia.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 auto-rows-min items-start content-start flex-1 overflow-y-auto pr-1 custom-scrollbar">
                        <AnimatePresence mode="popLayout">
                            {trash.map((item, idx) => (
                                <motion.div key={item.id || idx} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                                    className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2 hover:border-zinc-700 transition-colors h-fit">
                                    <div className="flex items-center gap-2">
                                        <Database className="w-4 h-4 text-zinc-500 shrink-0" />
                                        <span className="text-sm font-semibold text-white truncate">{item.ine || `ID: ${item.id.toString().substring(0,6)}`}</span>
                                    </div>
                                    <div className="space-y-1 text-xs text-zinc-500 border-t border-zinc-800 pt-2">
                                        <div className="flex items-center gap-1.5 truncate"><MapPin className="w-3 h-3 shrink-0" />{item.ubicacion || 'Sin ubicación'}</div>
                                        <div className="flex items-center gap-1.5 truncate"><User className="w-3 h-3 shrink-0" />{item.responsable || 'Sin propietario'}</div>
                                    </div>
                                    <div className="flex items-center gap-1 pt-2 border-t border-zinc-800">
                                        <button onClick={() => handleRestore(item.id)} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-transparent hover:bg-white/5 text-zinc-400 hover:text-emerald-400 text-xs font-medium transition-colors cursor-pointer">
                                            <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                                        </button>
                                        <div className="flex-1" />
                                        <button onClick={() => handleDeleteIndividual(item.id)} className="w-7 h-7 grid place-items-center rounded-lg bg-transparent hover:bg-white/5 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            <ConfirmModal isOpen={isPurgeOpen} onClose={() => setIsPurgeOpen(false)} onConfirm={handlePurge} title="¿Purgar Papelera?" message="Se eliminarán todos los registros permanentemente." type="danger" />
            <ConfirmModal isOpen={isOptimizeOpen} onClose={() => setIsOptimizeOpen(false)} onConfirm={handleOptimize} title="Optimizar" message="Se reorganizarán índices y almacenamiento." type="info" />
        </div>
    );
};
export default SaludPanel;
