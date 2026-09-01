import { useState, useEffect, useRef } from 'react';
import { History, Calendar, Tag, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiRequest } from '../services/api';
import { getEventStyle } from '../utils/historialEventos';
import SearchInput from '../components/common/SearchInput';
import CommonCard from '../components/common/CommonCard';
import HistorialDetalleModal from '../components/historial/HistorialDetalleModal';

const spring = { type: 'spring' as const, stiffness: 400, damping: 30 };

export default function Historial() {
    const [search, setSearch] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [selectedEvento, setSelectedEvento] = useState<any>(null);
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchData = async (searchTerm = "", pageNum = 1) => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (searchTerm.trim()) params.set('q', searchTerm.trim());
            params.set('page', String(pageNum));
            params.set('limit', '50');
            const data = await apiRequest(`/historial?${params.toString()}`);
            setResults(data?.data || data || []);
            setTotal(data?.pagination?.total || 0);
            setTotalPages(data?.pagination?.totalPages || 0);
            setCurrentPage(data?.pagination?.page || 1);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (searchDebounce.current) clearTimeout(searchDebounce.current);
        searchDebounce.current = setTimeout(() => fetchData(search, 1), 400);
        return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current); };
    }, [search]);

    useEffect(() => {
        document.body.style.overflow = selectedEvento ? 'hidden' : 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [selectedEvento]);

    const goToPage = (p: number) => { if (p < 1 || p > totalPages) return; fetchData(search, p); };

    const formatFecha = (fecha: string) => new Date(fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

    return (
        <div className="flex-1 min-h-0 flex flex-col space-y-4 w-full max-w-full overflow-hidden">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="flex flex-col sm:flex-row gap-2">
                <div className="min-w-0 w-auto max-w-full">
                    <SearchInput value={search} onChange={(e: any) => setSearch(e.target.value)} placeholder="Buscar por INE, serie, responsable o evento..." />
                </div>
            </motion.div>

            {loading ? (
                <div className="flex-1 min-h-[calc(100vh-280px)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 content-start overflow-y-auto custom-scrollbar pr-1">
                    {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-44 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse" />)}
                </div>
            ) : results.length === 0 ? (
                <div className="flex-1 min-h-[calc(100vh-280px)] flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 rounded-xl">
                    <History className="w-8 h-8 text-zinc-600 mb-3" />
                    <p className="font-semibold">Sin resultados</p>
                    <p className="text-sm text-zinc-500 mt-1">{search ? `No hay eventos para "${search}"` : "No hay eventos registrados"}</p>
                </div>
            ) : (
                <div className="flex-1 min-h-0 flex flex-col space-y-3 overflow-hidden">
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                        <div className="h-px flex-1 bg-zinc-800" />
                        <span className="flex items-center gap-3">
                            <span>{total} registros · Pág {currentPage}/{totalPages || 1}</span>
                            {totalPages > 1 && (
                                <span className="inline-flex gap-1">
                                    <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1} className="w-7 h-7 grid place-items-center rounded-lg bg-zinc-800 border border-zinc-700 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                                    <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages} className="w-7 h-7 grid place-items-center rounded-lg bg-zinc-800 border border-zinc-700 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                                </span>
                            )}
                        </span>
                        <div className="h-px flex-1 bg-zinc-800" />
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
                            <AnimatePresence>
                                {results.map((event: any, i: number) => {
                                    const style = getEventStyle(event.evento);
                                    return (
                                        <motion.div
                                            key={`event-${event.id}`}
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ ...spring, delay: i * 0.02 }}
                                        >
                                            <CommonCard
                                                layoutId={`evento-${event.id}`}
                                                title={event.ine || 'Sin INE'}
                                                badge={style.label}
                                                badgeColor={style.color}
                                                icon={style.icon}
                                                onView={() => setSelectedEvento(event)}
                                            >
                                                <p className="text-[#c4c5d9] text-[10px] font-semibold tracking-wide uppercase mb-2">{style.label}</p>
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2 text-[#e4e2e4] text-[11px]"><Tag className="w-3 h-3 text-zinc-500 shrink-0" /><span className="font-medium truncate">{event.equipo_tipo || 'Sin Tipo'}</span></div>
                                                    <div className="flex items-center gap-2 text-[#e4e2e4] text-[11px]"><Calendar className="w-3 h-3 text-zinc-500 shrink-0" /><span className="font-medium">{formatFecha(event.fecha)}</span></div>
                                                    <div className="flex items-center gap-2 text-[#e4e2e4] text-[11px]"><User className="w-3 h-3 text-zinc-500 shrink-0" /><span className="font-medium truncate">{event.responsable_actual || event.responsable}</span></div>
                                                    <div className="mt-2 p-2.5 bg-[#131315] border border-white/5 rounded-xl">
                                                        <p className="text-zinc-400 text-[11px] leading-relaxed line-clamp-2 italic">&quot;{event.notas || 'Sin notas'}&quot;</p>
                                                    </div>
                                                </div>
                                            </CommonCard>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            )}

            <HistorialDetalleModal isOpen={!!selectedEvento} evento={selectedEvento} onClose={() => setSelectedEvento(null)} />
        </div>
    );
}
