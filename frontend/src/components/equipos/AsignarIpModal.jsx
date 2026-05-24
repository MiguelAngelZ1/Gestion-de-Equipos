import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2, Monitor, User, MapPin, Tag, ChevronRight, Save, Globe } from 'lucide-react';
import { apiRequest } from '../../services/api';
import SearchInput from '../common/SearchInput';

const AsignarIpModal = ({ isOpen, ip, redId, onClose, onAssign }) => {
    const [search, setSearch] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedEquipo, setSelectedEquipo] = useState(null);
    const [dns1, setDns1] = useState('8.8.8.8');
    const [dns2, setDns2] = useState('8.8.4.4');
    const [isAssigning, setIsAssigning] = useState(false);

    useEffect(() => {
        const fetchEquipos = async () => {
            if (search.trim().length < 2) {
                setResults([]);
                return;
            }
            setLoading(true);
            try {
                const data = await apiRequest(`/equipos?q=${search}`);
                setResults(data || []);
            } catch (error) {
                console.error("Error buscando equipos:", error);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(fetchEquipos, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const handleConfirm = async () => {
        if (!selectedEquipo || isAssigning) return;
        setIsAssigning(true);
        try {
            await onAssign({
                redId,
                ip,
                equipoId: selectedEquipo.id,
                dns1,
                dns2
            });
            onClose();
        } catch (error) {
            console.error("Error asignando IP:", error);
        } finally {
            setIsAssigning(false);
        }
    };

    if (!isOpen || typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-[#0f172a] border border-white/10 shadow-2xl rounded-[2.5rem] w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-8 border-b border-white/5 relative shrink-0">
                        <button 
                            onClick={onClose}
                            className="absolute top-8 right-8 p-2 hover:bg-white/5 rounded-full transition-colors text-slate-500 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                                <Monitor className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tight">Vincular IP a Equipo</h2>
                                <p className="text-slate-400 text-sm font-medium mt-1">
                                    Asignando <span className="text-indigo-400 font-bold">{ip}</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-8 space-y-8 overflow-y-auto flex-1 custom-scrollbar">
                        {/* Selector de Equipo */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                                {selectedEquipo ? <Tag className="w-3 h-3" /> : <Search className="w-3 h-3" />} 
                                {selectedEquipo ? 'Equipo Seleccionado' : 'Buscar Equipo (INE o Serie)'}
                            </label>

                            {!selectedEquipo ? (
                                <>
                                    <SearchInput 
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Escribe para buscar..."
                                        className="w-full"
                                    />

                                    <div className="space-y-2 mt-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                        {loading && (
                                            <div className="flex items-center justify-center py-8">
                                                <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                                            </div>
                                        )}
                                        
                                        {!loading && search.length >= 2 && results.length === 0 && (
                                            <div className="text-center py-8 bg-white/[0.02] rounded-3xl border border-dashed border-white/10">
                                                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">No se encontraron equipos</p>
                                            </div>
                                        )}

                                        {results.map(eq => (
                                            <button
                                                key={eq.id}
                                                onClick={() => setSelectedEquipo(eq)}
                                                className="w-full flex items-center justify-between p-4 rounded-2xl border bg-white/5 border-white/5 hover:border-white/20 transition-all"
                                            >
                                                <div className="flex items-center gap-4 text-left">
                                                    <div className="p-2 rounded-xl bg-white/5">
                                                        <Tag className="w-4 h-4 text-slate-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-bold text-sm tracking-tight">{eq.ine}</p>
                                                        <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                                            <span className="flex items-center gap-1"><Monitor className="w-3 h-3" /> {eq.tipo}</span>
                                                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {eq.ubicacion}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-5 h-5 text-indigo-400" />
                                            </button>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center justify-between p-6 rounded-[2rem] bg-indigo-500/10 border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
                                    <div className="flex items-center gap-4 text-left">
                                        <div className="p-3 rounded-2xl bg-indigo-500/20">
                                            <Monitor className="w-6 h-6 text-indigo-400" />
                                        </div>
                                        <div>
                                            <p className="text-white font-black text-lg tracking-tight">{selectedEquipo.ine}</p>
                                            <div className="flex items-center gap-3 mt-1 text-[10px] text-indigo-400 font-black uppercase tracking-[0.15em]">
                                                <span>{selectedEquipo.tipo}</span>
                                                <span className="w-1 h-1 rounded-full bg-indigo-500/40"></span>
                                                <span>{selectedEquipo.ubicacion}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedEquipo(null)}
                                        className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all shadow-inner"
                                    >
                                        Cambiar
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* DNS Config */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/5">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                                    <Globe className="w-3 h-3" /> DNS Primario
                                </label>
                                <input 
                                    type="text"
                                    value={dns1}
                                    onChange={(e) => setDns1(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all placeholder:text-slate-600"
                                    placeholder="8.8.8.8"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                                    <Globe className="w-3 h-3" /> DNS Secundario
                                </label>
                                <input 
                                    type="text"
                                    value={dns2}
                                    onChange={(e) => setDns2(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all placeholder:text-slate-600"
                                    placeholder="8.8.4.4"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-8 border-t border-white/5 bg-black/20 shrink-0 flex gap-4">
                        <button
                            onClick={onClose}
                            className="flex-1 px-6 py-4 rounded-2xl bg-white/5 border border-white/5 text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] hover:bg-white/10 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!selectedEquipo || isAssigning}
                            className={`flex-[2] px-6 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 transition-all ${
                                !selectedEquipo || isAssigning
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-xl shadow-indigo-500/20 active:scale-[0.98]'
                            }`}
                        >
                            {isAssigning ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            Vincular Ahora
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
};

export default AsignarIpModal;
