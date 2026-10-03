import { useState, lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { ROLES } from '../config/constants';
import { MapPin, Tag, Shield, Activity, HeartPulse, Users, UserCircle, Bell, HardDrive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GruposComodidadPanel = lazy(() => import('../components/config/GruposComodidadPanel'));
const EstadosPanel = lazy(() => import('../components/config/EstadosPanel'));
const GradosPanel = lazy(() => import('../components/config/GradosPanel'));
const UbicacionesPanel = lazy(() => import('../components/config/UbicacionesPanel'));
const SaludPanel = lazy(() => import('../components/config/SaludPanel'));
const BackupPanel = lazy(() => import('../components/config/BackupPanel'));
const UserManagementPanel = lazy(() => import('../components/config/UserManagementPanel'));
const ProfilePanel = lazy(() => import('../components/config/ProfilePanel'));
const NotificationsPanel = lazy(() => import('../components/config/NotificationsPanel'));
import { ConfigCircularNav, ConfigNavTrigger } from '../components/config/ConfigCircularNav';


const TABS = [
  { id: 'perfil', label: 'Mi Perfil', icon: UserCircle },
  { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
  { id: 'usuarios', label: 'Usuarios', icon: Users, admin: true },
  { id: 'grupos-comodidad', label: 'Grupos', icon: Tag },
  { id: 'grados', label: 'Grados', icon: Shield },
  { id: 'estados', label: 'Estados', icon: Activity },
  { id: 'ubicaciones', label: 'Ubicaciones', icon: MapPin },
  { id: 'mantenimiento', label: 'Salud', icon: HeartPulse },
  { id: 'backup', label: 'Backup', icon: HardDrive },
];

export default function Configuracion() {
  const location = useLocation() as any;
  const [tab, setTab] = useState(location.state?.activeTab || 'perfil');
  const [navOpen, setNavOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem("equipos_user_data") || "{}");
  const isAdmin = (user.rol || ROLES.USER).toUpperCase() === ROLES.ADMIN;
  const filtered = TABS.filter(t => !t.admin || isAdmin);

  return (
    <div className="md:flex-1 md:min-h-0 flex flex-col lg:flex-row gap-3 lg:gap-4 w-full max-w-full md:overflow-hidden">
      <aside className="hidden lg:flex lg:w-[260px] shrink-0 lg:bg-zinc-900 lg:border lg:border-zinc-800 rounded-xl p-2 flex-col overflow-visible lg:self-stretch">
        <div className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible custom-scrollbar pb-2 lg:pb-0 -mx-1 px-1 lg:pr-3">
          {filtered.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap border shrink-0 lg:shrink transition-colors ${tab === t.id ? 'bg-white text-zinc-900 border-white' : 'text-zinc-400 border-transparent hover:bg-zinc-800 hover:text-zinc-100'}`}>
              <t.icon className="w-4 h-4 shrink-0" />{t.label}
              {tab === t.id && <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rotate-45" />}
            </button>
          ))}
        </div>
      </aside>

      <ConfigNavTrigger tabs={filtered} active={tab} onOpen={() => setNavOpen(true)} />
      <ConfigCircularNav tabs={filtered} active={tab} open={navOpen} onClose={() => setNavOpen(false)} onSelect={setTab} />

      <main className="md:flex-1 md:min-h-0 min-w-0 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: -28, scale: 0.96, filter: 'blur(6px)' }}
            animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: -16, scale: 0.97, filter: 'blur(4px)' }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar p-4 lg:p-6"
          >
            <Suspense fallback={<div className="py-16 grid place-items-center"><div className="w-6 h-6 rounded-full border-2 border-zinc-800 border-t-white animate-spin" /></div>}>
              {tab === 'perfil' && <ProfilePanel />}
              {tab === 'notificaciones' && <NotificationsPanel />}
              {tab === 'usuarios' && <UserManagementPanel />}

              {tab === 'grupos-comodidad' && <GruposComodidadPanel />}
              {tab === 'grados' && <GradosPanel />}
              {tab === 'estados' && <EstadosPanel />}
              {tab === 'ubicaciones' && <UbicacionesPanel />}
              {tab === 'mantenimiento' && <SaludPanel />}
              {tab === 'backup' && <BackupPanel />}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}