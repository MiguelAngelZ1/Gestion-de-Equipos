import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../services/api';
import { ROLES } from '../config/constants';
import { Package, Plus, Calendar, Trash2, Boxes, Check, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { matchesSearch } from '../utils/search';
import CommonCard from '../components/common/CommonCard';
import SearchInput from '../components/common/SearchInput';
import ConfirmModal from '../components/common/ConfirmModal';
import ComponenteFormModal from '../components/componentes/ComponenteFormModal';
import ComponenteDetalleModal from '../components/componentes/ComponenteDetalleModal';
import MovimientosStockModal from '../components/componentes/MovimientosStockModal';
import { useToast } from '../context/ToastContext';

const spring = { type: 'spring' as const, stiffness: 400, damping: 30 };

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
        <div className="flex-1 min-h-0 flex flex-col space-y-4 w-full max-w-full overflow-hidden">
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="min-w-0 w-auto max-w-full">
                    <SearchInput
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por Nombre, NNE o Serie..."
                    />
                </div>
                {userRole === ROLES.ADMIN && (
                    <div className="flex gap-2 shrink-0">
                        <button
                            onClick={() => { setFormData({}); setIsFormOpen(true); }}
                            className="inline-flex items-center justify-center gap-2 px-2 py-2.5 text-sm font-semibold text-[#c4c5d9] hover:text-white transition-colors"
                        >
                            <Plus className="w-4 h-4" /> Nuevo
                        </button>
                    </div>
                )}
            </div>

            {loading && componentes.length === 0 ? (
                <div className="flex-1 min-h-[calc(100vh-280px)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 content-start overflow-y-auto custom-scrollbar pr-1">
                    {[1,2,3,4,5,6].map(i => <div key={i} className="h-44 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse" />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex-1 min-h-[calc(100vh-280px)] flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 rounded-xl">
                    <Boxes className="w-8 h-8 text-zinc-600 mb-3" />
                    <p className="font-semibold">Sin resultados</p>
                    <p className="text-sm text-zinc-500 mt-1">{search ? `No hay repuestos para "${search}"` : 'No hay repuestos registrados'}</p>
                </div>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col space-y-3 overflow-hidden">
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <div className="h-px flex-1 bg-zinc-800" />
                  <span className="flex items-center gap-3">
                    {userRole === ROLES.ADMIN && (
                      <button onClick={toggleAll} className="inline-flex items-center gap-1.5 font-semibold hover:text-zinc-300">
                        <span className={`w-4 h-4 rounded border grid place-items-center ${filtered.every(c => selectedIds.includes(c.id)) ? 'bg-white border-white text-zinc-900' : 'border-zinc-700'}`}>
                          {filtered.every(c => selectedIds.includes(c.id)) && <Check className="w-3 h-3" />}
                        </span> Seleccionar todo
                      </button>
                    )}
                    <span>{filtered.length} {filtered.length === 1 ? 'repuesto' : 'repuestos'}</span>
                  </span>
                  <div className="h-px flex-1 bg-zinc-800" />
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
                    <AnimatePresence>
                        {filtered.map((comp, idx) => (
                            <motion.div
                                key={comp.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.02, ...spring }}
                            >
                                <CommonCard
                                    layoutId={`comp-${comp.id}`}
                                    title={comp.nombre}
                                    badge={`${comp.cantidad} unids`}
                                    badgeColor={comp.cantidad > 0 ? '#22c55e' : '#ef4444'}
                                    icon={Package}
                                    onView={() => setSelectedComponente(comp)}
                                    onEdit={userRole === ROLES.ADMIN ? () => { setFormData(comp); setIsFormOpen(true); } : null}
                                    onDelete={userRole === ROLES.ADMIN ? () => { setComponenteToDelete(comp); setIsDeleteOpen(true); } : null}
                                    selectable={userRole === ROLES.ADMIN}
                                    isSelected={selectedIds.includes(comp.id)}
                                    onSelect={() => toggleSelect(comp.id)}
                                    onHistory={() => { setComponenteForHistory(comp); setIsHistoryOpen(true); }}
                                >
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-1.5 text-xs text-zinc-400"><Package className="w-3 h-3 text-zinc-500 shrink-0" /><span className="truncate">NNE: {comp.nne || '-'}</span></div>
                                        <div className="flex items-center gap-1.5 text-xs text-zinc-300"><Tag className="w-3 h-3 text-zinc-500 shrink-0" /><span className="truncate font-medium">Serie: {comp.serie || '-'}</span></div>
                                        <div className="flex items-center gap-1.5 text-xs text-zinc-400"><Calendar className="w-3 h-3 text-zinc-500 shrink-0" /><span className="truncate">{new Date(comp.fecha_ingreso).toLocaleDateString()}</span></div>
                                        <div className="flex items-center gap-1.5 text-xs text-zinc-400"><Boxes className="w-3 h-3 text-zinc-500 shrink-0" /><span className="truncate">{comp.cantidad} en stock · {comp.total_ingresado || comp.cantidad} ingresados</span></div>
                                    </div>
                                </CommonCard>
                            </motion.div>
                        ))}
                    </AnimatePresence>
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
