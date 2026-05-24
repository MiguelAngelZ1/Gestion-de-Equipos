import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { ROLES } from '../config/constants';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, MapPin, Tag, Shield, Activity, GitBranch, HeartPulse, 
  ArrowLeft, Loader2, Users, UserCircle, Bell, ChevronRight,
  Layout, Cpu, Globe
} from 'lucide-react';

// Lazy loading de paneles
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
  <div className="flex-1 flex flex-col items-center justify-center py-24">
    <div className="relative">
        <div className="w-20 h-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
            <Cpu className="w-8 h-8 text-indigo-400 animate-pulse" />
        </div>
    </div>
    <span className="mt-8 text-slate-400 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Sincronizando Módulo...</span>
  </div>
);

const ScrollReset = () => {
  useEffect(() => {
    // Intentamos scrollear de varias formas para asegurar éxito
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
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 min-h-[calc(100vh-160px)] p-2 lg:p-0 pb-32 lg:pb-0">
      
      {/* --- SIDEBAR NAVIGATION --- */}
      <motion.aside 
        initial={{ x: -30, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="lg:w-80 h-fit flex flex-col bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] lg:rounded-[3rem] p-4 lg:p-6 shadow-2xl relative overflow-hidden shrink-0"
      >
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col h-full pt-2 lg:pt-4">
          <nav className="space-y-2 overflow-y-auto max-h-[30vh] lg:max-h-none custom-scrollbar pr-2 pb-2">
            {filteredTabs.map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full group relative flex items-center gap-4 px-4 lg:px-5 py-3 lg:py-4 rounded-[1.2rem] lg:rounded-[1.5rem] transition-all duration-500 overflow-hidden ${
                    isSelected 
                      ? 'bg-gradient-to-br ' + tab.gradient + ' text-white shadow-xl shadow-indigo-600/20 scale-[1.02]' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className={`p-2 lg:p-2.5 rounded-xl transition-all duration-500 ${isSelected ? 'bg-white/20' : 'bg-white/5 group-hover:scale-110 group-hover:bg-indigo-500/20'}`}>
                    <Icon className={`w-4 h-4 lg:w-5 lg:h-5 ${isSelected ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'}`} />
                  </div>
                  <div className="flex flex-col items-start leading-none text-left">
                    <span className="text-xs lg:text-sm font-black tracking-tight">{tab.title}</span>
                    <span className={`text-[8px] lg:text-[9px] font-black uppercase tracking-widest mt-1 lg:mt-1.5 transition-colors ${isSelected ? 'text-white/80' : 'text-slate-600 group-hover:text-slate-400'}`}>
                      {tab.description}
                    </span>
                  </div>
                  {isSelected && (
                    <motion.div 
                      layoutId="activePointer"
                      className="ml-auto bg-white/20 p-1 rounded-lg"
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
        className="flex-1 flex flex-col bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] lg:rounded-[3rem] shadow-2xl relative overflow-hidden min-h-[500px] lg:min-h-0"
      >
        {/* Glow Header Background */}
        <div className={`absolute top-0 left-0 w-full h-40 bg-gradient-to-b opacity-10 transition-colors duration-700 ${activeTabData.gradient.replace('from-', 'from-').split(' ')[0]}`} />
        
        <header id="config-active-header" className="flex-shrink-0 flex items-center justify-between p-4 lg:p-6 border-b border-white/5 relative z-10">
          <div className="flex items-center gap-3 lg:gap-4">
            <div className={`w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br ${activeTabData.gradient} rounded-[1rem] lg:rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/10 group relative overflow-hidden shrink-0`}>
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              {activeTabData && <activeTabData.icon className="w-5 h-5 lg:w-6 lg:h-6 text-white relative z-10 drop-shadow-lg" />}
            </div>
            <div className="min-w-0">
              <motion.h2 
                key={activeTab}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-white text-lg lg:text-2xl font-black tracking-tighter leading-tight truncate"
              >
                {activeTabData.title}
              </motion.h2>
              <div className="flex items-center gap-2 mt-0.5 lg:mt-1">
                <div className="hidden sm:flex -space-x-1 shrink-0">
                    <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full border border-slate-900 bg-emerald-500 shadow-sm" />
                    <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full border border-slate-900 bg-indigo-500 shadow-sm" />
                </div>
                <span className="text-slate-500 text-[8px] lg:text-[9px] font-black uppercase tracking-[0.2em] truncate">{activeTabData.description}</span>
              </div>
            </div>
          </div>
        </header>

        {/* --- STAGE AREA --- */}
        <div className="flex-1 relative lg:overflow-y-auto lg:overflow-x-hidden custom-scrollbar">
          {/* Inner Decorative Glows */}
          <div className="absolute -bottom-48 -right-48 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
          
          <Suspense fallback={<PanelLoader />}>
            <div className="p-3 sm:p-6 lg:p-12 relative z-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
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
