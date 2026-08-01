import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { ROLES } from '../config/constants';
import { useToast } from '../context/ToastContext';
import { Calendar, User, FileText, CheckCircle, Clock, AlertCircle, RotateCcw, CheckSquare, Square, Trash2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from '../components/common/ConfirmModal';
import ReceiveLoanModal from '../components/prestamos/ReceiveLoanModal';

const spring = { type: 'spring' as const, stiffness: 400, damping: 30 };

const ItemSkeleton = ({ i }: { i: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: i * 0.05, ...spring }}
    className="bg-white/[0.02] rounded-2xl h-28 animate-pulse border border-white/[0.04]"
  />
);

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

  return (
    <div className="flex flex-col flex-1 h-full overflow-y-auto lg:overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-700">

      <ReceiveLoanModal
        isOpen={returnConfirm.isOpen}
        prestamo={returnConfirm.prestamo}
        onConfirm={handleReturn}
        onClose={() => setReturnConfirm({ isOpen: false, prestamo: null })}
      />

      <ConfirmModal isOpen={cleanupConfirm} title="Limpiar Historial" message="¿Estás seguro de que quieres borrar todos los registros de préstamos devueltos? Esta acción no se puede deshacer." onConfirm={handleCleanup} onClose={() => setCleanupConfirm(false)} type="danger" confirmText="Limpiar Ahora" />
      <ConfirmModal isOpen={isBulkReturnOpen} title="¿Recibir Equipos Seleccionados?" message={`Estás a punto de marcar ${selectedIds.length} equipos como devueltos.`} onConfirm={handleBulkReturn} onClose={() => setIsBulkReturnOpen(false)} type="success" isLoading={isProcessingBulkReturn} />
      <ConfirmModal isOpen={isBulkDeleteOpen} title="¿Eliminar del Historial?" message={`¿Estás seguro de que quieres borrar estos ${selectedHistoryIds.length} registros del historial? Esta acción no se puede deshacer.`} onConfirm={handleBulkDeleteHistory} onClose={() => setIsBulkDeleteOpen(false)} type="danger" isLoading={isProcessingBulkDelete} />

      {/* Counter */}
      <div className="flex items-center gap-3 mb-6 shrink-0 px-1">
        <div className="h-px bg-white/[0.08] flex-1" />
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={spring}>
          <div className="bg-indigo-500/10 border border-indigo-500/30 px-4 py-2 rounded-xl flex items-center gap-2.5 shadow-[0_0_16px_rgba(99,102,241,0.08)]">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span className="text-xl font-black text-white tabular-nums">{activeLoans.length}</span>
            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Activos</span>
          </div>
        </motion.div>
        <div className="h-px bg-white/[0.08] flex-1" />
      </div>

      {/* Two columns */}
      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-3 lg:gap-4 flex-1 lg:h-[calc(100vh-220px)] min-h-[300px] md:min-h-[500px] lg:min-h-0 sm:px-1 lg:overflow-hidden">

        {/* Active Loans */}
        <section className="flex flex-col min-h-[300px] lg:min-h-0 bg-transparent lg:bg-white/[0.02] lg:rounded-2xl sm:rounded-3xl border-transparent lg:border-white/[0.04] sm:p-3 lg:p-4 lg:backdrop-blur-sm lg:overflow-hidden relative">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/10 rounded-xl">
                <Calendar className="w-4 h-4 text-indigo-400" />
              </div>
              <h2 className="text-base font-black text-white tracking-tight">Equipos en Préstamo</h2>
            </div>
            {userRole === ROLES.ADMIN && activeLoans.length > 0 && (
              <button
                onClick={() => {
                  const allActiveIds = activeLoans.map(p => p.id);
                  const allSelected = allActiveIds.every(id => selectedIds.includes(id));
                  if (allSelected) {
                    setSelectedIds(prev => prev.filter(id => !allActiveIds.includes(id)));
                  } else {
                    setSelectedIds(prev => [...new Set([...prev, ...allActiveIds])]);
                  }
                }}
                className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-white transition-colors cursor-pointer"
              >
                {activeLoans.every((id: any) => selectedIds.includes(id.id)) ? 'Desmarcar' : 'Seleccionar Todo'}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar [mask-image:linear-gradient(to_bottom,transparent_0%,black_5%,black_95%,transparent_100%)] pb-6 pt-2">
            {loading ? (
              <div className="space-y-2">{[1,2,3].map(i => <ItemSkeleton key={i} i={i} />)}</div>
            ) : activeLoans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 bg-white/[0.02] rounded-2xl border border-dashed border-white/[0.06]">
                <CheckCircle className="w-10 h-10 text-emerald-500/20 mb-3" />
                <p className="text-slate-400 font-medium text-sm">No hay activos</p>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {activeLoans.map((p, idx) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.03, ...spring }}
                    >
                      <div className={`bg-white/[0.03] border border-white/[0.04] rounded-2xl p-3 sm:p-4 hover:bg-white/[0.06] transition-all group relative overflow-hidden ${selectedIds.includes(p.id) ? 'ring-2 ring-indigo-500/50 bg-white/[0.05]' : ''}`}>
                        {userRole === ROLES.ADMIN && (
                          <div
                            onClick={(e) => { e.stopPropagation(); toggleSelect(p.id); }}
                            className="absolute top-3 right-3 cursor-pointer z-10"
                          >
                            <div className={`p-1 rounded-lg transition-all ${selectedIds.includes(p.id) ? 'bg-indigo-600 text-white shadow-[0_0_10px_rgba(79,70,229,0.4)]' : 'bg-white/5 text-slate-500 hover:text-indigo-400'}`}>
                              {selectedIds.includes(p.id) ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                        )}

                        <div className="flex items-start gap-3 mb-2.5">
                          <div className="p-2 bg-indigo-500/20 rounded-xl group-hover:bg-indigo-500 transition-colors duration-300 shrink-0">
                            <Calendar className="w-4 h-4 text-indigo-400 group-hover:text-white transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-black text-white tracking-tight truncate">{p.equipos?.ine}</h3>
                            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                              <User className="w-3 h-3 text-indigo-400" /> {p.solicitante}
                            </div>
                          </div>
                        </div>

                        <div className="bg-white/[0.03] rounded-xl p-2.5 mb-2.5 border border-white/[0.04]">
                          <div className="flex items-start gap-2">
                            <FileText className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5" />
                            <p className="text-slate-400 text-[11px] italic leading-relaxed line-clamp-2">"{p.motivo}"</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex gap-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Salida</span>
                              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
                                <Clock className="w-3 h-3 text-indigo-400" />
                                {new Date(p.fecha_prestamo).toLocaleDateString()}
                              </div>
                            </div>
                            {p.fecha_devolucion_estimada && (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[8px] font-black text-indigo-500/50 uppercase tracking-widest">Estimada</span>
                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-400">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(p.fecha_devolucion_estimada).toLocaleDateString()}
                                </div>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => setReturnConfirm({ isOpen: true, prestamo: p })}
                            className="bg-emerald-600/10 hover:bg-emerald-500 text-emerald-400 hover:text-white px-3 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 border border-emerald-500/20 hover:shadow-emerald-500/20 group/btn cursor-pointer shrink-0"
                          >
                            <RotateCcw className="w-3 h-3 group-hover/btn:rotate-180 transition-transform duration-500" />
                            <span className="hidden sm:inline">Recibir</span>
                          </button>
                        </div>

                        <div className="absolute left-0 top-4 bottom-4 w-0.5 bg-indigo-500 rounded-full" />
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </section>

        {/* History */}
        <section className="flex flex-col min-h-[300px] lg:min-h-0 bg-transparent lg:bg-white/[0.01] lg:rounded-2xl sm:rounded-3xl border-transparent lg:border-white/[0.04] sm:p-3 lg:p-4 lg:backdrop-blur-sm lg:overflow-hidden relative">
          <div className="flex items-center justify-between mb-3 shrink-0 gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-slate-500/10 rounded-xl">
                <RotateCcw className="w-4 h-4 text-slate-500" />
              </div>
              <h2 className="text-base font-black text-white tracking-tight">Historial</h2>
            </div>
            <div className="flex items-center gap-1.5">
              {userRole === ROLES.ADMIN && pastLoans.length > 0 && (
                <button
                  onClick={() => {
                    const allPastIds = pastLoans.map(p => p.id);
                    const allSelected = allPastIds.every(id => selectedHistoryIds.includes(id));
                    if (allSelected) {
                      setSelectedHistoryIds(prev => prev.filter(id => !allPastIds.includes(id)));
                    } else {
                      setSelectedHistoryIds(prev => [...new Set([...prev, ...allPastIds])]);
                    }
                  }}
                  className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors cursor-pointer"
                >
                  {pastLoans.length > 0 && pastLoans.every(p => selectedHistoryIds.includes(p.id)) ? 'Desmarcar' : 'Todo'}
                </button>
              )}
              {pastLoans.length > 0 && (
                <button
                  onClick={() => setCleanupConfirm(true)}
                  className="px-2.5 py-1.5 bg-rose-500/5 hover:bg-rose-500/20 text-rose-500/60 hover:text-rose-500 text-[8px] sm:text-[9px] font-black uppercase tracking-widest rounded-lg border border-rose-500/10 hover:border-rose-500/30 transition-all cursor-pointer"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar [mask-image:linear-gradient(to_bottom,transparent_0%,black_5%,black_95%,transparent_100%)] pb-6 pt-2">
            {pastLoans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 border border-dashed border-white/[0.04] rounded-2xl opacity-30">
                <AlertCircle className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Sin registros</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {pastLoans.map(p => (
                  <div
                    key={p.id}
                    onClick={() => userRole === ROLES.ADMIN && toggleSelectHistory(p.id)}
                    className={`bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 flex items-center justify-between hover:bg-white/[0.06] transition-all group gap-2 cursor-pointer ${selectedHistoryIds.includes(p.id) ? 'ring-2 ring-rose-500/50' : ''}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {userRole === ROLES.ADMIN && (
                        <div className={`w-1 h-6 rounded-full transition-all ${selectedHistoryIds.includes(p.id) ? 'bg-rose-500 scale-y-125' : 'bg-emerald-500/30 group-hover:bg-emerald-500 group-hover:scale-y-110'}`} />
                      )}
                      <div className="min-w-0">
                        <h4 className="text-white font-bold text-xs truncate tracking-tight">{p.equipos?.ine}</h4>
                        <p className="text-slate-500 text-[10px] font-medium truncate italic">{p.solicitante}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">Devuelto</p>
                      <span className="text-[11px] font-bold text-slate-400">{new Date(p.fecha_devolucion_real).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Floating Bulk Return Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-20 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm"
          >
            <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-[0_0_16px_rgba(79,70,229,0.4)]">
                  <RotateCcw className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-black text-xs tabular-nums">{selectedIds.length}</span>
              </div>
              <button
                onClick={() => setIsBulkReturnOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer"
              >
                Recibir Todo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Bulk Delete Bar */}
      <AnimatePresence>
        {selectedHistoryIds.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-20 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm"
          >
            <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-rose-600 rounded-xl flex items-center justify-center shadow-[0_0_16px_rgba(225,29,72,0.4)]">
                  <Trash2 className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-black text-xs tabular-nums">{selectedHistoryIds.length}</span>
              </div>
              <button
                onClick={() => setIsBulkDeleteOpen(true)}
                className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Prestamos;
