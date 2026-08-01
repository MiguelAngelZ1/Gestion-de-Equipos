import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { ROLES } from '../config/constants';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Tag, Shield, Activity, GitBranch, HeartPulse, 
  Users, UserCircle, Bell, ChevronRight,
  Cpu
} from 'lucide-react';

const GruposComodidadPanel = lazy(() => import('../components/config/GruposComodidadPanel'));
const EstadosPanel = lazy(() => import('../components/config/EstadosPanel'));
const GradosPanel = lazy(() => import('../components/config/GradosPanel'));
const UbicacionesPanel = lazy(() => import('../components/config/UbicacionesPanel'));
const SaludPanel = lazy(() => import('../components/config/SaludPanel'));
const BackupPanel = lazy(() => import('../components/config/BackupPanel'));
const UserManagementPanel = lazy(() => import('../components/config/UserManagementPanel'));
const ProfilePanel = lazy(() => import('../components/config/ProfilePanel'));
const NotificationsPanel = lazy(() => import('../components/config/NotificationsPanel'));
const MensajesAdminPanel = lazy(() => import('../components/config/MensajesAdminPanel'));

const TABS_CONFIG = [
  { id: 'perfil', title: 'Mi Perfil', icon: UserCircle, description: 'Ajustes de cuenta', gradient: 'from-blue-500 to-indigo-500' },
  { id: 'notificaciones', title: 'Notificaciones', icon: Bell, description: 'Alertas de sistema', gradient: 'from-amber-500 to-orange-500' },
  { id: 'usuarios', title: 'Usuarios', icon: Users, description: 'Control de accesos', adminOnly: true, gradient: 'from-emerald-500 to-teal-500' },
  { id: 'mensajes', title: 'Bandeja Notas', icon: Bell, description: 'Reportes y soporte', adminOnly: true, gradient: 'from-purple-500 to-pink-500' },
  { id: 'grupos-comodidad', title: 'Grupo Comodidad', icon: Tag, description: 'Tipos de equipo', gradient: 'from-indigo-500 to-purple-500' },
  { id: 'grados', title: 'Grados Personal', icon: Shield, description: 'Jerarquías', gradient: 'from-slate-500 to-slate-700' },
  { id: 'estados', title: 'Estados', icon: Activity, description: 'Estados operativos', gradient: 'from-rose-500 to-red-500' },
  { id: 'ubicaciones', title: 'Ubicaciones', icon: MapPin, description: 'Sedes y lugares', gradient: 'from-cyan-500 to-blue-500' },
  { id: 'mantenimiento', title: 'Salud Sistema', icon: HeartPulse, description: 'Monitoreo técnico', gradient: 'from-rose-600 to-rose-400' },
  { id: 'backup', title: 'Copia Seguridad', icon: GitBranch, description: 'Respaldos nube', gradient: 'from-emerald-600 to-emerald-400' }
];

const PanelLoader = () => (
  <div className="flex-1 flex flex-col items-center justify-center py-12 sm:py-24">
    <div className="relative">
        <div className="w-14 h-14 sm:w-20 sm:h-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
            <Cpu className="w-5 h-5 sm:w-8 sm:h-8 text-indigo-400 animate-pulse" />
        </div>
    </div>
    <span className="mt-6 sm:mt-8 text-slate-400 font-black uppercase tracking-[0.3em] text-[9px] sm:text-[10px] animate-pulse">Sincronizando Módulo...</span>
  </div>
);

