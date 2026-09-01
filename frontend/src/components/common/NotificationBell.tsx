import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, Package, Wrench, Info, CheckCheck, Trash2, MessageSquare } from 'lucide-react';
import { createPortal } from 'react-dom';
import { apiRequest, getUserData, getAuthToken } from '../../services/api';

const NotificationBell = ({ plain = false }: { plain?: boolean } = {}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef(null);
    const panelRef = useRef(null);
    const [pos, setPos] = useState(null);
    const navigate = useNavigate();

    // Determinar la URL del servidor de sockets (misma base que la API sin el /api)
    const socketURL = import.meta.env.VITE_API_URL 
        ? import.meta.env.VITE_API_URL.replace('/api', '') 
        : window.location.origin;

    const fetchNotifications = async (offset = 0) => {
        try {
            const response = await apiRequest(`/notificaciones?limit=20&offset=${offset}`);
            const data = response?.data || response || [];
            
            if (offset === 0) {
                setNotifications(data);
            } else {
                setNotifications(prev => [...prev, ...data]);
            }
            const allNotifs = offset === 0 ? data : [...notifications, ...data];
            setUnreadCount(allNotifs.filter(n => !n.leido).length);
        } catch {
            // silent
        }
    };

    const userId = (() => {
        const userData = getUserData();
        if (userData && userData.id !== undefined) {
            return userData.id;
        }
        const token = localStorage.getItem("equipos_admin_token");
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const extractedId = payload.userId;
                if (userData && extractedId) {
                    userData.id = extractedId;
                    localStorage.setItem("equipos_user_data", JSON.stringify(userData));
                }
                return extractedId;
            } catch {
                // silent
            }
        }
        return null;
    })();

    useEffect(() => {
        fetchNotifications();
    }, []);

    useEffect(() => {
        if (!userId) return;

        let socket = null;
        let cancelled = false;
        let reconnectAttempts = 0;
        let reconnectTimer = null;

        const connectSocket = () => {
            import('socket.io-client').then(({ io }) => {
                if (cancelled) return;

                socket = io(socketURL, {
                    auth: { token: getAuthToken() },
                    reconnection: false,
                    transports: ['websocket', 'polling']
                });

                socket.on('connect', () => {
                    reconnectAttempts = 0;
                    socket.emit('join', userId);
                });

                socket.on('new_notification', (newNotif) => {
                    setNotifications(prev => [newNotif, ...prev]);
                    setUnreadCount(prev => prev + 1);
                });

                socket.on('disconnect', () => {
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
                    reconnectAttempts++;
                    reconnectTimer = setTimeout(connectSocket, delay);
                });

                socket.on('connect_error', () => {
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
                    reconnectAttempts++;
                    reconnectTimer = setTimeout(connectSocket, delay);
                });
            });
        };

        connectSocket();

        return () => {
            cancelled = true;
            if (reconnectTimer) clearTimeout(reconnectTimer);
            if (socket) {
                socket.off('new_notification');
                socket.off('disconnect');
                socket.off('connect_error');
                socket.disconnect();
            }
        };
    }, [userId, socketURL]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target) && !panelRef.current?.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkAsRead = async (id) => {
        try {
            await apiRequest(`/notificaciones/${id}/read`, { method: 'PATCH' });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, leido: 1 } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch {
            // silent
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await apiRequest('/notificaciones/all/read', { method: 'PATCH' });
            setNotifications(prev => prev.map(n => ({ ...n, leido: 1 })));
            setUnreadCount(0);
        } catch {
            // silent
        }
    };

    const handleClearRead = async () => {
        try {
            await apiRequest('/notificaciones/read/clear', { method: 'DELETE' });
            setNotifications(prev => prev.filter(n => !n.leido));
        } catch {
            // silent
        }
    };

    const getIcon = (tipo) => {
        switch (tipo) {
            case 'stock': return <Package className="w-4 h-4 text-zinc-300" />;
            case 'taller': return <Wrench className="w-4 h-4 text-zinc-300" />;
            case 'tickets': return <MessageSquare className="w-4 h-4 text-zinc-300" />;
            default: return <Info className="w-4 h-4 text-zinc-300" />;
        }
    };

    const handleNotificationClick = (notif) => {
        if (!notif.leido) {
            handleMarkAsRead(notif.id);
        }
        
        switch (notif.tipo) {
            case 'stock':
                navigate('/componentes');
                break;
            case 'taller':
                navigate('/equipos');
                break;
            case 'soporte':
                navigate('/soporte');
                break;
            case 'tickets':
                navigate('/configuracion', { state: { activeTab: 'mensajes' } });
                break;
            default:
                break;
        }
        setIsOpen(false);
    };

    const toggleOpen = () => {
        if (!isOpen) {
            const rect = dropdownRef.current?.getBoundingClientRect();
            if (rect) {
                const isMobile = window.innerWidth < 640;
                setPos({
                    top: rect.bottom + 8,
                    right: isMobile ? 12 : Math.max(8, window.innerWidth - rect.right),
                });
            }
        }
        setIsOpen(!isOpen);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={toggleOpen}
                className={plain ? "relative p-2 text-[#c4c5d9] hover:text-white transition-colors" : "relative p-2.5 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer active:scale-95"}
                aria-label={`Notificaciones ${unreadCount > 0 ? `(${unreadCount} sin leer)` : ''}`}
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                {plain ? <span className="material-symbols-outlined text-[20px]">notifications</span> : <Bell className="w-6 h-6" aria-hidden="true" />}
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                        {unreadCount > 9 ? '+9' : unreadCount}
                    </span>
                )}
            </button>

            {createPortal(isOpen && (
                <div
                    ref={panelRef}
                    style={{ top: pos?.top ?? 8, right: pos?.right ?? 8 }}
                    className="fixed z-[100] w-[calc(100vw-1.5rem)] max-w-sm sm:w-80 sm:max-w-none notif-drop"
                >
                    <div className="absolute -top-1.5 right-6 h-3 w-3 rotate-45 bg-zinc-900 border-l border-t border-zinc-800 hidden sm:block" aria-hidden="true" />
                    <div className="relative flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl max-h-[min(70dvh,32rem)] sm:max-h-[min(80dvh,40rem)]">
                        <div className="p-4 border-b border-zinc-800 flex flex-col gap-3">
                            <div className="flex justify-between items-center">
                                <h3 className="text-zinc-50 text-sm font-semibold flex items-center gap-2">
                                    <Bell className="w-4 h-4 text-zinc-400" />
                                    Notificaciones
                                </h3>
                                {unreadCount > 0 && <span className="text-[10px] text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded-full font-semibold">{unreadCount} nuevas</span>}
                            </div>
                            
                            {notifications.length > 0 && (
                                <div className="flex justify-between items-center gap-2">
                                    <button 
                                        onClick={handleMarkAllAsRead}
                                        disabled={unreadCount === 0}
                                        className="text-[11px] flex items-center gap-1.5 font-semibold text-[#c4c5d9] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <CheckCheck className="w-3.5 h-3.5" />
                                        Leer Todas
                                    </button>
                                    <button 
                                        onClick={handleClearRead}
                                        disabled={notifications.filter(n => n.leido).length === 0}
                                        className="text-[11px] flex items-center gap-1.5 font-semibold text-[#c4c5d9] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Limpiar Leídas
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                            {notifications.length === 0 ? (
                                <div className="py-12 flex flex-col items-center justify-center text-center px-6">
                                    <BellOff className="w-8 h-8 text-zinc-600 mb-3" />
                                    <p className="font-semibold text-zinc-50 text-sm">Sin notificaciones</p>
                                    <p className="text-xs text-zinc-500 mt-1">No tienes notificaciones por ahora</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-zinc-800">
                                    {notifications.map((notif) => (
                                        <div 
                                            key={notif.id} 
                                            role="button"
                                            tabIndex={0}
                                            aria-label={`${notif.titulo}: ${notif.mensaje}`}
                                            className={`p-4 flex gap-3 transition-colors hover:bg-zinc-800/40 cursor-pointer ${!notif.leido ? 'bg-zinc-800/20' : ''}`}
                                            onClick={() => handleNotificationClick(notif)}
                                            onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') handleNotificationClick(notif); }}
                                        >
                                            <div className="mt-0.5 h-8 w-8 rounded-xl bg-[#131315] border border-white/5 flex items-center justify-center shrink-0">
                                                {getIcon(notif.tipo)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start gap-2">
                                                    <p className={`text-xs font-semibold truncate ${!notif.leido ? 'text-zinc-50' : 'text-zinc-400'}`}>{notif.titulo}</p>
                                                    <span className="text-[10px] text-zinc-500 whitespace-nowrap mt-0.5">
                                                        {new Date(notif.fecha).toLocaleDateString([], { day:'2-digit', month:'short' })}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-2 leading-relaxed">{notif.mensaje}</p>
                                                {!notif.leido && (
                                                    <div className="flex justify-end mt-2">
                                                        <span className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider">Nueva</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                ),
                document.body
            )}
        </div>
    );
};

export default NotificationBell;
