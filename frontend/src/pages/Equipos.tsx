import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { apiRequest } from '../services/api';
import { ROLES } from '../config/constants';
import { Server, User, MapPin, Tag, Info, Plus, Search, Sliders, X, Filter, Calendar, CheckSquare, Square, Trash2, CheckCircle, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { matchesSearch } from '../utils/search';
import { useToast } from '../context/ToastContext';

import EquipoDetalleModal from '../components/equipos/EquipoDetalleModal';
import EquipoFormModal from '../components/equipos/EquipoFormModal';
import SearchInput from '../components/common/SearchInput';
import Select from '../components/common/Select';
import CommonCard from '../components/common/CommonCard';
import ConfirmModal from '../components/common/ConfirmModal';
import LoanModal from '../components/equipos/LoanModal';

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
       <div className="flex flex-col gap-3 min-h-[100px] mt-2">
          <div className="flex items-start gap-2 text-sm text-slate-400">
             <Tag className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
             <span className="break-words font-medium">{eq.tipo || 'Sin Tipo'}</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-400">
             <User className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
             <span className="break-words font-medium text-slate-300">{eq.responsable || 'Sin Responsable'}</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-400">
             <MapPin className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
             <span className="break-words font-medium">{eq.ubicacion || 'Sin Ubicación'}</span>
          </div>
       </div>
       
       {/* Loan Action */}
       {userRole === ROLES.ADMIN && (
         <div className="mt-4 pt-4 border-t border-white/5">
            <button 
               onClick={(e) => { e.stopPropagation(); onLoan(eq); }}
               className="w-full bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 group border border-indigo-500/10 cursor-pointer"
            >
               <Calendar className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
               Prestar Equipo
            </button>
         </div>
       )}
    </CommonCard>
);

