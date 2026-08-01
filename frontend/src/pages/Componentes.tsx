import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../services/api';
import { ROLES } from '../config/constants';
import { Package, Plus, Calendar, Trash2, Boxes, CheckCircle, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { matchesSearch } from '../utils/search';
import CommonCard from '../components/common/CommonCard';
import SearchInput from '../components/common/SearchInput';
import ConfirmModal from '../components/common/ConfirmModal';
import ComponenteFormModal from '../components/componentes/ComponenteFormModal';
import ComponenteDetalleModal from '../components/componentes/ComponenteDetalleModal';
import MovimientosStockModal from '../components/componentes/MovimientosStockModal';
import { useToast } from '../context/ToastContext';

const ItemSkeleton = ({ i }: { i: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: i * 0.05, ...{ type: 'spring' as const, stiffness: 400, damping: 30 } }}
    className="bg-white/[0.02] rounded-2xl h-48 animate-pulse border border-white/[0.04]"
  />
);

const Componentes = () => {
    const { showToast } = useToast();
    const [componentes, setComponentes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
    const [isProcessingBulk, setIsProcessingBulk] = useState(false);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [selectedComponente, setSelectedComponente] = useState<any>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [componenteToDelete, setComponenteToDelete] = useState<any>(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [componenteForHistory, setComponenteForHistory] = useState<any>(null);

    const userData = JSON.parse(localStorage.getItem("equipos_user_data") || "{}");
    const userRole = (userData.rol || ROLES.USER).toUpperCase();

    const fetchComponentes = async () => {
        try {
            setLoading(true);
            const data = await apiRequest(`/componentes${search ? `?q=${encodeURIComponent(search)}` : ''}`);
            setComponentes(data);
        } catch (error) {
            showToast("Error al cargar la lista de repuestos", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            fetchComponentes();
        }, 300);
        return () => clearTimeout(delayDebounce);
    }, [search]);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleAll = () => {
        const currentFilteredIds = filtered.map(c => c.id);
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
            await apiRequest('/componentes/bulk', {
                method: 'DELETE',
                body: { ids: selectedIds }
            });
            setComponentes(prev => prev.filter(c => !selectedIds.includes(c.id)));
            showToast("Operación Exitosa", `${selectedIds.length} repuestos eliminados correctamente.`, "success");
            setSelectedIds([]);
            setIsBulkDeleteOpen(false);
            fetchComponentes();
        } catch (error) {
            showToast("Error", "No se pudieron eliminar los repuestos seleccionados.", "error");
        } finally {
            setIsProcessingBulk(false);
        }
    };

    const handleSave = async (data: any) => {
        try {
            await apiRequest('/componentes', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showToast(data.id ? "Repuesto actualizado" : "Repuesto registrado", "La operación se realizó correctamente.", "success");
            setIsFormOpen(false);
            fetchComponentes();
        } catch (error: any) {
            showToast("Error", error.message || "No se pudo procesar la solicitud del inventario.", "error");
        }
    };

    const handleDelete = async () => {
        try {
            await apiRequest(`/componentes/${componenteToDelete.id}`, { method: 'DELETE' });
            setComponentes(prev => prev.filter(c => c.id !== componenteToDelete.id));
            showToast("Repuesto eliminado", "El registro ha sido borrado del inventario.", "success");
            setIsDeleteOpen(false);
            fetchComponentes();
        } catch (error) {
            showToast("Error", "No se pudo eliminar el repuesto.", "error");
        }
    };

    const handleQuickStockAdd = async (id: string, cantidadSuma: number) => {
        try {
            const componente = componentes.find(c => c.id === id);
            if (!componente) return;
            const nuevaCantidad = (componente.cantidad || 0) + cantidadSuma;
            await apiRequest('/componentes', {
                method: 'POST',
                body: JSON.stringify({ ...componente, cantidad: nuevaCantidad })
            });
            setComponentes(prev => prev.map(c => c.id === id ? { ...c, cantidad: nuevaCantidad } : c));
            showToast("Stock Actualizado", `Se han añadido ${cantidadSuma} unidades a "${componente.nombre}"`, "success");
            fetchComponentes();
            if (selectedComponente?.id === id) {
                setSelectedComponente((prev: any) => ({ ...prev, cantidad: nuevaCantidad }));
            }
        } catch (error) {
            showToast("Error", "No se pudo actualizar el stock.", "error");
            throw error;
        }
    };

    const filtered = componentes.filter(c => matchesSearch(c, search));

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                    <SearchInput
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por Nombre, NNE o Serie..."
                    />
                </div>
                <button
                    onClick={() => setIsFormOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white w-11 h-11 rounded-xl font-bold shadow-[0_0_16px_rgba(79,70,229,0.25)] transition-all flex items-center justify-center cursor-pointer shrink-0"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            <div className="flex items-center gap-3 px-1">
               <div className="h-px bg-white/[0.08] flex-1" />
               <div className="flex items-center gap-4">
                  {userRole === ROLES.ADMIN && filtered.length > 0 && (
                    <button
                      onClick={toggleAll}
                      className="flex items-center gap-1.5 text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-white transition-colors cursor-pointer group"
                    >
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                        filtered.every(c => selectedIds.includes(c.id))
                          ? 'bg-indigo-600 border-indigo-500'
                          : 'border-white/20 group-hover:border-indigo-500/50'
                      }`}>
                         {filtered.every(c => selectedIds.includes(c.id)) && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      Seleccionar Todo
                    </button>
                  )}
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="text-indigo-400/60">|</span>
                    {filtered.length} {filtered.length === 1 ? 'repuesto' : 'repuestos'}
                    <span className="text-indigo-400/60">|</span>
                  </span>
               </div>
               <div className="h-px bg-white/[0.08] flex-1" />
            </div>

            {loading && componentes.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[1,2,3].map(i => <ItemSkeleton key={i} i={i} />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="py-16 bg-white/[0.02] border border-dashed border-white/[0.06] rounded-2xl flex flex-col items-center justify-center text-center px-6">
                    <Boxes className="w-12 h-12 text-slate-700 mb-4 opacity-30" />
                    <h3 className="text-lg font-black text-white">No hay repuestos registrados</h3>
                    <p className="text-slate-500 max-w-xs text-sm mt-1">Pulsa "Cargar Repuesto" para iniciar tu inventario de piezas técnicas.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <AnimatePresence>
                        {filtered.map((comp, idx) => (
                            <motion.div
                                key={comp.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.03, ...{ type: 'spring' as const, stiffness: 400, damping: 30 } }}
                            >
                                <CommonCard
                                    layoutId={`comp-${comp.id}`}
                                    title={comp.nombre}
                                    badge={`${comp.cantidad} unids`}
                                    badgeAbsolute={true}
                                    badgeColor={comp.cantidad > 0 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"}
                                    icon={Package}
                                    onView={() => setSelectedComponente(comp)}
                                    onEdit={userRole === ROLES.ADMIN ? () => { setFormData(comp); setIsFormOpen(true); } : null}
                                    onDelete={userRole === ROLES.ADMIN ? () => { setComponenteToDelete(comp); setIsDeleteOpen(true); } : null}
                                    selectable={userRole === ROLES.ADMIN}
                                    isSelected={selectedIds.includes(comp.id)}
                                    onSelect={() => toggleSelect(comp.id)}
                                    onHistory={() => { setComponenteForHistory(comp); setIsHistoryOpen(true); }}
                                >
                                    <div className="space-y-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="bg-white/[0.03] p-2 rounded-xl border border-white/[0.04]">
                                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">NNE</p>
                                                <p className="text-xs text-white font-bold truncate">{comp.nne || '-'}</p>
                                            </div>
                                            <div className="bg-white/[0.03] p-2 rounded-xl border border-white/[0.04]">
                                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">Serie</p>
                                                <p className="text-xs text-white font-bold truncate">{comp.serie || '-'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                                            <Calendar className="w-3 h-3" />
                                            <span>{new Date(comp.fecha_ingreso).toLocaleDateString()}</span>
                                            <span className="text-white/10 mx-1">|</span>
                                            <Boxes className="w-3 h-3" />
                                            <span className="text-white font-semibold">{comp.total_ingresado || comp.cantidad}</span>
                                        </div>
                                    </div>
                                </CommonCard>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            <AnimatePresence>
                {selectedIds.length > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-20 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-lg"
                    >
                        <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.4)]">
                                    <CheckCircle className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h4 className="text-white font-black text-sm">{selectedIds.length} seleccionados</h4>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Inventario masivo</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
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
                message={`Estás a punto de eliminar permanentemente ${selectedIds.length} repuestos del inventario. Esta acción no se puede deshacer.`}
                onConfirm={handleBulkDelete}
                onClose={() => setIsBulkDeleteOpen(false)}
                type="danger"
                isLoading={isProcessingBulk}
            />

            <ComponenteFormModal
                isOpen={isFormOpen}
                initialData={formData}
                onClose={() => setIsFormOpen(false)}
                onSave={handleSave}
            />

            <ComponenteDetalleModal
                isOpen={!!selectedComponente}
                componente={selectedComponente}
                onClose={() => setSelectedComponente(null)}
                onViewHistory={(comp: any) => {
                    setComponenteForHistory(comp);
                    setIsHistoryOpen(true);
                }}
                onQuickStockAdd={handleQuickStockAdd}
            />

            <ConfirmModal
                isOpen={isDeleteOpen}
                title="Eliminar Repuesto"
                message={`¿Estás seguro que deseas eliminar "${componenteToDelete?.nombre}" del inventario? Esta acción no se puede deshacer.`}
                onConfirm={handleDelete}
                onClose={() => setIsDeleteOpen(false)}
            />

            <MovimientosStockModal
               isOpen={isHistoryOpen}
               componente={componenteForHistory}
               onClose={() => { setIsHistoryOpen(false); setComponenteForHistory(null); }}
            />
        </div>
    );
};

export default Componentes;
