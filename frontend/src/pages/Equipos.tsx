import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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

/* ─── Spring ─── */
const spring = { type: 'spring' as const, stiffness: 400, damping: 30 };
const fadeUp = { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: spring } };

/* ─── Equipo Item ─── */
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
  >
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
        <Tag className="w-3 h-3 text-indigo-400/60 shrink-0" />
        <span className="truncate">{eq.tipo || 'Sin Tipo'}</span>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
        <User className="w-3 h-3 text-indigo-400/60 shrink-0" />
        <span className="truncate font-medium">{eq.responsable || 'Sin Responsable'}</span>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
        <MapPin className="w-3 h-3 text-indigo-400/60 shrink-0" />
        <span className="truncate">{eq.ubicacion || 'Sin Ubicación'}</span>
      </div>
    </div>

    {userRole === ROLES.ADMIN && (
      <div className="mt-2 pt-2 border-t border-white/[0.04]">
        <button
          onClick={(e) => { e.stopPropagation(); onLoan(eq); }}
          className="w-full bg-indigo-600/[0.08] hover:bg-indigo-600/15 text-indigo-400 py-2 rounded-lg font-bold text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 group border border-indigo-500/10 cursor-pointer"
        >
          <Calendar className="w-3 h-3 transition-transform group-hover:scale-110" />
          Prestar
        </button>
      </div>
    )}
  </CommonCard>
);

