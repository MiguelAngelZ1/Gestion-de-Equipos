import { useEffect, useState, lazy, Suspense } from 'react';
import { apiRequest } from '../services/api';
import { ROLES } from '../config/constants';
import { Database, CheckCircle2, XCircle, Wrench, AlertTriangle, Package, MapPin, User, AlertCircle, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../context/ToastContext';

const LocationChart = lazy(() => import('../components/componentes/LocationChart'));

/* ─── Spring config (premium feel) ─── */
const spring = { type: 'spring' as const, stiffness: 400, damping: 30 };
const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: spring } };

/* ─── Stat Card ─── */
const StatCard = ({ title, value, icon: Icon, color, loading = false, accent = false }) => (
  <motion.div
    variants={fadeUp}
    className={`relative rounded-2xl border px-3 py-3 text-center overflow-hidden transition-colors ${
      accent
        ? 'bg-indigo-500/[0.08] border-indigo-500/20'
        : 'bg-white/[0.04] border-white/[0.06] hover:border-white/[0.12]'
    }`}
  >
    {accent && <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.06] to-transparent pointer-events-none" />}
    <Icon className={`w-5 h-5 ${color} shrink-0 mx-auto mb-1.5 relative`} />
    <p className="text-xl font-black text-white leading-none tabular-nums relative">
      {loading ? <span className="opacity-20 animate-pulse">--</span> : value}
    </p>
    <p className="text-[10px] font-bold tracking-widest uppercase mt-1.5 leading-none text-slate-500 relative">{title}</p>
  </motion.div>
);

/* ─── Alert Item ─── */
const AlertItem = ({ eq, idx }) => (
  <motion.div
    variants={fadeUp}
    className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-200"
  >
    <div className="flex items-start gap-2.5">
      <div className="w-0.5 h-8 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: eq.color_hex || '#ef4444' }} />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <h4 className="text-white font-bold text-sm tracking-tight uppercase truncate" title={eq.ine}>{eq.ine || 'N/A'}</h4>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase shrink-0"
            style={{ backgroundColor: `${(eq.color_hex || '#ef4444')}15`, color: eq.color_hex || '#ef4444', borderColor: `${(eq.color_hex || '#ef4444')}25` }}>
            {eq.estado || 'Falla'}
          </span>
        </div>
        <p className="text-indigo-400/80 text-[10px] font-bold uppercase tracking-wider mt-0.5">{eq.categoria}</p>
        <div className="flex gap-3 mt-1.5">
          <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium truncate">
            <MapPin className="w-3 h-3 shrink-0 opacity-60" />{eq.ubicacion || 'N/A'}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium truncate">
            <User className="w-3 h-3 shrink-0 opacity-60" />{eq.responsable_actual || 'N/A'}
          </span>
        </div>
        {eq.falla && (
          <div className="mt-2 pt-2 border-t border-white/5 flex items-start gap-1.5">
            <AlertCircle className="w-3 h-3 text-rose-500/60 mt-0.5 shrink-0" />
            <p className="text-slate-400/80 text-[11px] italic leading-relaxed">"{eq.falla}"</p>
          </div>
        )}
      </div>
    </div>
  </motion.div>
);

/* ─── Stock Item ─── */
const StockItem = ({ comp, idx }) => (
  <motion.div
    variants={fadeUp}
    className="bg-rose-500/[0.04] border border-rose-500/10 rounded-xl p-3 hover:bg-rose-500/[0.08] hover:border-rose-500/20 transition-all duration-200"
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 min-w-0">
        <Package className="w-4 h-4 text-rose-400/80 shrink-0" />
        <h4 className="text-white font-bold text-sm tracking-tight truncate">{comp.nombre}</h4>
      </div>
      <div className="text-right shrink-0">
        <p className="text-lg font-black text-white leading-none tabular-nums">{comp.cantidad || 0}</p>
        <p className="text-[8px] text-slate-500 font-bold uppercase">uds</p>
      </div>
    </div>
  </motion.div>
);

/* ─── Skeleton Loader ─── */
const SkeletonCard = ({ accent = false }) => (
  <div className={`rounded-2xl border px-3 py-3 text-center animate-pulse ${
    accent ? 'bg-indigo-500/[0.05] border-indigo-500/10' : 'bg-white/[0.03] border-white/[0.04]'
  }`}>
    <div className="w-5 h-5 rounded-full bg-white/5 mx-auto mb-1.5" />
    <div className="w-10 h-5 rounded bg-white/10 mx-auto mb-1.5" />
    <div className="w-12 h-2 rounded bg-white/5 mx-auto" />
  </div>
);

