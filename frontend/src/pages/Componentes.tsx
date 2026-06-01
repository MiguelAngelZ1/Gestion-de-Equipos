import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { ROLES } from '../config/constants';
import { Package, Plus, Search, Tag, Server, Calendar, Trash2, Edit2, AlertCircle, Info, Boxes, History, CheckSquare, Square, CheckCircle, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { matchesSearch } from '../utils/search';
import CommonCard from '../components/common/CommonCard';
import SearchInput from '../components/common/SearchInput';
import ConfirmModal from '../components/common/ConfirmModal';
import ComponenteFormModal from '../components/componentes/ComponenteFormModal';
import ComponenteDetalleModal from '../components/componentes/ComponenteDetalleModal';
import MovimientosStockModal from '../components/componentes/MovimientosStockModal';
import { useToast } from '../context/ToastContext';

const Componentes = () => {
    const { showToast } = useToast();
    const [componentes, setComponentes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState([]);
    const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
    const [isProcessingBulk, setIsProcessingBulk] = useState(false);
    
    // UI States
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formData, setFormData] = useState({});
    const [selectedComponente, setSelectedComponente] = useState(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [componenteToDelete, setComponenteToDelete] = useState(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [componenteForHistory, setComponenteForHistory] = useState(null);

    const userData = JSON.parse(localStorage.getItem("equipos_user_data") || "{}");
    const userRole = (userData.rol || ROLES.USER).toUpperCase();

    const fetchComponentes = async () => {
        try {
            setLoading(true);
            const data = await apiRequest(`/componentes${search ? `?q=${encodeURIComponent(search)}` : ''}`);
            setComponentes(data);
        } catch (error) {
            console.error("Error fetching componentes:", error);
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

    const toggleSelect = (id) => {
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
            // Actualización Optimista
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

    const handleSave = async (data) => {
        try {
            await apiRequest('/componentes', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showToast(data.id ? "Repuesto actualizado" : "Repuesto registrado", "La operación se realizó correctamente.", "success");
            setIsFormOpen(false);
            fetchComponentes();
        } catch (error) {
            console.error("[Componentes] Error guardando componente:", error);
            showToast("Error", error.message || "No se pudo procesar la solicitud del inventario.", "error");
        }
    };

    const handleDelete = async () => {
        try {
            await apiRequest(`/componentes/${componenteToDelete.id}`, { method: 'DELETE' });
            // Actualización Optimista
            setComponentes(prev => prev.filter(c => c.id !== componenteToDelete.id));
            showToast("Repuesto eliminado", "El registro ha sido borrado del inventario.", "success");
            setIsDeleteOpen(false);
            fetchComponentes();
        } catch (error) {
            console.error("Error eliminando componente:", error);
            showToast("Error", "No se pudo eliminar el repuesto.", "error");
        }
    };

    const handleQuickStockAdd = async (id, cantidadSuma) => {
        try {
            const componente = componentes.find(c => c.id === id);
            if (!componente) return;
            
            const nuevaCantidad = (componente.cantidad || 0) + cantidadSuma;
            
            await apiRequest('/componentes', {
                method: 'POST',
                body: JSON.stringify({
                    ...componente,
                    cantidad: nuevaCantidad
                })
            });
            
            // Actualización Optimista
            setComponentes(prev => prev.map(c => c.id === id ? { ...c, cantidad: nuevaCantidad } : c));
            
            showToast("Stock Actualizado", `Se han añadido ${cantidadSuma} unidades a "${componente.nombre}"`, "success");
            fetchComponentes();
            // Actualizar el detalle si es el componente seleccionado
            if (selectedComponente?.id === id) {
               setSelectedComponente(prev => ({ ...prev, cantidad: nuevaCantidad }));
            }
        } catch (error) {
            console.error("Error en ajuste rápido de stock:", error);
            showToast("Error", "No se pudo actualizar el stock.", "error");
            throw error;
        }
    };

    const filtered = componentes.filter(c => matchesSearch(c, search));

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-start gap-4">
                <div className="flex flex-row gap-2 md:gap-3 w-full lg:w-auto">
                    <div className="flex-1 min-w-0">
                        <SearchInput 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por Nombre, NNE o Serie..."
                        />
                    </div>
                    <button 
                        onClick={() => setIsFormOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white p-2.5 sm:px-6 sm:py-2.5 rounded-xl font-medium shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer w-auto active:scale-95 shrink-0"
                    >
                        <Plus className="w-5 h-5 shrink-0" /> <span className="hidden sm:inline">Cargar Repuesto</span>
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-3 px-2">
               <div className="h-px bg-white/10 flex-1"></div>
               <div className="flex items-center gap-6">
                  {userRole === ROLES.ADMIN && filtered.length > 0 && (
                    <button 
                      onClick={toggleAll}
                      className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-white transition-colors cursor-pointer group"
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                        filtered.every(c => selectedIds.includes(c.id)) 
                          ? 'bg-indigo-600 border-indigo-500' 
                          : 'border-white/20 group-hover:border-indigo-500/50'
                      }`}>
                         {filtered.every(c => selectedIds.includes(c.id)) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      Seleccionar Todo
                    </button>
                  )}
                  <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                     Repuestos: <span className="text-indigo-400">{filtered.length}</span>
                  </h2>
               </div>
               <div className="h-px bg-white/10 flex-1"></div>
            </div>

            {loading && componentes.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1,2,3].map(i => (
                        <div key={i} className="bg-white/5 rounded-[2rem] h-64 animate-pulse border border-white/5"></div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="py-20 bg-white/5 backdrop-blur-xl border border-dashed border-white/10 rounded-[3rem] flex flex-col items-center justify-center text-center p-8">
                    <Boxes className="w-20 h-20 text-slate-700 mb-6 opacity-20" />
                    <h3 className="text-2xl font-black text-white">No hay repuestos registrados</h3>
                    <p className="text-slate-500 max-w-sm font-medium mt-2 italic">Pulsa "Cargar Repuesto" para iniciar tu inventario de piezas técnicas.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {filtered.map(comp => (
                                <CommonCard
                                    key={comp.id}
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
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                            <div className="bg-black/20 p-2 rounded-xl border border-white/5">
                                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">NNE</p>
                                                <p className="text-xs text-white font-bold">{comp.nne || '-'}</p>
                                            </div>
                                            <div className="bg-black/20 p-2 rounded-xl border border-white/5">
                                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">Serie</p>
                                                <p className="text-xs text-white font-bold">{comp.serie || '-'}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2 pt-2 border-t border-white/5">
                                            <div className="flex items-center gap-2 text-slate-400 text-[11px] font-bold">
                                                <Calendar className="w-4 h-4 text-indigo-400" />
                                                <span>Entró el: {new Date(comp.fecha_ingreso).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-400 text-[11px] font-bold">
                                                <Boxes className="w-4 h-4 text-emerald-400" />
                                                <span>Stock Histórico: <span className="text-white">{comp.total_ingresado || comp.cantidad} unids</span></span>
                                            </div>
                                        </div>
                                    </div>
                                </CommonCard>
                        ))}
                    </AnimatePresence>
                </div>
            )}

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
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Inventario masivo</p>
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
                onViewHistory={(comp) => {
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
