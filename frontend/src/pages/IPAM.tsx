import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    Globe,
    Plus,
    Search,
    Filter,
    Download,
    Network,
    Activity,
    ChevronRight,
    Info,
    User,
    MapPin,
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
    Eraser,
    X,
    Eye,
    PlusCircle,
    Link as LinkIcon,
    Monitor,
    ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE, apiRequest } from '../services/api';
import { useToast } from '../context/ToastContext';
import SearchInput from '../components/common/SearchInput';
import ConfirmModal from '../components/common/ConfirmModal';
import Select from '../components/common/Select';
import EquipoDetalleModal from '../components/equipos/EquipoDetalleModal';
import AsignarIpModal from '../components/equipos/AsignarIpModal';

const IPAM = () => {
    const { showToast } = useToast();
    const [redes, setRedes] = useState([]);
    const [selectedRed, setSelectedRed] = useState(null);
    const [networkData, setNetworkData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mapLoading, setMapLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState(''); // '', 'ALL', 'LIBRE', 'OCUPADA', 'RESERVADA'
    const [pingingIp, setPingingIp] = useState(null);
    const [pingResults, setPingResults] = useState({});
    const [editingRed, setEditingRed] = useState(null);

    // --- Lógica de Scroll a Top (Back to Top) ---
    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => {
        const handleScroll = (e) => {
            const scroller = e.target;
            // capturamos cualquier scroll que ocurra en elementos con overflow
            if (scroller.scrollTop > 200) {
                setShowScrollTop(true);
            } else if (scroller.scrollTop <= 200) {
                setShowScrollTop(false);
            }
        };

        window.addEventListener('scroll', handleScroll, true);
        return () => window.removeEventListener('scroll', handleScroll, true);
    }, []);

    const handleScrollToTop = () => {
        // Buscamos todos los contenedores posibles y desplazamos el que tiene el scroll activo
        const containers = document.querySelectorAll('.overflow-y-auto');
        let scrolledContainer = null;

        containers.forEach(container => {
            if (container.scrollTop > 50) {
                scrolledContainer = container;
            }
        });

        if (scrolledContainer) {
            scrolledContainer.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // Modal states
    const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
    const [reservingIp, setReservingIp] = useState(null);
    const [reserveNote, setReserveNote] = useState('');

    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [assigningIp, setAssigningIp] = useState(null);
    const [isDetalleModalOpen, setIsDetalleModalOpen] = useState(false);
    const [selectedEquipo, setSelectedEquipo] = useState(null);
    const [estados, setEstados] = useState([]);

    // Modal states
    const [isDeleteRedOpen, setIsDeleteRedOpen] = useState(false);
    const [redToDelete, setRedToDelete] = useState(null);
    const [isCreateRedOpen, setIsCreateRedOpen] = useState(false);
    const [newRed, setNewRed] = useState({
        nombre: '',
        segmento: '',
        mascara: '255.255.255.0',
        gateway: '',
        dns: '',
        vlan: ''
    });

    const fetchRedes = async () => {
        try {
            setLoading(true);
            const data = await apiRequest('/ipam/redes');
            setRedes(data || []);

            // También cargamos los estados para el modal de detalle
            const estadosData = await apiRequest('/config/estados').catch(() => []);
            setEstados(estadosData);
        } catch (error) {
            showToast("Error", "No se pudieron cargar las redes configuradas.", "error");
        } finally {
            setLoading(false);
        }
    };

    const fetchNetworkMap = async (redId) => {
        try {
            setMapLoading(true);
            const data = await apiRequest(`/ipam/redes/${redId}/mapa`);
            setNetworkData(data);
        } catch (error) {
            showToast("Error", "No se pudo cargar el mapa de red.", "error");
        } finally {
            setMapLoading(false);
        }
    };

    useEffect(() => {
        fetchRedes();
    }, []);

    useEffect(() => {
        if (selectedRed) {
            fetchNetworkMap(selectedRed.id);
        }
    }, [selectedRed]);


    const handleDeleteRed = async () => {
        try {
            await apiRequest(`/ipam/redes/${redToDelete.id}`, { method: 'DELETE' });
            showToast("Red Eliminada", "El segmento ha sido removido del sistema.", "success");
            setIsDeleteRedOpen(false);
            setRedToDelete(null);
            if (selectedRed?.id === redToDelete.id) {
                setSelectedRed(null);
                setNetworkData(null);
            }
            fetchRedes();
        } catch (error) {
            showToast("Error", "No se pudo eliminar la red.", "error");
        }
    };

    const handleCreateRed = async () => {
        try {
            const created = await apiRequest('/ipam/redes', {
                method: 'POST',
                body: newRed
            });
            showToast("Red Creada", "El segmento manual quedo disponible en IPAM.", "success");
            setIsCreateRedOpen(false);
            setNewRed({
                nombre: '',
                segmento: '',
                mascara: '255.255.255.0',
                gateway: '',
                dns: '',
                vlan: ''
            });
            await fetchRedes();
            setSelectedRed(created);
        } catch (error) {
            showToast("Error", error.message || "No se pudo crear la red.", "error");
        }
    };

    const handleUpdateRed = async () => {
        if (!editingRed) return;
        try {
            const updated = await apiRequest(`/ipam/redes/${editingRed.id}`, {
                method: 'PUT',
                body: newRed
            });
            showToast("Red Actualizada", "El segmento manual fue actualizado correctamente.", "success");
            setIsCreateRedOpen(false);
            setEditingRed(null);
            setNewRed({
                nombre: '',
                segmento: '',
                mascara: '255.255.255.0',
                gateway: '',
                dns: '',
                vlan: ''
            });
            await fetchRedes();
            setSelectedRed(updated);
        } catch (error) {
            showToast("Error", error.message || "No se pudo actualizar la red.", "error");
        }
    };

    const handlePing = async (ip) => {
        try {
            setPingingIp(ip);
            const result = await apiRequest(`/ipam/ping/${ip}`);
            setPingResults(prev => ({ ...prev, [ip]: result.online }));

            if (result.online) {
                showToast("Ping Exitoso", `La IP ${ip} respondió correctamente.`, "success");
            } else {
                showToast("Sin Respuesta", `La IP ${ip} no respondió al ping.`, "warning");
            }
        } catch (error) {
            showToast("Error de Red", "Falla al intentar alcanzar la IP.", "error");
        } finally {
            setPingingIp(null);
        }
    };

    const handleReserve = async () => {
        if (!reservingIp) return;
        try {
            await apiRequest(`/ipam/redes/${selectedRed.id}/reservar`, {
                method: 'POST',
                body: { ip: reservingIp, notas: reserveNote }
            });
            showToast("Éxito", "IP reservada correctamente.", "success");
            setIsReserveModalOpen(false);
            setReservingIp(null);
            setReserveNote('');
            fetchNetworkMap(selectedRed.id);
        } catch (error) {
            showToast("Error", "No se pudo realizar la reserva.", "error");
        }
    };

    const handleAssign = async (data) => {
        try {
            showToast("Procesando", "Vinculando IP al equipo...", "info");
            await apiRequest('/ipam/asignar', {
                method: 'POST',
                body: data
            });
            showToast("Vínculo Exitoso", `La IP ${data.ip} ha sido asignada al equipo.`, "success");
            fetchNetworkMap(selectedRed.id);
        } catch (error) {
            showToast("Error", "No se pudo realizar la vinculación.", "error");
            throw error;
        }
    };

    const handleUnlink = async (ip, equipoId) => {
        try {
            showToast("Procesando", "Desvinculando IP...", "info");
            await apiRequest('/ipam/desvincular', {
                method: 'POST',
                body: { ip, equipoId }
            });
            showToast("Desvinculación Exitosa", `La IP ${ip} ha sido removida del equipo.`, "success");
            fetchNetworkMap(selectedRed.id);
        } catch (error) {
            showToast("Error", "No se pudo realizar la desvinculación.", "error");
        }
    };

    const handleRelease = async (ip) => {
        try {
            showToast("Procesando", "Liberando dirección IP...", "info");
            await apiRequest(`/ipam/liberar/${ip}`, { method: 'DELETE' });
            showToast("Éxito", `La IP ${ip} ahora está libre.`, "success");
            if (selectedRed) {
                fetchNetworkMap(selectedRed.id);
            }
        } catch (err) {
            showToast("Error", "No se pudo liberar la IP o es una IP de infraestructura.", "error");
        }
    };

    const handleViewDetails = async (equipoId) => {
        try {
            const fullEquipo = await apiRequest(`/equipos/${equipoId}`);
            setSelectedEquipo(fullEquipo);
            setIsDetalleModalOpen(true);
        } catch (err) {
            showToast("Error", "No se pudo cargar la información del equipo.", "error");
        }
    };

    const handleExportExcel = async () => {
        try {
            const response = await fetch(`${API_BASE}/ipam/exportar-excel`, {
                credentials: 'include'
            });
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `IPAM_Reporte_${new Date().toISOString().split('T')[0]}.xlsx`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            }
        } catch (error) {
            showToast("Error", "No se pudo exportar el reporte a Excel.", "error");
        }
    };

    const handleExportDrive = async () => {
        try {
            showToast("Procesando", "Sincronizando reporte con Google Drive...", "info");
            const data = await apiRequest('/ipam/exportar-drive', { method: 'POST' });
            if (data.success) {
                showToast("Éxito", "Reporte de Red subido a Google Drive correctamente.", "success");
            }
        } catch (error) {
            showToast("Error", "No se pudo sincronizar con Google Drive.", "error");
        }
    };

    const filteredIps = (networkData?.ips || []).filter(ip => {
        const matchesSearch = ip.ip.includes(search) || (ip.equipo?.ine || '').toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filterStatus === 'ALL' || !filterStatus ? true : ip.estado === filterStatus;
        return matchesSearch && matchesFilter;
    });

    const showResults = search.trim() !== '' || filterStatus !== '';

    return (
        <div className="space-y-6">
            {/* Toolbar section */}
            <div className="flex justify-end gap-2 md:gap-3">
                <button
                    onClick={handleExportExcel}
                    className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5 md:gap-2 cursor-pointer shadow-lg shadow-emerald-500/5 group"
                >
                    <FileSpreadsheet className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover:scale-110 transition-transform" />
                    <span className="hidden sm:inline">Exportar Excel</span><span className="sm:hidden">Excel</span>
                </button>
                <button
                    onClick={handleExportDrive}
                    className="bg-sky-600/10 hover:bg-sky-600/20 text-sky-400 border border-sky-500/20 px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5 md:gap-2 cursor-pointer shadow-lg shadow-sky-500/5 group"
                >
                    <UploadCloud className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover:animate-bounce transition-transform" />
                    <span className="hidden sm:inline">Exportar Drive</span><span className="sm:hidden">Drive</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar: Redes List */}
                <div className="lg:col-span-1 space-y-4 min-w-0 relative z-20">
                    <div className="bg-[#0f172a]/60 backdrop-blur-2xl border border-white/10 rounded-3xl md:rounded-[2.5rem] p-5 md:p-7 shadow-2xl relative min-w-0">
                        <div className="absolute top-0 right-0 p-6 md:p-8 opacity-5">
                            <Network className="w-20 h-20 md:w-32 md:h-32 text-white" />
                        </div>
                        <div className="flex items-center justify-between gap-3 mb-4 md:mb-6">
                            <h3 className="text-[10px] md:text-[11px] font-black text-indigo-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                                Segmentos
                            </h3>
                            <button
                                onClick={() => {
                                    setEditingRed(null);
                                    setNewRed({
                                        nombre: '',
                                        segmento: '',
                                        mascara: '255.255.255.0',
                                        gateway: '',
                                        dns: '',
                                        vlan: ''
                                    });
                                    setIsCreateRedOpen(true);
                                }}
                                className="group relative p-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f172a]"
                                title="Crear red manual"
                            >
                                <span className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[0_0_0_1px_rgba(99,102,241,0.25),0_10px_30px_rgba(99,102,241,0.10)]" />
                                <Plus className="w-4 h-4 relative transition-transform duration-300 group-hover:rotate-90 group-active:scale-90" />
                                <span className="pointer-events-none absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200">
                                    <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0b1020]/95 border border-white/10 text-[10px] font-black uppercase tracking-[0.25em] text-slate-200 shadow-xl shadow-black/40 whitespace-nowrap">
                                        + Segmento manual
                                    </span>
                                </span>
                            </button>
                        </div>

                        <div className="space-y-3 relative z-10">
                            {loading ? (
                                [1, 2, 3].map(i => <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse border border-white/5"></div>)
                            ) : redes.length === 0 ? (
                                <div className="text-center py-12 px-4 border-2 border-dashed border-white/5 rounded-3xl bg-white/2">
                                    <Network className="w-12 h-12 text-slate-700 mx-auto mb-4 opacity-40" />
                                    <p className="text-slate-500 text-xs font-bold leading-relaxed">No se encontraron redes configuradas en el sistema.</p>
                                </div>
                            ) : (
                                redes.map(red => {
                                    const cidrLabel = `${red.segmento}${red.cidr ? `/${red.cidr}` : ''}`;
                                    return (
                                        <motion.div
                                            layout
                                            key={red.id}
                                            onClick={() => setSelectedRed(red)}
                                            className={`group relative z-0 hover:z-20 p-5 rounded-2xl cursor-pointer transition-all duration-300 border ${selectedRed?.id === red.id
                                                ? 'bg-indigo-600/25 border-indigo-500/50 shadow-[0_20px_40px_rgba(79,70,229,0.15)] ring-1 ring-indigo-500/30'
                                                : 'bg-white/3 border-white/5 hover:border-white/20 hover:bg-white/6'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between gap-3 min-w-0">
                                                <div
                                                    className="flex items-center justify-between gap-3 min-w-0 flex-1"
                                                    title={`${cidrLabel} - ${red.isAuto ? 'AUTO' : 'MANUAL'}`}
                                                >
                                                    <div className="min-w-0 overflow-x-auto overscroll-x-contain whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                                        <span className="text-white font-black text-sm tracking-tight">
                                                            {cidrLabel}
                                                        </span>
                                                    </div>
                                                    <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.25em] px-2.5 py-1 rounded-full border bg-white/5 text-slate-300 border-white/10">
                                                        {red.isAuto ? 'AUTO' : 'MANUAL'}
                                                    </span>
                                                </div>
                                            </div>

                                            {!red.isAuto && (
                                                <div className="absolute z-50 pointer-events-none group-hover:pointer-events-auto top-1/2 right-0 translate-x-[calc(100%+10px)] -translate-y-1/2 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200">
                                                    <div className="relative">
                                                        <div className="absolute -inset-3 rounded-full bg-indigo-500/15 blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        <div className="relative flex items-center gap-1 p-1 rounded-full bg-[#0b1020]/95 border border-white/10 shadow-xl shadow-black/40">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingRed(red);
                                                                    setNewRed({
                                                                        nombre: red.nombre || '',
                                                                        segmento: red.segmento || '',
                                                                        mascara: red.mascara || '255.255.255.0',
                                                                        gateway: red.gateway || '',
                                                                        dns: red.dns || '',
                                                                        vlan: red.vlan || ''
                                                                    });
                                                                    setIsCreateRedOpen(true);
                                                                }}
                                                                className="grid place-items-center w-9 h-9 rounded-full text-indigo-200 hover:text-white hover:bg-indigo-500/10 transition-all cursor-pointer"
                                                                title="Editar segmento manual"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setRedToDelete(red);
                                                                    setIsDeleteRedOpen(true);
                                                                }}
                                                                className="grid place-items-center w-9 h-9 rounded-full text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 transition-all cursor-pointer"
                                                                title="Eliminar segmento manual"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                        <div className="pointer-events-none absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 bg-[#0b1020]/95 border-l border-b border-white/10" />
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Main: IP Map */}
                <div className="lg:col-span-3 space-y-6">
                    {!selectedRed ? (
                        <div className="h-full flex flex-col items-center justify-center py-10 md:py-24 bg-white/5 rounded-3xl md:rounded-[3rem] border border-dashed border-white/10">
                            <Activity className="w-10 h-10 md:w-16 md:h-16 text-slate-600 mb-3 md:mb-4 opacity-20" />
                            <h3 className="text-base md:text-xl font-black text-white">Selecciona un segmento</h3>
                            <p className="text-slate-400 mt-1 md:mt-2 text-xs md:text-sm">Configura o selecciona una red para ver su ocupación.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Stats Summary */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-4">
                                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-[#0f172a]/40 backdrop-blur-xl border border-white/10 p-3.5 md:p-6 rounded-2xl md:rounded-4xl group hover:bg-[#0f172a]/60 transition-all duration-500 shadow-xl">
                                    <p className="text-slate-500 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-1 md:mb-2">Total IPs</p>
                                    <p className="text-2xl md:text-4xl font-black text-white tracking-tight">{networkData?.stats?.total || '-'}</p>
                                    <div className="h-0.5 w-6 md:w-8 bg-indigo-500/30 mt-2.5 md:mt-4 rounded-full group-hover:w-16 transition-all duration-500"></div>
                                </motion.div>
                                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-emerald-500/3 backdrop-blur-xl border border-emerald-500/20 p-3.5 md:p-6 rounded-2xl md:rounded-4xl group hover:bg-emerald-500/6 transition-all duration-500 shadow-xl shadow-emerald-500/5">
                                    <p className="text-emerald-500/60 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-1 md:mb-2">Libres</p>
                                    <p className="text-2xl md:text-4xl font-black text-emerald-400 tracking-tight">{networkData?.stats?.free || '-'}</p>
                                    <div className="h-0.5 w-6 md:w-8 bg-emerald-500/30 mt-2.5 md:mt-4 rounded-full group-hover:w-16 transition-all duration-500"></div>
                                </motion.div>
                                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="bg-rose-500/3 backdrop-blur-xl border border-rose-500/20 p-3.5 md:p-6 rounded-2xl md:rounded-4xl group hover:bg-rose-500/6 transition-all duration-500 shadow-xl shadow-rose-500/5">
                                    <p className="text-rose-500/60 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-1 md:mb-2">Ocupadas</p>
                                    <p className="text-2xl md:text-4xl font-black text-rose-400 tracking-tight">{networkData?.stats?.occupied || '-'}</p>
                                    <div className="h-0.5 w-6 md:w-8 bg-rose-500/30 mt-2.5 md:mt-4 rounded-full group-hover:w-16 transition-all duration-500"></div>
                                </motion.div>
                                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="bg-sky-500/3 backdrop-blur-xl border border-sky-500/20 p-3.5 md:p-6 rounded-2xl md:rounded-4xl group hover:bg-sky-500/6 transition-all duration-500 shadow-xl shadow-sky-500/5">
                                    <p className="text-sky-500/60 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-1 md:mb-2">Reservadas</p>
                                    <p className="text-2xl md:text-4xl font-black text-sky-400 tracking-tight">{networkData?.stats?.reserved || '-'}</p>
                                    <div className="h-0.5 w-6 md:w-8 bg-sky-500/30 mt-2.5 md:mt-4 rounded-full group-hover:w-16 transition-all duration-500"></div>
                                </motion.div>
                            </div>

                            {/* Toolbar */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-6 bg-[#0f172a]/60 backdrop-blur-2xl border border-white/10 p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] shadow-2xl relative overflow-visible group">
                                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                                <div className="max-w-md w-full relative">
                                    <SearchInput
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Buscar IP o Equipo..."
                                    />
                                </div>

                                <div className="flex items-center flex-wrap gap-3 md:gap-6">
                                    <div className="flex items-center gap-2 md:gap-4">
                                        <span className="text-[10px] md:text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap">Ver IP(s):</span>
                                        <div className="min-w-[120px] md:min-w-[160px]">
                                            <Select
                                                value={filterStatus}
                                                onChange={(e) => setFilterStatus(e.target.value)}
                                                options={[
                                                    { value: 'ALL', label: 'Todas las IPs' },
                                                    { value: 'LIBRE', label: 'Libres' },
                                                    { value: 'OCUPADA', label: 'Ocupadas' },
                                                    { value: 'RESERVADA', label: 'Reservadas' }
                                                ]}
                                                placeholder="Seleccionar..."
                                                className="gap-0!"
                                            />
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {showResults && (
                                            <motion.button
                                                initial={{ opacity: 0, x: 20, scale: 0.9 }}
                                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                                exit={{ opacity: 0, x: 20, scale: 0.9 }}
                                                onClick={() => {
                                                    setSearch('');
                                                    setFilterStatus('');
                                                }}
                                                className="p-2.5 text-rose-400 group/clear hover:text-rose-300 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/20 rounded-xl transition-all duration-300 shadow-lg shadow-rose-500/5 active:scale-95 cursor-pointer"
                                                title="Limpiar filtros"
                                            >
                                                <X className="w-3.5 h-3.5 group-hover/clear:rotate-90 transition-transform" />
                                            </motion.button>
                                        )}
                                    </AnimatePresence>

                                    <div className="w-px h-6 md:h-8 bg-white/5"></div>

                                    <button
                                        onClick={() => fetchNetworkMap(selectedRed.id)}
                                        className="p-2.5 md:p-3.5 text-slate-400 hover:text-indigo-400 bg-white/3 hover:bg-white/6 border border-white/10 rounded-xl md:rounded-2xl transition-all duration-500 tooltip relative active:scale-95 group/refresh cursor-pointer"
                                        title="Sincronizar Mapa de Red"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${mapLoading ? 'animate-spin' : 'group-hover/refresh:rotate-180 transition-transform duration-700'}`} />
                                        <span className="text-[10px] font-black uppercase tracking-widest hidden group-hover/refresh:inline-block ml-2 animate-in fade-in slide-in-from-right-1">Actualizar</span>
                                    </button>
                                </div>
                            </div>

                            {/* IP Grid */}
                            {!showResults && !mapLoading ? (
                                <div className="py-10 md:py-24 text-center bg-white/2 border border-dashed border-white/10 rounded-2xl md:rounded-[3.5rem] group hover:bg-white/4 transition-all duration-700 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-linear-to-b from-indigo-500/2 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                                    <motion.div
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="flex flex-col items-center relative z-10"
                                    >
                                        <div className="w-14 h-14 md:w-24 md:h-24 bg-indigo-500/5 rounded-2xl md:rounded-4xl flex items-center justify-center mb-4 md:mb-8 border border-indigo-500/10 group-hover:scale-110 group-hover:rotate-12 transition-all duration-700 shadow-2xl">
                                            <Filter className="w-6 h-6 md:w-10 md:h-10 text-indigo-400/40" />
                                        </div>
                                        <h4 className="text-white font-black uppercase tracking-[0.3em] md:tracking-[0.4em] text-xs md:text-sm mb-2 md:mb-4">Selecciona un filtro</h4>
                                        <p className="text-slate-500 text-[10px] md:text-xs font-black max-w-xs mx-auto leading-relaxed uppercase tracking-[0.15em] md:tracking-[0.2em] opacity-40 px-4">
                                            Usa el buscador o el selector superior.
                                        </p>
                                    </motion.div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 md:gap-5 pb-20">
                                    {mapLoading ? (
                                        [1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="h-44 bg-white/5 rounded-[2.5rem] animate-pulse border border-white/5 shadow-inner"></div>)
                                    ) : filteredIps?.length === 0 ? (
                                        <div className="col-span-full py-24 text-center bg-[#0f172a]/40 border border-dashed border-white/10 rounded-[3rem]">
                                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 opacity-20">
                                                <XCircle className="w-8 h-8 text-white" />
                                            </div>
                                            <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.3em]">No se encontraron resultados para tu búsqueda</p>
                                        </div>
                                    ) : (
                                        filteredIps.map(ip => (
                                            <motion.div
                                                layout
                                                key={ip.ip}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className={`relative group p-3.5 md:p-5 rounded-2xl md:rounded-4xl bg-[#0c1222] border border-white/5 hover:border-indigo-500/20 transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/10 overflow-hidden ${ip.estado === 'RESERVADA' ? 'hover:border-sky-500/20 hover:shadow-sky-500/10' :
                                                    ip.estado === 'OCUPADA' ? 'hover:border-indigo-500/30' : ''
                                                    }`}
                                            >
                                                

                                                {/* Card Content */}
                                                <div className="relative z-10 flex flex-col h-full items-center text-center">
                                                    {/* Top: IP and Status */}
                                                    <div className="flex items-center justify-center gap-2 md:gap-3 mb-3 md:mb-5">
                                                        <div className="relative">
                                                            <p className="text-white font-black text-sm md:text-lg tracking-tight leading-none select-none">{ip.ip}</p>
                                                        </div>
                                                        <span className={`px-1.5 md:px-2 py-0.5 rounded-lg text-[7px] md:text-[8px] font-black uppercase tracking-[0.15em] border ${ip.estado === 'OCUPADA' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                                            ip.estado === 'RESERVADA' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                            }`}>
                                                            {ip.estado}
                                                        </span>

                                                        {ip.estado === 'RESERVADA' && ip.notas && (
                                                            <span className="text-[8px] md:text-[9px] text-sky-400/60 font-medium tracking-tight hidden md:inline">
                                                                {ip.notas}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Middle: Actions (Buttons) */}
                                                    <div className="flex items-center justify-center gap-1.5 md:gap-2 mb-2">
                                                        {ip.estado === 'OCUPADA' && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleViewDetails(ip.equipo.id)}
                                                                    className="p-2 md:p-2.5 rounded-lg md:rounded-xl transition-all duration-300 border shadow-lg bg-white/3 border-white/5 hover:border-indigo-500/40 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/5 group/detail flex items-center gap-1.5 md:gap-2 cursor-pointer"
                                                                    title="Ver detalles del equipo"
                                                                >
                                                                    <Eye className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover/detail:scale-110 transition-transform" />
                                                                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider hidden group-hover/detail:inline-block animate-in fade-in slide-in-from-left-1">Detalle</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        if (window.confirm(`¿Estás seguro de que deseas desvincular la IP ${ip.ip} del equipo ${ip.equipo.ine}? Se borrarán las especificaciones de red.`)) {
                                                                            handleUnlink(ip.ip, ip.equipo.id);
                                                                        }
                                                                    }}
                                                                    className="p-2 md:p-2.5 rounded-lg md:rounded-xl transition-all duration-300 border shadow-lg bg-rose-500/5 border-rose-500/10 hover:border-rose-500/40 text-rose-400/50 hover:text-rose-400 hover:bg-rose-500/10 group/unlink flex items-center gap-1.5 md:gap-2 cursor-pointer"
                                                                    title="Desvincular IP del equipo"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover/unlink:scale-110 transition-transform" />
                                                                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider hidden group-hover/unlink:inline-block animate-in fade-in slide-in-from-left-1">Vínculo</span>
                                                                </button>
                                                            </>
                                                        )}
                                                        {ip.estado === 'LIBRE' && (
                                                            <>
                                                                <button
                                                                    onClick={() => {
                                                                        setReservingIp(ip.ip);
                                                                        setIsReserveModalOpen(true);
                                                                    }}
                                                                    className="p-2 md:p-2.5 rounded-lg md:rounded-xl transition-all duration-300 border shadow-lg bg-white/3 border-white/5 hover:border-sky-500/40 text-slate-500 hover:text-sky-400 hover:bg-sky-500/5 group/reserve flex items-center gap-1.5 md:gap-2 cursor-pointer"
                                                                    title="Reservar IP"
                                                                >
                                                                    <Lock className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover/reserve:scale-110 transition-transform" />
                                                                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider hidden group-hover/reserve:inline-block animate-in fade-in slide-in-from-left-1">Reservar</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setAssigningIp(ip.ip);
                                                                        setIsAssignModalOpen(true);
                                                                    }}
                                                                    className="p-2 md:p-2.5 rounded-lg md:rounded-xl transition-all duration-300 border shadow-lg bg-white/3 border-white/5 hover:border-indigo-500/40 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/5 group/link flex items-center gap-1.5 md:gap-2 cursor-pointer"
                                                                    title="Vincular a equipo"
                                                                >
                                                                    <LinkIcon className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover/link:scale-110 transition-transform" />
                                                                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider hidden group-hover/link:inline-block animate-in fade-in slide-in-from-left-1">Vincular</span>
                                                                </button>
                                                            </>
                                                        )}
                                                        {ip.estado === 'RESERVADA' && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleRelease(ip.ip)}
                                                                    className="p-2 md:p-2.5 rounded-lg md:rounded-xl transition-all duration-300 border shadow-lg bg-rose-500/5 border-rose-500/10 hover:border-rose-500/40 text-rose-400/50 hover:text-rose-400 hover:bg-rose-500/10 group/release flex items-center gap-1.5 md:gap-2 cursor-pointer"
                                                                    title="Liberar Reserva"
                                                                >
                                                                    <Unlock className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover/release:scale-110 transition-transform" />
                                                                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider hidden group-hover/release:inline-block animate-in fade-in slide-in-from-left-1">Liberar</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setAssigningIp(ip.ip);
                                                                        setIsAssignModalOpen(true);
                                                                    }}
                                                                    className="p-2.5 rounded-xl transition-all duration-300 border shadow-lg bg-white/3 border-white/5 hover:border-indigo-500/40 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/5 group/link flex items-center gap-2 cursor-pointer"
                                                                    title="Vincular a equipo"
                                                                >
                                                                    <LinkIcon className="w-4 h-4 group-hover/link:scale-110 transition-transform" />
                                                                    <span className="text-[10px] font-black uppercase tracking-wider hidden group-hover/link:inline-block animate-in fade-in slide-in-from-left-1">Vincular</span>
                                                                </button>
                                                            </>
                                                        )}
                                                        <button
                                                            onClick={() => handlePing(ip.ip)}
                                                            disabled={pingingIp === ip.ip}
                                                            className={`p-2.5 rounded-xl transition-all duration-300 border shadow-lg bg-white/3 border-white/5 hover:border-emerald-500/40 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/5 group/ping flex items-center gap-2 cursor-pointer relative ${pingingIp === ip.ip ? 'opacity-50 cursor-not-allowed!' : ''
                                                                }`}
                                                            title="Realizar Ping"
                                                        >
                                                            {/* Indicador de resultado de ping */}
                                                            {pingResults[ip.ip] !== undefined && (
                                                                <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-[#0c1222] shadow-sm z-20 ${pingResults[ip.ip] ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-rose-500 shadow-rose-500/50'
                                                                    }`} />
                                                            )}

                                                            <Activity className={`w-4 h-4 transition-transform ${pingingIp === ip.ip ? 'animate-spin text-emerald-400' : 'group-hover/ping:scale-110'
                                                                }`} />
                                                            <span className="text-[10px] font-black uppercase tracking-wider hidden group-hover/ping:inline-block animate-in fade-in slide-in-from-left-1">
                                                                {pingingIp === ip.ip ? 'Ping...' : 'Ping'}
                                                            </span>
                                                        </button>
                                                    </div>

                                                    {/* Bottom: Team Info (only for occupied) */}
                                                    {ip.estado === 'OCUPADA' && (
                                                        <div className="mt-4 pt-3 border-t border-white/5 w-full">
                                                            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/2 border border-white/5 group-hover:bg-indigo-500/3 transition-colors">
                                                                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                                                                    <Monitor className="w-4 h-4" />
                                                                </div>
                                                                <div className="min-w-0 text-left">
                                                                    <p className="text-white font-black text-xs tracking-tight truncate">{ip.equipo.ine}</p>
                                                                    <p className="text-slate-500 text-[9px] font-bold uppercase tracking-wider truncate mt-0.5">{ip.equipo.tipo} • {ip.equipo.ubicacion}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>


            <ConfirmModal
                isOpen={isCreateRedOpen}
                title={editingRed ? 'Editar Segmento' : 'Crear Segmento'}
                confirmText={editingRed ? 'Guardar cambios' : 'Crear red'}
                cancelText="Cancelar"
                type="info"
                onClose={() => {
                    setIsCreateRedOpen(false);
                    setEditingRed(null);
                }}
                onConfirm={editingRed ? handleUpdateRed : handleCreateRed}
            >
                <div className="space-y-4 text-left">
                    <div className="space-y-2">
                        <label className="text-slate-400 text-[10px] font-black uppercase tracking-widest block px-1">Nombre</label>
                        <input value={newRed.nombre} onChange={(e) => setNewRed(prev => ({ ...prev, nombre: e.target.value }))} placeholder="Ej: Administracion" className="w-full bg-white/3 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500/40 transition-all placeholder:text-slate-600" autoFocus />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <label className="text-slate-400 text-[10px] font-black uppercase tracking-widest block px-1">Segmento</label>
                            <input value={newRed.segmento} onChange={(e) => setNewRed(prev => ({ ...prev, segmento: e.target.value }))} placeholder="192.168.1.0" className="w-full bg-white/3 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500/40 transition-all placeholder:text-slate-600" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-slate-400 text-[10px] font-black uppercase tracking-widest block px-1">Mascara</label>
                            <input value={newRed.mascara} onChange={(e) => setNewRed(prev => ({ ...prev, mascara: e.target.value }))} placeholder="/24 o 255.255.255.0" className="w-full bg-white/3 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500/40 transition-all placeholder:text-slate-600" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <label className="text-slate-400 text-[10px] font-black uppercase tracking-widest block px-1">Gateway</label>
                            <input value={newRed.gateway} onChange={(e) => setNewRed(prev => ({ ...prev, gateway: e.target.value }))} placeholder="192.168.1.1" className="w-full bg-white/3 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500/40 transition-all placeholder:text-slate-600" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-slate-400 text-[10px] font-black uppercase tracking-widest block px-1">VLAN</label>
                            <input value={newRed.vlan} onChange={(e) => setNewRed(prev => ({ ...prev, vlan: e.target.value }))} placeholder="Opcional" className="w-full bg-white/3 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500/40 transition-all placeholder:text-slate-600" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-slate-400 text-[10px] font-black uppercase tracking-widest block px-1">DNS</label>
                        <input value={newRed.dns} onChange={(e) => setNewRed(prev => ({ ...prev, dns: e.target.value }))} placeholder="8.8.8.8, 1.1.1.1" className="w-full bg-white/3 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500/40 transition-all placeholder:text-slate-600" />
                    </div>
                </div>
            </ConfirmModal>

            <ConfirmModal
                isOpen={isDeleteRedOpen}
                title="¿Eliminar Segmento?"
                message={`¿Estás seguro de que deseas eliminar la red "${redToDelete?.nombre}"? Esta acción no afectará las IPs asignadas a los equipos, pero ya no podrás ver el mapa de este segmento.`}
                onConfirm={handleDeleteRed}
                onClose={() => setIsDeleteRedOpen(false)}
                type="danger"
            />

            {/* Modal de Reserva con Nota */}
            <ConfirmModal
                isOpen={isReserveModalOpen}
                title="Reservar Dirección IP"
                confirmText="Reservar ahora"
                cancelText="Cancelar"
                type="info"
                onClose={() => {
                    setIsReserveModalOpen(false);
                    setReservingIp(null);
                    setReserveNote('');
                }}
                onConfirm={handleReserve}
            >
                <div className="space-y-4 py-2">
                    <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">IP a Reservar</p>
                        <p className="text-white font-black text-xl tracking-tight">{reservingIp}</p>
                    </div>
                    <div className="space-y-2">
                        <label className="text-slate-400 text-[10px] font-black uppercase tracking-widest block px-1">Nota de Reserva</label>
                        <textarea
                            value={reserveNote}
                            onChange={(e) => setReserveNote(e.target.value)}
                            placeholder="Ej: Reservada para rack de servidores, nuevo equipo de red, etc..."
                            className="w-full bg-white/3 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-indigo-500/40 transition-all placeholder:text-slate-600 min-h-[120px] resize-none"
                            autoFocus
                        />
                    </div>
                </div>
            </ConfirmModal>

            {/* Modal de Detalle de Equipo */}
            {selectedEquipo && (
                <EquipoDetalleModal
                    isOpen={isDetalleModalOpen}
                    onClose={() => {
                        setIsDetalleModalOpen(false);
                        setSelectedEquipo(null);
                    }}
                    equipo={selectedEquipo}
                    estados={estados}
                    onEquipoUpdated={() => {}}
                />
            )}
            {/* Modal de Asignación de IP */}
            <AsignarIpModal
                isOpen={isAssignModalOpen}
                ip={assigningIp}
                redId={selectedRed?.id}
                onClose={() => {
                    setIsAssignModalOpen(false);
                    setAssigningIp(null);
                }}
                onAssign={handleAssign}
            />

            {/* Back to Top Button - SOLO ICONO, POSICIÓN BAJA, CONDICIONAL */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {showScrollTop && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.5, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.5, y: 20 }}
                            onClick={handleScrollToTop}
                            // bottom-[-2px] subiendo levemente tras pasarnos hacia abajo
                            className="fixed bottom-[10px] left-1/2 -translate-x-1/2 md:left-[272px] md:translate-x-0 z-99999 flex items-center justify-center cursor-pointer group outline-none"
                            title="Volver arriba"
                        >
                            <div className="relative flex items-center justify-center">
                                {/* Efecto de resplandor constante para visibilidad */}
                                <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full scale-150 animate-pulse" />

                                <ChevronUp
                                    className="w-10 h-10 text-indigo-400 group-hover:text-white drop-shadow-[0_0_12px_rgba(79,70,229,0.9)] transition-all duration-300 transform group-hover:-translate-y-2"
                                />
                            </div>
                        </motion.button>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

export default IPAM;
