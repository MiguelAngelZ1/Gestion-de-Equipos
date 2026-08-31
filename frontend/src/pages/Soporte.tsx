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
    <div className="flex flex-col gap-3 w-full overflow-x-hidden flex-1 min-h-0">

      {/* ─── Search Bar Row ─── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="flex flex-col sm:flex-row gap-2">
        <div className="min-w-0 w-auto max-w-full"><SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por Equipo o Responsable..." /></div>
        {userRole === ROLES.ADMIN && (
          <button onClick={() => { setFormData({}); setIsFormOpen(true); }} className="inline-flex items-center justify-center gap-2 px-2 py-2.5 text-sm font-semibold text-[#c4c5d9] hover:text-white transition-colors shrink-0">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Nuevo</span><span className="sm:hidden">Nuevo</span>
          </button>
        )}
      </motion.div>

      {userRole === ROLES.ADMIN && filteredTareas.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <button onClick={toggleAll} className="flex items-center gap-1.5 text-[10px] font-semibold text-[#c4c5d9] uppercase tracking-wide hover:text-white transition-colors group">
            <span className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${filteredTareas.every(t => selectedIds.includes(t.id)) ? 'bg-white border-white text-zinc-900' : 'border-white/15 group-hover:border-white/25'}`}>
              {filteredTareas.every(t => selectedIds.includes(t.id)) && <Check className="w-3 h-3" />}
            </span>
            Todo
          </button>
        </div>
      )}

      {/* ─── Grid de Tarjetas ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 flex-1">
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
            className="col-span-full flex-1 min-h-[calc(100vh-280px)] flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 rounded-xl py-16">
            <ClipboardList className="w-8 h-8 text-zinc-600 mb-3" />
            <p className="font-semibold text-zinc-100">Sin resultados</p>
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
                  <p className="text-[#c4c5d9] text-[10px] font-semibold tracking-wide uppercase mb-2">Ticket: {tarea.ticket_id}</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-[#e4e2e4] text-[11px]"><MapPin className="w-3 h-3 text-zinc-500 shrink-0" /><span className="font-medium truncate">{tarea.equipo_ubicacion || 'Central'}</span></div>
                    <div className="flex items-center gap-2 text-[#e4e2e4] text-[11px]"><Calendar className="w-3 h-3 text-zinc-500 shrink-0" /><span className="font-medium">{new Date(tarea.fecha.split('T')[0] + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
                    <div className="flex items-center gap-2 text-[#e4e2e4] text-[11px]"><User className="w-3 h-3 text-zinc-500 shrink-0" /><span className="font-medium truncate">{tarea.responsable}</span></div>
                    <div className="mt-2 p-2.5 bg-[#131315] border border-white/5 rounded-xl">
                      <p className="text-zinc-400 text-[11px] leading-relaxed line-clamp-2 italic">&quot;{tarea.tarea_realizada}&quot;</p>
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
            <div className="bg-[#1C1C1E] border border-white/5 p-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 px-1">
                <div className="w-8 h-8 bg-white text-zinc-900 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-[#e4e2e4] font-semibold text-sm">{selectedIds.length} seleccionados</h4>
                  <p className="text-[10px] font-semibold text-[#c4c5d9] uppercase tracking-wide">Acciones masivas</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSelectedIds([])}
                  className="px-3 py-2 text-slate-400 hover:text-white font-black text-[10px] uppercase tracking-widest transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button onClick={() => setIsBulkDeleteOpen(true)} className="px-4 py-2 rounded-xl bg-white text-zinc-900 text-xs font-semibold hover:bg-zinc-100 inline-flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar
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
