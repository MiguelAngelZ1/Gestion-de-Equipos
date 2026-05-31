import React, { useState, useEffect } from 'react';
import { apiRequest, getUserData } from '../../services/api';
import { UserCircle, Lock, Save, Send, AlertCircle, Mail, MessageSquare, ShieldCheck, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ProfilePanel = () => {
    const userLocal = getUserData();
    const [perfil, setPerfil] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    
    const [formData, setFormData] = useState({
        usuario: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const [error, setError] = useState('');

    const fetchPerfil = async () => {
        try {
            setLoading(true);
            const data = await apiRequest('/usuarios/perfil');
            setPerfil(data);
            setFormData({
                usuario: data.usuario || '',
                email: data.email || '',
                password: '',
                confirmPassword: ''
            });
        } catch (error) {
            console.error("Error fetching perfil:", error);
            setError("No se pudo cargar la información del perfil.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPerfil();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        if (formData.password && formData.password !== formData.confirmPassword) {
            setError("Las contraseñas no coinciden.");
            return;
        }

        try {
            setSaving(true);
            const response = await apiRequest('/usuarios/perfil', {
                method: 'PUT',
                body: JSON.stringify({
                    usuario: formData.usuario,
                    email: formData.email,
                    password: formData.password || undefined
                })
            });
            
            // Si el cambio fue exitoso y el usuario es el actual, actualizar localStorage para reflejar el cambio de nombre
            const localData = getUserData();
            if (localData) {
                localStorage.setItem("equipos_user_data", JSON.stringify({
                    ...localData,
                    usuario: formData.usuario,
                    email: formData.email
                }));
            }

            setSuccess(true);
            setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
            setTimeout(() => setSuccess(false), 3000);
            fetchPerfil();
        } catch (error) {
            setError(error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                <span className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Cargando tu perfil...</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:h-full">
            {/* Account Info Section */}
            <form onSubmit={handleSave} className="space-y-6">
                <div className="sm:bg-white/5 sm:border border-white/10 sm:p-6 sm:rounded-2xl space-y-4 sm:space-y-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <UserCircle className="w-4 h-4 text-indigo-400" /> Información de Cuenta
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombre de Usuario</label>
                            <div className="relative">
                                <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    value={formData.usuario}
                                    onChange={e => setFormData({ ...formData, usuario: e.target.value })}
                                    placeholder="Nombre de usuario"
                                    className="w-full bg-black/30 border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none transition-all"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Correo Electrónico</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="correo@ejemplo.com"
                                    className="w-full bg-black/30 border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Security Section */}
                <div className="sm:bg-white/5 sm:border border-white/10 sm:p-5 sm:rounded-2xl space-y-4 sm:space-y-5">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-indigo-400" /> Seguridad
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nueva Contraseña</label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                placeholder="Dejar en blanco para no cambiar"
                                autoComplete="new-password"
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none transition-all placeholder:text-white/10"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Confirmar Contraseña</label>
                            <input
                                type="password"
                                value={formData.confirmPassword}
                                onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                placeholder="Repita la nueva contraseña"
                                autoComplete="new-password"
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none transition-all placeholder:text-white/10"
                            />
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                        Deje los campos de contraseña en blanco si no desea cambiarla. Use una contraseña segura de al menos 8 caracteres.
                    </p>
                </div>

                {/* Bottom Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <AnimatePresence mode="wait">
                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-3 flex items-center gap-3 text-rose-400 text-xs font-bold"
                            >
                                <AlertCircle className="w-4 h-4" /> {error}
                            </motion.div>
                        )}
                        {success && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 flex items-center gap-3 text-emerald-400 text-xs font-bold"
                            >
                                <ShieldCheck className="w-4 h-4" /> ¡Perfil actualizado exitosamente!
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={saving}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2.5 px-6 font-black uppercase tracking-widest text-xs transition-all shadow-[0_15px_30px_rgba(79,70,229,0.3)] disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </motion.button>
                </div>
            </form>
        </div>
    );
};

export default ProfilePanel;
