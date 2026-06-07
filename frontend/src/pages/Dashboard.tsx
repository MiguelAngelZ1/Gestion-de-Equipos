import React, { useEffect, useState, lazy, Suspense } from 'react';
import { apiRequest } from '../services/api';
import { ROLES } from '../config/constants';
import { 
  Database, 
  CheckCircle2, 
  XCircle, 
  Wrench, 
  AlertTriangle, 
  Package, 
  MapPin, 
  AlertCircle,
  Calendar,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../context/ToastContext';

// Carga diferida (lazy loading) para el componente de gráficos
const LocationChart = lazy(() => import('../components/componentes/LocationChart'));

// StatCard extraído fuera de Dashboard para evitar desmontajes/montajes innecesarios
const StatCard = ({ title, value, icon: Icon, colorClass, bgClass, delay = 0, loading = false }) => (
  <motion.div 
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
    className="glass-panel glass-card-hover p-6 md:p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden group"
  >
    <div className={`p-4 rounded-2xl ${bgClass} ${colorClass} group-hover:scale-110 transition-transform duration-500`}>
      <Icon className="w-8 h-8 md:w-10 md:h-10" />
    </div>
    <div className="flex flex-col items-center">
      <h2 className="text-slate-400 text-[10px] md:text-xs font-black tracking-[0.3em] uppercase mb-2">{title}</h2>
      <p className="text-4xl md:text-6xl font-black text-white tracking-tighter">
        {loading ? <span className="opacity-20 animate-pulse">--</span> : value}
      </p>
    </div>
    <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-10 ${colorClass}`} />
  </motion.div>
);

const Dashboard = () => {
  const { showToast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [stats, setStats] = useState({ total: 0, servicio: 0, fuera: 0, reparacion: 0, prestamo: 0 });
  const [criticalEquipos, setCriticalEquipos] = useState([]);
  const [lowStockComponentes, setLowStockComponentes] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      // Solo el administrador debe cargar estas estadísticas
      const userData = JSON.parse(localStorage.getItem("equipos_user_data") || "{}");
      const userRole = (userData.rol || ROLES.USER).toUpperCase();
      
      if (userRole !== ROLES.ADMIN) {
        setLoading(false);
        return;
      }

      try {
        const data = await apiRequest('/dashboard/summary');
        
        const servicio = data.stats.find(s => 
          s.name.toLowerCase().includes('buena') || 
          s.name.toLowerCase().includes('en servicio') || 
          s.name.toLowerCase() === 'e/s'
        )?.value || 0;
        
        const fuera = data.stats.find(s => 
          s.name.toLowerCase().includes('mala') || 
          s.name.toLowerCase().includes('fuera de servicio') || 
          s.name.toLowerCase() === 'f/s'
        )?.value || 0;
        
        const reparacion = data.stats.find(s => 
          s.name.toLowerCase().includes('taller') || 
          s.name.toLowerCase().includes('reparaci') || 
          s.name.toLowerCase().includes('mantenimiento') || 
          s.name.toLowerCase() === 'mant'
        )?.value || 0;

        const prestamo = data.stats.find(s => 
          s.name.toLowerCase().includes('prestamo') || 
          s.name.toLowerCase().includes('préstamo')
        )?.value || 0;

        setStats({ 
          total: data.total, 
          servicio: Number(servicio), 
          fuera: Number(fuera), 
          reparacion: Number(reparacion),
          prestamo: Number(prestamo)
        });

        setCriticalEquipos(data.criticalEquipos || []);
        setLowStockComponentes(data.alerts.lowStock || []);
        
        const formattedCharts = (data.locations || []).map(loc => ({
          ...loc,
          value: Number(loc.value)
        }));
        setChartData(formattedCharts);
      } catch (error) {
        console.error("Error cargando dashboard:", error);
        showToast("Error", "No se pudo cargar el resumen del sistema.", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
    setIsMounted(true);
  }, [showToast]);

  return (
    <div className="flex flex-col gap-6 md:gap-10 w-full min-h-screen overflow-x-hidden">
      
      {/* Grid de Estadísticas Principales */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 shrink-0 px-2 lg:px-0">
        <StatCard title="Total de Equipos" value={stats.total} icon={Database} colorClass="text-indigo-400" bgClass="bg-indigo-500/10" delay={0.1} loading={loading} />
        <StatCard title="En Servicio" value={stats.servicio} icon={CheckCircle2} colorClass="text-emerald-400" bgClass="bg-emerald-500/10" delay={0.2} loading={loading} />
        <StatCard title="Fuera de Servicio" value={stats.fuera} icon={XCircle} colorClass="text-rose-400" bgClass="bg-rose-500/10" delay={0.3} loading={loading} />
        <StatCard title="En Mantenimiento" value={stats.reparacion} icon={Wrench} colorClass="text-amber-400" bgClass="bg-amber-500/10" delay={0.4} loading={loading} />
        <StatCard title="En Préstamo" value={stats.prestamo} icon={Calendar} colorClass="text-blue-400" bgClass="bg-blue-500/10" delay={0.5} loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 px-2 lg:px-0">
        
        {/* Panel de Alertas Críticas */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.5 }}
          className="glass-panel rounded-[3rem] p-6 md:p-8 flex flex-col h-full min-h-[300px] md:min-h-[500px] overflow-hidden group"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-rose-500/15 rounded-2xl shadow-lg shadow-rose-500/10">
                <AlertTriangle className="w-7 h-7 text-rose-400" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Estado Crítico</h2>
                <p className="text-slate-400 text-xs font-bold mt-1 tracking-wide opacity-80 uppercase">Atención inmediata requerida</p>
              </div>
            </div>
            <div className="hidden md:block h-px flex-1 bg-gradient-to-r from-rose-500/20 to-transparent mx-8 opacity-30" />
          </div>
          
          <div className="flex-1 overflow-y-auto pr-3 space-y-4 custom-scrollbar">
            <AnimatePresence mode="popLayout">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                  <span className="text-slate-500 font-bold tracking-widest text-[10px] uppercase">Sincronizando...</span>
                </div>
              ) : (criticalEquipos.length === 0 && lowStockComponentes.length === 0) ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center h-full text-center p-12 border-2 border-dashed border-white/5 rounded-[2.5rem] bg-white/[0.02]"
                >
                  <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 opacity-60" />
                  </div>
                  <p className="text-xl font-black text-white">Sistema Saludable</p>
                  <p className="text-slate-400 text-sm mt-2 max-w-[250px] mx-auto opacity-70">No se detectaron fallos activos ni falta de suministros críticos.</p>
                </motion.div>
              ) : (
                <motion.div layout className="space-y-4">
                  {criticalEquipos.map((eq, idx) => (
                    <motion.div 
                      key={eq.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + (idx * 0.05) }}
                      className="bg-white/[0.03] border border-white/5 rounded-[2rem] p-6 hover:bg-white/[0.06] transition-all duration-300 group/item relative overflow-hidden"
                    >
                      <div className="flex items-start gap-5">
                        <div 
                          className="w-1.5 h-12 rounded-full shrink-0 shadow-lg transition-shadow duration-500 mt-1" 
                          style={{ 
                            backgroundColor: eq.color_hex || '#ef4444',
                            boxShadow: `0 0 15px ${(eq.color_hex || '#ef4444')}40`
                          }} 
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-4">
                             <div className="min-w-0">
                                <h4 className="text-white font-black text-lg tracking-tight leading-tight uppercase truncate" title={eq.ine}>{eq.ine || 'Unidad Desconocida'}</h4>
                                <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest mt-1 opacity-80">{eq.categoria}</p>
                             </div>
                             <span 
                               className="text-[9px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-tighter shrink-0"
                               style={{ 
                                 backgroundColor: `${(eq.color_hex || '#ef4444')}20`,
                                 color: eq.color_hex || '#ef4444',
                                 borderColor: `${(eq.color_hex || '#ef4444')}30`
                               }}
                             >
                               {eq.estado || 'Falla Crítica'}
                             </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                            <div className="flex items-center gap-2.5 min-w-0">
                               <div className="p-1.5 bg-indigo-500/10 rounded-lg shrink-0">
                                  <MapPin className="w-3 h-3 text-indigo-400" />
                               </div>
                               <span className="text-[10px] text-slate-300 font-bold truncate">{eq.ubicacion || 'Sin Ubicación'}</span>
                            </div>
                            <div className="flex items-center gap-2.5 min-w-0">
                               <div className="p-1.5 bg-indigo-500/10 rounded-lg shrink-0">
                                  <User className="w-3 h-3 text-indigo-400" />
                               </div>
                               <span className="text-[10px] text-slate-300 font-bold truncate">{eq.responsable_actual || 'Sin Asignar'}</span>
                            </div>
                          </div>

                          {(eq.nne || eq.serie) && (
                            <div className="mt-3 flex flex-wrap gap-2">
                               {eq.nne && (
                                 <span className="text-[9px] font-black px-2 py-0.5 bg-white/5 text-slate-400 rounded-md border border-white/5 uppercase tracking-tighter">
                                    NNE: {eq.nne}
                                 </span>
                               )}
                               {eq.serie && (
                                 <span className="text-[9px] font-black px-2 py-0.5 bg-white/5 text-slate-400 rounded-md border border-white/5 uppercase tracking-tighter">
                                    S/N: {eq.serie}
                                 </span>
                               )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-5 pt-4 border-t border-white/5 flex items-start gap-3 bg-rose-500/[0.02] -mx-6 px-6 -mb-6 pb-6">
                        <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 opacity-50 shrink-0" />
                        <p className="text-slate-300 text-xs italic leading-relaxed font-medium">"{eq.falla || 'Diagnóstico pendiente...'}"</p>
                      </div>
                    </motion.div>
                  ))}
                  {lowStockComponentes.map((comp, idx) => (
                    <motion.div 
                      key={`comp-${comp.id}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + (idx * 0.05) }}
                      className="bg-rose-500/[0.04] border border-rose-500/10 rounded-[1.5rem] p-5 hover:bg-rose-500/[0.08] transition-all duration-300 group/item"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center shrink-0 border border-rose-500/10">
                            <Package className="w-6 h-6 text-rose-400" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-white font-black text-base tracking-tight truncate">{comp.nombre}</h4>
                            <p className="text-rose-400 text-[10px] font-black uppercase tracking-widest mt-1 opacity-80">Stock Crítico</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black text-white leading-none">{comp.cantidad || 0}</p>
                          <p className="text-[8px] text-slate-500 font-bold uppercase tracking-tighter mt-1">Unidades</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Panel de Distribución por Ubicación */}
        <Suspense fallback={
          <div className="glass-panel rounded-[3rem] p-6 md:p-8 flex flex-col h-full min-h-[300px] md:min-h-[500px] justify-center items-center">
            <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            <span className="text-slate-500 font-bold tracking-widest text-[10px] uppercase mt-4">Cargando gráfico...</span>
          </div>
        }>
          <LocationChart chartData={chartData} loading={loading} total={stats.total} />
        </Suspense>

      </div>
    </div>
  );
};

export default Dashboard;