const ScrollReset = () => {
  useEffect(() => {
    const header = document.getElementById('config-active-header');
    if (header) {
      header.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);
  return null;
};

const Configuracion = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'perfil');
  const scrollRef = React.useRef(null);
  const user = JSON.parse(localStorage.getItem("equipos_user_data") || "{}");
  const isAdmin = (user.rol || ROLES.USER).toUpperCase() === ROLES.ADMIN;

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state?.activeTab]);

  const filteredTabs = TABS_CONFIG.filter(tab => !tab.adminOnly || isAdmin);
  const activeTabData = filteredTabs.find(t => t.id === activeTab) || filteredTabs[0];

  return (
    <div className="flex flex-col lg:flex-row gap-3 lg:gap-8 min-h-[calc(100vh-160px)] p-0 lg:p-0">
      
      {/* --- SIDEBAR NAVIGATION --- */}
      <motion.aside 
        initial={{ x: -30, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="lg:w-80 h-fit flex flex-col bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-2xl lg:rounded-[3rem] p-2.5 lg:p-6 shadow-2xl relative overflow-hidden shrink-0"
      >
        
        <div className="relative z-10 flex flex-col h-full lg:pt-4">
          {/* Mobile: horizontal scroll, Desktop: vertical list */}
          <nav className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-y-auto lg:max-h-none max-h-[70vh] custom-scrollbar px-1 py-1 snap-x snap-mandatory lg:snap-none">
            {filteredTabs.map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group relative flex items-center gap-2.5 lg:gap-4 px-3 lg:px-5 py-2.5 lg:py-3.5 rounded-xl lg:rounded-[1.5rem] transition-all duration-300 overflow-hidden shrink-0 snap-start lg:snap-none ${
                    isSelected 
                      ? 'bg-gradient-to-br ' + tab.gradient + ' text-white shadow-xl shadow-indigo-600/20 scale-[1.02]' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className={`p-1.5 lg:p-2.5 rounded-lg lg:rounded-xl transition-all duration-300 ${isSelected ? 'bg-white/20' : 'bg-white/5 group-hover:scale-110 group-hover:bg-indigo-500/20'}`}>
                    <Icon className={`w-3.5 h-3.5 lg:w-5 lg:h-5 ${isSelected ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'}`} />
                  </div>
                  <div className="flex flex-col items-start leading-none text-left min-w-0">
                    <span className="text-[10px] lg:text-sm font-black tracking-tight whitespace-nowrap">{tab.title}</span>
                    <span className={`text-[7px] lg:text-[9px] font-black uppercase tracking-widest mt-0.5 lg:mt-1 transition-colors hidden sm:block ${isSelected ? 'text-white/80' : 'text-slate-600 group-hover:text-slate-400'}`}>
                      {tab.description}
                    </span>
                  </div>
                  {isSelected && (
                    <motion.div 
                      layoutId="activePointer"
                      className="ml-auto bg-white/20 p-0.5 lg:p-1 rounded-md lg:rounded-lg hidden lg:block"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <ChevronRight className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-white" />
                    </motion.div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </motion.aside>

      {/* --- MAIN STAGE --- */}
      <motion.main 
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
        className="flex-1 flex flex-col bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl lg:rounded-[3rem] shadow-2xl relative overflow-hidden min-h-[300px] md:min-h-[500px] lg:min-h-0"
      >
        {/* Glow Header Background */}
        <div className={`absolute top-0 left-0 w-full h-40 bg-gradient-to-b opacity-10 transition-colors duration-700 ${activeTabData.gradient.replace('from-', 'from-').split(' ')[0]}`} />
        
        <header id="config-active-header" className="flex-shrink-0 flex items-center justify-between p-3 sm:p-4 lg:p-6 border-b border-white/5 relative z-10">
          <div className="flex items-center gap-2.5 sm:gap-3 lg:gap-4">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gradient-to-br ${activeTabData.gradient} rounded-xl lg:rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/10 group relative overflow-hidden shrink-0`}>
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              {activeTabData && <activeTabData.icon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white relative z-10 drop-shadow-lg" />}
            </div>
            <div className="min-w-0">
              <motion.h2 
                key={activeTab}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-white text-base sm:text-lg lg:text-2xl font-black tracking-tighter leading-tight truncate"
              >
                {activeTabData.title}
              </motion.h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-slate-500 text-[8px] lg:text-[9px] font-black uppercase tracking-[0.2em] truncate">{activeTabData.description}</span>
              </div>
            </div>
          </div>
        </header>

        {/* --- STAGE AREA --- */}
        <div className="flex-1 relative lg:overflow-y-auto lg:overflow-x-hidden custom-scrollbar">
          
          <Suspense fallback={<PanelLoader />}>
            <div className="p-3 sm:p-4 lg:p-8 relative z-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <ScrollReset />
                  {activeTab === 'perfil' && <ProfilePanel />}
                  {activeTab === 'notificaciones' && <NotificationsPanel />}
                  {activeTab === 'usuarios' && <UserManagementPanel />}
                  {activeTab === 'mensajes' && <MensajesAdminPanel />}
                  {activeTab === 'grupos-comodidad' && <GruposComodidadPanel />}
                  {activeTab === 'grados' && <GradosPanel />}
                  {activeTab === 'estados' && <EstadosPanel />}
                  {activeTab === 'ubicaciones' && <UbicacionesPanel />}
                  {activeTab === 'mantenimiento' && <SaludPanel />}
                  {activeTab === 'backup' && <BackupPanel />}
                </motion.div>
              </AnimatePresence>
            </div>
          </Suspense>
        </div>
      </motion.main>
    </div>
  );
};

export default Configuracion;
