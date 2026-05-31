import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Search, User, Server, AlertCircle, ArrowRight, Calendar, UserCheck, Package, Wrench, Trash2 } from 'lucide-react';
import { apiRequest } from '../services/api';
import { matchesSearch } from '../utils/search';
import CommonCard from '../components/common/CommonCard';

const Historial = () => {
    const [search, setSearch] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);

    const handleSearch = async () => {
        setLoading(true);
        try {
            const data = await apiRequest(`/historial${search.trim() ? `?q=${encodeURIComponent(search)}` : ''}`);
            setResults(data?.data || data || []);
        } catch (error) {
            console.error("Error fetching historial:", error);
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
                return {
                    bg: 'bg-rose-500/10',
                    border: 'border-rose-500/20',
                    text: 'text-rose-400',
                    iconBg: 'bg-rose-500/20',
                    icon: AlertCircle
                };
            case 'CAMBIO_DE_ESTADO':
                return {
                    bg: 'bg-violet-500/10',
                    border: 'border-violet-500/20',
                    text: 'text-violet-400',
                    iconBg: 'bg-violet-500/20',
                    icon: History
                };
            case 'CAMBIO_DE_UBICACION':
                return {
                    bg: 'bg-cyan-500/10',
                    border: 'border-cyan-500/20',
                    text: 'text-cyan-400',
                    iconBg: 'bg-cyan-500/20',
                    icon: Server
                };
            case 'BAJA_EQUIPO':
                return {
                    bg: 'bg-rose-500/10',
                    border: 'border-rose-500/20',
                    text: 'text-rose-400',
                    iconBg: 'bg-rose-500/20',
                    icon: Trash2
                };
            case 'RESTAURACION_EQUIPO':
                return {
                    bg: 'bg-teal-500/10',
                    border: 'border-teal-500/20',
                    text: 'text-teal-400',
                    iconBg: 'bg-teal-500/20',
                    icon: UserCheck
                };
            case 'ASIGNACION':
                return {
                    bg: 'bg-emerald-500/10',
                    border: 'border-emerald-500/20',
                    text: 'text-emerald-400',
                    iconBg: 'bg-emerald-500/20',
                    icon: UserCheck
                };
            case 'CAMBIO_DE_CARGO':
                return {
                    bg: 'bg-indigo-500/10',
                    border: 'border-indigo-500/20',
                    text: 'text-indigo-400',
                    iconBg: 'bg-indigo-500/20',
                    icon: ArrowRight
                };
            case 'SOPORTE_MANTENIMIENTO':
            case 'SOPORTE_TECNICO':
                return {
                    bg: 'bg-blue-500/10',
                    border: 'border-blue-500/20',
                    text: 'text-blue-400',
                    iconBg: 'bg-blue-500/20',
                    icon: Wrench
                };
            case 'MANTENIMIENTO_ACTUALIZADO':
                return {
                    bg: 'bg-indigo-500/10',
                    border: 'border-indigo-500/20',
                    text: 'text-indigo-400',
                    iconBg: 'bg-indigo-500/20',
                    icon: Wrench
                };
            case 'INSTALACION_COMPONENTE':
                return {
                    bg: 'bg-amber-500/10',
                    border: 'border-amber-500/20',
                    text: 'text-amber-400',
                    iconBg: 'bg-amber-500/20',
                    icon: Package
                };
            case 'RETIRO_COMPONENTE':
                return {
                    bg: 'bg-slate-500/10',
                    border: 'border-slate-500/20',
                    text: 'text-slate-400',
                    iconBg: 'bg-slate-500/20',
                    icon: Trash2
                };
            default:
                return {
                    bg: 'bg-slate-500/10',
                    border: 'border-slate-500/20',
                    text: 'text-slate-400',
                    iconBg: 'bg-slate-500/20',
                    icon: History
                };
        }
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* Header */}

            {/* Buscador Central Principal */}
            <div className="transition-all duration-500 mt-4">
                <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="relative max-w-2xl mx-auto group">
                    <div className="hidden md:flex absolute inset-y-0 left-0 pl-5 items-center pointer-events-none">
                        <Search className={`w-6 h-6 transition-colors duration-300 ${loading ? 'text-indigo-400 animate-pulse' : 'text-slate-500 group-focus-within:text-indigo-400'}`} />
                    </div>
                    <input 
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por Nombre, INE o Número de Serie..."
                        className="w-full bg-white/5 border-2 border-white/10 text-white rounded-[2rem] pl-6 md:pl-14 pr-16 md:pr-32 py-4 md:py-5 text-base md:text-lg font-medium focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all shadow-2xl placeholder:text-slate-600 focus:ring-4 focus:ring-indigo-500/10"
                        autoFocus
                    />
                    <button 
                        type="submit"
                        disabled={loading}
                        title="Buscar"
                        className="absolute right-2 top-2 bottom-2 md:right-3 md:top-3 md:bottom-3 w-[46px] md:w-auto px-0 md:px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[1.2rem] md:rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                        {loading ? (
                             <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin flex-shrink-0" />
                        ) : (
                             <>
                                <Search className="w-5 h-5 md:hidden" />
                                <span className="hidden md:block">{search.trim() ? 'Refrescar' : 'Consultar'}</span>
                             </>
                        )}
                    </button>
                </form>
            </div>

            {/* Resultados */}
            <div className="min-h-[400px]">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div 
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex justify-center py-20"
                        >
                            <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                        </motion.div>
                    ) : results.length === 0 ? (
                        <motion.div 
                            key="no-results"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10"
                        >
                            <AlertCircle className="w-12 h-12 text-slate-500 opacity-50 mb-4" />
                            <h3 className="text-xl font-black text-white">Sin registros encontrados</h3>
                            <p className="text-slate-400 text-center max-w-sm font-medium mt-1">
                                {search 
                                    ? `No hay eventos registrados para "${search}" en el sistema.`
                                    : "No hay eventos registrados en el sistema."
                                }
                            </p>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="results"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-6 pb-20"
                        >
                             <div className="flex items-center gap-4 mb-8">
                                <div className="h-px bg-white/10 flex-1"></div>
                                <span className="text-xs font-black text-slate-500 uppercase tracking-widest bg-black/20 px-4 py-1.5 rounded-full">
                                    {results.length} registros encontrados
                                </span>
                                <div className="h-px bg-white/10 flex-1"></div>
                             </div>

                <div className="grid gap-4">
                    {results
                        .map((event, idx) => {
                            const styles = getEventStyles(event.evento);
                            return (
                                <motion.div
                                    key={`event-${event.id}`}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className={`p-6 rounded-[2rem] border ${styles.border} ${styles.bg} backdrop-blur-md relative overflow-hidden group`}
                                >
                                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                                {event.evento === 'FALLA_REPORTADA' ? <AlertCircle className="w-24 h-24" /> : <UserCheck className="w-24 h-24" />}
                                            </div>

                                            <div className="flex flex-col md:flex-row md:items-center gap-6 relative z-10">
                                                {/* Left: Persona e Icono */}
                                                <div className="flex items-center gap-4 min-w-[200px]">
                                                    <div className={`p-3 rounded-2xl ${styles.iconBg} ${styles.text}`}>
                                                        {event.evento === 'FALLA_REPORTADA' ? <AlertCircle className="w-6 h-6" /> : <User className="w-6 h-6" />}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-lg font-black text-white truncate">{event.responsable}</h4>
                                                        <div className="flex flex-col">
                                                            <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${styles.text}`}>
                                                                {event.evento.replace(/_/g, ' ')}
                                                            </p>
                                                            {event.responsable_actual && event.responsable_actual !== event.responsable && (
                                                                <p className="text-[9px] text-slate-500 font-bold mt-0.5">
                                                                    A CARGO DE: <span className="text-indigo-400/70">{event.responsable_actual}</span>
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right: Equipo y Fecha */}
                                                <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                    <div className="bg-black/20 p-4 rounded-2xl border border-white/5 flex items-center gap-4">
                                                        <div className="p-2 bg-indigo-500/10 rounded-lg">
                                                            <Server className="w-5 h-5 text-indigo-400" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-indigo-400 uppercase tracking-widest">{event.equipo_tipo}</p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-white font-bold">{event.ine}</span>
                                                                <span className="text-slate-600 text-[10px]">|</span>
                                                                <span className="text-slate-400 text-xs">{event.serie}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col items-end gap-1">
                                                        <div className="flex items-center gap-2 text-slate-400 text-sm font-bold">
                                                            <Calendar className="w-4 h-4" />
                                                            {new Date(event.fecha).toLocaleDateString()}
                                                        </div>
                                                        <div className="text-slate-500 text-[10px] font-medium uppercase tracking-tighter">
                                                            {new Date(event.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} HS
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {event.notas && (
                                                <div className="mt-4 pt-4 border-t border-white/5">
                                                    <p className="text-sm text-slate-300 italic font-medium">"{event.notas}"</p>
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                             </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Historial;
