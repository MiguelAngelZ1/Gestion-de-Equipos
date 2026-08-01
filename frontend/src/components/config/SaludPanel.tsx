import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api';
import { 
    Activity, Database, Trash2, RotateCcw, 
    ShieldCheck, AlertCircle, HardDrive, 
    RefreshCw, User, MapPin, FileText, 
    Sparkles, Zap, Shield
} from 'lucide-react';
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
            const [statsData, trashData] = await Promise.all([
                apiRequest('/mantenimiento/stats'),
                apiRequest('/mantenimiento/trash')
            ]);
            setStats(statsData);
            setTrash(trashData);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOptimize = async () => {
        setIsOptimizeOpen(false);
        try {
            setActionLoading(true);
            await apiRequest('/mantenimiento/optimize', { method: 'POST' });
            showToast("Sistema Optimizado", "La base de datos ha sido reorganizada.", "success");
            await fetchData();
        } catch (error) {
            showToast("Error", "No se pudo optimizar el sistema.", "error");
        } finally {
            setActionLoading(false);
        }
    };

    const handleRestore = async (id) => {
        // Actualización optimista: eliminar de la vista inmediatamente
        setTrash(prev => prev.filter(item => item.id !== id));
        
        try {
            await apiRequest(`/mantenimiento/restore/${id}`, { method: 'POST' });
            showToast("Equipo Restaurado", "El registro ha vuelto al inventario activo.", "success");
            await fetchData();
        } catch (error) {
            showToast("Error", "No se pudo restaurar el equipo.", "error");
            // Revertir si hay error (opcional, fetchData lo hará de todos modos)
            await fetchData();
        }
    };

    const handleDeleteIndividual = async (id) => {
        // Actualización optimista: eliminar de la vista inmediatamente
        setTrash(prev => prev.filter(item => item.id !== id));

        try {
            await apiRequest(`/mantenimiento/delete/${id}`, { method: 'DELETE' });
            showToast("Eliminado Definitivamente", "El registro ha sido borrado de la base de datos.", "success");
            await fetchData();
        } catch (error) {
            showToast("Error", "No se pudo eliminar el equipo permanentemente.", "error");
            // Revertir si hay error
            await fetchData();
        }
    };

    const handlePurge = async () => {
        setIsPurgeOpen(false);
        try {
            setActionLoading(true);
            await apiRequest('/mantenimiento/purge', { method: 'DELETE' });
            showToast("Papelera Vaciada", "Se han eliminado todos los registros permanentemente.", "success");
            await fetchData();
        } catch (error) {
            showToast("Error", "No se pudo vaciar la papelera.", "error");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
        </div>
    );

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 pb-10 overflow-x-hidden max-w-full"
        >
            {/* --- HEADER BENTO GRID --- */}
            {/* --- HEADER STACK --- */}
            <div className="flex flex-col gap-6">
                {/* Database Glow Card */}
                <div className="relative group overflow-hidden sm:bg-white/[0.03] sm:border border-white/10 rounded-2xl sm:rounded-[2.5rem] p-0 sm:p-7 transition-all hover:border-indigo-500/30 w-full shadow-2xl">
                    
                    <div className="relative flex flex-col gap-7">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-2xl shadow-indigo-500/10 shrink-0">
                                    <HardDrive className="w-8 h-8 text-indigo-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tighter leading-tight">Estado del Almacenamiento</h2>
                                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                                        <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 h-6">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Sistema en Línea</span>
                                        </div>
                                        <div className="bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 h-6 flex items-center">
                                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{stats?.engine || 'SQLITE (LOCAL)'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="hidden md:flex flex-col items-end text-right opacity-40 group-hover:opacity-100 transition-opacity">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Integridad de Datos</span>
                                <span className="text-white font-black text-xs uppercase tracking-widest mt-1">100% Verificada</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                            <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[2rem] relative overflow-hidden group/item">
                                <Activity className="absolute -right-6 -bottom-6 w-32 h-32 text-white/[0.02] group-hover/item:text-white/[0.04] transition-all pointer-events-none transform -rotate-12 group-hover/item:scale-110" />
                                <div className="relative z-10">
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                        <div className="w-1 h-1 rounded-full bg-indigo-500" />
                                        Espacio en Disco
                                    </p>
                                    <div className="flex items-baseline gap-2">
                                        <p className="text-3xl sm:text-4xl font-black text-white tracking-tighter">{stats?.databaseSize?.split(' ')[0] || '0.00'}</p>
                                        <p className="text-lg font-black text-indigo-400/50 uppercase">{stats?.databaseSize?.split(' ')[1] || 'MB'}</p>
                                    </div>
                                    <p className="text-[8px] text-slate-500 font-bold mt-3 uppercase tracking-widest opacity-60">Peso total de la base de datos</p>
                                </div>
                            </div>
                            <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[2rem] relative overflow-hidden group/item">
                                <Database className="absolute -right-6 -bottom-6 w-32 h-32 text-white/[0.02] group-hover/item:text-white/[0.04] transition-all pointer-events-none transform rotate-12 group-hover/item:scale-110" />
                                <div className="relative z-10">
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                        <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                        Registros Totales
                                    </p>
                                    <div className="flex items-baseline gap-2">
                                        <p className="text-3xl sm:text-4xl font-black text-white tracking-tighter">
                                            {(stats?.counts?.equipos || 0) + (stats?.counts?.repuestos || 0) + (stats?.counts?.soporte || 0)}
                                        </p>
                                        <p className="text-lg font-black text-emerald-400/50 uppercase">Entradas</p>
                                    </div>
                                    <p className="text-[8px] text-slate-500 font-bold mt-3 uppercase tracking-widest opacity-60">Objetos rastreados en el sistema</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Optimization Quick Action - Refined Format */}
                <div className="relative overflow-hidden group cursor-pointer hover:scale-[1.01] transition-all active:scale-[0.99] flex flex-col w-full glass-panel bg-indigo-600/5 rounded-[2rem] sm:rounded-[2.5rem] border border-white/10 shadow-2xl"
                     onClick={() => setIsOptimizeOpen(true)}>
                    
                    {/* Accent Glows handled by the parent now, adding extra internal depth */}
                    <div className="absolute right-0 top-0 bottom-0 w-1/4 bg-gradient-to-l from-indigo-500/5 to-transparent pointer-events-none" />
                    
                    <div className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-12 relative z-10">
                        <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                            <div className="bg-indigo-500/20 w-16 h-16 rounded-2xl flex items-center justify-center border border-indigo-500/30 group-hover:rotate-12 transition-all duration-700 shrink-0 shadow-xl shadow-indigo-500/20">
                                <Sparkles className="w-8 h-8 text-indigo-400" />
                            </div>
                            <div className="flex flex-col gap-1 max-w-xl">
                                <h3 className="text-white text-xl sm:text-2xl font-black tracking-tighter leading-none">Optimización Inteligente</h3>
                                <p className="text-slate-400 text-[11px] sm:text-xs font-bold leading-relaxed opacity-70 mt-1 max-w-lg">
                                    Reorganiza estructuras de datos, limpia registros y recupera espacio automáticamente para máximo rendimiento del motor.
                                </p>
                            </div>
                        </div>
                        
                        <div className="shrink-0 w-full md:w-auto">
                            <div className="flex items-center gap-3 text-white font-black text-[10px] sm:text-xs uppercase tracking-[0.25em] bg-indigo-500 hover:bg-indigo-400 px-8 py-4 sm:py-5 rounded-2xl border border-indigo-400/30 w-full md:w-fit justify-center transition-all shadow-xl shadow-indigo-500/30 group-hover:shadow-indigo-500/50 group-hover:scale-105 active:scale-95">
                                <Zap className="w-4 h-4 fill-white animate-pulse" />
                                <span>Ejecutar Ahora</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- RECYCLE BIN SECTION --- */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-0 sm:px-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                            <Trash2 className="w-6 h-6 text-rose-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white tracking-tight">Papelera de Reciclaje</h3>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{trash.length} Elementos Archivados</p>
                        </div>
                    </div>
                    {trash.length > 0 && (
                        <button 
                            onClick={() => setIsPurgeOpen(true)}
                            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center gap-3 active:scale-95 shadow-lg shadow-rose-500/5 cursor-pointer"
                        >
                            <AlertCircle className="w-3.5 h-3.5" />
                            Vaciar Todo
                        </button>
                    )}
                </div>

                <div className="relative min-h-[200px] sm:min-h-[300px] sm:bg-white/[0.02] sm:border border-white/10 rounded-2xl sm:rounded-[3rem] p-0 sm:p-8 overflow-hidden sm:shadow-inner">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500/20 to-transparent"></div>
                    
                    {trash.length === 0 ? (
                        <div className="h-[250px] flex flex-col items-center justify-center gap-4 text-center">
                            <div className="w-20 h-20 bg-emerald-500/5 rounded-full flex items-center justify-center border border-emerald-500/10">
                                <Shield className="w-10 h-10 text-emerald-500 opacity-40" />
                            </div>
                            <div>
                                <p className="text-slate-400 font-black uppercase text-xs tracking-[0.2em]">Papelera Limpia</p>
                                <p className="text-slate-500 text-xs font-bold mt-1">Tu base de datos está libre de elementos pendientes.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 sm:gap-8">
                            <AnimatePresence mode="popLayout">
                                {trash.map((item, idx) => (
                                    <motion.div
                                        key={item.id || idx}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        whileHover={{ y: -5 }}
                                        className="relative group bg-white/[0.03] border border-white/10 p-5 rounded-[2rem] flex flex-col gap-4 hover:border-rose-500/30 hover:bg-rose-500/[0.03] transition-all overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none group-hover:bg-rose-500/10 transition-all"></div>
                                        
                                        <div className="flex items-center gap-4 relative">
                                            <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20 group-hover:scale-110 transition-transform duration-500">
                                                <Database className="w-5 h-5 text-rose-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-white font-black text-sm leading-tight truncate group-hover:text-rose-100 transition-colors">
                                                    {item.ine || `EQUIPO ID: ${item.id.toString().substring(0,6)}`}
                                                </h4>
                                                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1 truncate bg-white/5 px-3 py-1 rounded-full border border-white/5 w-fit">
                                                    {item.tipo || 'Sin Tipo'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-2 py-2 border-y border-white/5 relative">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">
                                                    <MapPin className="w-3 h-3 text-slate-400" />
                                                </div>
                                                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider truncate">
                                                    {item.ubicacion || 'Sin Ubicación'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">
                                                    <User className="w-3 h-3 text-slate-400" />
                                                </div>
                                                <span className="text-slate-400 text-[11px] font-medium truncate">
                                                    {item.responsable || 'Sin Propietario'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button 
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    handleRestore(item.id); 
                                                }}
                                                className="flex-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white py-3 rounded-2xl border border-emerald-500/20 transition-all flex items-center justify-center gap-2.5 text-[10px] font-black uppercase tracking-widest active:scale-95 shadow-xl shadow-emerald-500/5 cursor-pointer relative overflow-hidden group/btn"
                                            >
                                                <RotateCcw className="w-4 h-4 group-hover/btn:rotate-[-45deg] transition-transform duration-500" />
                                                <span>Restaurar</span>
                                            </button>
                                            <button 
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    handleDeleteIndividual(item.id);
                                                }}
                                                className="p-3 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-2xl border border-rose-500/20 transition-all flex items-center justify-center active:scale-95 cursor-pointer"
                                                title="Eliminar permanentemente"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>

            {/* --- MODALS --- */}
            <ConfirmModal 
                isOpen={isPurgeOpen}
                onClose={() => setIsPurgeOpen(false)}
                onConfirm={handlePurge}
                title="¿Purgar Toda la Papelera?"
                message="Esta acción eliminará definitivamente todos los registros. No podrás recuperar los números de inventario ni el historial asociado."
                type="danger"
            />

            <ConfirmModal 
                isOpen={isOptimizeOpen}
                onClose={() => setIsOptimizeOpen(false)}
                onConfirm={handleOptimize}
                title="Optimizar Motor de Datos"
                message="Se reorganizarán los índices y el almacenamiento físico. Esto mejorará la velocidad de respuesta de todo el sistema."
            />
        </motion.div>
    );
};

export default SaludPanel;
