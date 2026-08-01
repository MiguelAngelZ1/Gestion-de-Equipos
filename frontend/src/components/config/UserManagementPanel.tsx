import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api';
import { Users, Plus, Edit2, Trash2, X, AlertCircle, Shield, Mail, User as UserIcon, MessageSquare, Lock, Send, Loader2, Clock } from 'lucide-react';
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
        <div className="flex flex-col lg:h-full">
        <div className="flex flex-col sm:flex-row justify-start items-stretch sm:items-center gap-2.5 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex-1">
              <SearchInput
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por usuario o rol..."
              />
            </div>
            <button
                onClick={() => handleOpenModal()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 sm:px-6 py-2.5 rounded-xl text-[10px] sm:text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-600/20 cursor-pointer w-full sm:w-auto shrink-0"
            >
                <Plus className="w-4 h-4" /> Nuevo Usuario
            </button>
        </div>

            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar sm:bg-black/20 sm:rounded-2xl sm:border border-white/5 py-2 sm:p-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                        <Loader2 className="w-10 h-10 animate-spin text-indigo-400 mb-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cargando Usuarios...</span>
                    </div>
                ) : usuarios.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white/[0.02] border border-dashed border-white/10 rounded-[2.5rem]">
                        <Users className="w-12 h-12 text-slate-700 mb-4" />
                        <p className="text-slate-500 italic font-medium">No hay usuarios registrados.</p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full gap-3 pb-6">
                        {filteredUsuarios.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 bg-white/[0.02] border border-dashed border-white/10 rounded-[2.5rem]">
                                <SearchInput value="" onChange={() => {}} className="w-10 h-10 text-slate-600 mb-4" />
                                <p className="text-slate-500 font-medium text-sm">No se encontraron usuarios que coincidan con la búsqueda.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
                                <AnimatePresence mode="popLayout">
                                    {filteredUsuarios.map(user => {
                                const roleLower = (user.rol || '').toLowerCase();
                                const isAdmin = roleLower === 'admin';
                                
                                return (
                                    <CommonCard
                                        key={user.id}
                                        layoutId={`user-${user.id}`}
                                        title={user.usuario}
                                        icon={UserIcon}
                                        badge={user.rol}
                                        badgeAbsolute={false}
                                        badgeColor={isAdmin ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-[#1e293b] text-slate-400 border-white/5"}
                                        onView={() => { setDetailsUser(user); setIsDetailsOpen(true); }}
                                        onEdit={() => handleOpenModal(user)}
                                        onDelete={() => { setUserToDelete(user); setIsDeleteOpen(true); }}
                                        compact={true}
                                    />
                                );
                            })}
                        </AnimatePresence>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal de Create/Edit */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-slate-900 border border-white/10 w-full max-w-md rounded-2xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden"
                        >
                            <form onSubmit={handleSave} className={`p-5 sm:p-8 space-y-4 sm:space-y-5 ${isSaving ? 'opacity-50' : ''}`}>
                                <div className="flex items-center justify-between mb-1 sm:mb-2">
                                    <h3 className="text-lg sm:text-xl font-black text-white">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
                                    <button type="button" disabled={isSaving} onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors cursor-pointer">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Username</label>
                                        <div className="relative group">
                                            <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
                                            <input
                                                type="text"
                                                disabled={isSaving}
                                                value={formData.usuario}
                                                onChange={e => setFormData({ ...formData, usuario: e.target.value })}
                                                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:border-indigo-500/50 outline-none transition-all"
                                                required
                                                placeholder="Ej: mimperio"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Email</label>
                                        <div className="relative group">
                                            <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
                                            <input
                                                type="email"
                                                disabled={isSaving}
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:border-indigo-500/50 outline-none transition-all"
                                                required
                                                placeholder="usuario@ejemplo.com"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Password {editingUser && '(Opcional)'}</label>
                                        <div className="relative group">
                                            <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
                                            <input
                                                type="password"
                                                disabled={isSaving}
                                                value={formData.password}
                                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:border-indigo-500/50 outline-none transition-all"
                                                required={!editingUser}
                                                placeholder={editingUser ? "Dejar en blanco para no cambiar" : "••••••••"}
                                            />
                                        </div>
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
                                    className={`w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl py-4 font-bold transition-all shadow-[0_10px_20px_rgba(79,70,229,0.3)] flex items-center justify-center gap-2 ${isSaving ? 'opacity-80 cursor-not-allowed' : 'active:scale-95 cursor-pointer'}`}
                                >
                                    {isSaving ? (
                                        <><Loader2 className="w-5 h-5 animate-spin" /> Procesando...</>
                                    ) : (
                                        editingUser ? 'Guardar Cambios' : 'Crear Usuario'
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ConfirmModal
                isOpen={isDeleteOpen}
                onClose={() => { setIsDeleteOpen(false); setUserToDelete(null); }}
                onConfirm={handleDelete}
                title="Eliminar Usuario"
                message={`¿Estás seguro que deseas eliminar permanentemente a "${userToDelete?.usuario}"? Esta acción no se puede deshacer.`}
                type="danger"
            />

            {/* Modal de Detalles */}
            <AnimatePresence>
                {isDetailsOpen && detailsUser && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            className="bg-[#0f1523] border border-white/10 w-full max-w-lg rounded-2xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden"
                        >
                            <div className="p-5 sm:p-8 space-y-5 sm:space-y-8">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                                            <UserIcon className="w-7 h-7 text-indigo-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-white">{detailsUser.usuario}</h3>
                                            <div className="mt-1 flex items-center gap-2">
                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${(detailsUser.rol || '').toLowerCase() === 'admin' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-slate-500/10 text-slate-400 border-white/10'}`}>
                                                    {detailsUser.rol}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setIsDetailsOpen(false)}
                                        className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all shadow-lg cursor-pointer"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Información de Contacto</label>
                                            <div className="bg-black/20 rounded-3xl border border-white/5 overflow-hidden divide-y divide-white/5">
                                                <div className="p-4 flex items-center gap-4 group">
                                                    <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-indigo-500/10 transition-colors">
                                                        <Mail className="w-4 h-4 text-slate-400 group-hover:text-indigo-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">Email</p>
                                                        <p className="text-sm text-slate-200">{detailsUser.email}</p>
                                                    </div>
                                                </div>


                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <button 
                                            onClick={() => { handleOpenModal(detailsUser); setIsDetailsOpen(false); }}
                                            className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-95 border border-white/5 cursor-pointer"
                                        >
                                            <Edit2 className="w-4 h-4 text-slate-400" />
                                            Editar Usuario
                                        </button>
                                        <button 
                                            onClick={() => { setIsDetailsOpen(false); }}
                                            className="px-8 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl transition-all active:scale-95 shadow-lg shadow-indigo-600/20 cursor-pointer"
                                        >
                                            Cerrar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UserManagementPanel;
