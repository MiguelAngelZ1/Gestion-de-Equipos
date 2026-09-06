import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    Network,
    Plus,
    Server,
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
import ScannerTable from '../components/network/ScannerTable';
import EvidenceModal from '../components/network/EvidenceModal';
import TopologyMap from '../components/network/TopologyMap';
import { useNetworkSocket } from '../hooks/useNetworkSocket';

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
    const [newRed, setNewRed] = useState({ nombre: '', segmento: '', mascara: '255.255.255.0', gateway: '', dns: '' });

    const [activeTab, setActiveTab] = useState<'SCANNER' | 'GRID'>('SCANNER');
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [dispositivos, setDispositivos] = useState<any[]>([]);
    const [graphedDevices, setGraphedDevices] = useState<any[]>([]);
    const [graphLinks, setGraphLinks] = useState<{ from: string; to: string }[]>([]);
    const [linkingFrom, setLinkingFrom] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState<{ scanned: number; total: number; percentage: number; found: number } | null>(null);


    const fetchRedes = useCallback(async () => {
        try {
            setLoading(true);
            const data = await apiRequest('/ipam/redes');
            setRedes(data || []);
            const estadosData = await apiRequest('/config/estados').catch(() => []);
            setEstados(estadosData);
        } catch { showToast("Error", "No se pudieron cargar las redes.", "error"); }
        finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchNetworkMap = useCallback(async (redId: string) => {
        try {
            setMapLoading(true);
            const data = await apiRequest(`/ipam/redes/${redId}/mapa`);
            setNetworkData(data);
        } catch { showToast("Error", "No se pudo cargar el mapa de red.", "error"); }
        finally { setMapLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchDispositivos = useCallback(async (redId: string) => {
        try {
            const data = await apiRequest(`/network/redes/${redId}/dispositivos`);
            setDispositivos(data || []);
        } catch {
            setDispositivos([]);
        }
    }, []);

    useEffect(() => { fetchRedes(); }, [fetchRedes]); // eslint-disable-line react-hooks/set-state-in-effect
    const [graphPositions, setGraphPositions] = useState<Record<string, { x: number; y: number }>>({});
    useEffect(() => {
        if (selectedRed) {
            fetchNetworkMap(selectedRed.id);
            fetchDispositivos(selectedRed.id);
            try {
                const g = localStorage.getItem(`graph:${selectedRed.id}`);
                const l = localStorage.getItem(`graphLinks:${selectedRed.id}`);
                const p = localStorage.getItem(`graphPos:${selectedRed.id}`);
                if (g) setGraphedDevices(JSON.parse(g)); else setGraphedDevices([]);
                if (l) setGraphLinks(JSON.parse(l)); else setGraphLinks([]);
                if (p) setGraphPositions(JSON.parse(p)); else setGraphPositions({});
            } catch { setGraphedDevices([]); setGraphLinks([]); setGraphPositions({}); }
            setLinkingFrom(null);
        } else { setGraphedDevices([]); setGraphLinks([]); setGraphPositions({}); }
    }, [selectedRed, fetchNetworkMap, fetchDispositivos]);

    useEffect(() => {
        if (!selectedRed) return;
        try { localStorage.setItem(`graph:${selectedRed.id}`, JSON.stringify(graphedDevices)); } catch {}
    }, [graphedDevices, selectedRed]);
    useEffect(() => {
        if (!selectedRed) return;
        try { localStorage.setItem(`graphLinks:${selectedRed.id}`, JSON.stringify(graphLinks)); } catch {}
    }, [graphLinks, selectedRed]);
    useEffect(() => {
        if (!selectedRed) return;
        try { localStorage.setItem(`graphPos:${selectedRed.id}`, JSON.stringify(graphPositions)); } catch {}
    }, [graphPositions, selectedRed]);

    useEffect(() => {
        if (!graphedDevices.length || !dispositivos.length) return;
        setGraphedDevices(prev => prev.map(g => {
            const d = dispositivos.find(x => x.ip === g.ip || x.id === g.id);
            return d ? { ...g, estado_monitoreo: d.estado_monitoreo, latencia_actual_ms: d.latencia_actual_ms, fallos_consecutivos: d.fallos_consecutivos } : g;
        }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispositivos]);

    // Socket.IO en tiempo real
    useNetworkSocket(
        selectedRed?.id || null,
        (evt) => {
            setDispositivos((prev) =>
                prev.map((d) =>
                    d.id === evt.dispositivoId || d.ip === evt.ip
                        ? {
                              ...d,
                              estado_monitoreo: evt.nuevoEstado,
                              fallos_consecutivos: evt.fallosConsecutivos,
                              latencia_actual_ms: evt.latenciaMs
                          }
                        : d
                )
            );
        },
        (progress) => {
            setIsScanning(true);
            setScanProgress(progress);
        },
        () => {
            setIsScanning(false);
            setScanProgress(null);
            showToast("Escaneo Completo", "Descubrimiento de red finalizado.", "success");
            if (selectedRed) {
                fetchDispositivos(selectedRed.id);
                fetchNetworkMap(selectedRed.id);
            }
        }
    );

    const handleStartScan = async () => {
        if (!selectedRed) return;
        try {
            setIsScanning(true);
            showToast("Escaneo Iniciado", `Iniciando descubrimiento en ${selectedRed.segmento}...`, "info");
            await apiRequest(`/network/redes/${selectedRed.id}/scan`, { method: 'POST' });
        } catch (e: any) {
            setIsScanning(false);
            showToast("Error", e.message || "No se pudo iniciar el escaneo.", "error");
        }
    };

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
            setIsCreateRedOpen(false); setNewRed({ nombre: '', segmento: '', mascara: '255.255.255.0', gateway: '', dns: '' });
            await fetchRedes(); setSelectedRed(created);
        } catch (e) { showToast("Error", e.message || "No se pudo crear la red.", "error"); }
    };
    const handleUpdateRed = async () => {
        if (!editingRed) return;
        try {
            const updated = await apiRequest(`/ipam/redes/${editingRed.id}`, { method: 'PUT', body: newRed });
            showToast("Red Actualizada", "Segmento actualizado.", "success");
            setIsCreateRedOpen(false); setEditingRed(null);
            setNewRed({ nombre: '', segmento: '', mascara: '255.255.255.0', gateway: '', dns: '' });
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
    const [tracertOutput, setTracertOutput] = useState<string | null>(null);
    const [tracertIp, setTracertIp] = useState<string | null>(null);
    const [isTracertOpen, setIsTracertOpen] = useState(false);
    const [pingOutput, setPingOutput] = useState<string | null>(null);
    const [pingIp, setPingIp] = useState<string | null>(null);
    const [isPingOpen, setIsPingOpen] = useState(false);
    const pingAbortRef = React.useRef<AbortController | null>(null);
    const handleRename = async (node: any, alias: string) => {
        try {
            const updated = await apiRequest(`/network/dispositivos/${node.id}/alias`, { method: 'PATCH', body: { alias } });
            setDispositivos(prev => prev.map(d => d.id === node.id || d.ip === node.ip ? { ...d, alias: updated.alias, hostname_actual: updated.alias || d.hostname_actual } : d));
            setGraphedDevices(prev => prev.map(d => d.ip === node.ip || d.id === node.id ? { ...d, alias: updated.alias, hostname_actual: updated.alias || d.hostname_actual } : d));
            showToast("Nombre actualizado", `"${node.ip}" ahora es "${alias || 'Desconocido'}"`, "success");
        } catch (e: any) { showToast("Error", e.message || "No se pudo renombrar.", "error"); }
    };
    const handleScannerPing = async (ip: string) => {
        try { pingAbortRef.current?.abort(); } catch {}
        const ac = new AbortController(); pingAbortRef.current = ac;
        setPingIp(ip); setPingOutput(`C:\\WINDOWS\\system32> ping -t ${ip}\n\n`); setIsPingOpen(true);
        let gotData = false;
        const fallback = setTimeout(async () => {
            if (gotData || ac.signal.aborted) return;
            try { ac.abort(); } catch {}
            const ac2 = new AbortController(); pingAbortRef.current = ac2;
            setPingOutput(prev => (prev || '') + `Haciendo ping a ${ip} con 32 bytes de datos:\n`);
            const iv = setInterval(async () => {
                if (ac2.signal.aborted) { clearInterval(iv); return; }
                try {
                    const r: any = await apiRequest(`/network/ping/${encodeURIComponent(ip)}?fast=1`);
                    const chunk: string = r.output || '';
                    const line = chunk.split('\n').find((l: string) => /Respuesta|Reply|bytes=|TTL|tiempo|time/i.test(l)) || chunk.split('\n').pop() || 'Tiempo de espera agotado.';
                    if (!ac2.signal.aborted) setPingOutput(p => (p || '') + line.trim() + '\n');
                } catch {}
            }, 850);
            try { const r: any = await apiRequest(`/network/ping/${encodeURIComponent(ip)}?fast=1`); const c: string = r.output || ''; const l = c.split('\n').find((x: string) => /Respuesta|Reply/i.test(x)) || ''; if (l) setPingOutput(p => (p || '') + l.trim() + '\n'); } catch {}
            ac2.signal.addEventListener('abort', () => clearInterval(iv));
            (pingAbortRef as any).current = ac2;
        }, 2500);
        try {
            const r = await fetch(`${API_BASE}/network/ping-stream/${encodeURIComponent(ip)}`, { credentials: 'include', signal: ac.signal });
            if (!r.ok || !r.body) throw new Error('No se pudo iniciar ping continuo');
            const reader = r.body.getReader(); const dec = new TextDecoder('utf-8');
            clearTimeout(fallback); gotData = true;
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (ac.signal.aborted) break;
                gotData = true;
                setPingOutput(prev => (prev || '') + dec.decode(value, { stream: true }));
            }
        } catch (e: any) {
            if (e.name === 'AbortError' && !gotData) return;
            if (e.name !== 'AbortError') setPingOutput(prev => (prev || '') + `\n[conexión cerrada] ${e.message || ''}`);
            clearTimeout(fallback);
        }
    };
    const closePing = () => { try { pingAbortRef.current?.abort(); } catch {} setIsPingOpen(false); };
    const handleTracert = async (ip: string) => {
        try {
            setTracertIp(ip); setTracertOutput('C:\\WINDOWS\\system32> tracert -d -h 15 ' + ip + '\n\nEjecutando tracert...\n'); setIsTracertOpen(true);
            const r: any = await apiRequest(`/network/tracert/${ip}`);
            setTracertOutput(r.output || 'Sin salida');
        } catch (e: any) { setTracertOutput(e.message || 'Error'); }
    };
    const handleGraphScanner = (node: any) => {
        const ip = node.ip;
        const exists = graphedDevices.some(g => g.ip === ip);
        if (exists) { showToast("Ya en el mapa", `${ip} ya está graficado.`, "info"); return; }
        const n = { id: node.id || ip, ip, hostname_actual: node.alias || node.hostname_actual || node.equipo_ine || ip, alias: node.alias || null, fabricante_actual: node.fabricante_actual || '', estado_monitoreo: node.estado_monitoreo || 'UNKNOWN', latencia_actual_ms: node.latencia_actual_ms ?? null, rol: (node.rol && node.rol !== 'ENDPOINT' ? node.rol : 'NOTEBOOK'), equipo_ine: node.equipo_ine || null };
        setGraphedDevices(prev => [...prev, n]); showToast("Graficado", `${ip} añadido al mapa.`, "success");
    };
    const handleGraph = (ip: any) => {
        const exists = graphedDevices.some(g => g.ip === ip.ip);
        if (exists) {
            setGraphedDevices(prev => prev.filter(g => g.ip !== ip.ip));
            setGraphLinks(prev => prev.filter(l => l.from !== ip.ip && l.to !== ip.ip));
            showToast("Removido del mapa", `${ip.ip} quitado.`, "info");
            return;
        }
        const node = {
            id: ip.ip,
            ip: ip.ip,
            hostname_actual: ip.equipo?.ine || ip.ip,
            equipo_ine: ip.equipo?.ine || null,
            rol: ip.equipo ? 'ENDPOINT' : 'UNKNOWN',
            estado_monitoreo: ip.estado === 'OCUPADA' ? 'ONLINE' : ip.estado === 'RESERVADA' ? 'WARNING' : 'OFFLINE',
            fabricante_actual: '',
            latencia_actual_ms: null,
        };
        setGraphedDevices(prev => [...prev, node]);
        setActiveTab('TOPOLOGY');
        showToast("Graficado", `${ip.ip} añadido al mapa.`, "success");
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
                            onClick={() => { setEditingRed(null); setNewRed({ nombre: '', segmento: '', mascara: '255.255.255.0', gateway: '', dns: '' }); setIsCreateRedOpen(true); }}
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
                                                        <button onClick={(e) => { e.stopPropagation(); setEditingRed(red); setNewRed({ nombre: red.nombre || '', segmento: red.segmento || '', mascara: red.mascara || '255.255.255.0', gateway: red.gateway || '', dns: red.dns || '' }); setIsCreateRedOpen(true); }}
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

                            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setActiveTab('SCANNER')}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                            activeTab === 'SCANNER'
                                                ? 'bg-white text-zinc-950 shadow-sm'
                                                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        Monitor & Escáner
                                    </button>
                                    <button
                                        onClick={() => setIsMapModalOpen(true)}
                                        className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-zinc-400 hover:text-white hover:bg-white/5"
                                    >
                                        Mapa de Red
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('GRID')}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                            activeTab === 'GRID'
                                                ? 'bg-white text-zinc-950 shadow-sm'
                                                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        Mapeo IPAM
                                    </button>
                                </div>
                            </div>

                            {activeTab === 'SCANNER' && (
                                <ScannerTable
                                    nodes={dispositivos}
                                    isScanning={isScanning}
                                    scanProgress={scanProgress}
                                    onStartScan={handleStartScan}
                                    onRename={handleRename}
                                    onPing={handleScannerPing}
                                    onTracert={handleTracert}
                                    onGraph={handleGraphScanner}
                                />
                            )}

                            {isMapModalOpen && createPortal(
                                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setIsMapModalOpen(false)}>
                                    <div onClick={e => e.stopPropagation()} className="bg-zinc-950 border border-zinc-800 rounded-2xl w-[92vw] max-w-6xl h-[82vh] flex flex-col overflow-hidden shadow-2xl">
                                        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between shrink-0">
                                            <h3 className="text-sm font-bold text-white">Mapa de Red — {selectedRed?.segmento || ''} <span className="text-zinc-500 font-normal ml-2">{graphedDevices.length} nodos • {graphLinks.length} vínculos</span></h3>
                                            <button onClick={() => setIsMapModalOpen(false)} className="w-8 h-8 grid place-items-center rounded-xl hover:bg-white/5 text-zinc-400"><X className="w-4 h-4" /></button>
                                        </div>
                                        <div className="flex-1 min-h-[520px] overflow-hidden flex flex-col relative">
                                            <TopologyMap
                                                nodes={graphedDevices}
                                                gatewayIp={selectedRed?.gateway}
                                                links={graphLinks}
                                                linkingFrom={linkingFrom}
                                                draggable
                                                compactCards
                                                noChrome
                                                positions={graphPositions}
                                                onPositionChange={(ip, pos) => setGraphPositions(prev => ({ ...prev, [ip]: pos }))}
                                                onSelectNode={(node) => {
                                                    if (!linkingFrom) return;
                                                    if (linkingFrom === node.ip) { setLinkingFrom(null); return; }
                                                    const exists = graphLinks.some(l => (l.from === linkingFrom && l.to === node.ip) || (l.from === node.ip && l.to === linkingFrom));
                                                    if (!exists) setGraphLinks(prev => [...prev, { from: linkingFrom, to: node.ip }]);
                                                    setLinkingFrom(null);
                                                }}
                                                onRemove={(ip) => { setGraphedDevices(prev => prev.filter(n => n.ip !== ip)); setGraphLinks(prev => prev.filter(l => l.from !== ip && l.to !== ip)); setGraphPositions(prev => { const c = { ...prev }; delete c[ip]; return c; }); }}
                                                onChangeIcon={(ip, rol) => setGraphedDevices(prev => prev.map(n => n.ip === ip ? { ...n, rol } : n))}
                                                onStartLink={(ip) => setLinkingFrom(prev => prev === ip ? null : ip)}
                                                onClearLinks={() => setGraphLinks([])}
                                                onUnlink={(a,b) => setGraphLinks(prev => prev.filter(l => !((l.from===a && l.to===b) || (l.from===b && l.to===a))))}
                                                onPing={handleScannerPing}
                                                onTracert={handleTracert}
                                            />
                                        </div>
                                    </div>
                                </div>,
                                document.body
                            )}

                            {activeTab === 'GRID' && (
                                <>
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

                                                        <div className="flex items-center gap-1.5 pt-2.5 border-t border-zinc-800 mt-1">
                                                            {ip.estado === 'OCUPADA' && <>
                                                                <button onClick={() => handleViewDetails(ip.equipo.id)} className="group/tooltip relative w-8 h-8 grid place-items-center rounded-lg bg-transparent text-zinc-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer shrink-0"><Eye className="w-4 h-4" /><span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap rounded-lg bg-zinc-800 border border-zinc-700 px-2 py-1 text-[11px] font-medium text-zinc-200 opacity-0 group-hover/tooltip:opacity-100 transition-opacity shadow-lg">Detalle</span></button>
                                                                <button onClick={() => { if (window.confirm(`¿Desvincular IP ${ip.ip} de ${ip.equipo.ine}?`)) handleUnlink(ip.ip, ip.equipo.id); }} className="group/tooltip relative w-8 h-8 grid place-items-center rounded-lg bg-transparent text-zinc-500 hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer shrink-0"><Trash2 className="w-4 h-4" /><span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap rounded-lg bg-zinc-800 border border-zinc-700 px-2 py-1 text-[11px] font-medium text-zinc-200 opacity-0 group-hover/tooltip:opacity-100 transition-opacity shadow-lg">Desvincular</span></button>
                                                            </>}
                                                            {ip.estado === 'LIBRE' && <>
                                                                <button onClick={() => { setReservingIp(ip.ip); setIsReserveModalOpen(true); }} className="group/tooltip relative w-8 h-8 grid place-items-center rounded-lg bg-transparent text-zinc-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer shrink-0"><Lock className="w-4 h-4" /><span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap rounded-lg bg-zinc-800 border border-zinc-700 px-2 py-1 text-[11px] font-medium text-zinc-200 opacity-0 group-hover/tooltip:opacity-100 transition-opacity shadow-lg">Reservar</span></button>
                                                                <button onClick={() => { setAssigningIp(ip.ip); setIsAssignModalOpen(true); }} className="group/tooltip relative w-8 h-8 grid place-items-center rounded-lg bg-transparent text-zinc-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer shrink-0"><LinkIcon className="w-4 h-4" /><span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap rounded-lg bg-zinc-800 border border-zinc-700 px-2 py-1 text-[11px] font-medium text-zinc-200 opacity-0 group-hover/tooltip:opacity-100 transition-opacity shadow-lg">Vincular</span></button>
                                                            </>}
                                                            {ip.estado === 'RESERVADA' && <>
                                                                <button onClick={() => handleRelease(ip.ip)} className="group/tooltip relative w-8 h-8 grid place-items-center rounded-lg bg-transparent text-zinc-500 hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer shrink-0"><Unlock className="w-4 h-4" /><span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap rounded-lg bg-zinc-800 border border-zinc-700 px-2 py-1 text-[11px] font-medium text-zinc-200 opacity-0 group-hover/tooltip:opacity-100 transition-opacity shadow-lg">Liberar</span></button>
                                                                <button onClick={() => { setAssigningIp(ip.ip); setIsAssignModalOpen(true); }} className="group/tooltip relative w-8 h-8 grid place-items-center rounded-lg bg-transparent text-zinc-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer shrink-0"><LinkIcon className="w-4 h-4" /><span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap rounded-lg bg-zinc-800 border border-zinc-700 px-2 py-1 text-[11px] font-medium text-zinc-200 opacity-0 group-hover/tooltip:opacity-100 transition-opacity shadow-lg">Vincular</span></button>
                                                            </>}
                                                            <button onClick={() => handlePing(ip.ip)} disabled={pingingIp === ip.ip} className="group/tooltip relative w-8 h-8 grid place-items-center rounded-lg bg-transparent text-zinc-500 hover:text-emerald-400 hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50 shrink-0">
                                                                {pingResults[ip.ip] !== undefined && <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-zinc-900 ${pingResults[ip.ip] ? 'bg-emerald-500' : 'bg-red-500'}`} />}
                                                                <Activity className={`w-4 h-4 ${pingingIp === ip.ip ? 'animate-pulse' : ''}`} />
                                                                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap rounded-lg bg-zinc-800 border border-zinc-700 px-2 py-1 text-[11px] font-medium text-zinc-200 opacity-0 group-hover/tooltip:opacity-100 transition-opacity shadow-lg">Probar conexión</span>
                                                            </button>
                                                            <button onClick={() => handleGraph(ip)} className={`group/tooltip relative w-8 h-8 grid place-items-center rounded-lg transition-colors cursor-pointer shrink-0 ${graphedDevices.some(g => g.ip === ip.ip) ? 'bg-white text-zinc-900' : 'bg-transparent text-zinc-500 hover:text-white hover:bg-white/5'}`}>
                                                                <Network className="w-4 h-4" />
                                                                <span className={`pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap rounded-lg border px-2 py-1 text-[11px] font-medium opacity-0 group-hover/tooltip:opacity-100 transition-opacity shadow-lg ${graphedDevices.some(g => g.ip === ip.ip) ? 'bg-zinc-900 border-zinc-700 text-zinc-200' : 'bg-zinc-800 border-zinc-700 text-zinc-200'}`}>{graphedDevices.some(g => g.ip === ip.ip) ? 'Quitar' : 'Graficar'}</span>
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
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
                        <div><label className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 block mb-1">DNS</label><input value={newRed.dns} onChange={e => setNewRed(p => ({ ...p, dns: e.target.value }))} placeholder="8.8.8.8, 1.1.1.1" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700" /></div>
                    </div>
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
            {isPingOpen && createPortal(
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={closePing}>
                    <div onClick={e => e.stopPropagation()} className="bg-black border border-zinc-700 rounded-lg w-full max-w-2xl h-[420px] flex flex-col overflow-hidden shadow-2xl">
                        <div className="px-3 py-2 bg-zinc-800 border-b border-zinc-700 flex items-center justify-between select-none shrink-0">
                            <span className="text-xs font-medium text-zinc-300">Ventana de comandos</span>
                            <button onClick={closePing} className="w-7 h-7 grid place-items-center rounded hover:bg-white/10 text-zinc-400 hover:text-white"><X className="w-3.5 h-3.5" /></button>
                        </div>
                        <pre ref={el => { if (el) el.scrollTop = el.scrollHeight; }} className="p-4 text-[12px] font-mono leading-5 text-zinc-100 bg-black overflow-y-auto whitespace-pre-wrap flex-1 min-h-0 custom-scrollbar">{pingOutput || 'Sin salida'}</pre>
                    </div>
                </div>,
                document.body
            )}
            {isTracertOpen && createPortal(
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setIsTracertOpen(false)}>
                    <div onClick={e => e.stopPropagation()} className="bg-black border border-zinc-700 rounded-lg w-full max-w-2xl h-[420px] flex flex-col overflow-hidden shadow-2xl">
                        <div className="px-3 py-2 bg-zinc-800 border-b border-zinc-700 flex items-center justify-between select-none shrink-0">
                            <span className="text-xs font-medium text-zinc-300">Ventana de comandos</span>
                            <button onClick={() => setIsTracertOpen(false)} className="w-7 h-7 grid place-items-center rounded hover:bg-white/10 text-zinc-400 hover:text-white"><X className="w-3.5 h-3.5" /></button>
                        </div>
                        <pre className="p-4 text-[12px] font-mono leading-5 text-zinc-100 bg-black overflow-y-auto whitespace-pre-wrap flex-1 min-h-0 custom-scrollbar">{tracertOutput || 'Sin salida'}</pre>
                    </div>
                </div>,
                document.body
            )}

            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>{showScrollTop && <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} onClick={handleScrollToTop} className="fixed bottom-6 left-1/2 -translate-x-1/2 md:left-[280px] md:translate-x-0 z-50 w-9 h-9 grid place-items-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white shadow-xl cursor-pointer"><ChevronUp className="w-5 h-5" /></motion.button>}</AnimatePresence>, document.body
            )}
        </div>
    );
};
export default IPAM;