const Equipos = () => {
  const { showToast } = useToast();
  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(true);
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
  
  const [selectedEquipo, setSelectedEquipo] = useState(null);

  // Estados para Borrado
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [equipoToDelete, setEquipoToDelete] = useState(null);

  // Estado para Sidebar de Filtros (Mobile)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Estados para Préstamos
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [equipoForLoan, setEquipoForLoan] = useState(null);

  const userData = JSON.parse(localStorage.getItem("equipos_user_data") || "{}");
  const userRole = (userData.rol || ROLES.USER).toUpperCase();

  const clearFilters = () => {
    setSearch("");
    setFilterEstado("TODOS");
    setFilterUbicacion("TODAS");
    setFilterGrupo("TODOS");
  };

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = async (searchTerm = "") => {
    try {
      setLoading(true);
      const query = searchTerm ? `/equipos?q=${encodeURIComponent(searchTerm)}` : '/equipos';
      const [eData, ueData, gcData, sData, uData] = await Promise.all([
        apiRequest(query),
        apiRequest('/config/grados').catch(() => []),
        apiRequest('/config/grupos-comodidad').catch(() => []),
        apiRequest('/config/estados').catch(() => []),
        apiRequest('/config/ubicaciones').catch(() => [])
      ]);
      setEquipos(eData?.data || eData || []);
      setGrados(ueData);
      setGruposComodidad(gcData);
      setEstados(sData);
      setUbicaciones(uData);
    } catch (error) {
      showToast("Error", "No se pudieron cargar los datos del inventario.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      fetchData(search);
    }, 400);
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
  }, [search]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    const currentFilteredIds = filtered.map(e => e.id);
    const allSelected = currentFilteredIds.every(id => selectedIds.includes(id));
    
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !currentFilteredIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...currentFilteredIds])]);
    }
  };

  const handleBulkDelete = async () => {
    try {
      setIsProcessingBulk(true);
      await apiRequest('/equipos/bulk', {
        method: 'DELETE',
        body: { ids: selectedIds }
      });
      // Actualización Optimista
      setEquipos(prev => prev.filter(e => !selectedIds.includes(e.id)));
      showToast("Operación Exitosa", `${selectedIds.length} equipos han sido movidos a la papelera.`, "success");
      setSelectedIds([]);
      setIsBulkDeleteOpen(false);
      fetchData(search);
    } catch (error) {
      showToast("Error", "No se pudieron eliminar los equipos seleccionados.", "error");
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const getStatusColor = (estadoNombre) => {
    // Buscar el color configurado en el backend
    const estadoConfig = estados.find(e => e.nombre.toLowerCase() === (estadoNombre || '').toLowerCase());
    if (estadoConfig?.color_hex) return estadoConfig.color_hex;

    // Fallbacks si no se encuentra o no tiene color
    const st = (estadoNombre || '').toLowerCase();
    if (st.includes('fuera de servicio') || st.includes('malo') || st.includes('reparación') || st === 'f/s') return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    if (st.includes('en servicio') || st.includes('operativo') || st.includes('bueno') || st === 'e/s') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (st.includes('prestamo') || st.includes('préstamo')) return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  };

  const filtered = equipos.filter(eq => {
    const matchSearch = matchesSearch(eq, search);
    const matchEstado = filterEstado === "TODOS" || eq.estado === filterEstado;
    const matchUbicacion = filterUbicacion === "TODAS" || eq.ubicacion === filterUbicacion;
    const matchGrupo = filterGrupo === "TODOS" || eq.tipo === filterGrupo;
    return matchSearch && matchEstado && matchUbicacion && matchGrupo;
  });

  return (
    <div className="space-y-6">
      {/* Header, Search and Filters Row */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-start gap-4">
        
        <div className="w-full lg:w-auto shrink-0">
          <div className="flex items-center gap-2 w-full">
            <div className="flex-1 min-w-0">
              <SearchInput 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar NNE, Serie..."
              />
            </div>

            {/* Botón Nuevo Equipo (al lado del input en móvil) */}
            {userRole === ROLES.ADMIN && (
              <button 
                onClick={() => { setFormData({}); setIsFormOpen(true); }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white p-2.5 sm:px-5 sm:py-2.5 rounded-xl font-bold shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                 <Plus className="w-5 h-5 shrink-0" /> 
                 <span className="hidden sm:inline">Nuevo Equipo</span>
              </button>
            )}

            {/* Mobile Filter Trigger (shown together with Search on small screens) */}
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden bg-white/5 hover:bg-white/10 text-white p-2.5 border border-white/10 rounded-xl transition-all shrink-0 cursor-pointer"
            >
              <Sliders className="w-5 h-5 text-indigo-400" />
            </button>
          </div>
        </div>

        {/* Right Side: Desktop Filters */}
        <div className="hidden lg:flex flex-wrap lg:flex-nowrap items-end gap-3 lg:justify-end">
          
          {/* Desktop Filters */}
          <div className="hidden lg:flex flex-col gap-1.5 ml-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap shrink-0 ml-1">Filtrar por:</span>
            
            <div className="flex items-center gap-2">
              <Select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                icon={Info}
                className="min-w-[140px]"
                options={[
                  { value: "TODOS", label: "Estado" },
                  ...estados.map(e => ({ value: e.nombre, label: e.nombre }))
                ]}
              />

              <Select
                value={filterUbicacion}
                onChange={(e) => setFilterUbicacion(e.target.value)}
                icon={MapPin}
                className="min-w-[140px]"
                options={[
                  { value: "TODAS", label: "Ubicación" },
                  ...ubicaciones.map(u => ({ value: u.nombre, label: u.nombre }))
                ]}
              />

              <Select
                value={filterGrupo}
                onChange={(e) => setFilterGrupo(e.target.value)}
                icon={Tag}
                className="min-w-[140px]"
                options={[
                  { value: "TODOS", label: "Categoría" },
                  ...gruposComodidad.map(c => ({ value: c.nombre, label: c.nombre }))
                ]}
              />

              {(filterEstado !== "TODOS" || filterUbicacion !== "TODAS" || filterGrupo !== "TODOS" || search !== "") && (
                <button 
                  onClick={clearFilters}
                  className="p-3 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all tooltip shrink-0 cursor-pointer mt-auto"
                  title="Limpiar filtros"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>



      {/* Grid de Equipos */}
      <div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white/5 rounded-3xl h-52 animate-pulse border border-white/5"></div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 bg-white/5 rounded-[3rem] border border-dashed border-white/10"
          >
            <Server className="w-12 h-12 text-slate-500 mb-4 opacity-20" />
            <h3 className="text-xl font-black text-white">No se encontraron equipos</h3>
            <p className="text-slate-400 mt-2">Prueba con otros filtros o términos de búsqueda.</p>
            <button
               onClick={clearFilters}
               className="mt-6 text-indigo-400 font-black text-xs uppercase tracking-widest hover:text-white transition-colors cursor-pointer"
            >
               Restablecer filtros
            </button>
          </motion.div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-3 px-2">
               <div className="h-px bg-white/10 flex-1"></div>
               <div className="flex items-center gap-6">
                  {userRole === ROLES.ADMIN && filtered.length > 0 && (
                    <button 
                      onClick={toggleAll}
                      className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-white transition-colors cursor-pointer group"
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                        filtered.every(e => selectedIds.includes(e.id)) 
                          ? 'bg-indigo-600 border-indigo-500' 
                          : 'border-white/20 group-hover:border-indigo-500/50'
                      }`}>
                         {filtered.every(e => selectedIds.includes(e.id)) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      Seleccionar Todo
                    </button>
                  )}
                  <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                     Resultados: <span className="text-indigo-400">{filtered.length}</span>
                  </h2>
               </div>
               <div className="h-px bg-white/10 flex-1"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                    onLoan={(equipo) => {
                       setEquipoForLoan(equipo);
                       setIsLoanModalOpen(true);
                    }}
                    userRole={userRole}
                    isSelected={selectedIds.includes(eq.id)}
                    onToggleSelect={toggleSelect}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* Floating Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-2xl"
          >
            <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 px-2">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.4)]">
                   <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                   <h4 className="text-white font-black text-sm">{selectedIds.length} seleccionados</h4>
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Acciones masivas disponibles</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedIds([])}
                  className="px-4 py-2.5 text-slate-400 hover:text-white font-black text-[10px] uppercase tracking-widest transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setIsBulkDeleteOpen(true)}
                  className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-rose-600/20 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar Selección
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={isBulkDeleteOpen}
        title="¿Eliminar Selección?"
        message={`Estás a punto de mover ${selectedIds.length} equipos a la papelera. Esta acción se puede deshacer desde la papelera de reciclaje.`}
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
        onEquipoUpdated={fetchData}
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
            fetchData(search);
            showToast(
              id ? 'Equipo Actualizado' : 'Equipo Guardado',
              id 
                ? `Los cambios en el equipo "${data.ine}" han sido guardados exitosamente.` 
                : `El equipo "${data.ine}" ha sido registrado correctamente.`,
              'success'
            );
          } catch (err) {
            console.error("[Equipos] Error guardando equipo:", err);
            showToast("Error", err.message || "No se pudo guardar el equipo.", "error");
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
        onClose={() => {
            setIsLoanModalOpen(false);
           setEquipoForLoan(null);
        }}
        onConfirm={async (loanData) => {
           try {
              await apiRequest('/prestamos', {
                 method: 'POST',
                 body: JSON.stringify({
                    ...loanData,
                    equipo_id: equipoForLoan.id
                 })
              });
               setIsLoanModalOpen(false);
               setEquipoForLoan(null);
               fetchData(search);
              showToast("Préstamo Registrado", `El equipo "${equipoForLoan?.ine}" ha sido prestado correctamente.`, "success");
           } catch (error) {
              showToast("Error", "No se pudo registrar el préstamo.", "error");
           }
        }}
      />

      <ConfirmModal
        isOpen={isDeleteOpen}
        title="¿Mover a la Papelera?"
        message={`¿Estás seguro de que deseas eliminar el equipo "${equipoToDelete?.ine}"? El equipo se moverá a la papelera.`}
        onConfirm={async () => {
          try {
            await apiRequest(`/equipos/${equipoToDelete.id}`, { method: 'DELETE' });
            // Actualización Optimista
            setEquipos(prev => prev.filter(e => e.id !== equipoToDelete.id));
            setIsDeleteOpen(false);
            setEquipoToDelete(null);
            fetchData(search);
            showToast("Equipo Eliminado", "El registro ha sido movido a la papelera.", "success");
          } catch (err) {
            showToast("Error", "No se pudo eliminar el equipo.", "error");
          }
        }}
        onClose={() => {
          setIsDeleteOpen(false);
          setEquipoToDelete(null);
        }}
        type="danger"
      />

      {/* Mobile Filter Modal (Compact Floating) - Rendered via Portal to avoid stacking context issues */}
      {createPortal(
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] md:hidden pointer-events-auto"
              />
              <motion.div 
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-x-4 bottom-24 max-w-lg mx-auto bg-slate-900 border border-white/10 z-[1001] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col gap-6 md:hidden rounded-[2.5rem] pointer-events-auto"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center">
                      <Filter className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-white">Filtros</h2>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ajustar resultados</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-all cursor-pointer"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
                  <div className="grid grid-cols-1 gap-4">
                    <Select
                      label="Estado del Equipo"
                      icon={Info}
                      value={filterEstado}
                      onChange={(e) => setFilterEstado(e.target.value)}
                      options={[
                        { value: "TODOS", label: "Todos los Estados" },
                        ...estados.map(e => ({ value: e.nombre, label: e.nombre }))
                      ]}
                    />

                    <Select
                      label="Ubicación"
                      icon={MapPin}
                      value={filterUbicacion}
                      onChange={(e) => setFilterUbicacion(e.target.value)}
                      options={[
                        { value: "TODAS", label: "Todas las Ubicaciones" },
                        ...ubicaciones.map(u => ({ value: u.nombre, label: u.nombre }))
                      ]}
                    />

                    <Select
                      label="Categoría"
                      icon={Tag}
                      value={filterGrupo}
                      onChange={(e) => setFilterGrupo(e.target.value)}
                      options={[
                        { value: "TODOS", label: "Todos los Grupos" },
                        ...gruposComodidad.map(c => ({ value: c.nombre, label: c.nombre }))
                      ]}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 flex gap-3">
                  <button 
                    onClick={clearFilters}
                    className="flex-1 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer"
                  >
                    Limpiar
                  </button>
                  <button 
                    onClick={() => setIsSidebarOpen(false)}
                    className="flex-[2] bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg cursor-pointer"
                  >
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