/* ─── Dashboard ─── */
const Dashboard = () => {
  const { showToast } = useToast();
  const [stats, setStats] = useState({ total: 0, servicio: 0, fuera: 0, reparacion: 0, prestamo: 0 });
  const [criticalEquipos, setCriticalEquipos] = useState([]);
  const [lowStockComponentes, setLowStockComponentes] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const userData = JSON.parse(localStorage.getItem("equipos_user_data") || "{}");
      const userRole = (userData.rol || ROLES.USER).toUpperCase();
      if (userRole !== ROLES.ADMIN) { setLoading(false); return; }
      try {
        const data = await apiRequest('/dashboard/summary');
        const find = (arr, ...terms) => arr.find(s => terms.some(t => s.name.toLowerCase().includes(t)))?.value || 0;
        const statsArr = data.stats || [];
        setStats({
          total: data.total,
          servicio: find(statsArr, 'buena', 'en servicio', 'e/s'),
          fuera: find(statsArr, 'mala', 'fuera de servicio', 'f/s'),
          reparacion: find(statsArr, 'taller', 'reparaci', 'mantenimiento', 'mant'),
          prestamo: find(statsArr, 'prestamo', 'préstamo')
        });
        setCriticalEquipos(data.criticalEquipos || []);
        setLowStockComponentes(data.alerts?.lowStock || []);
        setChartData((data.locations || []).map(loc => ({ ...loc, value: Number(loc.value) })));
      } catch {
        showToast("Error", "No se pudo cargar el resumen del sistema.", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [showToast]);

  const hasAlerts = criticalEquipos.length > 0 || lowStockComponentes.length > 0;
  const alertCount = criticalEquipos.length + lowStockComponentes.length;

  return (
    <div className="flex flex-col gap-3 w-full min-h-screen overflow-x-hidden">

      {/* ─── Stat Cards ─── */}
      {/* Pirámide: Total arriba, 4 cards en 2 columnas abajo */}
      <motion.div variants={stagger} initial="hidden" animate="visible" className="flex flex-col gap-2 shrink-0">
        <StatCard title="Total" value={stats.total} icon={Database} color="text-indigo-400" loading={loading} accent />
        <div className="grid grid-cols-2 gap-2">
          <StatCard title="E/S" value={stats.servicio} icon={CheckCircle2} color="text-emerald-400" loading={loading} />
          <StatCard title="F/S" value={stats.fuera} icon={XCircle} color="text-rose-400" loading={loading} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StatCard title="Mant." value={stats.reparacion} icon={Wrench} color="text-amber-400" loading={loading} />
          <StatCard title="Prestamo" value={stats.prestamo} icon={Calendar} color="text-blue-400" loading={loading} />
        </div>
      </motion.div>

      {/* ─── Bottom Grid: Alerts + Chart ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1">

        {/* Alertas */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.2 }}
          className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4 flex flex-col min-h-[180px] overflow-hidden"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-rose-500/10">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <h2 className="text-sm font-bold text-white tracking-tight">Alertas</h2>
            {hasAlerts && (
              <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-500/15 text-rose-400 rounded-full border border-rose-500/20">
                {alertCount}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
            <AnimatePresence mode="popLayout">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2].map(i => (
                    <div key={i} className="h-16 rounded-xl bg-white/[0.03] border border-white/[0.04] animate-pulse" />
                  ))}
                </div>
              ) : !hasAlerts ? (
                <motion.div variants={fadeUp} initial="hidden" animate="visible"
                  className="flex items-center gap-2 py-3 px-3 bg-emerald-500/[0.06] rounded-xl border border-emerald-500/10">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <p className="text-xs font-bold text-emerald-300">Todo OK — sin alertas activas</p>
                </motion.div>
              ) : (
                <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-2">
                  {criticalEquipos.map((eq, idx) => (
                    <AlertItem key={eq.id} eq={eq} idx={idx} />
                  ))}
                  {lowStockComponentes.map((comp, idx) => (
                    <StockItem key={`c-${comp.id}`} comp={comp} idx={idx} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Chart */}
        <Suspense fallback={
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4 flex items-center justify-center min-h-[180px]">
            <div className="w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        }>
          <LocationChart chartData={chartData} loading={loading} total={stats.total} />
        </Suspense>
      </div>
    </div>
  );
};

export default Dashboard;
