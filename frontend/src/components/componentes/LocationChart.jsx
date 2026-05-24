import React, { useEffect, useState, useRef } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';

const CHART_COLORS = [
  '#818cf8', // Indigo
  '#4ade80', // Emerald
  '#fbbf24', // Amber
  '#f87171', // Rose
  '#c084fc', // Purple
  '#60a5fa', // Blue
  '#f472b6', // Pink
  '#2dd4bf', // Teal
  '#fb923c'  // Orange
];

const DEFAULT_CHART_DATA = [];

const LocationChart = ({ chartData = DEFAULT_CHART_DATA, loading = false, total = 0 }) => {
  const containerRef = useRef(null);
  const [chartHeight, setChartHeight] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setChartHeight(entry.contentRect.height);
      }
    });

    observer.observe(el);
    setChartHeight(el.clientHeight || el.offsetHeight || 250);

    return () => observer.disconnect();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 30 }} 
      animate={{ opacity: 1, x: 0 }} 
      transition={{ duration: 0.8, delay: 0.6 }}
      className="glass-panel rounded-[3rem] p-6 md:p-8 flex flex-col h-full overflow-hidden"
    >
      <div className="flex items-center gap-5 mb-2 shrink-0">
        <div className="p-4 bg-indigo-500/15 rounded-2xl shadow-lg shadow-indigo-500/10">
          <MapPin className="w-7 h-7 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Distribución Geográfica</h2>
          <p className="text-slate-400 text-xs font-bold mt-1 tracking-wide opacity-80 uppercase">Concentración de Activos</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start mt-2 min-h-0 relative">
        {loading ? (
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        ) : chartData.length === 0 ? (
          <span className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Sin datos de geolocalización</span>
        ) : (
          <div className="w-full h-full flex flex-col items-center">
            {/* Gráfico Tipo Gauge (Semi-circular) */}
            <div ref={containerRef} className="w-full h-[250px] md:h-[320px] relative mt-0">
              {chartHeight > 0 && (
                <ResponsiveContainer width="100%" height={chartHeight} debounce={1}>
                  <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      {chartData.map((_, index) => (
                        <linearGradient key={`grad-dist-${index}`} id={`grad-dist-${index}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0.8}/>
                          <stop offset="100%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={1}/>
                        </linearGradient>
                      ))}
                    </defs>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="80%"
                      startAngle={180}
                      endAngle={0}
                      innerRadius="75%"
                      outerRadius="100%"
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                      animationDuration={2000}
                      animationBegin={400}
                      cornerRadius={4}
                      minAngle={3}
                    >
                      {chartData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={`url(#grad-dist-${index})`}
                          cornerRadius={4}
                          style={{
                            filter: 'drop-shadow(0px 8px 12px rgba(0,0,0,0.3))'
                          }}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                        backdropFilter: 'blur(16px)',
                        border: '1px solid rgba(255,255,255,0.1)', 
                        borderRadius: '1.5rem',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
                        padding: '12px 20px'
                      }}
                      itemStyle={{ color: '#fff', fontSize: '13px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                      cursor={{ fill: 'transparent' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
              {/* Overlay de información central */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-[15%] text-center">
                <p className="text-4xl md:text-5xl font-black text-white leading-none tracking-tighter">{total}</p>
                <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.3em] mt-3">Total Activos</p>
              </div>
            </div>

            {/* Leyenda Premium */}
            <div className="w-full mt-auto pt-8 border-t border-white/5 max-h-[180px] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                {chartData.map((entry, index) => (
                  <motion.div 
                    key={`leg-${index}`} 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    transition={{ delay: 0.8 + (index * 0.05) }}
                    className="flex items-center gap-3 group/leg cursor-default"
                  >
                    <div 
                      className="w-3 h-3 rounded-full shrink-0 shadow-lg group-hover/leg:scale-125 transition-transform duration-300" 
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length], boxShadow: `0 0 10px ${CHART_COLORS[index % CHART_COLORS.length]}50` }} 
                    />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[11px] text-white font-black truncate tracking-tight uppercase group-hover/leg:text-indigo-300 transition-colors">{entry.name}</span>
                      <span className="text-[9px] text-indigo-400 font-black mt-1 opacity-60 group-hover/leg:opacity-100 transition-opacity tracking-widest">{entry.value} UNIDADES</span>
                    </div>
                  </motion.div>
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
