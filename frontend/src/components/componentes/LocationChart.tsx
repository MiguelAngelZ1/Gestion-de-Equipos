import { useEffect, useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { motion } from 'framer-motion';

const COLORS = ['#818cf8', '#4ade80', '#fbbf24', '#f87171', '#c084fc', '#60a5fa', '#f472b6', '#2dd4bf', '#fb923c'];

const spring = { type: 'spring' as const, stiffness: 400, damping: 30 };

const LocationChart = ({ chartData = [], loading = false, total = 0 }) => {
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.25 }}
      className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4 flex flex-col h-full overflow-hidden"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-500/10">
          <div className="w-3 h-3 rounded-full border-2 border-indigo-400" />
        </div>
        <p className="text-sm font-bold text-white tracking-tight">Ubicaciones</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <div className="w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : chartData.length === 0 ? (
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Sin datos</p>
        ) : (
          <div className="w-full h-full flex flex-col items-center">
            <div className="w-full h-[180px] relative">
              {ready && (
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      {chartData.map((_, i) => (
                        <linearGradient key={i} id={`g${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.7} />
                          <stop offset="100%" stopColor={COLORS[i % COLORS.length]} stopOpacity={1} />
                        </linearGradient>
                      ))}
                    </defs>
                    <Pie data={chartData} cx="50%" cy="80%" startAngle={180} endAngle={0}
                      innerRadius="70%" outerRadius="100%" paddingAngle={3} dataKey="value"
                      stroke="none" animationDuration={1200} animationBegin={200} cornerRadius={4} minAngle={3}>
                      {chartData.map((_, i) => <Cell key={i} fill={`url(#g${i})`} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15,23,42,0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '0.75rem',
                        padding: '8px 12px',
                        backdropFilter: 'blur(12px)',
                      }}
                      itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}
                      cursor={{ fill: 'transparent' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-[10%] text-center pointer-events-none">
                <p className="text-2xl font-black text-white leading-none tabular-nums">{total}</p>
                <p className="text-[9px] text-indigo-400/80 font-bold uppercase tracking-wider mt-1">Total</p>
              </div>
            </div>

            {/* Legend */}
            <div className="w-full mt-auto pt-3 border-t border-white/[0.06]">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {chartData.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2 py-0.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-[11px] text-slate-300 font-medium truncate">{entry.name}</span>
                    <span className="text-[10px] text-indigo-400/80 font-bold ml-auto tabular-nums">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default LocationChart;
