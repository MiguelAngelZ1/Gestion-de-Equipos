import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { apiRequest } from '../../services/api';
import { Plus, Shield, Edit2, Trash2, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../context/ToastContext';
import CommonCard from '../common/CommonCard';
import ConfirmModal from '../common/ConfirmModal';

const GestionGrados = () => {
  const { showToast } = useToast();
  const [grados, setGrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ abreviatura: "", grado_completo: "" });
  
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const fetchGrados = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/config/grados');
      setGrados(data);
    } catch (err) {
      showToast("Error", "No se pudieron obtener los grados.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGrados(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await apiRequest(`/config/grados/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
      } else {
        await apiRequest('/config/grados', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }
      setIsModalOpen(false);
      const nombre = formData.grado_completo;
      setFormData({ abreviatura: "", grado_completo: "" });
      fetchGrados();
      showToast(
        editingItem ? 'Grado Actualizado' : 'Grado Guardado',
        editingItem ? `El grado "${nombre}" ha sido modificado.` : `El grado "${nombre}" ha sido creado.`,
        'success'
      );
    } catch (err) {
      showToast("Error", "No se pudo guardar el grado militar. Inténtalo de nuevo.", "error");
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await apiRequest(`/config/grados/${itemToDelete.id}`, { method: 'DELETE' });
      setIsDeleteOpen(false);
      showToast("Grado Eliminado", `El grado "${itemToDelete.grado_completo}" ha sido borrado.`, "info");
      setItemToDelete(null);
      fetchGrados();
    } catch (err) {
      showToast("Error de Eliminación", "No se puede eliminar un grado que está asignado a responsables activos.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-[#1e293b]/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
        <div>
          <h3 className="text-xl font-bold text-white">Catálogo de Grados</h3>
          <p className="text-slate-400 text-sm">Administra las jerarquías y sus abreviaturas técnicas.</p>
        </div>
        <button 
          onClick={() => { setEditingItem(null); setFormData({ abreviatura: "", grado_completo: "" }); setIsModalOpen(true); }}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-5 h-5" /> Nuevo Grado
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-full py-20 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div></div>
        ) : (Array.isArray(grados) ? grados : []).map(grado => (
          <CommonCard 
            key={grado.id} 
            title={grado.grado_completo} 
            badge={grado.abreviatura}
            badgeColor="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            icon={Shield}
            onEdit={() => { setEditingItem(grado); setFormData({ abreviatura: grado.abreviatura, grado_completo: grado.grado_completo }); setIsModalOpen(true); }}
            onDelete={() => { setItemToDelete(grado); setIsDeleteOpen(true); }}
          />
        ))}
      </div>

      {/* Modal de Confirmación */}
      <ConfirmModal 
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Grado"
        message={`¿Estás seguro que deseas eliminar el grado "${itemToDelete?.grado_completo}"? Esta acción no se puede deshacer.`}
        type="danger"
      />

      {/* Formulario con Portal */}
      {createPortal(
        <AnimatePresence>
          {isModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 z-[150] flex items-center justify-center p-5 sm:p-6 bg-black/85 backdrop-blur-md h-[100dvh] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#1e293b] border border-white/20 p-8 rounded-3xl w-full max-w-md shadow-2xl max-h-[calc(100dvh-40px)] overflow-y-auto"
              >
                <h3 className="text-xl font-bold text-white mb-6 font-outfit">{editingItem ? 'Editar Grado' : 'Nuevo Grado'}</h3>
                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Abreviatura</label>
                    <input 
                      type="text" 
                      value={formData.abreviatura}
                      onChange={(e) => setFormData(prev => ({ ...prev, abreviatura: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-all font-medium"
                      placeholder="Ej: Sgto"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Grado Completo</label>
                    <input 
                      type="text" 
                      value={formData.grado_completo}
                      onChange={(e) => setFormData(prev => ({ ...prev, grado_completo: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-all font-medium"
                      placeholder="Ej: Sargento"
                      required
                    />
                  </div>
                  <div className="flex gap-3 pt-6">
                    <button 
                      type="button" 
                      onClick={() => setIsModalOpen(false)} 
                      className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 transition-all font-bold cursor-pointer text-sm"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit" 
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-2.5 rounded-xl transition-all shadow-[0_0_20_rgba(79,70,229,0.3)] flex items-center justify-center gap-2 cursor-pointer flex-1 text-sm"
                    >
                      <Save className="w-4 h-4" />
                      Guardar Grado
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default GestionGrados;