/* ─── Equipos Page ─── */
const Equipos = () => {
  const { showToast } = useToast();
  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [gruposComodidad, setGruposComodidad] = useState([]);
  const [grados, setGrados] = useState([]);
  const [estados, setEstados] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);

  const [filterEstado, setFilterEstado] = useState("TODOS");
  const [filterUbicacion, setFilterUbicacion] = useState("TODAS");
  const [filterGrupo, setFilterGrupo] = useState("TODOS");
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [selectedEquipo, setSelectedEquipo] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [equipoToDelete, setEquipoToDelete] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [equipoForLoan, setEquipoForLoan] = useState(null);
  const [fetchedOnce, setFetchedOnce] = useState(false);

  const userData = JSON.parse(localStorage.getItem("equipos_user_data") || "{}");
  const userRole = (userData.rol || ROLES.USER).toUpperCase();

  const hasActiveFilters = filterEstado !== "TODOS" || filterUbicacion !== "TODAS" || filterGrupo !== "TODOS";

  const clearFilters = () => {
    setSearch("");
    setFilterEstado("TODOS");
    setFilterUbicacion("TODAS");
    setFilterGrupo("TODOS");
  };

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchConfig = async () => {
    try {
      const [ueData, gcData, sData, uData] = await Promise.all([
        apiRequest('/config/grados').catch(() => []),
        apiRequest('/config/grupos-comodidad').catch(() => []),
        apiRequest('/config/estados').catch(() => []),
        apiRequest('/config/ubicaciones').catch(() => [])
      ]);
      setGrados(ueData);
      setGruposComodidad(gcData);
      setEstados(sData);
      setUbicaciones(uData);
    } catch { /* non-critical */ }
  };

  const fetchData = async (searchTerm = "", estadoFilter = "TODOS", ubicacionFilter = "TODAS", categoriaFilter = "TODOS", pageNum = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.set('q', searchTerm);
      if (estadoFilter !== "TODOS") params.set('estado', estadoFilter);
      if (ubicacionFilter !== "TODAS") params.set('ubicacion', ubicacionFilter);
      if (categoriaFilter !== "TODOS") params.set('categoria', categoriaFilter);
      params.set('page', String(pageNum));
      params.set('limit', '50');
      const eData = await apiRequest(`/equipos?${params.toString()}`);
      setEquipos(eData?.data || eData || []);
      setTotal(eData?.pagination?.total || 0);
      setTotalPages(eData?.pagination?.totalPages || 0);
      setCurrentPage(eData?.pagination?.page || 1);
    } catch {
      showToast("Error", "No se pudieron cargar los datos del inventario.", "error");
    } finally {
      setLoading(false);
      setFetchedOnce(true);
    }
  };

  useEffect(() => { fetchConfig(); }, []);

  useEffect(() => {
    if (!search && !fetchedOnce) return;
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      fetchData(search, filterEstado, filterUbicacion, filterGrupo, 1);
    }, 400);
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current); };
  }, [search]);

  useEffect(() => {
    if (!hasActiveFilters && !fetchedOnce) return;
    fetchData(search, filterEstado, filterUbicacion, filterGrupo, 1);
  }, [filterEstado, filterUbicacion, filterGrupo]);

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const toggleAll = () => {
    const currentFilteredIds = filtered.map(e => e.id);
    const allSelected = currentFilteredIds.every(id => selectedIds.includes(id));
    setSelectedIds(prev => allSelected ? prev.filter(id => !currentFilteredIds.includes(id)) : [...new Set([...prev, ...currentFilteredIds])]);
  };

  const goToPage = (pageNum) => {
    if (pageNum < 1 || pageNum > totalPages) return;
    fetchData(search, filterEstado, filterUbicacion, filterGrupo, pageNum);
  };

  const handleBulkDelete = async () => {
    try {
      setIsProcessingBulk(true);
      await apiRequest('/equipos/bulk', { method: 'DELETE', body: { ids: selectedIds } });
      setEquipos(prev => prev.filter(e => !selectedIds.includes(e.id)));
      showToast("Operación Exitosa", `${selectedIds.length} equipos han sido movidos a la papelera.`, "success");
      setSelectedIds([]);
      setIsBulkDeleteOpen(false);
      fetchData(search, filterEstado, filterUbicacion, filterGrupo, currentPage);
    } catch {
      showToast("Error", "No se pudieron eliminar los equipos seleccionados.", "error");
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const getStatusColor = (estadoNombre) => {
    const estadoConfig = estados.find(e => e.nombre.toLowerCase() === (estadoNombre || '').toLowerCase());
    if (estadoConfig?.color_hex) return estadoConfig.color_hex;
    const st = (estadoNombre || '').toLowerCase();
    if (st.includes('fuera de servicio') || st.includes('malo') || st.includes('reparación') || st === 'f/s') return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    if (st.includes('en servicio') || st.includes('operativo') || st.includes('bueno') || st === 'e/s') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (st.includes('prestamo') || st.includes('préstamo')) return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  };

  const filtered = equipos;

  return (
    <div className="flex flex-col gap-3 w-full overflow-x-hidden">

      {/* ─── Search Bar Row ─── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar NNE, Serie..."
          />
        </div>
        {userRole === ROLES.ADMIN && (
          <button
            onClick={() => { setFormData({}); setIsFormOpen(true); }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white w-11 h-11 rounded-xl font-bold shadow-[0_0_16px_rgba(79,70,229,0.25)] transition-all flex items-center justify-center cursor-pointer shrink-0"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="bg-white/[0.04] hover:bg-white/[0.08] text-white w-11 h-11 border border-white/[0.06] rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer"
        >
          <Sliders className="w-4 h-4 text-indigo-400" />
        </button>
      </motion.div>

      {/* ─── Active Filter Chips ─── */}
      {hasActiveFilters && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2 flex-wrap">
          {filterEstado !== "TODOS" && (
            <button onClick={() => setFilterEstado("TODOS")} className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:bg-indigo-500/20 transition-all">
              {filterEstado} <X className="w-3 h-3" />
            </button>
          )}
          {filterUbicacion !== "TODAS" && (
            <button onClick={() => setFilterUbicacion("TODAS")} className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:bg-indigo-500/20 transition-all">
              {filterUbicacion} <X className="w-3 h-3" />
            </button>
          )}
          {filterGrupo !== "TODOS" && (
            <button onClick={() => setFilterGrupo("TODOS")} className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:bg-indigo-500/20 transition-all">
              {filterGrupo} <X className="w-3 h-3" />
            </button>
          )}
          <button onClick={clearFilters} className="text-[10px] font-bold text-rose-400 uppercase tracking-wider hover:text-rose-300 transition-colors cursor-pointer ml-1">
            Limpiar
          </button>
        </motion.div>
      )}

      {/* ─── Content ─── */}
      {!fetchedOnce ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 bg-white/[0.03] rounded-2xl border border-dashed border-white/[0.06]">
          <Search className="w-10 h-10 text-slate-500 mb-3 opacity-20" />
          <h3 className="text-lg font-bold text-white">Busca un equipo</h3>
          <p className="text-slate-400 text-xs mt-1 text-center max-w-xs">Usa la búsqueda o filtros para encontrar equipos.</p>
        </motion.div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white/[0.03] border border-white/[0.04] rounded-2xl h-36 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 bg-white/[0.03] rounded-2xl border border-dashed border-white/[0.06]">
          <Server className="w-10 h-10 text-slate-500 mb-3 opacity-20" />
          <h3 className="text-lg font-bold text-white">Sin resultados</h3>
          <p className="text-slate-400 text-xs mt-1">Prueba con otros filtros.</p>
          <button onClick={clearFilters} className="mt-4 text-indigo-400 font-bold text-[10px] uppercase tracking-widest hover:text-white transition-colors cursor-pointer">
            Restablecer
          </button>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Results Header */}
          <div className="flex items-center gap-3 px-1">
            <div className="h-px bg-white/[0.06] flex-1" />
            <div className="flex items-center gap-3">
              {userRole === ROLES.ADMIN && (
                <button onClick={toggleAll}
                  className="flex items-center gap-1.5 text-[9px] font-bold text-indigo-400 uppercase tracking-widest hover:text-white transition-colors cursor-pointer group">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                    filtered.every(e => selectedIds.includes(e.id)) ? 'bg-indigo-600 border-indigo-500' : 'border-white/20 group-hover:border-indigo-500/50'
                  }`}>
                    {filtered.every(e => selectedIds.includes(e.id)) && <Check className="w-3 h-3 text-white" />}
                  </div>
                  Todo
                </button>
              )}
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                <span className="text-indigo-400">{total}</span> res
                {totalPages > 1 && <> · Pág. <span className="text-indigo-400">{currentPage}</span>/{totalPages}</>}
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}
                    className="p-1.5 rounded-lg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-white/5 hover:bg-white/10 text-slate-400">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages}
                    className="p-1.5 rounded-lg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-white/5 hover:bg-white/10 text-slate-400">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
            <div className="h-px bg-white/[0.06] flex-1" />
          </div>

          {/* Cards Grid */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            <AnimatePresence mode="popLayout">
              {filtered.map(eq => (
                <EquipoItem
                  key={eq.id}
                  eq={eq}
                  getStatusColor={getStatusColor}
                  setSelectedEquipo={setSelectedEquipo}
                  setFormData={setFormData}
                  setIsFormOpen={setIsFormOpen}
                  setEquipoToDelete={setEquipoToDelete}
                  setIsDeleteOpen={setIsDeleteOpen}
                  onLoan={(equipo) => { setEquipoForLoan(equipo); setIsLoanModalOpen(true); }}
                  userRole={userRole}
                  isSelected={selectedIds.includes(eq.id)}
                  onToggleSelect={toggleSelect}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      )}

      {/* ─── Floating Bulk Action Bar ─── */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md">
            <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.5)] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 px-1">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-[0_0_16px_rgba(79,70,229,0.3)]">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">{selectedIds.length}选</h4>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Acciones masivas</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedIds([])}
                  className="px-3 py-2 text-slate-400 hover:text-white font-bold text-[9px] uppercase tracking-widest transition-colors cursor-pointer">
                  Cancelar
                </button>
                <button onClick={() => setIsBulkDeleteOpen(true)}
                  className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl font-bold text-[9px] uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />
                  Eliminar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={isBulkDeleteOpen}
        title="¿Eliminar Selección?"
        message={`Mover ${selectedIds.length} equipos a la papelera.`}
        onConfirm={handleBulkDelete}
        onClose={() => setIsBulkDeleteOpen(false)}
        type="danger"
        isLoading={isProcessingBulk}
      />

      <EquipoDetalleModal
        isOpen={!!selectedEquipo}
        equipo={selectedEquipo}
        estados={estados}
        onClose={() => setSelectedEquipo(null)}
        onEquipoUpdated={() => fetchData(search, filterEstado, filterUbicacion, filterGrupo, currentPage)}
      />

      <EquipoFormModal
        isOpen={isFormOpen}
        initialData={formData}
        onClose={() => setIsFormOpen(false)}
        onSave={async (data: Record<string, any>) => {
          try {
            const id = data.id || formData.id;
            await apiRequest('/equipos', {
              method: 'POST',
              body: { ...data, id, responsable_id: data.responsable_id || formData.responsable_id }
            });
            setIsFormOpen(false);
            fetchData(search, filterEstado, filterUbicacion, filterGrupo, currentPage);
            showToast(id ? 'Equipo Actualizado' : 'Equipo Guardado',
              id ? `Cambios en "${data.ine}" guardados.` : `"${data.ine}" registrado.`, 'success');
          } catch (err) {
            showToast("Error", err.message || "No se pudo guardar.", "error");
          }
        }}
        grados={grados}
        gruposComodidad={gruposComodidad}
        estados={estados}
        ubicaciones={ubicaciones}
      />

      <LoanModal
        isOpen={isLoanModalOpen}
        equipo={equipoForLoan}
        onClose={() => { setIsLoanModalOpen(false); setEquipoForLoan(null); }}
        onConfirm={async (loanData) => {
          try {
            await apiRequest('/prestamos', { method: 'POST', body: JSON.stringify({ ...loanData, equipo_id: equipoForLoan.id }) });
            setIsLoanModalOpen(false);
            setEquipoForLoan(null);
            fetchData(search, filterEstado, filterUbicacion, filterGrupo, currentPage);
            showToast("Préstamo Registrado", `"${equipoForLoan?.ine}" prestado.`, "success");
          } catch {
            showToast("Error", "No se pudo registrar el préstamo.", "error");
          }
        }}
      />

      <ConfirmModal
        isOpen={isDeleteOpen}
        title="¿Mover a la Papelera?"
        message={`Eliminar "${equipoToDelete?.ine}".`}
        onConfirm={async () => {
          try {
            await apiRequest(`/equipos/${equipoToDelete.id}`, { method: 'DELETE' });
            setEquipos(prev => prev.filter(e => e.id !== equipoToDelete.id));
            setIsDeleteOpen(false);
            setEquipoToDelete(null);
            fetchData(search, filterEstado, filterUbicacion, filterGrupo, currentPage);
            showToast("Eliminado", "Movido a la papelera.", "success");
          } catch {
            showToast("Error", "No se pudo eliminar.", "error");
          }
        }}
        onClose={() => { setIsDeleteOpen(false); setEquipoToDelete(null); }}
        type="danger"
      />

      {/* ─── Mobile Filter Modal ─── */}
      {createPortal(
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] pointer-events-auto" />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={spring}
                className="fixed inset-x-3 bottom-20 max-w-lg mx-auto bg-slate-900/95 backdrop-blur-xl border border-white/10 z-[1001] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.5)] flex flex-col gap-5 rounded-2xl pointer-events-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center border border-indigo-500/20">
                      <Filter className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white">Filtros</h2>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Ajustar</p>
                    </div>
                  </div>
                  <button onClick={() => setIsSidebarOpen(false)}
                    className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-all cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 overflow-y-auto max-h-[50vh] pr-1 custom-scrollbar">
                  <Select label="Estado" icon={Info} value={filterEstado}
                    onChange={(e) => setFilterEstado(e.target.value)}
                    options={[{ value: "TODOS", label: "Todos" }, ...estados.map(e => ({ value: e.nombre, label: e.nombre }))]} />
                  <Select label="Ubicación" icon={MapPin} value={filterUbicacion}
                    onChange={(e) => setFilterUbicacion(e.target.value)}
                    options={[{ value: "TODAS", label: "Todas" }, ...ubicaciones.map(u => ({ value: u.nombre, label: u.nombre }))]} />
                  <Select label="Categoría" icon={Tag} value={filterGrupo}
                    onChange={(e) => setFilterGrupo(e.target.value)}
                    options={[{ value: "TODOS", label: "Todas" }, ...gruposComodidad.map(c => ({ value: c.nombre, label: c.nombre }))]} />
                </div>

                <div className="pt-3 border-t border-white/[0.06] flex gap-2">
                  <button onClick={clearFilters}
                    className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all cursor-pointer">
                    Limpiar
                  </button>
                  <button onClick={() => setIsSidebarOpen(false)}
                    className="flex-[2] bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all cursor-pointer">
                    Ver Resultados
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default Equipos;
