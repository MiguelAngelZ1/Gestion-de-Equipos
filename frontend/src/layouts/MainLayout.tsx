import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { removeAuthToken, apiRequest } from '../services/api';
import logoImage from '../assets/LogoIMPERIO.webp';
import { notificationManager } from '../services/notificationManager';
import NotificationBell from '../components/common/NotificationBell';
import { ROLES } from '../config/constants';

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("equipos_user_data") || "{}");
  const role = (user.rol || ROLES.USER).toUpperCase();

  useEffect(() => {
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
    if (!isPWA && !isMobile) return;
    (async () => {
      const ok = await notificationManager.init(); if (!ok) return;
      let p: any = notificationManager.getPermissionStatus();
      if (p === 'default') p = await notificationManager.requestPermission();
      if (p !== 'granted') return;
      try {
        const { publicKey } = await apiRequest('/notificaciones/public-key'); if (!publicKey) return;
        const sub = await notificationManager.subscribeUser(publicKey); if (!sub) return;
        await apiRequest('/notificaciones/subscribe', { method: 'POST', body: { subscription: sub, deviceInfo: navigator.userAgent } });
      } catch {}
    })();
  }, []);

  const navItems = [
    { label: 'Dashboard', to: '/', icon: 'dashboard', roles: [ROLES.ADMIN] },
    { label: 'Equipos', to: '/equipos', icon: 'inventory_2', roles: [ROLES.ADMIN, ROLES.USER] },
    { label: 'Soporte', to: '/soporte', icon: 'build', roles: [ROLES.ADMIN] },
    { label: 'Movimientos', to: '/historial', icon: 'history', roles: [ROLES.ADMIN] },
    { label: 'Repuestos', to: '/componentes', icon: 'settings_input_component', roles: [ROLES.ADMIN] },
    { label: 'Préstamos', to: '/prestamos', icon: 'handshake', roles: [ROLES.ADMIN] },
    { label: 'Red', to: '/ipam', icon: 'lan', roles: [ROLES.ADMIN] },
    { label: 'Ajustes', to: '/configuracion', icon: 'settings', roles: [ROLES.ADMIN] },
  ].filter(i => i.roles.includes(role));
  if (role === ROLES.USER) navItems.push({ label: 'Ajustes', to: '/configuracion', icon: 'settings', roles: [ROLES.USER] } as any);

  const mobilePrimary = navItems.slice(0, 5);
  const mobileExtra = navItems.slice(5);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false); };
    if (moreOpen) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [moreOpen]);

  const titles: Record<string, string> = {
    '/': 'Dashboard', '/equipos': 'Equipos', '/soporte': 'Soporte', '/historial': 'Movimientos',
    '/componentes': 'Repuestos', '/prestamos': 'Préstamos', '/ipam': 'Red', '/configuracion': 'Ajustes',
  };

  return (
    <div className="min-h-screen bg-black text-[#e4e2e4] flex flex-col md:flex-row" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      <header className="md:hidden sticky top-0 z-40 h-14 flex items-center justify-between px-4 bg-[#1b1b1d] border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <img src={logoImage} alt="IMPERIO" className="w-7 h-7 object-contain rounded-full bg-white p-1" />
          <span className="font-semibold text-sm">{titles[location.pathname] || 'IMPERIO'}</span>
        </div>
        <div className="flex items-center gap-1">
          {role === ROLES.ADMIN && <NotificationBell />}
          <button onClick={() => { removeAuthToken(); navigate('/login'); }} className="w-8 h-8 grid place-items-center rounded-full hover:bg-white/5 text-[#c4c5d9]"><span className="material-symbols-outlined text-[20px]">logout</span></button>
        </div>
      </header>

      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-[260px] bg-[#1b1b1d] border-r border-white/5 z-50 flex-col pt-6 pb-1">
        <div className="px-6 mb-8 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full flex items-center justify-center bg-white p-1.5 overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
            <img src={logoImage} alt="IMPERIO Logo" className="w-full h-full object-cover rounded-full" />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2">
          <div className="space-y-1">
            {navItems.map(it => (
              <NavLink key={it.label} to={it.to} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-4 py-2 mx-2 text-[14px] font-semibold transition-colors relative ${isActive ? 'bg-white text-zinc-900' : 'text-[#c4c5d9] hover:text-white hover:bg-white/5'}`}>
                {({ isActive }) => (
                  <>
                    <span className="material-symbols-outlined text-[20px]" style={isActive ? { fontVariationSettings: '"FILL" 1' } : undefined}>{it.icon}</span>
                    <span>{it.label}</span>
                    {isActive && <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rotate-45" />}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="mt-auto px-4 py-2 flex items-center justify-between gap-2 overflow-visible">
          <span className="text-sm font-semibold truncate flex items-center gap-2.5 pl-1 overflow-visible">
            <span className="relative flex h-2.5 w-2.5 shrink-0 overflow-visible">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            </span>
            {user.usuario || 'mimperio'}
          </span>
          <button onClick={() => { removeAuthToken(); navigate('/login'); }} className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors shrink-0">
            <span className="material-symbols-outlined text-[16px]">logout</span> Salir
          </button>
        </div>
      </aside>

      <div className="ml-0 md:ml-[260px] flex-1 flex flex-col h-screen w-full md:w-[calc(100%-260px)] overflow-hidden">
        <div className="hidden md:flex justify-end items-center px-8 pt-4 pb-2 shrink-0">
          <div className="flex items-center gap-1">
            {role === ROLES.ADMIN && <NotificationBell plain />}
          </div>
        </div>

        <main className="flex-1 min-h-0 overflow-hidden px-4 md:px-8 pb-6 md:pb-8 w-full max-w-[1440px] mx-auto flex flex-col">
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <Outlet />
          </div>
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#1b1b1d] border-t border-white/5 safe-pb">
        <div className="flex h-16">
          {mobilePrimary.map(it => (
            <NavLink key={it.label} to={it.to} className="flex-1 grid place-items-center">
              {({ isActive }) => (
                <span className={`flex flex-col items-center gap-1 ${isActive ? 'text-[#b8c3ff]' : 'text-[#c4c5d9]'}`}>
                  <span className="material-symbols-outlined text-[20px]" style={isActive ? { fontVariationSettings: '"FILL" 1' } : undefined}>{it.icon}</span>
                  <span className="text-[10px] font-semibold">{it.label}</span>
                </span>
              )}
            </NavLink>
          ))}
          {mobileExtra.length > 0 && (
            <div className="flex-1 grid place-items-center relative" ref={moreRef}>
              <button onClick={() => setMoreOpen(v => !v)} className={`flex flex-col items-center gap-1 ${mobileExtra.some(e => location.pathname === e.to) ? 'text-[#b8c3ff]' : 'text-[#c4c5d9]'}`}>
                <span className="material-symbols-outlined text-[20px]">more_horiz</span>
                <span className="text-[10px] font-semibold">Más</span>
              </button>
              {moreOpen && (
                <div className="absolute bottom-full mb-2 right-2 bg-[#1b1b1d] border border-white/10 rounded-xl overflow-hidden min-w-[160px] shadow-xl">
                  {mobileExtra.map(it => (
                    <NavLink key={it.label} to={it.to} onClick={() => setMoreOpen(false)} className={({ isActive }) => `flex items-center gap-3 px-4 py-3 text-sm ${isActive ? 'bg-[#2e5bff] text-white' : 'text-[#c4c5d9]'}`}>
                      <span className="material-symbols-outlined text-[20px]">{it.icon}</span>{it.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}
