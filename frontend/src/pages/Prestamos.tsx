import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { ROLES } from '../config/constants';
import { useToast } from '../context/ToastContext';
import { Calendar, User, FileText, CheckCircle, Clock, AlertCircle, RotateCcw, CheckSquare, Square, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from '../components/common/ConfirmModal';
import ReceiveLoanModal from '../components/prestamos/ReceiveLoanModal';

const spring = { type: 'spring' as const, stiffness: 400, damping: 30 };


const Prestamos = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeLoans, setActiveLoans] = useState<any[]>([]);
  const [pastLoans, setPastLoans] = useState<any[]>([]);
  const [returnConfirm, setReturnConfirm] = useState<{ isOpen: boolean; prestamo: any }>({ isOpen: false, prestamo: null });
  const [cleanupConfirm, setCleanupConfirm] = useState(false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);
  const [isProcessingBulkReturn, setIsProcessingBulkReturn] = useState(false);
  const [isProcessingBulkDelete, setIsProcessingBulkDelete] = useState(false);
  const [isBulkReturnOpen, setIsBulkReturnOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  const userData = JSON.parse(localStorage.getItem("equipos_user_data") || "{}");
  const userRole = (userData.rol || ROLES.USER).toUpperCase();

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/prestamos');
      setActiveLoans(data.filter((p: any) => !p.fecha_devolucion_real));
      setPastLoans(data.filter((p: any) => p.fecha_devolucion_real));
    } catch (error) {
      showToast("Error de Conexión", "No se pudieron obtener los datos de préstamos.", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectHistory = (id: string) => {
    setSelectedHistoryIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkReturn = async () => {
    try {
      setIsProcessingBulkReturn(true);
      await apiRequest('/prestamos/devolver/bulk', {
        method: 'POST',
        body: { ids: selectedIds }
      });
      const returnedLoans = activeLoans.filter(l => selectedIds.includes(l.id));
      setActiveLoans(prev => prev.filter(l => !selectedIds.includes(l.id)));
      setPastLoans(prev => [...returnedLoans.map(l => ({ ...l, fecha_devolucion_real: new Date().toISOString() })), ...prev]);
      showToast("Operación Exitosa", `${selectedIds.length} equipos recibidos correctamente.`, "success");
      setSelectedIds([]);
      setIsBulkReturnOpen(false);
      fetchData();
    } catch (error) {
      showToast("Error", "No se pudieron devolver los equipos seleccionados.", "error");
    } finally {
      setIsProcessingBulkReturn(false);
    }
  };

  const handleBulkDeleteHistory = async () => {
    try {
      setIsProcessingBulkDelete(true);
      await apiRequest('/prestamos/bulk', {
        method: 'DELETE',
        body: { ids: selectedHistoryIds }
      });
      setPastLoans(prev => prev.filter(l => !selectedHistoryIds.includes(l.id)));
      showToast("Historial Actualizado", `${selectedHistoryIds.length} registros eliminados del historial.`, "success");
      setSelectedHistoryIds([]);
      setIsBulkDeleteOpen(false);
      fetchData();
    } catch (error) {
      showToast("Error", "No se pudieron eliminar los registros del historial.", "error");
    } finally {
      setIsProcessingBulkDelete(false);
    }
  };

  const handleReturn = async (estado_id_final: string) => {
    if (!returnConfirm.prestamo) return;
    try {
      await apiRequest(`/prestamos/${returnConfirm.prestamo.id}/devolver`, {
        method: 'POST',
        body: JSON.stringify({ estado_id_final })
      });
      const returnedLoan = activeLoans.find(l => l.id === returnConfirm.prestamo.id);
      setActiveLoans(prev => prev.filter(l => l.id !== returnConfirm.prestamo.id));
      if (returnedLoan) {
        setPastLoans(prev => [{ ...returnedLoan, fecha_devolucion_real: new Date().toISOString() }, ...prev]);
      }
      showToast("Equipo Recibido", `El equipo ${returnConfirm.prestamo.equipos?.ine} ha sido marcado como devuelto.`, "success");
      fetchData();
    } catch (error) {
      showToast("Error", "No se pudo procesar la devolución.", "error");
    } finally {
      setReturnConfirm({ isOpen: false, prestamo: null });
    }
  };

  const handleCleanup = async () => {
    try {
      await apiRequest('/prestamos/historial', { method: 'DELETE' });
      setPastLoans([]);
      showToast("Historial Limpio", "Todo el historial de préstamos devueltos ha sido borrado.", "success");
      fetchData();
    } catch (error) {
      showToast("Error", "No se pudo limpiar el historial.", "error");
    } finally {
      setCleanupConfirm(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const allActiveSelected = activeLoans.length > 0 && activeLoans.every(p => selectedIds.includes(p.id));
  const allPastSelected = pastLoans.length > 0 && pastLoans.every(p => selectedHistoryIds.includes(p.id));

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-4 w-full max-w-full overflow-y-auto lg:overflow-hidden">

      <ReceiveLoanModal
        isOpen={returnConfirm.isOpen}
        prestamo={returnConfirm.prestamo}
        onConfirm={handleReturn}
        onClose={() => setReturnConfirm({ isOpen: false, prestamo: null })}
      />

      <ConfirmModal isOpen={cleanupConfirm} title="Limpiar Historial" message="¿Estás seguro de que quieres borrar todos los registros de préstamos devueltos? Esta acción no se puede deshacer." onConfirm={handleCleanup} onClose={() => setCleanupConfirm(false)} type="danger" confirmText="Limpiar Ahora" />
      <ConfirmModal isOpen={isBulkReturnOpen} title="¿Recibir Equipos Seleccionados?" message={`Estás a punto de marcar ${selectedIds.length} equipos como devueltos.`} onConfirm={handleBulkReturn} onClose={() => setIsBulkReturnOpen(false)} type="success" isLoading={isProcessingBulkReturn} />
      <ConfirmModal isOpen={isBulkDeleteOpen} title="¿Eliminar del Historial?" message={`¿Estás seguro de que quieres borrar estos ${selectedHistoryIds.length} registros del historial? Esta acción no se puede deshacer.`} onConfirm={handleBulkDeleteHistory} onClose={() => setIsBulkDeleteOpen(false)} type="danger" isLoading={isProcessingBulkDelete} />

      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 flex-1 min-h-0 lg:overflow-hidden">

        <section className="flex flex-col min-h-[300px] lg:min-h-0 lg:overflow-hidden">
          <div className="flex items-center gap-3 text-xs text-zinc-500 mb-3 shrink-0">
            <span className="inline-flex items-center gap-2 text-zinc-300 font-semibold">
              <Calendar className="w-4 h-4 text-zinc-400" /> En Préstamo
            </span>
            <div className="h-px flex-1 bg-zinc-800" />
            <span>{activeLoans.length} activos</span>
            {userRole === ROLES.ADMIN && activeLoans.length > 0 && (
              <button
                onClick={() => {
                  const ids = activeLoans.map(p => p.id);
                  setSelectedIds(prev => allActiveSelected ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])]);
                }}
                className="font-semibold hover:text-zinc-300"
              >
                {allActiveSelected ? 'Desmarcar' : 'Seleccionar todo'}
              </button>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
            {loading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-36 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse" />)}</div>
            ) : activeLoans.length === 0 ? (
              <div className="min-h-[240px] h-full flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 rounded-xl">
                <CheckCircle className="w-8 h-8 text-zinc-600 mb-3" />
                <p className="font-semibold">Sin préstamos activos</p>
                <p className="text-sm text-zinc-500 mt-1">Todos los equipos están en su lugar</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {activeLoans.map((p, idx) => {
                    const isSelected = selectedIds.includes(p.id);
                    return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ delay: idx * 0.02, ...spring }}
                    >
                      <div className={`rounded-xl border p-4 flex flex-col gap-3 transition-colors ${isSelected ? 'bg-white border-white text-zinc-900' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative shrink-0 grid place-items-center">
                              <Calendar className={`w-5 h-5 ${isSelected ? 'text-zinc-900' : 'text-zinc-400'}`} />
                              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2" style={{ background: '#f97316', borderColor: isSelected ? '#fff' : '#18181b' }} />
                            </div>
                            <h3 className={`text-sm font-semibold truncate ${isSelected ? 'text-zinc-900' : 'text-zinc-50'}`}>{p.equipos?.ine}</h3>
                          </div>
                          {userRole === ROLES.ADMIN && (
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleSelect(p.id); }}
                              className={`w-7 h-7 grid place-items-center shrink-0 ${isSelected ? 'text-zinc-900' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                              {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                            </button>
                          )}
                        </div>

                        <div className={`flex flex-col gap-1.5 text-sm ${isSelected ? 'text-zinc-600' : 'text-zinc-400'}`}>
                          <div className="flex items-center gap-1.5 text-xs"><User className="w-3 h-3 text-zinc-500 shrink-0" /><span className="truncate font-medium">{p.solicitante}</span></div>
                          <div className="flex items-center gap-1.5 text-xs"><Clock className="w-3 h-3 text-zinc-500 shrink-0" /><span className="truncate">Salida: {new Date(p.fecha_prestamo).toLocaleDateString()}</span></div>
                          {p.fecha_devolucion_estimada && (
                            <div className="flex items-center gap-1.5 text-xs"><Calendar className="w-3 h-3 text-zinc-500 shrink-0" /><span className="truncate">Estimada: {new Date(p.fecha_devolucion_estimada).toLocaleDateString()}</span></div>
                          )}
                          {!isSelected && (
                            <div className="mt-1 p-2.5 bg-[#131315] border border-white/5 rounded-xl flex items-start gap-2">
                              <FileText className="w-3 h-3 text-zinc-500 shrink-0 mt-0.5" />
                              <p className="text-zinc-400 text-[11px] leading-relaxed line-clamp-2 italic">&quot;{p.motivo || 'Sin motivo'}&quot;</p>
                            </div>
                          )}
                        </div>

                        <div className={`pt-3 border-t flex items-center justify-end ${isSelected ? 'border-zinc-200' : 'border-zinc-800'}`}>
                          <button
                            onClick={() => setReturnConfirm({ isOpen: true, prestamo: p })}
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold ${isSelected ? 'text-zinc-900' : 'text-[#c4c5d9] hover:text-white'}`}
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Recibir
                          </button>
                        </div>
                      </div>
                    </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </section>

        <section className="flex flex-col min-h-[300px] lg:min-h-0 lg:overflow-hidden">
          <div className="flex items-center gap-3 text-xs text-zinc-500 mb-3 shrink-0">
            <span className="inline-flex items-center gap-2 text-zinc-300 font-semibold">
              <RotateCcw className="w-4 h-4 text-zinc-400" /> Historial
            </span>
            <div className="h-px flex-1 bg-zinc-800" />
            {userRole === ROLES.ADMIN && pastLoans.length > 0 && (
              <button
                onClick={() => {
                  const ids = pastLoans.map(p => p.id);
                  setSelectedHistoryIds(prev => allPastSelected ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])]);
                }}
                className="font-semibold hover:text-zinc-300"
              >
                {allPastSelected ? 'Desmarcar' : 'Seleccionar todo'}
              </button>
            )}
            {pastLoans.length > 0 && (
              <button onClick={() => setCleanupConfirm(true)} className="font-semibold text-red-400 hover:text-red-300">Limpiar</button>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
            {pastLoans.length === 0 ? (
              <div className="min-h-[240px] h-full flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 rounded-xl">
                <AlertCircle className="w-8 h-8 text-zinc-600 mb-3" />
                <p className="font-semibold">Sin registros</p>
                <p className="text-sm text-zinc-500 mt-1">Aún no hay devoluciones</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pastLoans.map(p => {
                  const isSelected = selectedHistoryIds.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => userRole === ROLES.ADMIN && toggleSelectHistory(p.id)}
                      className={`rounded-xl border p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${isSelected ? 'bg-white border-white text-zinc-900' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
                    >
                      <div className="min-w-0">
                        <h4 className={`text-sm font-semibold truncate ${isSelected ? 'text-zinc-900' : 'text-zinc-50'}`}>{p.equipos?.ine}</h4>
                        <p className={`text-xs truncate ${isSelected ? 'text-zinc-600' : 'text-zinc-400'}`}>{p.solicitante}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-[10px] uppercase tracking-wide ${isSelected ? 'text-zinc-600' : 'text-zinc-500'}`}>Devuelto</p>
                        <span className={`text-xs font-medium ${isSelected ? 'text-zinc-900' : 'text-zinc-300'}`}>{new Date(p.fecha_devolucion_real).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-16px)] max-w-md">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex items-center justify-between shadow-xl">
            <span className="flex items-center gap-2 text-sm font-semibold"><span className="w-8 h-8 rounded-full bg-white text-zinc-900 grid place-items-center font-bold text-xs">{selectedIds.length}</span> seleccionados</span>
            <div className="flex gap-2">
              <button onClick={() => setSelectedIds([])} className="px-3 py-2 text-sm font-medium text-zinc-400">Cancelar</button>
              <button onClick={() => setIsBulkReturnOpen(true)} className="px-4 py-2 rounded-full bg-white text-zinc-900 text-sm font-semibold inline-flex items-center gap-1.5"><RotateCcw className="w-4 h-4" /> Recibir</button>
            </div>
          </div>
        </div>
      )}

      {selectedHistoryIds.length > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-16px)] max-w-md">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex items-center justify-between shadow-xl">
            <span className="flex items-center gap-2 text-sm font-semibold"><span className="w-8 h-8 rounded-full bg-white text-zinc-900 grid place-items-center font-bold text-xs">{selectedHistoryIds.length}</span> seleccionados</span>
            <div className="flex gap-2">
              <button onClick={() => setSelectedHistoryIds([])} className="px-3 py-2 text-sm font-medium text-zinc-400">Cancelar</button>
              <button onClick={() => setIsBulkDeleteOpen(true)} className="px-4 py-2 rounded-full bg-red-600 text-white text-sm font-semibold inline-flex items-center gap-1.5"><Trash2 className="w-4 h-4" /> Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Prestamos;
