import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  Server, 
  Wrench, 
  History, 
  Settings, 
  LogOut, 
  ChevronRight, 
  Menu, 
  X,
  Package,
  MessageSquarePlus,
  Calendar,
  Globe,
  MoreHorizontal,
  LayoutDashboard,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { removeAuthToken, apiRequest } from '../services/api';
import logoImage from '../assets/LogoIMPERIO.webp';
import { notificationManager } from '../services/notificationManager';
import NotificationBell from '../components/common/NotificationBell';
import { ROLES } from '../config/constants';

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const userData = JSON.parse(localStorage.getItem("equipos_user_data") || "{}");
  const userRole = (userData.rol || ROLES.USER).toUpperCase();

  // Solicitar permiso y Suscribir a Push SOLO en dispositivos móviles o instalados (PWA)
  useEffect(() => {
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (!isPWA && !isMobile) return;

    const setupNotifications = async () => {
      // Registrar SW e inicializar manager
      const initialized = await notificationManager.init();
      if (!initialized) return;

      const status = notificationManager.getPermissionStatus();
      
      if (status === 'default' || status === 'granted') {
        let currentPermission = status;
        
        if (status === 'default') {
          currentPermission = await notificationManager.requestPermission() as 'default' | 'granted';
        }

        if (currentPermission === 'granted') {
          try {
            const { publicKey } = await apiRequest('/notificaciones/public-key');
            if (!publicKey) return;

            const subscription = await notificationManager.subscribeUser(publicKey);
            if (!subscription) return;

            await apiRequest('/notificaciones/subscribe', {
              method: 'POST',
              body: { 
                subscription,
                deviceInfo: navigator.userAgent
              }
            });
          } catch {
              // silent
          }
        }
      }
    };
    setupNotifications();
  }, []);

  const handleLogout = () => {
    removeAuthToken();
    navigate('/login');
  };

  const getPageInfo = (pathname) => {
    switch(pathname) {
      case '/':
        return { title: 'Resumen', subtitle: 'Estado general del inventario.' };
      case '/equipos':
        return { title: 'Inventario General', subtitle: 'Listado completo de equipos y herramientas.' };
      case '/soporte':
        return { title: 'Soporte', subtitle: 'Registra y administra las tareas de mantenimiento de equipos.' };
      case '/historial':
        return { title: 'Historial', subtitle: 'Rastrea la vida útil de los equipos y su relación con el personal.' };
      case '/componentes':
        return { title: 'Repuestos', subtitle: 'Inventario técnico de piezas y recambios para equipos.' };
      case '/configuracion':
        return { title: 'Ajustes del Sistema', subtitle: 'Gestiona configuraciones globales del sistema.' };
      case '/mensaje-admin':
        return { title: 'Dejar nota', subtitle: 'Envía un mensaje o reporte al administrador del sistema.' };
      case '/prestamos':
        return { title: 'Gestión de Préstamos', subtitle: 'Rastreo y administración de equipos prestados temporalmente.' };
      case '/ipam':
        return { title: 'Gestión de Red (IPAM)', subtitle: 'Control de direccionamiento IP y ocupación de red.' };
      default:
         return { title: 'Control de Equipos', subtitle: 'Sistema de Gestión IMPERIO' };
    }
  };

  const pageInfo = getPageInfo(location.pathname);

  const allNavItems = [
    { name: 'Dashboard', path: '/', icon: Home, roles: [ROLES.ADMIN] },
    { name: 'Equipos', path: '/equipos', icon: Server, roles: [ROLES.ADMIN, ROLES.USER] },
    { name: 'Soporte', path: '/soporte', icon: Wrench, roles: [ROLES.ADMIN] },
    { name: 'Historial', path: '/historial', icon: History, roles: [ROLES.ADMIN] },
    { name: 'Repuestos', path: '/componentes', icon: Package, roles: [ROLES.ADMIN] },
    { name: 'Préstamos', path: '/prestamos', icon: Calendar, roles: [ROLES.ADMIN] },
    { name: 'Red / IPAM', path: '/ipam', icon: Globe, roles: [ROLES.ADMIN] },
    { name: 'Configuración', path: '/configuracion', icon: Settings, roles: [ROLES.ADMIN] },
    { name: 'Dejar nota', path: '/mensaje-admin', icon: MessageSquarePlus, roles: [ROLES.USER] },
  ];

  const navItems = allNavItems.filter(item => item.roles.includes(userRole));

  // Bottom nav: max 5 items. Items beyond 5 go into "Más" menu
  const MAX_BOTTOM_NAV = 5;
  const bottomNavPrimary = navItems.slice(0, MAX_BOTTOM_NAV);
  const bottomNavExtra = navItems.slice(MAX_BOTTOM_NAV);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close more menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    if (showMoreMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMoreMenu]);

  return (
    <div className="h-screen overflow-hidden bg-[#0f1523] flex flex-col md:flex-row font-sans">
      {/* Mobile Header — minimal */}
      <motion.header 
        role="banner"
        initial={{ y: -50 }}
        animate={{ y: 0 }}
        className="md:hidden bg-[#1e293b]/90 backdrop-blur-xl border-b border-white/10 px-4 py-2.5 flex items-center justify-between sticky top-0 z-50"
      >
        <div className="flex items-center gap-2">
           <img src={logoImage} alt="Logo IMPERIO" className="h-7 w-7 object-contain" />
           <h1 className="text-white font-bold text-sm tracking-tight">{pageInfo.title}</h1>
        </div>
        {userRole === ROLES.ADMIN && <NotificationBell />}
      </motion.header>

      {/* Sidebar Desktop */}
      <motion.aside 
        role="navigation"
        aria-label="Navegación principal"
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
        className="hidden md:flex flex-col w-64 bg-[#1e293b]/50 backdrop-blur-3xl border-r border-white/10 fixed h-full z-10 shadow-xl"
      >
        <div className="p-4 pb-2 flex items-center justify-center">
          <div className="w-full flex justify-center py-1">
            <img src={logoImage} alt="Logotipo IMPERIO" className="h-20 object-contain" />
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 mt-2 overflow-y-auto custom-scrollbar" aria-label="Enlaces de navegación lateral">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              aria-label={`Ir a ${item.name}`}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 px-4 py-2 rounded-2xl transition-all font-medium overflow-hidden cursor-pointer ${
                  isActive
                    ? 'text-indigo-400'
                    : 'text-slate-400 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-white/5 rounded-2xl -z-10"
                      initial={false}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <item.icon className="w-5 h-5 z-10" aria-hidden="true" />
                  <span className="z-10" translate="no">{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <motion.button 
            whileHover={{ scale: 1.02, backgroundColor:"rgba(225, 29, 72, 0.1)" }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            aria-label="Cerrar sesión del sistema"
            className="flex items-center gap-3 px-4 py-2 w-full text-slate-400 hover:text-rose-400 rounded-2xl transition-all font-medium cursor-pointer"
          >
            <LogOut className="w-5 h-5" aria-hidden="true" />
            Cerrar Sesión
          </motion.button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main role="main" id="main-content" className="flex-1 md:ml-64 relative bg-transparent flex flex-col min-w-0 min-h-0">
        {/* Desktop Top Header Bar */}
        <div className="hidden md:flex items-center justify-between px-10 py-6 flex-shrink-0 bg-[#0f1523]/80 backdrop-blur-md z-40 border-b border-white/[0.03]">
           <div className="flex flex-col">
              <h1 className="text-white font-black text-2xl tracking-tighter leading-none">{pageInfo.title}</h1>
              <p className="text-slate-400 text-xs font-medium mt-1 uppercase tracking-widest">{pageInfo.subtitle}</p>
           </div>
           <div className="flex items-center gap-4">
              {userRole === ROLES.ADMIN && <NotificationBell />}
              <div className="h-10 w-[1px] bg-white/10 mx-2" />
                  <div className="flex items-center gap-3 bg-white/5 pr-4 pl-2 py-1.5 rounded-2xl border border-white/5 cursor-pointer hover:bg-white/10 transition-colors" role="status" aria-label="Perfil de usuario">
                     <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs" aria-hidden="true">
                    {userData.usuario?.substring(0, 2).toUpperCase() || 'AD'}
                 </div>
                 <div className="flex flex-col">
                    <span className="text-white text-[11px] font-black leading-none">{userData.usuario || 'Usuario'}</span>
                    <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">{userRole}</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Dynamic Area: Here to avoid double scrollbars, we let the inner pages handle it if they need to */}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 15, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -15, filter: 'blur(4px)' }}
            className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 md:pt-4 pb-20 md:pb-10 max-w-[1400px] mx-auto w-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation Mobile — max 5 items + More */}
      <nav 
        role="navigation"
        aria-label="Navegación móvil inferior"
        className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1e293b]/95 backdrop-blur-xl border-t border-white/10 flex justify-around items-center h-16 z-30 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
      >
        {bottomNavPrimary.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            aria-label={item.name}
            className="relative flex flex-col items-center justify-center flex-1 h-full cursor-pointer"
          >
            {({ isActive }) => (
              <>
                <motion.div
                  animate={{ 
                    y: isActive ? -6 : 0, 
                    color: isActive ? '#818cf8' : '#94a3b8' 
                  }}
                  className="flex flex-col items-center"
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} aria-hidden="true" />
                </motion.div>
                
                <span 
                  translate="no"
                  className={`absolute bottom-1.5 text-[8px] font-bold tracking-wide transition-all duration-300 pointer-events-none max-w-full truncate text-center px-0.5 ${
                    isActive ? 'opacity-100 translate-y-0 text-indigo-400' : 'opacity-0 translate-y-1 text-slate-400'
                  }`}
                >
                  {item.name === 'Configuración' ? 'Config' : item.name.length > 8 ? item.name.slice(0, 7) + '…' : item.name}
                </span>

                {isActive && (
                  <motion.div 
                    layoutId="bottomNavIndicator"
                    className="absolute top-0 w-8 h-[3px] bg-indigo-500 rounded-b-full shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}

        {/* More menu button */}
        {bottomNavExtra.length > 0 && (
          <div className="relative flex-1 h-full flex items-center justify-center" ref={moreMenuRef}>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="relative flex flex-col items-center justify-center w-full h-full cursor-pointer bg-transparent border-0 text-slate-400 hover:text-white transition-colors"
              aria-label="Más opciones"
              aria-expanded={showMoreMenu}
            >
              <MoreHorizontal className="w-5 h-5 stroke-[1.8px]" />
              <span className="absolute bottom-1.5 text-[8px] font-bold tracking-wide">Más</span>
              {/* Highlight if any extra item is active */}
              {bottomNavExtra.some(item => location.pathname === item.path) && (
                <motion.div 
                  layoutId="bottomNavIndicator"
                  className="absolute top-0 w-8 h-[3px] bg-indigo-500 rounded-b-full shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                />
              )}
            </motion.button>

            {/* Popup menu */}
            <AnimatePresence>
              {showMoreMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full mb-2 right-0 bg-[#1e293b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden min-w-[180px] z-50"
                >
                  {bottomNavExtra.map((item) => (
                    <NavLink
                      key={item.name}
                      to={item.path}
                      onClick={() => setShowMoreMenu(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 transition-all cursor-pointer ${
                          isActive 
                            ? 'bg-indigo-500/15 text-indigo-400' 
                            : 'text-slate-300 hover:bg-white/5 hover:text-white'
                        }`
                      }
                    >
                      <item.icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span className="text-sm font-semibold">{item.name}</span>
                    </NavLink>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </nav>
    </div>
  );
};

export default MainLayout;
