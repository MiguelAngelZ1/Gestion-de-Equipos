import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    Network,
    Plus,
    Search,
    Download,
    ChevronRight,
    Server,
    CheckCircle2,
    XCircle,
    RefreshCw,
    Trash2,
    Pencil,
    Lock,
    Unlock,
    UploadCloud,
    FileSpreadsheet,
    X,
    Eye,
    Link as LinkIcon,
    Monitor,
    ChevronUp,
    Activity,
    Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE, apiRequest } from '../services/api';
import { useToast } from '../context/ToastContext';
import SearchInput from '../components/common/SearchInput';
import ConfirmModal from '../components/common/ConfirmModal';
import Select from '../components/common/Select';
import EquipoDetalleModal from '../components/equipos/EquipoDetalleModal';
import AsignarIpModal from '../components/equipos/AsignarIpModal';

const spring = { type: 'spring' as const, stiffness: 400, damping: 30 };

const IPAM = () => {
    const { showToast } = useToast();
    const [redes, setRedes] = useState([]);
    const [selectedRed, setSelectedRed] = useState(null);
    const [networkData, setNetworkData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mapLoading, setMapLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [pingingIp, setPingingIp] = useState(null);
    const [pingResults, setPingResults] = useState({});
    const [editingRed, setEditingRed] = useState(null);
    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => {
        const handleScroll = (e) => {
            if (e.target.scrollTop > 200) setShowScrollTop(true);
            else if (e.target.scrollTop <= 200) setShowScrollTop(false);
        };
        window.addEventListener('scroll', handleScroll, true);
        return () => window.removeEventListener('scroll', handleScroll, true);
    }, []);

    const handleScrollToTop = () => {
        const containers = document.querySelectorAll('.overflow-y-auto');
        let scrolledContainer = null;
        containers.forEach(c => { if (c.scrollTop > 50) scrolledContainer = c; });
        if (scrolledContainer) scrolledContainer.scrollTo({ top: 0, behavior: 'smooth' });
        else window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
    const [reservingIp, setReservingIp] = useState(null);
    const [reserveNote, setReserveNote] = useState('');
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [assigningIp, setAssigningIp] = useState(null);
    const [isDetalleModalOpen, setIsDetalleModalOpen] = useState(false);
    const [selectedEquipo, setSelectedEquipo] = useState(null);
    const [estados, setEstados] = useState([]);
    const [isDeleteRedOpen, setIsDeleteRedOpen] = useState(false);
    const [redToDelete, setRedToDelete] = useState(null);
    const [isCreateRedOpen, setIsCreateRedOpen] = useState(false);
    const [newRed, setNewRed] = useState({ nombre: '', segmento: '', mascara: '255.255.255.0', gateway: '', dns: '', vlan: '' });

    const fetchRedes = async () => {
        try {
            setLoading(true);
            const data = await apiRequest('/ipam/redes');
            setRedes(data || []);
            const estadosData = await apiRequest('/config/estados').catch(() => []);
            setEstados(estadosData);
        } catch { showToast("Error", "No se pudieron cargar las redes.", "error"); }
        finally { setLoading(false); }
    };
    const fetchNetworkMap = async (redId) => {
        try {
            setMapLoading(true);
            const data = await apiRequest(`/ipam/redes/${redId}/mapa`);
            setNetworkData(data);
        } catch { showToast("Error", "No se pudo cargar el mapa de red.", "error"); }
        finally { setMapLoading(false); }
    };
    useEffect(() => { fetchRedes(); }, []);
    useEffect(() => { if (selectedRed) fetchNetworkMap(selectedRed.id); }, [selectedRed]);

    const handleDeleteRed = async () => {
        try {
            await apiRequest(`/ipam/redes/${redToDelete.id}`, { method: 'DELETE' });
            showToast("Red Eliminada", "Segmento removido.", "success");
            setIsDeleteRedOpen(false); setRedToDelete(null);
            if (selectedRed?.id === redToDelete.id) { setSelectedRed(null); setNetworkData(null); }
            fetchRedes();
        } catch { showToast("Error", "No se pudo eliminar la red.", "error"); }
    };
    const handleCreateRed = async () => {
        try {
            const created = await apiRequest('/ipam/redes', { method: 'POST', body: newRed });
            showToast("Red Creada", "Segmento disponible en IPAM.", "success");
            setIsCreateRedOpen(false); setNewRed({ nombre: '', segmento: '', mascara: '255.255.255.0', gateway: '', dns: '', vlan: '' });
            await fetchRedes(); setSelectedRed(created);
        } catch (e) { showToast("Error", e.message || "No se pudo crear la red.", "error"); }
    };
    const handleUpdateRed = async () => {
        if (!editingRed) return;
        try {
            const updated = await apiRequest(`/ipam/redes/${editingRed.id}`, { method: 'PUT', body: newRed });
            showToast("Red Actualizada", "Segmento actualizado.", "success");
            setIsCreateRedOpen(false); setEditingRed(null);
            setNewRed({ nombre: '', segmento: '', mascara: '255.255.255.0', gateway: '', dns: '', vlan: '' });
            await fetchRedes(); setSelectedRed(updated);
        } catch (e) { showToast("Error", e.message || "No se pudo actualizar.", "error"); }
    };
    const handlePing = async (ip) => {
        try {
            setPingingIp(ip);
            const r = await apiRequest(`/ipam/ping/${ip}`);
            setPingResults(prev => ({ ...prev, [ip]: r.online }));
            showToast(r.online ? "Ping Exitoso" : "Sin Respuesta", r.online ? `La IP ${ip} respondió.` : `La IP ${ip} no respondió.`, r.online ? "success" : "warning");
        } catch { showToast("Error de Red", "Falla al intentar alcanzar la IP.", "error"); }
        finally { setPingingIp(null); }
    };
    const handleReserve = async () => {
        if (!reservingIp) return;
        try {
            await apiRequest(`/ipam/redes/${selectedRed.id}/reservar`, { method: 'POST', body: { ip: reservingIp, notas: reserveNote } });
            showToast("Éxito", "IP reservada.", "success");
            setIsReserveModalOpen(false); setReservingIp(null); setReserveNote(''); fetchNetworkMap(selectedRed.id);
        } catch { showToast("Error", "No se pudo reservar.", "error"); }
    };
    const handleAssign = async (data) => {
        try {
            showToast("Procesando", "Vinculando IP al equipo...", "info");
            await apiRequest('/ipam/asignar', { method: 'POST', body: data });
            showToast("Vínculo Exitoso", `La IP ${data.ip} asignada.`, "success"); fetchNetworkMap(selectedRed.id);
        } catch { showToast("Error", "No se pudo vincular.", "error"); throw new Error(); }
    };
    const handleUnlink = async (ip, equipoId) => {
        try {
            await apiRequest('/ipam/desvincular', { method: 'POST', body: { ip, equipoId } });
            showToast("Desvinculada", `IP ${ip} removida.`, "success"); fetchNetworkMap(selectedRed.id);
        } catch { showToast("Error", "No se pudo desvincular.", "error"); }
    };
    const handleRelease = async (ip) => {
        try {
            await apiRequest(`/ipam/liberar/${ip}`, { method: 'DELETE' });
            showToast("Éxito", `IP ${ip} liberada.`, "success"); if (selectedRed) fetchNetworkMap(selectedRed.id);
        } catch { showToast("Error", "No se pudo liberar la IP.", "error"); }
    };
    const handleViewDetails = async (equipoId) => {
        try { const full = await apiRequest(`/equipos/${equipoId}`); setSelectedEquipo(full); setIsDetalleModalOpen(true); }
        catch { showToast("Error", "No se pudo cargar el equipo.", "error"); }
    };
    const handleExportExcel = async () => {
        try {
            const r = await fetch(`${API_BASE}/ipam/exportar-excel`, { credentials: 'include' });
            if (r.ok) { const blob = await r.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `IPAM_${new Date().toISOString().split('T')[0]}.xlsx`; document.body.appendChild(a); a.click(); a.remove(); }
        } catch { showToast("Error", "No se pudo exportar.", "error"); }
    };
    const handleExportDrive = async () => {
        try { showToast("Procesando", "Sincronizando con Drive...", "info"); const d = await apiRequest('/ipam/exportar-drive', { method: 'POST' }); if (d.success) showToast("Éxito", "Reporte subido a Drive.", "success"); }
        catch { showToast("Error", "No se pudo sincronizar con Drive.", "error"); }
    };

    const filteredIps = (networkData?.ips || []).filter(ip => {
        const matchesSearch = ip.ip.includes(search) || (ip.equipo?.ine || '').toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filterStatus === 'ALL' || !filterStatus ? true : ip.estado === filterStatus;
        return matchesSearch && matchesFilter;
    });
    const showResults = search.trim() !== '' || filterStatus !== '';

    return (
        <div className="flex-1 min-h-0 flex flex-col space-y-4 w-full max-w-full overflow-y-auto lg:overflow-hidden">
            <div className="flex justify-end gap-1.5 shrink-0">
                <button onClick={handleExportExcel} className="bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer">
                    <FileSpreadsheet className="w-4 h-4" /> <span className="hidden sm:inline">Exportar Excel</span><span className="sm:hidden">Excel</span>
                </button>
                <button onClick={handleExportDrive} className="bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer">
                    <UploadCloud className="w-4 h-4" /> <span className="hidden sm:inline">Exportar Drive</span><span className="sm:hidden">Drive</span>
                </button>
            </div>

            <div className="flex flex-col lg:grid lg:grid-cols-[340px_1fr] gap-4 flex-1 min-h-0 lg:overflow-hidden">
                <section className="flex flex-col min-h-[280px] lg:min-h-0 lg:overflow-hidden">
                    <div className="flex items-center gap-3 text-xs text-zinc-500 mb-3 shrink-0">
                        <span className="inline-flex items-center gap-2 text-zinc-300 font-semibold shrink-0"><Network className="w-4 h-4 text-zinc-400" /> Segmentos</span>
                        <span className="flex-1 text-center text-xs text-zinc-500">{redes.length} redes</span>
                        <button
                            onClick={() => { setEditingRed(null); setNewRed({ nombre: '', segmento: '', mascara: '255.255.255.0', gateway: '', dns: '', vlan: '' }); setIsCreateRedOpen(true); }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
                            title="Crear segmento"
                        ><Plus className="w-3.5 h-3.5" /> Añadir</button>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
                        <div className="grid grid-cols-2 gap-2">
                            {loading ? [1, 2, 3, 4].map(i => <div key={i} className="h-20 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse" />)
                                : redes.length === 0 ? (
                                    <div className="col-span-2 flex flex-col items-center justify-center py-16 bg-zinc-900 border border-zinc-800 rounded-xl">
                                        <Network className="w-8 h-8 text-zinc-600 mb-3" />
                                        <p className="text-sm text-zinc-500">Sin redes configuradas</p>
                                    </div>
                                ) : redes.map(red => {
                                    const isSelected = selectedRed?.id === red.id;
                                    const cidrLabel = `${red.segmento}${red.cidr ? `/${red.cidr}` : ''}`;
                                    const mask = (() => {
                                        const cidr = red.cidr ?? (red.mascara ? null : null);
                                        if (cidr != null) {
                                            const n = Number(cidr);
                                            if (!Number.isNaN(n) && n >= 0 && n <= 32) {
                                                const m = n === 0 ? 0 : (0xFFFFFFFF << (32 - n)) >>> 0;
                                                return [(m >>> 24) & 255, (m >>> 16) & 255, (m >>> 8) & 255, m & 255].join('.');
                                            }
                                        }
                                        return red.mascara || '';
                                    })();
                                    return (
                                        <motion.div layout key={red.id} onClick={() => setSelectedRed(red)}
                                            className={`group relative rounded-xl border p-3 flex flex-col gap-1 cursor-pointer transition-colors ${isSelected ? 'bg-white border-white text-zinc-900' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}>
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className={`text-[13px] font-bold tracking-tight truncate ${isSelected ? 'text-zinc-900' : 'text-white'}`}>{cidrLabel}</p>
                                                    {mask && <p className={`text-[11px] font-medium truncate ${isSelected ? 'text-zinc-500' : 'text-zinc-400'}`}>{mask}</p>}
                                                </div>
                                                {!red.isAuto && (
                                                    <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                                                        <button onClick={(e) => { e.stopPropagation(); setEditingRed(red); setNewRed({ nombre: red.nombre || '', segmento: red.segmento || '', mascara: red.mascara || '255.255.255.0', gateway: red.gateway || '', dns: red.dns || '', vlan: red.vlan || '' }); setIsCreateRedOpen(true); }}
                                                            className={`w-6 h-6 grid place-items-center rounded-lg transition-colors ${isSelected ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200' : 'bg-white/5 text-zinc-400 hover:text-white'}`}><Pencil className="w-3 h-3" /></button>
                                                        <button onClick={(e) => { e.stopPropagation(); setRedToDelete(red); setIsDeleteRedOpen(true); }}
                                                            className={`w-6 h-6 grid place-items-center rounded-lg transition-colors ${isSelected ? 'bg-zinc-100 text-zinc-600 hover:text-red-600' : 'bg-white/5 text-zinc-500 hover:text-red-400'}`}><Trash2 className="w-3 h-3" /></button>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                        </div>
                    </div>
                </section>

                <section className="flex flex-col min-h-[400px] lg:min-h-0 lg:overflow-hidden">
                    {!selectedRed ? (
                        <div className="flex-1 flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 rounded-xl py-16">
                            <Server className="w-10 h-10 text-zinc-600 mb-3" />
                            <p className="font-semibold text-zinc-300">Selecciona un segmento</p>
                            <p className="text-sm text-zinc-500 mt-1">Elige una red para ver su ocupación</p>
                        </div>
                    ) : (
                        <div className="flex flex-col flex-1 min-h-0 gap-4">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 shrink-0">
                                {[
                                    { label: 'Total', value: networkData?.stats?.total ?? '-' },
                                    { label: 'Libres', value: networkData?.stats?.free ?? '-' },
                                    { label: 'Ocupadas', value: networkData?.stats?.occupied ?? '-' },
                                    { label: 'Reservadas', value: networkData?.stats?.reserved ?? '-' },
                                ].map((s, i) => (
                                    <motion.div key={s.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, ...spring }}
                                        className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">{s.label}</p>
                                        <p className="text-xl font-bold text-white tracking-tight">{s.value}</p>
                                    </motion.div>
                                ))}
                            </div>

                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-1.5 flex items-center gap-1.5 shrink-0">
                                <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar IP o equipo..." className="shrink-0" />
                                <div className="w-[136px] shrink-0 -ml-0.5"><Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} options={[{ value: 'ALL', label: 'Todas' }, { value: 'LIBRE', label: 'Libres' }, { value: 'OCUPADA', label: 'Ocupadas' }, { value: 'RESERVADA', label: 'Reservadas' }]} placeholder="Estado" /></div>
                                <AnimatePresence>{showResults && <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} onClick={() => { setSearch(''); setFilterStatus(''); }} className="w-8 h-8 grid place-items-center rounded-xl bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"><X className="w-4 h-4" /></motion.button>}</AnimatePresence>
                                <button onClick={() => fetchNetworkMap(selectedRed.id)} className="w-8 h-8 grid place-items-center rounded-xl bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"><RefreshCw className={`w-4 h-4 ${mapLoading ? 'animate-spin' : ''}`} /></button>
                            </div>

                            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 flex flex-col">
                                {!showResults && !mapLoading ? (
                                    <div className="flex-1 flex flex-col items-center justify-center bg-zinc-900 border border-dashed border-zinc-800 rounded-xl min-h-[280px]">
                                        <Filter className="w-8 h-8 text-zinc-600 mb-3" />
                                        <p className="text-sm font-semibold text-zinc-300">Usa el buscador o filtro</p>
                                        <p className="text-xs text-zinc-500 mt-1">Selecciona un estado para ver IPs</p>
                                    </div>
                                ) : mapLoading ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-36 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse" />)}</div>
                                ) : filteredIps.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 bg-zinc-900 border border-zinc-800 rounded-xl">
                                        <XCircle className="w-8 h-8 text-zinc-600 mb-3" />
                                        <p className="text-sm text-zinc-500">Sin resultados</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 pb-4">
                                        {filteredIps.map(ip => (
                                            <motion.div layout key={ip.ip} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="relative bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2.5 hover:border-zinc-700 transition-colors h-fit overflow-hidden">
                                                <span className={`absolute top-3 right-3 w-2 h-2 rounded-full ${ip.estado === 'LIBRE' ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]' : ip.estado === 'OCUPADA' ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]' : 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]'}`} />
                                                <div className="flex items-center gap-2 pr-4">
                                                    <span className="text-sm font-bold text-white tracking-tight">{ip.ip}</span>
                                                </div>
                                                {ip.estado === 'RESERVADA' && ip.notas && <p className="text-xs text-zinc-500 truncate pr-2">{ip.notas}</p>}

                                                <div className="flex items-center gap-1 pt-2.5 border-t border-zinc-800 mt-1 flex-nowrap">
                                                    {ip.estado === 'OCUPADA' && <>
                                                        <button onClick={() => handleViewDetails(ip.equipo.id)} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-transparent text-zinc-400 hover:text-white hover:bg-white/5 text-xs font-medium transition-colors cursor-pointer shrink-0"><Eye className="w-3.5 h-3.5" /> Detalle</button>
                                                        <button onClick={() => { if (window.confirm(`¿Desvincular IP ${ip.ip} de ${ip.equipo.ine}?`)) handleUnlink(ip.ip, ip.equipo.id); }} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-transparent text-zinc-500 hover:text-red-400 hover:bg-white/5 text-xs font-medium transition-colors cursor-pointer shrink-0"><Trash2 className="w-3.5 h-3.5" /> Vínculo</button>
                                                    </>}
                                                    {ip.estado === 'LIBRE' && <>
                                                        <button onClick={() => { setReservingIp(ip.ip); setIsReserveModalOpen(true); }} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-transparent text-zinc-400 hover:text-white hover:bg-white/5 text-xs font-medium transition-colors cursor-pointer shrink-0"><Lock className="w-3.5 h-3.5" /> Reservar</button>
                                                        <button onClick={() => { setAssigningIp(ip.ip); setIsAssignModalOpen(true); }} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-transparent text-zinc-400 hover:text-white hover:bg-white/5 text-xs font-medium transition-colors cursor-pointer shrink-0"><LinkIcon className="w-3.5 h-3.5" /> Vincular</button>
                                                    </>}
                                                    {ip.estado === 'RESERVADA' && <>
                                                        <button onClick={() => handleRelease(ip.ip)} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-transparent text-zinc-500 hover:text-red-400 hover:bg-white/5 text-xs font-medium transition-colors cursor-pointer shrink-0"><Unlock className="w-3.5 h-3.5" /> Liberar</button>
                                                        <button onClick={() => { setAssigningIp(ip.ip); setIsAssignModalOpen(true); }} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-transparent text-zinc-400 hover:text-white hover:bg-white/5 text-xs font-medium transition-colors cursor-pointer shrink-0"><LinkIcon className="w-3.5 h-3.5" /> Vincular</button>
                                                    </>}
                                                    <button onClick={() => handlePing(ip.ip)} disabled={pingingIp === ip.ip} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-transparent text-zinc-400 hover:text-emerald-400 hover:bg-white/5 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 relative shrink-0">
                                                        {pingResults[ip.ip] !== undefined && <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full border-2 border-zinc-900 ${pingResults[ip.ip] ? 'bg-emerald-500' : 'bg-red-500'}`} />}
                                                        <Activity className={`w-3.5 h-3.5 ${pingingIp === ip.ip ? 'animate-pulse' : ''}`} /> {pingingIp === ip.ip ? '...' : 'Ping'}
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </section>
            </div>

            <ConfirmModal isOpen={isCreateRedOpen} title={editingRed ? 'Editar Segmento' : 'Crear Segmento'} confirmText={editingRed ? 'Guardar' : 'Crear'} type="info" onClose={() => { setIsCreateRedOpen(false); setEditingRed(null); }} onConfirm={editingRed ? handleUpdateRed : handleCreateRed}>
                <div className="space-y-3 text-left">
                    <div><label className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 block mb-1">Nombre</label><input value={newRed.nombre} onChange={e => setNewRed(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Administración" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700" /></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 block mb-1">Segmento</label><input value={newRed.segmento} onChange={e => setNewRed(p => ({ ...p, segmento: e.target.value }))} placeholder="192.168.1.0" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700" /></div>
                        <div><label className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 block mb-1">Máscara</label><input value={newRed.mascara} onChange={e => setNewRed(p => ({ ...p, mascara: e.target.value }))} placeholder="255.255.255.0" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 block mb-1">Gateway</label><input value={newRed.gateway} onChange={e => setNewRed(p => ({ ...p, gateway: e.target.value }))} placeholder="192.168.1.1" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700" /></div>
                        <div><label className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 block mb-1">VLAN</label><input value={newRed.vlan} onChange={e => setNewRed(p => ({ ...p, vlan: e.target.value }))} placeholder="Opcional" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700" /></div>
                    </div>
                    <div><label className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 block mb-1">DNS</label><input value={newRed.dns} onChange={e => setNewRed(p => ({ ...p, dns: e.target.value }))} placeholder="8.8.8.8, 1.1.1.1" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700" /></div>
                </div>
            </ConfirmModal>

            <ConfirmModal isOpen={isDeleteRedOpen} title="¿Eliminar segmento?" message={`¿Eliminar "${redToDelete?.nombre || redToDelete?.segmento}"? No afectará IPs asignadas.`} onConfirm={handleDeleteRed} onClose={() => setIsDeleteRedOpen(false)} type="danger" />
            <ConfirmModal isOpen={isReserveModalOpen} title="Reservar IP" confirmText="Reservar" type="info" onClose={() => { setIsReserveModalOpen(false); setReservingIp(null); setReserveNote(''); }} onConfirm={handleReserve}>
                <div className="space-y-3 text-left">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3"><p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">IP</p><p className="text-lg font-bold text-white">{reservingIp}</p></div>
                    <div><label className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 block mb-1">Nota</label><textarea value={reserveNote} onChange={e => setReserveNote(e.target.value)} placeholder="Motivo de reserva..." className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 min-h-[90px] resize-none" autoFocus /></div>
                </div>
            </ConfirmModal>

            {selectedEquipo && <EquipoDetalleModal isOpen={isDetalleModalOpen} onClose={() => { setIsDetalleModalOpen(false); setSelectedEquipo(null); }} equipo={selectedEquipo} estados={estados} onEquipoUpdated={() => {}} />}
            <AsignarIpModal isOpen={isAssignModalOpen} ip={assigningIp} redId={selectedRed?.id} onClose={() => { setIsAssignModalOpen(false); setAssigningIp(null); }} onAssign={handleAssign} />

            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>{showScrollTop && <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} onClick={handleScrollToTop} className="fixed bottom-6 left-1/2 -translate-x-1/2 md:left-[280px] md:translate-x-0 z-50 w-9 h-9 grid place-items-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white shadow-xl cursor-pointer"><ChevronUp className="w-5 h-5" /></motion.button>}</AnimatePresence>, document.body
            )}
        </div>
    );
};
export default IPAM;
