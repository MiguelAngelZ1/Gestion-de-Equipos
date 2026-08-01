import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Search, User, Server, AlertCircle, ArrowRight, Calendar, UserCheck, Package, Wrench, Trash2 } from 'lucide-react';
import { apiRequest } from '../services/api';

const spring = { type: 'spring' as const, stiffness: 400, damping: 30 };

const Historial = () => {
    const [search, setSearch] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);

    const handleSearch = async () => {
        setLoading(true);
        try {
            const data = await apiRequest(`/historial${search.trim() ? `?q=${encodeURIComponent(search)}` : ''}`);
            setResults(data?.data || data || []);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            handleSearch();
        }, 400);
        return () => clearTimeout(delayDebounce);
    }, [search]);

    const getEventStyles = (evento) => {
        switch (evento) {
            case 'FALLA_REPORTADA':
                return { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', iconBg: 'bg-rose-500/20', icon: AlertCircle };
            case 'CAMBIO_DE_ESTADO':
                return { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400', iconBg: 'bg-violet-500/20', icon: History };
            case 'CAMBIO_DE_UBICACION':
                return { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400', iconBg: 'bg-cyan-500/20', icon: Server };
            case 'BAJA_EQUIPO':
                return { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', iconBg: 'bg-rose-500/20', icon: Trash2 };
            case 'RESTAURACION_EQUIPO':
                return { bg: 'bg-teal-500/10', border: 'border-teal-500/20', text: 'text-teal-400', iconBg: 'bg-teal-500/20', icon: UserCheck };
            case 'ASIGNACION':
                return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', iconBg: 'bg-emerald-500/20', icon: UserCheck };
            case 'CAMBIO_DE_CARGO':
                return { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400', iconBg: 'bg-indigo-500/20', icon: ArrowRight };
            case 'SOPORTE_MANTENIMIENTO':
            case 'SOPORTE_TECNICO':
                return { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', iconBg: 'bg-blue-500/20', icon: Wrench };
            case 'MANTENIMIENTO_ACTUALIZADO':
                return { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400', iconBg: 'bg-indigo-500/20', icon: Wrench };
            case 'INSTALACION_COMPONENTE':
                return { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', iconBg: 'bg-amber-500/20', icon: Package };
            case 'RETIRO_COMPONENTE':
                return { bg: 'bg-slate-500/10', border: 'border-slate-500/20', text: 'text-slate-400', iconBg: 'bg-slate-500/20', icon: Trash2 };
            default:
                return { bg: 'bg-slate-500/10', border: 'border-slate-500/20', text: 'text-slate-400', iconBg: 'bg-slate-500/20', icon: History };
        }
    };

    return (
        <div className="flex flex-col gap-3 w-full overflow-x-hidden">

            {/* ─── Search Bar ─── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
                <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Search className={`w-4 h-4 transition-colors ${loading ? 'text-indigo-400 animate-pulse' : 'text-slate-500'}`} />
                    </div>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por Nombre, INE o Serie..."
                        className="w-full bg-white/[0.04] border border-white/[0.06] text-white rounded-xl pl-10 pr-12 py-2.5 text-sm font-medium focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all placeholder:text-slate-600"
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="absolute right-1.5 top-1.5 bottom-1.5 w-9 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
                    >
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Search className="w-4 h-4" />
                        )}
                    </button>
                </form>
            </motion.div>

            {/* ─── Counter ─── */}
            {!loading && results.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex items-center gap-3 px-1">
                    <div className="h-px bg-white/[0.06] flex-1" />
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                        Registros: <span className="text-indigo-400">{results.length}</span>
                    </span>
                    <div className="h-px bg-white/[0.06] flex-1" />
                </motion.div>
            )}

            {/* ─── Results ─── */}
            <div className="min-h-[300px]">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 animate-pulse">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white/[0.06]" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-3 bg-white/[0.06] rounded w-1/3" />
                                            <div className="h-2 bg-white/[0.04] rounded w-1/2" />
                                        </div>
                                        <div className="h-2 bg-white/[0.04] rounded w-16" />
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    ) : results.length === 0 ? (
                        <motion.div key="empty" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                            className="flex flex-col items-center justify-center py-16 bg-white/[0.03] rounded-2xl border border-dashed border-white/[0.06]">
                            <AlertCircle className="w-10 h-10 text-slate-500 mb-3 opacity-20" />
                            <h3 className="text-lg font-bold text-white">Sin registros</h3>
                            <p className="text-slate-400 text-xs mt-1 text-center max-w-xs">
                                {search ? `No hay eventos para "${search}".` : "No hay eventos registrados."}
                            </p>
                        </motion.div>
                    ) : (
                        <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                            {results.map((event, idx) => {
                                const styles = getEventStyles(event.evento);
                                const Icon = styles.icon;
                                return (
                                    <motion.div
                                        key={`event-${event.id}`}
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ ...spring, delay: idx * 0.03 }}
                                        className={`p-4 rounded-2xl border ${styles.border} ${styles.bg} backdrop-blur-md relative overflow-hidden`}
                                    >
                                        {/* Header row */}
                                        <div className="flex items-start gap-3 relative z-10">
                                            <div className={`p-2 rounded-xl ${styles.iconBg} shrink-0`}>
                                                <Icon className={`w-4 h-4 ${styles.text}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h4 className="text-sm font-black text-white truncate">{event.responsable}</h4>
                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${styles.text}`}>
                                                        {event.evento.replace(/_/g, ' ')}
                                                    </span>
                                                </div>
                                                {event.responsable_actual && event.responsable_actual !== event.responsable && (
                                                    <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                                                        A cargo de: <span className="text-indigo-400/70">{event.responsable_actual}</span>
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className="flex items-center gap-1 text-slate-400 text-[11px] font-bold">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(event.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                                </div>
                                                <div className="text-slate-500 text-[9px] font-medium uppercase tracking-tighter">
                                                    {new Date(event.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Equipment row */}
                                        <div className="mt-2.5 p-2.5 bg-black/20 rounded-xl border border-white/5 flex items-center gap-2.5 relative z-10">
                                            <div className="p-1.5 bg-indigo-500/10 rounded-lg shrink-0">
                                                <Server className="w-3 h-3 text-indigo-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{event.equipo_tipo}</p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="text-white font-bold text-xs truncate">{event.ine}</span>
                                                    <span className="text-slate-600 text-[9px]">|</span>
                                                    <span className="text-slate-400 text-[10px] truncate">{event.serie}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Notes */}
                                        {event.notas && (
                                            <div className="mt-2.5 pt-2.5 border-t border-white/5 relative z-10">
                                                <p className="text-xs text-slate-300 italic font-medium line-clamp-2">&quot;{event.notas}&quot;</p>
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Historial;
