import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { ROLES } from '../config/constants';
import { useToast } from '../context/ToastContext';
import EquipoDetalleModal from '../components/equipos/EquipoDetalleModal';

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
    <div className="w-full max-w-full flex flex-col flex-1 min-h-0 overflow-hidden gap-6">
      <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Hanken+Grotesk:wght@100..900&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      <style>{`
        .card-glass { background-color: #1C1C1E; border: 1px solid rgba(255,255,255,0.08); transition: all 0.2s ease-in-out; }
        .card-glass:hover { border-color: rgba(255,255,255,0.18); }
        .font-display { font-family: 'Hanken Grotesk', sans-serif; }
        .font-geist { font-family: 'Geist', sans-serif; }
      `}</style>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 shrink-0 w-full auto-rows-min">
        <div className="col-span-12 md:col-span-3 card-glass p-4 rounded-xl flex flex-col items-center justify-center text-center gap-2 py-5">
          <div className="flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[#b8c3ff] text-[20px]">devices</span>
            <p className="font-geist text-[11px] font-semibold tracking-wide text-[#c4c5d9] uppercase">Total Inventario</p>
          </div>
          <h3 className="font-display text-[32px] leading-none font-bold tracking-tight text-[#e4e2e4]">{loading ? '—' : stats.total}</h3>
        </div>

        <div className="col-span-12 md:col-span-3 card-glass p-4 rounded-xl flex flex-col items-center justify-center text-center gap-2 py-5">
          <div className="flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[#42e355] text-[20px]">check_circle</span>
            <p className="font-geist text-[11px] font-semibold tracking-wide text-[#c4c5d9] uppercase">En Servicio</p>
          </div>
          <h3 className="font-display text-[32px] leading-none font-bold tracking-tight text-[#e4e2e4]">{loading ? '—' : stats.servicio}</h3>
        </div>

        <div className="col-span-12 md:col-span-3 card-glass p-4 rounded-xl flex flex-col items-center justify-center text-center gap-2 py-5">
          <div className="flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[#ffb4ab] text-[20px]">warning</span>
            <p className="font-geist text-[11px] font-semibold tracking-wide text-[#c4c5d9] uppercase">Fuera de Servicio</p>
          </div>
          <h3 className="font-display text-[32px] leading-none font-bold tracking-tight text-[#ffb4ab]">{loading ? '—' : stats.fuera}</h3>
        </div>

        <div className="col-span-12 md:col-span-3 card-glass p-4 rounded-xl flex flex-col items-center justify-center text-center gap-2 py-5">
          <div className="flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[#ffb59b] text-[20px]">transfer_within_a_station</span>
            <p className="font-geist text-[11px] font-semibold tracking-wide text-[#c4c5d9] uppercase">En Préstamo</p>
          </div>
          <h3 className="font-display text-[32px] leading-none font-bold tracking-tight text-[#e4e2e4]">{loading ? '—' : stats.prestamo}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 min-h-0 items-stretch">
        <div className="col-span-12 md:col-span-4 card-glass p-0 rounded-2xl flex flex-col overflow-hidden min-h-0 h-full max-h-[calc(100vh-200px)]">
          <div className="p-6 flex items-center justify-between shrink-0">
            <h3 className="font-display text-[20px] font-semibold text-[#e4e2e4] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#ffb4ab]">campaign</span> Alertas Críticas
            </h3>
            <span className="bg-[#ffb4ab]/20 text-[#ffb4ab] font-geist text-[13px] font-medium px-2 py-1 rounded-md">{critical.length + lowStock.length} Nuevas</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar min-h-0">
            {loading ? (
              <div className="p-8 grid place-items-center"><div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-[#b8c3ff] animate-spin" /></div>
            ) : critical.length === 0 && lowStock.length === 0 ? (
              <div className="p-8 text-center">
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
                    }} className="p-4 m-2 rounded-xl bg-[#ffb4ab]/5 border border-[#ffb4ab]/10 hover:bg-[#ffb4ab]/10 hover:border-[#ffb4ab]/20 transition-colors cursor-pointer active:scale-[0.98]">
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
                  <div key={c.id} className="p-4 m-2 rounded-xl bg-[#2C2C2E] border border-white/5 hover:bg-[#353437] transition-colors cursor-pointer">
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

        <div className="col-span-12 md:col-span-8 card-glass p-6 rounded-2xl flex flex-col overflow-hidden min-h-0 h-full max-h-[calc(100vh-200px)]">
          <div className="flex items-start justify-between mb-6 shrink-0">
            <h3 className="font-display text-[20px] font-semibold text-[#e4e2e4]">Distribución por Ubicaciones</h3>
          </div>
          <div className="flex-1 min-h-0 rounded-xl border border-white/5 bg-[#131315] p-6 flex flex-col overflow-hidden">
            {loading ? (
              <div className="flex-1 grid place-items-center"><div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-[#b8c3ff] animate-spin" /></div>
            ) : chartData.length === 0 ? (
              <p className="font-geist text-sm text-[#c4c5d9] text-center py-12">Sin datos de ubicaciones</p>
            ) : (
              <div className="flex flex-col gap-4 overflow-y-auto flex-1 min-h-0 custom-scrollbar pr-1">
                {chartData.map((loc: any) => {
                  const pct = Math.round((loc.value / maxChart) * 100);
                  return (
                    <div key={loc.name} className="group">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-display text-[15px] font-semibold text-[#e4e2e4] truncate flex-1 min-w-0">{loc.name}</span>
                        <button onClick={() => navigate(`/equipos?ubicacion=${encodeURIComponent(loc.name)}`)} className="inline-flex items-center gap-1 text-[#b8c3ff] hover:text-white transition-colors shrink-0">
                          <span className="font-geist text-[12px] font-semibold">{'Ver ->'}</span>
                        </button>
                        <span className="font-geist text-[13px] font-medium text-[#b8c3ff] shrink-0 ml-1">{loc.value} Equipos</span>
                      </div>
                      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                        <div className="bg-gradient-to-r from-[#b8c3ff]/40 to-[#b8c3ff] h-full rounded-full transition-all duration-700 group-hover:brightness-125" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <EquipoDetalleModal isOpen={!!selectedEquipo} equipo={selectedEquipo} estados={estados} onClose={() => setSelectedEquipo(null)} onEquipoUpdated={() => {}} />
    </div>
  );
}
