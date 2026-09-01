import React, { useState, useEffect } from 'react';
import { Bell, Shield, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { notificationManager } from '../../services/notificationManager';
import { apiRequest } from '../../services/api';
import toast from 'react-hot-toast';

const NotificationsPanel = () => {
    const [permission, setPermission] = useState(Notification.permission);
    const [loading, setLoading] = useState(false);
    const [testSent, setTestSent] = useState(false);
    const [preferences, setPreferences] = useState({ stock: true, tickets: true, mantenimiento: true, backups: false, seguridad: true });

    useEffect(() => { setPermission(Notification.permission); }, []);
    useEffect(() => {
        (async () => {
            try {
                const serverPrefs = await apiRequest('/notificaciones/preferences');
                if (serverPrefs) { setPreferences(serverPrefs); localStorage.setItem('notification_preferences', JSON.stringify(serverPrefs)); }
            } catch {
                const saved = localStorage.getItem('notification_preferences');
                if (saved) setPreferences(JSON.parse(saved));
            }
        })();
    }, []);

    const handleRequestPermission = async () => { setLoading(true); const p = await notificationManager.requestPermission(); setPermission(p); setLoading(false); };
    const sendTestNotification = () => { notificationManager.showLocalNotification('¡Funciona! 🎉', { body: 'Notificación de prueba', tag: 'test-notification' }); setTestSent(true); setTimeout(() => setTestSent(false), 3000); };
    const togglePreference = async (key) => {
        const v = !preferences[key];
        setPreferences(prev => ({ ...prev, [key]: v }));
        localStorage.setItem('notification_preferences', JSON.stringify({ ...preferences, [key]: v }));
        try { await apiRequest('/notificaciones/preferences', { method: 'PUT', body: { ...preferences, [key]: v } }); }
        catch { setPreferences(prev => ({ ...prev, [key]: !v })); toast.error('No se pudo guardar'); }
    };

    const categories = [
        { id: 'stock', title: 'Stock', desc: 'Repuestos por debajo del mínimo', icon: AlertCircle },
        { id: 'tickets', title: 'Tickets', desc: 'Nuevas solicitudes de soporte', icon: Bell },
        { id: 'mantenimiento', title: 'Mantenimiento', desc: 'Equipos que requieren revisión', icon: RefreshCw },
        { id: 'backups', title: 'Backups', desc: 'Respaldo automático del sistema', icon: Shield },
        { id: 'seguridad', title: 'Seguridad', desc: 'Inicios de sesión y permisos', icon: Shield },
    ];

    const isPWA = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const usePush = isPWA || isMobile;
    const getStatusText = () => {
        if (!usePush) return 'Modo Escritorio';
        if (permission === 'granted') return 'Activadas';
        if (permission === 'denied') return 'Bloqueadas';
        return 'No configuradas';
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                        <Bell className="w-4 h-4 text-zinc-500" /> Notificaciones PWA
                    </h3>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${permission === 'granted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}>{getStatusText()}</span>
                </div>

                {!usePush ? (
                    <p className="text-sm text-zinc-400">En escritorio las alertas aparecen en la campana. Se actualizan cada 2 minutos. El Push nativo es solo para móvil/PWA.</p>
                ) : permission !== 'granted' ? (
                    <div className="space-y-3">
                        <p className="text-sm text-zinc-400">Activa las notificaciones para recibir alertas directas en tu móvil.</p>
                        <button onClick={handleRequestPermission} disabled={loading} className="inline-flex items-center gap-2 bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer">
                            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            {permission === 'denied' ? 'Cómo desbloquear' : 'Permitir Push'}
                        </button>
                        {permission === 'denied' && <p className="text-xs text-red-400">Has bloqueado las notificaciones. Resetea permisos en tu navegador.</p>}
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <p className="text-sm text-zinc-400 flex-1">Notificaciones activas.</p>
                        <button onClick={sendTestNotification} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${testSent ? 'bg-emerald-500 text-white' : 'bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white'}`}>
                            {testSent ? <Check className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                            {testSent ? '¡Enviada!' : 'Probar'}
                        </button>
                    </div>
                )}
            </div>

            {permission === 'granted' && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-zinc-800">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Categorías</h4>
                    </div>
                    <div className="divide-y divide-zinc-800">
                        {categories.map(item => (
                            <div key={item.id} className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <item.icon className={`w-4 h-4 shrink-0 ${preferences[item.id] ? 'text-zinc-300' : 'text-zinc-600'}`} />
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-white truncate">{item.title}</p>
                                        <p className="text-xs text-zinc-500 truncate">{item.desc}</p>
                                    </div>
                                </div>
                                <button onClick={() => togglePreference(item.id)} className={`w-10 h-6 rounded-full relative shrink-0 transition-colors ${preferences[item.id] ? 'bg-white' : 'bg-zinc-700'}`}>
                                    <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${preferences[item.id] ? 'right-1 bg-zinc-900' : 'left-1 bg-white'}`} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
export default NotificationsPanel;
