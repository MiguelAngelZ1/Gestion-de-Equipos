import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { apiRequest } from '../../services/api';
import { Plus, MapPin, Edit2, Trash2, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../context/ToastContext';
import CommonCard from '../common/CommonCard';
import ConfirmModal from '../common/ConfirmModal';

const GestionUbicaciones = () => {
  const { showToast } = useToast();
  const [ubicaciones, setUbicaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [nombre, setNombre] = useState("");
  
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const fetchUbicaciones = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/config/ubicaciones');
      setUbicaciones(data);
    } catch (error) {
      showToast("Error", "No se pudieron obtener las ubicaciones.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUbicaciones();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await apiRequest(`/config/ubicaciones/${editingItem.id}`, {
          method: 'PUT',
          body: { nombre }
        });
      } else {
        await apiRequest('/config/ubicaciones', {
          method: 'POST',
          body: { nombre }
        });
      }
      setIsModalOpen(false);
      setEditingItem(null);
      setNombre("");
      fetchUbicaciones();
      showToast(
        editingItem ? 'Ubicación Actualizada' : 'Ubicación Guardada',
        editingItem ? `La ubicación "${nombre}" ha sido modificada.` : `La ubicación "${nombre}" ha sido creada.`,
        'success'
      );
    } catch (error) {
      showToast("Error", "No se pudo guardar la ubicación. Asegúrate de que el nombre sea único.", "error");
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await apiRequest(`/config/ubicaciones/${itemToDelete.id}`, { method: 'DELETE' });
      setIsDeleteOpen(false);
      showToast("Ubicación Eliminada", `La ubicación "${itemToDelete.nombre}" ha sido borrada.`, "info");
      setItemToDelete(null);
      fetchUbicaciones();
    } catch (err) {
      showToast("Error de Eliminación", "No se puede eliminar una ubicación que tiene equipos asignados actualmente.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10">
        <div>
          <h3 className="text-lg font-bold text-white">Listado de Ubicaciones</h3>
          <p className="text-slate-400 text-sm italic">Define las áreas, oficinas o depósitos donde se encuentran los equipos.</p>
        </div>
        <button 
          onClick={() => { setEditingItem(null); setNombre(""); setIsModalOpen(true); }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl transition-all shadow-lg shadow-indigo-600/20 cursor-pointer flex items-center gap-2 font-bold"
        >
          <Plus className="w-5 h-5" />
          Nueva Ubicación
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p className="text-slate-400">Cargando...</p>
        ) : Array.isArray(ubicaciones) ? (
            ubicaciones.map(item => (
              <CommonCard 
                key={item.id} 
                title={item.nombre} 
                icon={MapPin}
                onEdit={() => { setEditingItem(item); setNombre(item.nombre); setIsModalOpen(true); }}
                onDelete={() => { setItemToDelete(item); setIsDeleteOpen(true); }}
              />
            ))
        ) : (
          <p className="text-rose-400">Error al cargar ubicaciones. Reinicie el servidor.</p>
        )}
      </div>

      <ConfirmModal 
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Ubicación"
        message={`¿Estás seguro que deseas eliminar la ubicación "${itemToDelete?.nombre}"? Esta acción no se puede deshacer.`}
        type="danger"
      />

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
                <h3 className="text-xl font-bold text-white mb-6 font-outfit">{editingItem ? 'Editar Ubicación' : 'Nueva Ubicación'}</h3>
                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Nombre de la Ubicación</label>
                    <input 
                      type="text" 
                      autoFocus
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500/50 transition-all font-medium"
                      placeholder="Ej: Oficina Central, Depósito A"
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
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-2.5 rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] flex items-center justify-center gap-2 cursor-pointer flex-1 text-sm"
                    >
                      <Save className="w-4 h-4" />
                      Guardar Ubicación
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

export default GestionUbicaciones;
