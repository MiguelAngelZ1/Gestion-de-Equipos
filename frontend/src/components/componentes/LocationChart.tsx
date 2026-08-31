import { useEffect, useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

const COLORS = ['#FAFAFA', '#A1A1AA', '#52525B', '#27272A', '#3F3F46', '#71717A', '#E4E4E7', '#D4D4D8'];

export default function LocationChart({ chartData = [], loading = false, total = 0 }: any) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (loading) return <div className="h-[240px] grid place-items-center"><div className="w-5 h-5 rounded-full border-2 border-zinc-800 border-t-zinc-400 animate-spin" /></div>;
  if (chartData.length === 0) return <p className="text-xs text-zinc-500 py-12 text-center">Sin datos</p>;
  return (
    <div className="w-full overflow-hidden">
      <div className="w-full h-[200px] relative">
        {ready && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} cx="50%" cy="78%" startAngle={180} endAngle={0} innerRadius="68%" outerRadius="92%" dataKey="value" stroke="none">
                {chartData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#18181B', border: '1px solid #27272A', borderRadius: 8 }} itemStyle={{ color: '#FAFAFA', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[14%] text-center pointer-events-none">
          <p className="text-2xl font-bold leading-none tabular-nums">{total}</p>
          <p className="text-[10px] tracking-widest font-bold text-zinc-500">TOTAL</p>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-zinc-800 grid grid-cols-2 gap-2">
        {chartData.map((e: any, i: number) => (
          <div key={i} className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="text-xs text-zinc-400 truncate flex-1 min-w-0">{e.name}</span>
            <span className="text-xs font-semibold shrink-0">{e.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
