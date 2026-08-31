import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { ROLES } from '../config/constants';
import { Server, User, MapPin, Tag, Info, Plus, Search, Sliders, X, Filter, Calendar, CheckSquare, Square, Trash2, CheckCircle, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../context/ToastContext';
import EquipoDetalleModal from '../components/equipos/EquipoDetalleModal';
import EquipoFormModal from '../components/equipos/EquipoFormModal';
import SearchInput from '../components/common/SearchInput';
import Select from '../components/common/Select';
import CommonCard from '../components/common/CommonCard';
import ConfirmModal from '../components/common/ConfirmModal';
import LoanModal from '../components/equipos/LoanModal';

const spring = { type: 'spring' as const, stiffness: 400, damping: 30 };

const EquipoItem = ({ eq, getStatusColor, setSelectedEquipo, setFormData, setIsFormOpen, setEquipoToDelete, setIsDeleteOpen, userRole, onLoan, isSelected, onToggleSelect }) => (
  <CommonCard
    layoutId={`eq-${eq.id}`}
    title={eq.ine || 'Sin INE'}
    badge={eq.estado}
    badgeColor={getStatusColor(eq.estado)}
    icon={Server}
    onView={() => setSelectedEquipo(eq)}
    onEdit={userRole === ROLES.ADMIN ? () => { setFormData(eq); setIsFormOpen(true); } : null}
    onDelete={userRole === ROLES.ADMIN ? () => { setEquipoToDelete(eq); setIsDeleteOpen(true); } : null}
    selectable={userRole === ROLES.ADMIN}
    isSelected={isSelected}
    onSelect={() => onToggleSelect(eq.id)}
    onLoan={userRole === ROLES.ADMIN ? () => onLoan(eq) : undefined}
  >
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-xs text-zinc-400"><Tag className="w-3 h-3 text-zinc-500 shrink-0" /><span className="truncate">{eq.tipo || 'Sin Tipo'}</span></div>
      <div className="flex items-center gap-1.5 text-xs text-zinc-300"><User className="w-3 h-3 text-zinc-500 shrink-0" /><span className="truncate font-medium">{eq.responsable || 'Sin Responsable'}</span></div>
      <div className="flex items-center gap-1.5 text-xs text-zinc-400"><MapPin className="w-3 h-3 text-zinc-500 shrink-0" /><span className="truncate">{eq.ubicacion || 'Sin Ubicación'}</span></div>
    </div>
  </CommonCard>
);

export default function Equipos() {
  const { showToast } = useToast();
  const [equipos, setEquipos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [gruposComodidad, setGruposComodidad] = useState<any[]>([]);
  const [grados, setGrados] = useState<any[]>([]);
  const [estados, setEstados] = useState<any[]>([]);
  const [ubicaciones, setUbicaciones] = useState<any[]>([]);
  const [filterEstado, setFilterEstado] = useState("TODOS");
  const [filterUbicacion, setFilterUbicacion] = useState("TODAS");
  const [filterGrupo, setFilterGrupo] = useState("TODOS");
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedEquipo, setSelectedEquipo] = useState<any>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [equipoToDelete, setEquipoToDelete] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [equipoForLoan, setEquipoForLoan] = useState<any>(null);
  const [fetchedOnce, setFetchedOnce] = useState(false);
  const [searchParams] = useSearchParams();
  const userData = JSON.parse(localStorage.getItem("equipos_user_data") || "{}");
  const userRole = (userData.rol || ROLES.USER).toUpperCase();
  const hasActiveFilters = filterEstado !== "TODOS" || filterUbicacion !== "TODAS" || filterGrupo !== "TODOS";
  const clearFilters = () => { setSearch(""); setFilterEstado("TODOS"); setFilterUbicacion("TODAS"); setFilterGrupo("TODOS"); };
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const fetchConfig = async () => {
    try {
      const [ueData, gcData, sData, uData] = await Promise.all([
        apiRequest('/config/grados').catch(() => []),
        apiRequest('/config/grupos-comodidad').catch(() => []),
        apiRequest('/config/estados').catch(() => []),
        apiRequest('/config/ubicaciones').catch(() => [])
      ]);
      setGrados(ueData); setGruposComodidad(gcData); setEstados(sData); setUbicaciones(uData);
    } catch {}
  };

  const fetchData = async (searchTerm = "", estadoFilter = "TODOS", ubicacionFilter = "TODAS", categoriaFilter = "TODOS", pageNum = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.set('q', searchTerm);
      if (estadoFilter !== "TODOS") params.set('estado', estadoFilter);
      if (ubicacionFilter !== "TODAS") params.set('ubicacion', ubicacionFilter);
      if (categoriaFilter !== "TODOS") params.set('categoria', categoriaFilter);
      params.set('page', String(pageNum)); params.set('limit', '50');
      const eData = await apiRequest(`/equipos?${params.toString()}`);
      setEquipos(eData?.data || eData || []);
      setTotal(eData?.pagination?.total || 0);
      setTotalPages(eData?.pagination?.totalPages || 0);
      setCurrentPage(eData?.pagination?.page || 1);
    } catch { showToast("Error", "No se pudieron cargar los datos.", "error"); }
    finally { setLoading(false); setFetchedOnce(true); }
  };

  useEffect(() => {
    const ub = searchParams.get('ubicacion');
    if (ub) setFilterUbicacion(ub);
  }, []);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (filterRef.current && !filterRef.current.contains(e.target as Node)) setIsSidebarOpen(false); };
    if (isSidebarOpen) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [isSidebarOpen]);
  useEffect(() => { fetchConfig(); }, []);
  useEffect(() => {
    if (!search && !fetchedOnce) return;
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => fetchData(search, filterEstado, filterUbicacion, filterGrupo, 1), 400);
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current); };
  }, [search]);
  useEffect(() => { if (!hasActiveFilters && !fetchedOnce) return; fetchData(search, filterEstado, filterUbicacion, filterGrupo, 1); }, [filterEstado, filterUbicacion, filterGrupo]);

  const toggleSelect = (id: number) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleAll = () => {
    const ids = equipos.map((e: any) => e.id);
    const all = ids.every((id: number) => selectedIds.includes(id));
    setSelectedIds(prev => all ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])]);
  };
  const goToPage = (p: number) => { if (p < 1 || p > totalPages) return; fetchData(search, filterEstado, filterUbicacion, filterGrupo, p); };
  const handleBulkDelete = async () => {
    try { setIsProcessingBulk(true); await apiRequest('/equipos/bulk', { method: 'DELETE', body: { ids: selectedIds } }); setEquipos(prev => prev.filter((e: any) => !selectedIds.includes(e.id))); showToast("Éxito", `${selectedIds.length} equipos eliminados.`, "success"); setSelectedIds([]); setIsBulkDeleteOpen(false); fetchData(search, filterEstado, filterUbicacion, filterGrupo, currentPage); }
    catch { showToast("Error", "No se pudieron eliminar.", "error"); } finally { setIsProcessingBulk(false); }
  };
  const getStatusColor = (n: string) => {
    const s = (n || '').toLowerCase().trim();
    if (s === 'e/s' || s.includes('en servicio') || s.includes('bueno')) return '#22c55e';
    if (s === 'f/s' || s.includes('fuera') || s.includes('malo')) return '#ef4444';
    if (s.includes('mant')) return '#eab308';
    if (s.includes('prest')) return '#f97316';
    const c: any = estados.find((e: any) => e.nombre.toLowerCase() === s);
    if (c?.color_hex) return c.color_hex;
    return '#71717a';
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-4 w-full max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="min-w-0 w-auto max-w-full"><SearchInput value={search} onChange={(e: any) => setSearch(e.target.value)} placeholder="Busca un equipo por cualquier característica..." /></div>
        <div className="flex gap-2 shrink-0">
          <div ref={filterRef} className="relative">
            <button onClick={() => setIsSidebarOpen(v => !v)} className={`inline-flex items-center justify-center gap-2 px-2 py-2.5 text-sm font-medium transition-colors ${isSidebarOpen ? 'text-white' : 'text-[#c4c5d9] hover:text-white'}`}>
              <Sliders className="w-4 h-4" /> Filtros {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
            </button>
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.div initial={{ opacity: 0, scale: 0.96, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: -6 }} transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }} className="absolute top-full left-0 mt-2.5 z-50 origin-top-left max-w-[calc(100vw-16px)]">
                  <div className="absolute -top-1 left-6 w-2 h-2 bg-[#27272A] border-l border-t border-zinc-700 rotate-45 shadow-sm" />
                  <div className="bg-[#27272A] border border-zinc-700 rounded-2xl p-3 shadow-2xl flex flex-col sm:flex-row gap-2 items-end min-w-[320px] sm:min-w-[520px] max-w-[calc(100vw-16px)]">
                    <div className="flex-1 min-w-[140px]"><Select label="Estado" icon={Info} value={filterEstado} onChange={(e: any) => setFilterEstado(e.target.value)} options={[{ value: "TODOS", label: "Todos" }, ...estados.map((e: any) => ({ value: e.nombre, label: e.nombre }))]} /></div>
                    <div className="flex-1 min-w-[140px]"><Select label="Ubicación" icon={MapPin} value={filterUbicacion} onChange={(e: any) => setFilterUbicacion(e.target.value)} options={[{ value: "TODAS", label: "Todas" }, ...ubicaciones.map((u: any) => ({ value: u.nombre, label: u.nombre }))]} /></div>
                    <div className="flex-1 min-w-[140px]"><Select label="Categoría" icon={Tag} value={filterGrupo} onChange={(e: any) => setFilterGrupo(e.target.value)} options={[{ value: "TODOS", label: "Todas" }, ...gruposComodidad.map((c: any) => ({ value: c.nombre, label: c.nombre }))]} /></div>
                    <div className="flex gap-1.5 shrink-0 pb-[1px]">
                      <button onClick={clearFilters} className="px-3 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-xs font-semibold hover:bg-zinc-700">Limpiar</button>
                      <button onClick={() => setIsSidebarOpen(false)} className="px-4 py-2.5 rounded-xl bg-white text-zinc-900 text-xs font-semibold hover:bg-zinc-100">Aplicar</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {userRole === ROLES.ADMIN && (
            <button onClick={() => { setFormData({}); setIsFormOpen(true); }} className="inline-flex items-center justify-center gap-2 px-2 py-2.5 text-sm font-semibold text-[#c4c5d9] hover:text-white transition-colors">
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Nuevo</span><span className="sm:hidden">Nuevo</span>
            </button>
          )}
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {filterEstado !== "TODOS" && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-xs">Estado: {filterEstado} <button onClick={() => setFilterEstado("TODOS")} className="ml-1 hover:text-white"><X className="w-3 h-3" /></button></span>}
          {filterUbicacion !== "TODAS" && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-xs">Ubicación: {filterUbicacion} <button onClick={() => setFilterUbicacion("TODAS")} className="ml-1"><X className="w-3 h-3" /></button></span>}
          {filterGrupo !== "TODOS" && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-xs">Grupo: {filterGrupo} <button onClick={() => setFilterGrupo("TODOS")} className="ml-1"><X className="w-3 h-3" /></button></span>}
          <button onClick={clearFilters} className="text-xs font-semibold text-zinc-400 hover:text-zinc-200">Limpiar todo</button>
        </div>
      )}

      {!fetchedOnce ? (
        <div className="flex-1 min-h-[calc(100vh-280px)] flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 rounded-xl">
          <Search className="w-8 h-8 text-zinc-600 mb-3" />
          <p className="font-semibold">Busca un equipo</p>
          <p className="text-sm text-zinc-500 mt-1">Usa búsqueda o filtros para empezar</p>
        </div>
      ) : loading ? (
        <div className="flex-1 min-h-[calc(100vh-280px)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 content-start overflow-y-auto custom-scrollbar pr-1">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-44 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse" />)}
        </div>
      ) : equipos.length === 0 ? (
        <div className="flex-1 min-h-[calc(100vh-280px)] flex flex-col items-center justify-center bg-zinc-900 border border-dashed border-zinc-800 rounded-xl">
          <Server className="w-8 h-8 text-zinc-600 mb-3" />
          <p className="font-semibold">Sin resultados</p>
          <p className="text-sm text-zinc-500">Prueba otros filtros</p>
          <button onClick={clearFilters} className="mt-4 text-sm font-semibold text-white underline">Limpiar filtros</button>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col space-y-3 overflow-hidden">
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <div className="h-px flex-1 bg-zinc-800" />
            <span className="flex items-center gap-3">
              {userRole === ROLES.ADMIN && (
                <button onClick={toggleAll} className="inline-flex items-center gap-1.5 font-semibold hover:text-zinc-300">
                  <span className={`w-4 h-4 rounded border grid place-items-center ${equipos.every((e: any) => selectedIds.includes(e.id)) ? 'bg-white border-white text-zinc-900' : 'border-zinc-700'}`}>
                    {equipos.every((e: any) => selectedIds.includes(e.id)) && <Check className="w-3 h-3" />}
                  </span> Seleccionar todo
                </button>
              )}
              <span>{total} resultados · Pág {currentPage}/{totalPages || 1}</span>
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
              {equipos.map((eq: any) => (
                <EquipoItem key={eq.id} eq={eq} getStatusColor={getStatusColor} setSelectedEquipo={setSelectedEquipo} setFormData={setFormData} setIsFormOpen={setIsFormOpen} setEquipoToDelete={setEquipoToDelete} setIsDeleteOpen={setIsDeleteOpen} userRole={userRole} onLoan={(e: any) => { setEquipoForLoan(e); setIsLoanModalOpen(true); }} isSelected={selectedIds.includes(eq.id)} onToggleSelect={toggleSelect} />
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-16px)] max-w-md">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex items-center justify-between shadow-xl">
            <span className="flex items-center gap-2 text-sm font-semibold"><span className="w-8 h-8 rounded-full bg-white text-zinc-900 grid place-items-center font-bold text-xs">{selectedIds.length}</span> seleccionados</span>
            <div className="flex gap-2">
              <button onClick={() => setSelectedIds([])} className="px-3 py-2 text-sm font-medium text-zinc-400">Cancelar</button>
              <button onClick={() => setIsBulkDeleteOpen(true)} className="px-4 py-2 rounded-full bg-red-600 text-white text-sm font-semibold inline-flex items-center gap-1.5"><Trash2 className="w-4 h-4" /> Eliminar</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal isOpen={isBulkDeleteOpen} title="Eliminar selección" message={`Mover ${selectedIds.length} equipos a papelera.`} onConfirm={handleBulkDelete} onClose={() => setIsBulkDeleteOpen(false)} type="danger" isLoading={isProcessingBulk} />
      <EquipoDetalleModal isOpen={!!selectedEquipo} equipo={selectedEquipo} estados={estados} onClose={() => setSelectedEquipo(null)} onEquipoUpdated={() => fetchData(search, filterEstado, filterUbicacion, filterGrupo, currentPage)} />
      <EquipoFormModal isOpen={isFormOpen} initialData={formData} onClose={() => setIsFormOpen(false)} onSave={async (data: any) => {
        try { const id = data.id || formData.id; await apiRequest('/equipos', { method: 'POST', body: { ...data, id, responsable_id: data.responsable_id || formData.responsable_id } }); setIsFormOpen(false); fetchData(search, filterEstado, filterUbicacion, filterGrupo, currentPage); showToast(id ? 'Actualizado' : 'Creado', `"${data.ine}" guardado.`, 'success'); }
        catch (err: any) { showToast("Error", err.message || "No se pudo guardar.", "error"); }
      }} grados={grados} gruposComodidad={gruposComodidad} estados={estados} ubicaciones={ubicaciones} />
      <LoanModal isOpen={isLoanModalOpen} equipo={equipoForLoan} onClose={() => { setIsLoanModalOpen(false); setEquipoForLoan(null); }} onConfirm={async (d: any) => {
        try { await apiRequest('/prestamos', { method: 'POST', body: JSON.stringify({ ...d, equipo_id: equipoForLoan.id }) }); setIsLoanModalOpen(false); setEquipoForLoan(null); fetchData(search, filterEstado, filterUbicacion, filterGrupo, currentPage); showToast("Préstamo", `"${equipoForLoan?.ine}" prestado.`, "success"); }
        catch { showToast("Error", "No se pudo prestar.", "error"); }
      }} />
      <ConfirmModal isOpen={isDeleteOpen} title="Mover a papelera" message={`Eliminar "${equipoToDelete?.ine}".`} onConfirm={async () => {
        try { await apiRequest(`/equipos/${equipoToDelete.id}`, { method: 'DELETE' }); setEquipos(prev => prev.filter((e: any) => e.id !== equipoToDelete.id)); setIsDeleteOpen(false); setEquipoToDelete(null); fetchData(search, filterEstado, filterUbicacion, filterGrupo, currentPage); showToast("Eliminado", "Movido a papelera.", "success"); }
        catch { showToast("Error", "No se pudo eliminar.", "error"); }
      }} onClose={() => { setIsDeleteOpen(false); setEquipoToDelete(null); }} type="danger" />


    </div>
  );
}
