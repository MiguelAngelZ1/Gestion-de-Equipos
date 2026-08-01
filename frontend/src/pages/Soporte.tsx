import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../services/api';
import { ROLES } from '../config/constants';
import { ClipboardList, Calendar, Trash2, Plus, Wrench, User, MapPin, CheckCircle, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { matchesSearch } from '../utils/search';

import SoporteDetalleModal from '../components/soporte/SoporteDetalleModal';
import SoporteFormModal from '../components/soporte/SoporteFormModal';
import SearchInput from '../components/common/SearchInput';
import CommonCard from '../components/common/CommonCard';
import ConfirmModal from '../components/common/ConfirmModal';
import { useToast } from '../context/ToastContext';

const spring = { type: 'spring' as const, stiffness: 400, damping: 30 };

const Soporte = () => {
  const { showToast } = useToast();
  const [tareas, setTareas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTarea, setSelectedTarea] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const fetchedOnce = useRef(false);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [tareaToDelete, setTareaToDelete] = useState(null);

  const userData = JSON.parse(localStorage.getItem("equipos_user_data") || "{}");
  const userRole = (userData.rol || ROLES.USER).toUpperCase();

  const fetchTareas = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/soporte');
      setTareas(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTareas(); }, []);

  useEffect(() => {
    if (!search && !fetchedOnce.current) return;
    fetchedOnce.current = true;
    const timer = setTimeout(() => { fetchTareas(); }, search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [search]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    const currentFilteredIds = filteredTareas.map(t => t.id);
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
      await apiRequest('/soporte/bulk', {
        method: 'DELETE',
        body: { ids: selectedIds }
      });
      setTareas(prev => prev.filter(t => !selectedIds.includes(t.id)));
      showToast("Operación Exitosa", `${selectedIds.length} tareas eliminadas correctamente.`, "success");
      setSelectedIds([]);
      setIsBulkDeleteOpen(false);
      fetchTareas();
    } catch {
      showToast("Error", "No se pudieron eliminar las tareas seleccionadas.", "error");
    } finally {
      setIsProcessingBulk(false);
    }
  };

  useEffect(() => {
    if (selectedTarea || isFormOpen || isDeleteOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [selectedTarea, isFormOpen, isDeleteOpen]);

  const filteredTareas = tareas.filter(t => matchesSearch(t, search));

  return (
    <div className="flex flex-col gap-3 w-full overflow-x-hidden">

      {/* ─── Search Bar Row ─── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por Equipo o Responsable..."
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
      </motion.div>

      {/* ─── Select All + Counter ─── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex items-center gap-3 px-1">
        <div className="h-px bg-white/[0.06] flex-1" />
        <div className="flex items-center gap-3">
          {userRole === ROLES.ADMIN && filteredTareas.length > 0 && (
            <button
              onClick={toggleAll}
              className="flex items-center gap-1.5 text-[9px] font-bold text-indigo-400 uppercase tracking-widest hover:text-white transition-colors cursor-pointer group"
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                filteredTareas.every(t => selectedIds.includes(t.id))
                  ? 'bg-indigo-600 border-indigo-500'
                  : 'border-white/20 group-hover:border-indigo-500/50'
              }`}>
                {filteredTareas.every(t => selectedIds.includes(t.id)) && <Check className="w-3 h-3 text-white" />}
              </div>
              Todo
            </button>
          )}
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
            Tareas: <span className="text-indigo-400">{filteredTareas.length}</span>
          </span>
        </div>
        <div className="h-px bg-white/[0.06] flex-1" />
      </motion.div>

      {/* ─── Grid de Tarjetas ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? (
          <>
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.06]" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-white/[0.06] rounded w-2/3" />
                    <div className="h-2 bg-white/[0.04] rounded w-1/3" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-2 bg-white/[0.04] rounded w-full" />
                  <div className="h-2 bg-white/[0.04] rounded w-3/4" />
                </div>
              </div>
            ))}
          </>
        ) : filteredTareas.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="col-span-full flex flex-col items-center justify-center py-16 bg-white/[0.03] rounded-2xl border border-dashed border-white/[0.06]">
            <ClipboardList className="w-10 h-10 text-slate-500 mb-3 opacity-20" />
            <h3 className="text-lg font-bold text-white">Sin resultados</h3>
            <p className="text-slate-400 text-xs mt-1">Prueba con otros filtros.</p>
          </motion.div>
        ) : (
          <AnimatePresence>
            {filteredTareas.map((tarea, i) => (
              <motion.div
                key={tarea.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: i * 0.04 }}
              >
                <CommonCard
                  layoutId={`tarea-${tarea.id}`}
                  title={tarea.ine || tarea.equipo_id}
                  badge={tarea.tipo_falla || "Soporte"}
                  badgeColor={tarea.tipo_falla === 'CORRECTIVO' ? '#ef4444' : '#6366f1'}
                  icon={Wrench}
                  onView={() => setSelectedTarea(tarea)}
                  onEdit={userRole === ROLES.ADMIN ? () => { setFormData(tarea); setIsFormOpen(true); } : null}
                  onDelete={userRole === ROLES.ADMIN ? () => { setTareaToDelete(tarea); setIsDeleteOpen(true); } : null}
                  selectable={userRole === ROLES.ADMIN}
                  isSelected={selectedIds.includes(tarea.id)}
                  onSelect={() => toggleSelect(tarea.id)}
                >
                  <p className="text-indigo-400/80 text-[10px] font-black tracking-widest uppercase mb-2">
                    Ticket: {tarea.ticket_id}
                  </p>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-slate-300 text-[11px]">
                      <MapPin className="w-3 h-3 text-indigo-400 shrink-0 opacity-70" />
                      <span className="font-bold truncate opacity-90">{tarea.equipo_ubicacion || 'Central'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300 text-[11px]">
                      <Calendar className="w-3 h-3 text-indigo-400 shrink-0 opacity-70" />
                      <span className="font-bold">{new Date(tarea.fecha.split('T')[0] + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300 text-[11px]">
                      <User className="w-3 h-3 text-indigo-400 shrink-0 opacity-70" />
                      <span className="font-bold truncate opacity-90">{tarea.responsable}</span>
                    </div>
                    <div className="mt-2 p-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                      <p className="text-slate-400 text-[11px] leading-relaxed line-clamp-2 italic font-medium">
                        &quot;{tarea.tarea_realizada}&quot;
                      </p>
                    </div>
                  </div>
                </CommonCard>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* ─── Floating Bulk Action Bar ─── */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-20 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md"
          >
            <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 px-1">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.4)]">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-white font-black text-sm">{selectedIds.length} seleccionados</h4>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Acciones masivas</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSelectedIds([])}
                  className="px-3 py-2 text-slate-400 hover:text-white font-black text-[10px] uppercase tracking-widest transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setIsBulkDeleteOpen(true)}
                  className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-lg shadow-rose-600/20 cursor-pointer"
                >
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
        message={`Estás a punto de eliminar de forma permanente ${selectedIds.length} registros de soporte. Esta acción no se puede deshacer.`}
        onConfirm={handleBulkDelete}
        onClose={() => setIsBulkDeleteOpen(false)}
        type="danger"
        isLoading={isProcessingBulk}
      />

      <SoporteDetalleModal 
        isOpen={!!selectedTarea} 
        tarea={selectedTarea} 
        onClose={() => setSelectedTarea(null)} 
      />

      <SoporteFormModal 
        isOpen={isFormOpen} 
        initialData={formData} 
        onClose={() => setIsFormOpen(false)} 
        onSave={async (data) => {
          try {
            const method = data.id ? 'PUT' : 'POST';
            const endpoint = data.id ? `/soporte/${data.id}` : '/soporte';
            
            await apiRequest(endpoint, {
              method,
              body: JSON.stringify(data)
            });
            setIsFormOpen(false);
            fetchTareas();
            showToast(
              data.id ? "Registro Actualizado" : "Soporte Enviado",
              data.id ? "Los cambios se guardaron correctamente." : "Tu solicitud ha sido registrada correctamente.",
              "success"
            );
          } catch {
            showToast("Error", "No se pudo procesar la solicitud de soporte.", "error");
          }
        }}
      />

      <ConfirmModal 
        isOpen={isDeleteOpen} 
        onClose={() => setIsDeleteOpen(false)} 
        onConfirm={async () => {
          try {
            await apiRequest(`/soporte/${tareaToDelete?.id}`, {
              method: 'DELETE'
            });
            setTareas(prev => prev.filter(t => t.id !== tareaToDelete.id));
            setIsDeleteOpen(false);
            showToast("Registro Eliminado", "La tarea de soporte ha sido borrada del historial.", "success");
            fetchTareas();
          } catch {
            showToast("Error", "No se pudo eliminar el registro.", "error");
          }
        }}
        title="Eliminar Registro de Soporte"
        message={`¿Estás seguro que deseas eliminar permanentemente este registro de mantenimiento para el equipo "${tareaToDelete?.ine || tareaToDelete?.equipo_id}"?`}
      />
    </div>
  );
};

export default Soporte;
