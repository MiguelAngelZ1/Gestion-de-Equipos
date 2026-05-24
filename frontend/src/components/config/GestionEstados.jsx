import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { apiRequest } from '../../services/api';
import { Plus, Palette, Edit2, Trash2, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../context/ToastContext';
import CommonCard from '../common/CommonCard';
import ConfirmModal from '../common/ConfirmModal';

const suggestedColors = [
  { name: 'Emeralda', hex: '#10b981' },
  { name: 'Rosa', hex: '#f43f5e' },
  { name: 'Ámbar', hex: '#f59e0b' },
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Cian', hex: '#06b6d4' },
  { name: 'Slate', hex: '#64748b' }
];

const GestionEstados = () => {
  const { showToast } = useToast();
  const [estados, setEstados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ nombre: "", color_hex: "#10b981" });
  
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const fetchEstados = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/config/estados');
      setEstados(data);
    } catch (err) {
      showToast("Error", "No se pudieron obtener los estados.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEstados(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await apiRequest(`/config/estados/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
      } else {
        await apiRequest('/config/estados', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }
      setIsModalOpen(false);
      const nombre = formData.nombre;
      setFormData({ nombre: "", color_hex: "#10b981" });
      fetchEstados();
      showToast(
        editingItem ? 'Estado Actualizado' : 'Estado Guardado',
        editingItem ? `El estado "${nombre}" ha sido modificado.` : `El estado "${nombre}" ha sido creado.`,
        'success'
      );
    } catch (err) {
      showToast("Error", "No se pudo guardar el estado. Verifica que el nombre no sea duplicado.", "error");
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await apiRequest(`/config/estados/${itemToDelete.id}`, { method: 'DELETE' });
      setIsDeleteOpen(false);
      showToast("Estado Eliminado", `El estado "${itemToDelete.nombre}" ha sido borrado.`, "info");
      setItemToDelete(null);
      fetchEstados();
    } catch (err) {
      showToast("Error de Eliminación", "No se puede eliminar un estado si está siendo utilizado por algún equipo.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-[#1e293b]/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
        <div>
          <h3 className="text-xl font-bold text-white">Estados Operativos</h3>
          <p className="text-slate-400 text-sm">Define los estados y sus colores para las etiquetas del sistema.</p>
        </div>
        <button 
          onClick={() => { setEditingItem(null); setFormData({ nombre: "", color_hex: "#10b981" }); setIsModalOpen(true); }}
          className="bg-amber-600 hover:bg-amber-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-5 h-5" /> Nuevo Estado
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-full py-20 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div></div>
        ) : (Array.isArray(estados) ? estados : []).map(estado => (
          <CommonCard 
            key={estado.id} 
            title={estado.nombre} 
            badge="Estado"
            badgeColor={`border-transparent text-white`}
            // Usamos style dinámico para el badge ya que el color viene de DB
            icon={Palette}
            onEdit={() => { setEditingItem(estado); setFormData({ nombre: estado.nombre, color_hex: estado.color_hex || "#10b981" }); setIsModalOpen(true); }}
            onDelete={() => { setItemToDelete(estado); setIsDeleteOpen(true); }}
          >
             <div className="flex items-center gap-2 mt-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: estado.color_hex }}></div>
                <span className="text-xs text-slate-400 font-mono uppercase">{estado.color_hex}</span>
             </div>
          </CommonCard>
        ))}
      </div>

      {/* Modal de Confirmación */}
      <ConfirmModal 
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Estado"
        message={`¿Estás seguro que deseas eliminar el estado "${itemToDelete?.nombre}"? Esta acción no se puede deshacer.`}
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
                <h3 className="text-xl font-bold text-white mb-6 font-outfit">{editingItem ? 'Editar Estado' : 'Nuevo Estado'}</h3>
                <form onSubmit={handleSave} className="space-y-5">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Nombre del Estado</label>
                    <input 
                      type="text" 
                      value={formData.nombre}
                      onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500/50 transition-all font-medium"
                      placeholder="Ej: En Servicio"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">Color de Etiqueta</label>
                    <div className="grid grid-cols-6 gap-2">
                      {suggestedColors.map(c => (
                        <button 
                          key={c.hex}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, color_hex: c.hex }))}
                          className={`h-10 rounded-lg border-2 transition-all cursor-pointer ${formData.color_hex === c.hex ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-50 hover:opacity-100'}`}
                          style={{ backgroundColor: c.hex }}
                          title={c.name}
                        />
                      ))}
                    </div>
                    <div className="mt-4 flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className="w-8 h-8 rounded-lg shadow-inner" style={{ backgroundColor: formData.color_hex }}></div>
                      <input 
                        type="text"
                        value={formData.color_hex}
                        onChange={(e) => setFormData(prev => ({ ...prev, color_hex: e.target.value }))}
                        className="bg-transparent border-none text-white font-mono text-sm focus:outline-none w-full"
                      />
                    </div>
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
                      Guardar Estado
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

export default GestionEstados;
