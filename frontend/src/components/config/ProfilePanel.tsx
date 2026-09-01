import React, { useState, useEffect } from 'react';
import { apiRequest, getUserData } from '../../services/api';
import { UserCircle, Lock, Save, AlertCircle, Mail, ShieldCheck, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ProfilePanel = () => {
    const [perfil, setPerfil] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({ usuario: '', email: '', password: '', confirmPassword: '' });
    const [error, setError] = useState('');

    const fetchPerfil = async () => {
        try {
            setLoading(true);
            const data = await apiRequest('/usuarios/perfil');
            setPerfil(data);
            setFormData({ usuario: data.usuario || '', email: data.email || '', password: '', confirmPassword: '' });
        } catch { setError("No se pudo cargar la información del perfil."); }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchPerfil(); }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setError(''); setSuccess(false);
        if (formData.password && formData.password !== formData.confirmPassword) { setError("Las contraseñas no coinciden."); return; }
        try {
            setSaving(true);
            await apiRequest('/usuarios/perfil', { method: 'PUT', body: JSON.stringify({ usuario: formData.usuario, email: formData.email, password: formData.password || undefined }) });
            const localData = getUserData();
            if (localData) localStorage.setItem("equipos_user_data", JSON.stringify({ ...localData, usuario: formData.usuario, email: formData.email }));
            setSuccess(true);
            setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
            setTimeout(() => setSuccess(false), 3000);
            fetchPerfil();
        } catch (err) { setError(err.message); }
        finally { setSaving(false); }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="w-6 h-6 rounded-full border-2 border-zinc-800 border-t-white animate-spin mb-3" />
                <span className="text-zinc-500 text-xs font-semibold">Cargando perfil...</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                            <UserCircle className="w-4 h-4 text-zinc-500" /> Información de Cuenta
                        </h3>
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 ml-1">Nombre de Usuario</label>
                                <input type="text" value={formData.usuario} onChange={e => setFormData({ ...formData, usuario: e.target.value })} placeholder="Nombre de usuario"
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-600 focus:outline-none transition-colors" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 ml-1">Correo Electrónico</label>
                                <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="correo@ejemplo.com"
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-600 focus:outline-none transition-colors" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                            <Lock className="w-4 h-4 text-zinc-500" /> Seguridad
                        </h3>
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 ml-1">Nueva Contraseña</label>
                                <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="Dejar en blanco para no cambiar" autoComplete="new-password"
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-600 focus:outline-none transition-colors" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 ml-1">Confirmar Contraseña</label>
                                <input type="password" value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} placeholder="Repita la nueva contraseña" autoComplete="new-password"
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-600 focus:outline-none transition-colors" />
                            </div>
                        </div>
                        <p className="text-xs text-zinc-500">Deje los campos en blanco si no desea cambiarla. Mínimo 8 caracteres.</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <button disabled={saving} className="inline-flex items-center gap-2 bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white border border-transparent disabled:opacity-50 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                    <AnimatePresence mode="wait">
                        {error && <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium px-3 py-2 rounded-xl flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</motion.div>}
                        {success && <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium px-3 py-2 rounded-xl flex items-center gap-2"><ShieldCheck className="w-4 h-4 shrink-0" />¡Perfil actualizado!</motion.div>}
                    </AnimatePresence>
                </div>
            </form>
        </div>
    );
};
export default ProfilePanel;
