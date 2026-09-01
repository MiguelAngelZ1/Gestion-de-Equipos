import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { apiRequest } from '../../services/api';
import { Users, Plus, Edit2, Trash2, X, Shield, Mail, User as UserIcon, Lock, Loader2, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../common/ConfirmModal';
import CommonCard from '../common/CommonCard';
import SearchInput from '../common/SearchInput';
import Select from '../common/Select';
import { matchesSearch } from '../../utils/search';

const UserManagementPanel = () => {
    const { showToast } = useToast();
    const [usuarios, setUsuarios] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        usuario: '',
        email: '',
        password: '',
        rol: 'USER'
    });
    const [isSaving, setIsSaving] = useState(false);

    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [detailsUser, setDetailsUser] = useState(null);

    const fetchUsuarios = async () => {
        try {
            setLoading(true);
            const data = await apiRequest('/usuarios');
            setUsuarios(data);
        } catch (error) {
            showToast("Error", "No se pudieron obtener los usuarios.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsuarios();
    }, []);

    const handleOpenModal = (user = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                usuario: user.usuario,
                email: user.email,
                password: '', // Password se deja vacío al editar a menos que se quiera cambiar
                rol: user.rol
            });
        } else {
            setEditingUser(null);
            setFormData({
                usuario: '',
                email: '',
                password: '',
                rol: 'USER'
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (isSaving) return;
        
        setIsSaving(true);
        try {
            const endpoint = editingUser ? `/usuarios/${editingUser.id}` : '/usuarios';
            const method = editingUser ? 'PUT' : 'POST';
            
            await apiRequest(endpoint, {
                method,
                body: JSON.stringify(formData)
            });

            setIsModalOpen(false);
            fetchUsuarios();
            showToast(
              editingUser ? 'Usuario Actualizado' : 'Usuario Creado',
              editingUser 
                ? `Los datos de "${formData.usuario}" han sido actualizados.` 
                : `El usuario "${formData.usuario}" ha sido registrado correctamente.`,
              'success'
            );
        } catch (error) {
            showToast("Error de Usuario", error.message || 'No se pudo procesar la solicitud del usuario.', "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        try {
            await apiRequest(`/usuarios/${userToDelete.id}`, { method: 'DELETE' });
            
            // Actualización optimista
            setUsuarios(prev => prev.filter(u => u.id !== userToDelete.id));
            
            setIsDeleteOpen(false);
            showToast("Usuario Eliminado", `El usuario "${userToDelete.usuario}" ha sido borrado.`, "info");
            setUserToDelete(null);
            fetchUsuarios(); // Sincronizar
        } catch (error) {
            showToast("Error", "No se pudo eliminar el usuario.", "error");
        }
    };

    const filteredUsuarios = usuarios.filter(user => matchesSearch(user, searchTerm));

    return (
        <div className="flex flex-col flex-1 min-h-0 gap-4">
        <div className="flex items-center gap-2 shrink-0">
              <SearchInput
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por usuario o rol..."
              />
            <button
                onClick={() => handleOpenModal()}
                className="inline-flex items-center gap-1.5 bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0"
            >
                <Plus className="w-4 h-4" /> Nuevo Usuario
            </button>
        </div>

            <div className="flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="w-6 h-6 rounded-full border-2 border-zinc-800 border-t-white animate-spin mb-3" />
                        <span className="text-xs font-semibold text-zinc-500">Cargando usuarios...</span>
                    </div>
                ) : usuarios.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 bg-zinc-900 border border-dashed border-zinc-800 rounded-xl">
                        <Users className="w-8 h-8 text-zinc-600 mb-3" />
                        <p className="text-sm text-zinc-500">No hay usuarios registrados.</p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full gap-3 pb-6">
                        {filteredUsuarios.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 bg-zinc-900 border border-dashed border-zinc-800 rounded-xl">
                                <p className="text-sm text-zinc-500">Sin resultados para la búsqueda.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,210px))] justify-start gap-3 auto-rows-min content-start">
                                <AnimatePresence mode="popLayout">
                                    {filteredUsuarios.map(user => {
                                const isAdmin = (user.rol || '').toLowerCase() === 'admin';
                                return (
                                    <motion.div key={user.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2.5 hover:border-zinc-700 transition-colors h-fit">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <UserIcon className="w-4 h-4 text-zinc-500 shrink-0" />
                                            <span className="text-sm font-semibold text-white truncate">{user.usuario}</span>
                                            <span className={`ml-auto text-[10px] font-bold uppercase tracking-widest shrink-0 ${isAdmin ? 'text-amber-400' : 'text-zinc-500'}`}>{user.rol}</span>
                                        </div>
                                        <div className="flex items-center gap-1 pt-2.5 border-t border-zinc-800">
                                            <button onClick={() => { setDetailsUser(user); setIsDetailsOpen(true); }} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white text-xs font-medium transition-colors cursor-pointer"><Eye className="w-3.5 h-3.5" /> Ver</button>
                                            <div className="flex-1" />
                                            <button onClick={() => handleOpenModal(user)} className="w-7 h-7 grid place-items-center rounded-lg bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white transition-colors cursor-pointer"><Edit2 className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => { setUserToDelete(user); setIsDeleteOpen(true); }} className="w-7 h-7 grid place-items-center rounded-lg bg-transparent hover:bg-white/5 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal de Create/Edit */}
            {typeof document !== 'undefined' && createPortal(
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 12 }}
                            className="bg-zinc-900 border border-zinc-800 w-auto min-w-[340px] max-w-md rounded-xl shadow-2xl overflow-hidden h-auto"
                        >
                            <form onSubmit={handleSave} className={`p-5 space-y-4 ${isSaving ? 'opacity-50' : ''}`}>
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-white">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
                                    <button type="button" disabled={isSaving} onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors cursor-pointer">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 ml-1">Username</label>
                                            <input
                                                type="text"
                                                disabled={isSaving}
                                                value={formData.usuario}
                                                onChange={e => setFormData({ ...formData, usuario: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder:text-zinc-500 focus:border-zinc-600 outline-none transition-colors"
                                                required
                                                placeholder="Ej: mimperio"
                                            />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 ml-1">Email</label>
                                            <input
                                                type="email"
                                                disabled={isSaving}
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder:text-zinc-500 focus:border-zinc-600 outline-none transition-colors"
                                                required
                                                placeholder="usuario@ejemplo.com"
                                            />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 ml-1">Password {editingUser && '(Opcional)'}</label>
                                            <input
                                                type="password"
                                                disabled={isSaving}
                                                value={formData.password}
                                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder:text-zinc-500 focus:border-zinc-600 outline-none transition-colors"
                                                required={!editingUser}
                                                placeholder={editingUser ? "Dejar en blanco para no cambiar" : "••••••••"}
                                            />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                                <Select
                                                    label="Rol"
                                                    icon={Shield}
                                                    disabled={isSaving}
                                                    value={formData.rol}
                                                    onChange={e => setFormData({ ...formData, rol: e.target.value })}
                                                    options={[
                                                        { value: "USER", label: "User" },
                                                        { value: "ADMIN", label: "Admin" }
                                                    ]}
                                                />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className={`w-full bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white border border-transparent rounded-xl py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                    {isSaving ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
                                    ) : (
                                        editingUser ? 'Guardar Cambios' : 'Crear Usuario'
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>, document.body)}

            <ConfirmModal
                isOpen={isDeleteOpen}
                onClose={() => { setIsDeleteOpen(false); setUserToDelete(null); }}
                onConfirm={handleDelete}
                title="Eliminar Usuario"
                message={`¿Estás seguro que deseas eliminar permanentemente a "${userToDelete?.usuario}"? Esta acción no se puede deshacer.`}
                type="danger"
            />

            {/* Modal de Detalles */}
            {typeof document !== 'undefined' && createPortal(
            <AnimatePresence>
                {isDetailsOpen && detailsUser && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 12 }}
                            className="bg-zinc-900 border border-zinc-800 w-auto min-w-[340px] max-w-md rounded-xl shadow-2xl overflow-hidden h-auto"
                        >
                            <div className="p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <UserIcon className="w-5 h-5 text-zinc-500" />
                                        <div>
                                            <h3 className="text-sm font-bold text-white">{detailsUser.usuario}</h3>
                                            <span className={`text-xs font-semibold ${(detailsUser.rol || '').toLowerCase() === 'admin' ? 'text-amber-400' : 'text-zinc-500'}`}>{detailsUser.rol}</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setIsDetailsOpen(false)}
                                        className="w-8 h-8 grid place-items-center rounded-lg bg-transparent hover:bg-white/5 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-3 flex items-center gap-3">
                                    <Mail className="w-4 h-4 text-zinc-500 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Email</p>
                                        <p className="text-sm text-zinc-200 truncate">{detailsUser.email}</p>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button 
                                        onClick={() => { handleOpenModal(detailsUser); setIsDetailsOpen(false); }}
                                        className="flex-1 bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                        Editar
                                    </button>
                                    <button 
                                        onClick={() => { setIsDetailsOpen(false); }}
                                        className="px-6 bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white text-sm font-semibold py-2.5 rounded-xl transition-colors cursor-pointer"
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>, document.body)}
        </div>
    );
};

export default UserManagementPanel;
