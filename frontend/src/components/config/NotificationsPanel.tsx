
import React, { useState, useEffect } from 'react';
import { Bell, Shield, Smartphone, Check, AlertCircle, RefreshCw, Smartphone as Mobile } from 'lucide-react';
import { notificationManager } from '../../services/notificationManager';

const NotificationsPanel = () => {
    const [permission, setPermission] = useState(Notification.permission);
    const [loading, setLoading] = useState(false);
    const [testSent, setTestSent] = useState(false);

    useEffect(() => {
        setPermission(Notification.permission);
    }, []);

    const handleRequestPermission = async () => {
        setLoading(true);
        const newPermission = await notificationManager.requestPermission();
        setPermission(newPermission);
        setLoading(false);
    };

    const sendTestNotification = () => {
        notificationManager.showLocalNotification('¡Funciona! 🎉', {
            body: 'Esta es una notificación de prueba de Control de Equipos 3.0',
            tag: 'test-notification'
        });
        setTestSent(true);
        setTimeout(() => setTestSent(false), 3000);
    };

    const [preferences, setPreferences] = useState(() => {
        const saved = localStorage.getItem('notification_preferences');
        return saved ? JSON.parse(saved) : {
            'stock': true,
            'tickets': true,
            'mantenimiento': true,
            'backups': false,
            'seguridad': true
        };
    });

    useEffect(() => {
        localStorage.setItem('notification_preferences', JSON.stringify(preferences));
    }, [preferences]);

    const togglePreference = (key) => {
        setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const categories = [
        { id: 'stock', title: 'Alerta de Stock', desc: 'Avisos cuando los repuestos están por agotarse o debajo del mínimo', icon: AlertCircle },
        { id: 'tickets', title: 'Tickets Pendientes', desc: 'Nuevas solicitudes de soporte técnico y mantenimiento', icon: Bell },
        { id: 'mantenimiento', title: 'Estado de Mantenimiento', desc: 'Alertas sobre equipos que requieren revisión periódica', icon: RefreshCw },
        { id: 'backups', title: 'Respaldo del Sistema', desc: 'Confirmación de tareas de backup automáticas', icon: Shield },
        { id: 'seguridad', title: 'Alertas de Seguridad', desc: 'Notificaciones sobre inicios de sesión o cambios de permisos', icon: AlertCircle },
    ];

    const isPWA = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const usePush = isPWA || isMobile;

    const getStatusText = () => {
        if (!usePush) return 'Modo Escritorio';
        switch (permission) {
            case 'granted': return 'Activadas';
            case 'denied': return 'Bloqueadas por el navegador';
            default: return 'No configuradas';
        }
    };

    return (
        <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-500">
            {/* Main Toggle Section */}
            <div className="sm:bg-white/[0.03] sm:border border-white/10 sm:rounded-[2.5rem] sm:overflow-hidden sm:shadow-2xl flex flex-col gap-6 sm:gap-0">
                <div className="sm:p-8 sm:border-b border-white/5 sm:bg-white/[0.01]">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center border transition-colors shrink-0 ${
                                permission === 'granted' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-indigo-500/10 border-indigo-500/20'
                            }`}>
                                <Bell className={`w-5 h-5 sm:w-6 sm:h-6 ${permission === 'granted' ? 'text-emerald-400' : 'text-indigo-400'}`} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-white text-lg sm:text-xl font-black tracking-tight leading-tight">Notificaciones PWA</h3>
                                <p className="text-slate-500 text-[9px] sm:text-xs font-bold uppercase tracking-widest mt-0.5 leading-tight">Alertas nativas</p>
                            </div>
                        </div>
                        <div className={`mt-2 sm:mt-0 px-3 sm:px-4 py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest border self-start sm:self-auto w-fit ${
                            permission === 'granted' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-slate-500/10 border-white/10 text-slate-500'
                        }`}>
                            {getStatusText()}
                        </div>
                    </div>
                </div>

                <div className="sm:p-8 space-y-6">
                    {!usePush ? (
                        <div className="space-y-4 sm:space-y-6">
                            <div className="bg-indigo-500/5 border border-indigo-500/10 p-4 sm:p-6 rounded-2xl sm:rounded-3xl">
                                <div className="flex items-start gap-3 sm:gap-4">
                                    <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-white font-bold text-base sm:text-lg mb-1 leading-tight">Campanita de Escritorio</p>
                                        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                                            En el modo PC, las notificaciones se muestran a través del ícono de campana.
                                            Estas alertas se actualizan cada 2 minutos.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <p className="text-center text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed px-2">
                                Las notificaciones Push (Nativas) están reservadas para móviles o PWA.
                            </p>
                        </div>
                    ) : permission !== 'granted' ? (
                        <div className="space-y-4 sm:space-y-6">
                            <div className="bg-indigo-500/5 border border-indigo-500/10 p-4 sm:p-6 rounded-2xl sm:rounded-3xl">
                                <div className="flex items-start gap-3 sm:gap-4">
                                    <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-white font-bold text-base sm:text-lg mb-1 leading-tight">Activa las notificaciones</p>
                                        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                                            Para recibir alertas directas en tu móvil, necesitamos tu permiso del sistema.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleRequestPermission}
                                disabled={loading}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-4 sm:py-5 rounded-xl sm:rounded-2xl text-[11px] sm:text-sm font-black uppercase tracking-widest transition-all shadow-[0_15px_30px_rgba(79,70,229,0.3)] active:scale-[0.98] flex items-center justify-center gap-2 sm:gap-3 cursor-pointer"
                            >
                                {loading ? <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Check className="w-4 h-4 sm:w-5 sm:h-5" />}
                                {permission === 'denied' ? 'Cómo desbloquear' : 'Permitir Push aquí'}
                            </button>
                            
                            {permission === 'denied' && (
                                <p className="text-center text-[9px] sm:text-[10px] text-rose-400 font-bold uppercase tracking-widest px-2 leading-relaxed">
                                    Has bloqueado las notificaciones. Resetea los permisos en tu navegador.
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4 sm:space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 sm:gap-4">
                                <div className="p-4 sm:p-5 bg-white/[0.02] border border-white/5 rounded-xl sm:rounded-2xl flex items-center gap-3 sm:gap-4">
                                    <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20 shrink-0">
                                        <Check className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-white text-[11px] sm:text-xs font-black uppercase tracking-widest truncate">Navegador Listo</p>
                                        <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium truncate">Soporta notificaciones nativas</p>
                                    </div>
                                </div>
                                <div className="p-4 sm:p-5 bg-white/[0.02] border border-white/5 rounded-xl sm:rounded-2xl flex items-center gap-3 sm:gap-4">
                                    <div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center border border-sky-500/20 shrink-0">
                                        <Mobile className="w-5 h-5 text-sky-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-white text-[11px] sm:text-xs font-black uppercase tracking-widest truncate">App Instalada</p>
                                        <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium truncate">Funciona como App celular</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2 sm:pt-4">
                                <button
                                    onClick={sendTestNotification}
                                    className={`w-full py-4 rounded-xl sm:rounded-2xl text-[11px] sm:text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                        testSent 
                                        ? 'bg-emerald-500 text-white' 
                                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                                    }`}
                                >
                                    {testSent ? <Check className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                                    {testSent ? '¡Enviada!' : 'Test'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Configuración de Alertas */}
            {permission === 'granted' && (
                <div className="sm:bg-white/[0.03] sm:border border-white/10 sm:rounded-[2.5rem] sm:overflow-hidden sm:shadow-2xl animate-in slide-in-from-bottom-5 duration-700 mt-6 sm:mt-0">
                    <div className="sm:p-8 mb-4 sm:mb-0 sm:border-b border-white/5 sm:bg-white/[0.01]">
                        <h4 className="text-white font-black uppercase tracking-widest text-[10px] sm:text-xs text-slate-500">Categorías de Notificación</h4>
                    </div>
                    <div className="space-y-2 sm:p-4">
                        {categories.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-3 sm:p-4 hover:bg-white/[0.02] rounded-xl sm:rounded-2xl transition-colors gap-2">
                                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                    <div className={`p-2 rounded-xl border shrink-0 ${preferences[item.id] ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-slate-500/10 border-white/5 text-slate-600'}`}>
                                        <item.icon className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-white text-xs sm:text-sm font-bold truncate">{item.title}</p>
                                        <p className="text-slate-500 text-[9px] sm:text-[10px] leading-tight line-clamp-2">{item.desc}</p>
                                    </div>
                                </div>
                                <div 
                                    onClick={() => togglePreference(item.id)}
                                    className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors shrink-0 ${preferences[item.id] ? 'bg-indigo-600' : 'bg-slate-700'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${preferences[item.id] ? 'right-1' : 'left-1'}`} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Info Footer */}
            <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4 sm:p-6 mx-0 mt-6 sm:mt-0">
                <p className="text-[9px] sm:text-[11px] text-slate-400 leading-relaxed italic text-center">
                    Nota: Para recibir notificaciones en iOS (iPhone), debes primero "Añadir a la pantalla de inicio" esta página desde Safari.
                </p>
            </div>
        </div>
    );
};

export default NotificationsPanel;
