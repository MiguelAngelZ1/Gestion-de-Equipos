import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { ROLES } from '../config/constants';
import { useToast } from '../context/ToastContext';
import EquipoDetalleModal from '../components/equipos/EquipoDetalleModal';
import CountUp from '../components/common/CountUp';

export default function Dashboard() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, servicio: 0, fuera: 0, prestamo: 0 });
  const [critical, setCritical] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEquipo, setSelectedEquipo] = useState<any>(null);
  const [estados, setEstados] = useState<any[]>([]);
  const [showAllDist, setShowAllDist] = useState(false);
  const DIST_VISIBLE = 3;

  useEffect(() => {
    (async () => {
      const u = JSON.parse(localStorage.getItem("equipos_user_data") || "{}");
      if ((u.rol || ROLES.USER).toUpperCase() !== ROLES.ADMIN) { setLoading(false); return; }
      try {
        const [data, estadosData] = await Promise.all([
          apiRequest('/dashboard/summary'),
          apiRequest('/config/estados').catch(() => [])
        ]);
        const find = (arr: any[], ...t: string[]) => arr.find((s: any) => t.some(x => s.name.toLowerCase().includes(x)))?.value || 0;
        setStats({
          total: data.total || 0,
          servicio: find(data.stats || [], 'buena', 'en servicio', 'e/s'),
          fuera: find(data.stats || [], 'mala', 'fuera', 'f/s'),
          prestamo: find(data.stats || [], 'prestamo', 'préstamo'),
        });
        setCritical(data.criticalEquipos || []);
        setLowStock(data.alerts?.lowStock || []);
        setChartData((data.locations || []).map((l: any) => ({ ...l, value: Number(l.value) })));
        setEstados(estadosData);
      } catch { showToast("Error", "No se pudo cargar el resumen.", "error"); }
      finally { setLoading(false); }
    })();
  }, [showToast]);

  const maxChart = Math.max(1, ...chartData.map(c => c.value));

  return (
    <div className="w-full max-w-full flex flex-col flex-1 min-h-0 md:overflow-hidden gap-2.5 md:gap-6">
      <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Hanken+Grotesk:wght@100..900&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      <div className="grid grid-cols-2 md:grid-cols-12 gap-2 md:gap-6 shrink-0 w-full auto-rows-min">
        <div className="col-span-1 md:col-span-3 card-glass p-2.5 md:p-4 rounded-xl flex flex-col items-center justify-center text-center gap-1 md:gap-2 md:py-5">
          <div className="flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[#b8c3ff] text-lg md:text-[20px]">devices</span>
            <p className="font-geist text-[10px] md:text-[11px] font-semibold tracking-wide text-[#c4c5d9] uppercase leading-tight">Total Inventario</p>
          </div>
          <h3 className="font-display text-2xl md:text-[32px] leading-none font-bold tracking-tight text-[#e4e2e4]">{loading ? '—' : <CountUp key={stats.total} value={stats.total} />}</h3>
        </div>

        <div className="col-span-1 md:col-span-3 card-glass p-2.5 md:p-4 rounded-xl flex flex-col items-center justify-center text-center gap-1 md:gap-2 md:py-5">
          <div className="flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[#42e355] text-lg md:text-[20px]">check_circle</span>
            <p className="font-geist text-[10px] md:text-[11px] font-semibold tracking-wide text-[#c4c5d9] uppercase leading-tight">En Servicio</p>
          </div>
          <h3 className="font-display text-2xl md:text-[32px] leading-none font-bold tracking-tight text-[#e4e2e4]">{loading ? '—' : <CountUp key={stats.servicio} value={stats.servicio} />}</h3>
        </div>

        <div className="col-span-1 md:col-span-3 card-glass p-2.5 md:p-4 rounded-xl flex flex-col items-center justify-center text-center gap-1 md:gap-2 md:py-5">
          <div className="flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[#ffb4ab] text-lg md:text-[20px]">warning</span>
            <p className="font-geist text-[10px] md:text-[11px] font-semibold tracking-wide text-[#c4c5d9] uppercase leading-tight">Fuera de Servicio</p>
          </div>
          <h3 className="font-display text-2xl md:text-[32px] leading-none font-bold tracking-tight text-[#ffb4ab]">{loading ? '—' : <CountUp key={stats.fuera} value={stats.fuera} />}</h3>
        </div>

        <div className="col-span-1 md:col-span-3 card-glass p-2.5 md:p-4 rounded-xl flex flex-col items-center justify-center text-center gap-1 md:gap-2 md:py-5">
          <div className="flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[#ffb59b] text-lg md:text-[20px]">transfer_within_a_station</span>
            <p className="font-geist text-[10px] md:text-[11px] font-semibold tracking-wide text-[#c4c5d9] uppercase leading-tight">En Préstamo</p>
          </div>
          <h3 className="font-display text-2xl md:text-[32px] leading-none font-bold tracking-tight text-[#e4e2e4]">{loading ? '—' : <CountUp key={stats.prestamo} value={stats.prestamo} />}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-6 md:flex-1 md:min-h-0 items-stretch">
        <div className="col-span-12 md:col-span-4 card-glass p-0 rounded-2xl flex flex-col md:overflow-hidden min-h-0 md:h-full md:max-h-[calc(100dvh-200px)]">
          <div className="p-3 md:p-6 flex items-center justify-between shrink-0">
            <h3 className="font-display text-lg md:text-[20px] font-semibold text-[#e4e2e4] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#ffb4ab]">campaign</span> Alertas Críticas
            </h3>
            <span className="bg-[#ffb4ab]/20 text-[#ffb4ab] font-geist text-[13px] font-medium px-2 py-1 rounded-md">{critical.length + lowStock.length} Nuevas</span>
          </div>
          <div className="md:flex-1 md:overflow-y-auto p-2 md:custom-scrollbar min-h-0">
            {loading ? (
              <div className="p-8 grid place-items-center"><div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-[#b8c3ff] animate-spin" /></div>
            ) : critical.length === 0 && lowStock.length === 0 ? (
              <div className="p-4 md:p-8 text-center">
                <p className="font-geist text-sm text-[#c4c5d9]">Sin alertas — todo operativo</p>
              </div>
            ) : (
              <>
                {critical.slice(0, 4).map((eq: any) => {
                  const d = eq.updated_at || eq.fecha_actualizacion || eq.updatedAt || eq.created_at || eq.fecha;
                  const fechaHora = d ? new Date(d).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '';
                  return (
                    <div key={eq.id} onClick={async () => {
                      try {
                        const full = await apiRequest(`/equipos/${eq.id}`);
                        setSelectedEquipo(full?.data || full);
                      } catch { setSelectedEquipo(eq); }
                    }} className="p-3 m-1.5 md:p-4 md:m-2 rounded-xl bg-[#ffb4ab]/5 border border-[#ffb4ab]/10 hover:bg-[#ffb4ab]/10 hover:border-[#ffb4ab]/20 transition-colors cursor-pointer active:scale-[0.98]">
                      <p className="font-geist text-[12px] font-bold tracking-wide text-[#ffb4ab] uppercase leading-tight break-words whitespace-normal">{eq.ine || 'SIN INE'}</p>
                      <div className="space-y-1 text-[13px] leading-5 mt-2">
                        <p className="text-[#e4e2e4]"><span className="text-[#c4c5d9] text-xs">Responsable:</span> <span className="font-medium">{eq.responsable_actual || eq.responsable || 'Sin responsable'}</span></p>
                        <p className="text-[#e4e2e4]"><span className="text-[#c4c5d9] text-xs">Ubicación:</span> <span className="font-medium">{eq.ubicacion || 'Sin ubicación'}</span></p>
                        <p className="text-[#e4e2e4]"><span className="text-[#c4c5d9] text-xs">Detalle:</span> <span className="font-medium">{eq.falla || eq.estado || 'Requiere atención'}</span></p>
                      </div>
                      {fechaHora && <p className="font-geist text-[11px] text-[#c4c5d9]/70 mt-3 text-right flex items-center justify-end gap-1.5"><span className="material-symbols-outlined text-[14px]">schedule</span>{fechaHora}</p>}
                    </div>
                  );
                })}
                {lowStock.slice(0, 2).map((c: any) => (
                  <div key={c.id} className="p-3 m-1.5 md:p-4 md:m-2 rounded-xl bg-[#2C2C2E] border border-white/5 hover:bg-[#353437] transition-colors cursor-pointer">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-geist text-[13px] font-medium text-[#ffb59b]">{c.nombre?.slice(0, 12).toUpperCase()}</span>
                      <span className="font-geist text-[12px] font-semibold tracking-wide text-[#c4c5d9]">Hace 2h</span>
                    </div>
                    <p className="font-display text-[15px] leading-5 text-[#e4e2e4] mb-2">Stock crítico — {c.cantidad} uds restantes.</p>
                    <button className="font-display text-sm font-semibold text-[#ffb59b] hover:text-white transition-colors">Gestionar →</button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="col-span-12 md:col-span-8 card-glass p-4 md:p-6 rounded-2xl flex flex-col md:overflow-hidden min-h-0 md:h-full md:max-h-[calc(100dvh-200px)]">
          <div className="flex items-start justify-between mb-3 md:mb-6 shrink-0">
            <h3 className="font-display text-lg md:text-[20px] font-semibold text-[#e4e2e4] flex items-center gap-2">
              <span className="material-symbols-outlined text-lg md:text-[20px] text-[#b8c3ff]">location_on</span>Distribución por Ubicaciones
            </h3>
          </div>
          <div className="md:flex-1 md:min-h-0 rounded-xl border border-white/5 bg-[#131315] p-3 md:p-6 flex flex-col md:overflow-hidden">
            {loading ? (
              <div className="flex-1 grid place-items-center"><div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-[#b8c3ff] animate-spin" /></div>
            ) : chartData.length === 0 ? (
              <p className="font-geist text-sm text-[#c4c5d9] text-center py-12">Sin datos de ubicaciones</p>
            ) : (
              <div className="flex flex-col gap-3 md:gap-4 md:overflow-y-auto md:flex-1 md:min-h-0 md:custom-scrollbar pr-1">
                {(showAllDist ? chartData : chartData.slice(0, DIST_VISIBLE)).map((loc: any) => {
                  const pct = Math.round((loc.value / maxChart) * 100);
                  return (
                    <div key={loc.name} className="group">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-display text-[15px] font-semibold text-[#e4e2e4] truncate flex-1 min-w-0">{loc.name}</span>
                        <button onClick={() => navigate(`/equipos?ubicacion=${encodeURIComponent(loc.name)}`)} className="inline-flex items-center gap-1 text-[#b8c3ff] hover:text-white transition-colors shrink-0">
                          <span className="font-geist text-[12px] font-semibold">{'Ver ->'}</span>
                        </button>
                        <span className="font-geist text-[13px] font-medium text-[#b8c3ff] shrink-0 ml-1"><CountUp key={`${loc.name}-${loc.value}`} value={Number(loc.value) || 0} /> Equipos</span>
                      </div>
                      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                        <div className="bg-gradient-to-r from-[#b8c3ff]/40 to-[#b8c3ff] h-full rounded-full transition-all duration-700 group-hover:brightness-125" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {chartData.length > DIST_VISIBLE && (
              <button
                onClick={() => setShowAllDist(v => !v)}
                className="mt-3 w-full py-2 md:py-2.5 rounded-xl text-[13px] font-semibold text-[#b8c3ff] hover:text-white hover:bg-white/5 transition-colors shrink-0"
              >
                {showAllDist ? 'Ver menos ↑' : `Ver más (${chartData.length - DIST_VISIBLE}) ↓`}
              </button>
            )}
          </div>
        </div>
      </div>

      <EquipoDetalleModal isOpen={!!selectedEquipo} equipo={selectedEquipo} estados={estados} onClose={() => setSelectedEquipo(null)} onEquipoUpdated={() => {}} />
    </div>
  );
}
