import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Server, User, MapPin, Tag, X, Info, Package, Plus, Calendar, Clock, Cpu } from 'lucide-react';
import { apiRequest } from '../../services/api';
import InstalarRepuestoModal from '../componentes/InstalarRepuestoModal';

const EquipoDetalleModal = ({ isOpen, equipo, estados, onClose, onEquipoUpdated }) => {
  const [activeTab, setActiveTab] = useState('info'); // 'info' o 'componentes'
  const [componentes, setComponentes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  const userData = JSON.parse(localStorage.getItem("equipos_user_data") || "{}");
  const userRole = (userData.rol || 'USER').toLowerCase();

  useEffect(() => {
    if (isOpen && equipo && activeTab === 'componentes') {
      fetchComponentes();
    }
  }, [isOpen, equipo, activeTab]);

  const fetchComponentes = async () => {
    setLoading(true);
    try {
      const data = await apiRequest(`/componentes/instalados/${equipo.id}`);
      setComponentes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (typeof document === 'undefined') return null;

  const getStatusColor = (estadoNombre) => {
    // 1. Buscar en la configuración dinámica cargada del sistema
    const st = (estadoNombre || '').toLowerCase();
    const estadoConfig = (estados || []).find(e => e.nombre.toLowerCase() === st);
    if (estadoConfig?.color_hex) return estadoConfig.color_hex;

    // 2. Fallbacks estáticos si no hay configuración
    if (st.includes('fuera de servicio') || st.includes('malo') || st.includes('reparación') || st === 'f/s') return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    if (st.includes('en servicio') || st.includes('operativo') || st.includes('bueno') || st === 'e/s') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && equipo && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-center justify-center p-5 sm:p-6 lg:p-12 bg-black/85 backdrop-blur-md h-[100dvh] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0f1523] border border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-3xl sm:rounded-[2rem] w-full max-w-3xl relative overflow-hidden flex flex-col max-h-[calc(100dvh-40px)]"
          >
            <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-br from-indigo-900/40 to-transparent pointer-events-none"></div>
            
            {/* Header Fijo Compacto */}
            <div className="p-4 sm:p-5 pb-0 border-b border-white/5 shrink-0 relative z-10">
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer z-50 shadow-lg backdrop-blur-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="flex flex-row gap-3 items-center pr-10 mb-4">
                 <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-600/20 shrink-0">
                    <Server className="w-5 h-5 text-white" />
                 </div>
                 <div className="flex-1 w-full">
                    <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none mb-1">Detalles del Equipo</h2>
                    <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight break-words whitespace-normal">
                       {equipo.ine || 'Sin INE'}
                    </h1>
                 </div>
              </div>

              {/* Quick Stats Bar */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                 <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/10">
                    <Tag className="w-3 h-3 text-indigo-400" />
                    <span className="text-[10px] font-bold text-slate-300 uppercase shrink-0">{equipo.tipo || 'S/T'}</span>
                 </div>
                 <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/10">
                    <User className="w-3 h-3 text-indigo-400" />
                    <span className="text-[10px] font-bold text-slate-300 uppercase shrink-0">{equipo.responsable || 'S/A'}</span>
                 </div>
                 <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/10">
                    <MapPin className="w-3 h-3 text-indigo-400" />
                    <span className="text-[10px] font-bold text-slate-300 uppercase shrink-0">{equipo.ubicacion || 'S/U'}</span>
                 </div>
                 {(() => {
                    const badgeColor = getStatusColor(equipo.estado);
                    const isHex = badgeColor.startsWith('#');
                    return (
                       <span 
                          className={`text-[9px] uppercase tracking-wider font-bold px-2.5 py-1.5 rounded-lg border ml-auto ${!isHex ? badgeColor : ''}`}
                          style={isHex ? {
                             backgroundColor: `${badgeColor}15`,
                             color: badgeColor,
                             borderColor: `${badgeColor}33`
                          } : {}}
                       >
                          {equipo.estado}
                       </span>
                    );
                 })()}
              </div>

              {/* Tabs */}
              <div className="flex gap-6 relative z-10">
                <button 
                  onClick={() => setActiveTab('info')}
                  className={`pb-3 text-[10px] font-black uppercase tracking-widest transition-all relative ${
                    activeTab === 'info' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Información Técnica
                  {activeTab === 'info' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />}
                </button>
                {userRole === 'admin' && (
                  <button 
                    onClick={() => setActiveTab('componentes')}
                    className={`pb-3 text-[10px] font-black uppercase tracking-widest transition-all relative ${
                      activeTab === 'componentes' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Piezas Instaladas
                    {activeTab === 'componentes' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />}
                  </button>
                )}
              </div>
            </div>

            {/* Body Scrolleable */}
            <div className="p-5 sm:p-6 flex-1 overflow-y-auto custom-scrollbar relative z-10 bg-black/20">
              <AnimatePresence mode="wait">
                {activeTab === 'info' ? (
                  <motion.div 
                    key="info"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    {/* Identificación Secundaria */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl">
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Número Nacional de Equipo (NNE)</p>
                          <p className="font-mono text-xs text-white bg-black/40 px-3 py-2 rounded-lg border border-white/5 inline-block min-w-[140px]">{equipo.nne || 'NO REGISTRADO'}</p>
                       </div>
                       <div className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl">
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Número de Serie (S/N)</p>
                          <p className="font-mono text-xs text-white bg-black/40 px-3 py-2 rounded-lg border border-white/5 inline-block min-w-[140px] font-bold">{equipo.serie || 'SIN SERIE VISIBLE'}</p>
                       </div>
                    </div>

                    {/* Ficha Técnica / Especificaciones */}
                    <div className="bg-white/[0.03] border border-white/5 rounded-[2rem] overflow-hidden">
                       <div className="px-6 py-4 bg-white/5 border-b border-white/5 flex items-center gap-3">
                          <Info className="w-4 h-4 text-indigo-400" />
                          <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Ficha Técnica Base</h4>
                       </div>
                       
                       <div className="p-6">
                         {equipo.especificaciones && equipo.especificaciones.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                               {equipo.especificaciones.map((spec, i) => (
                                 <div key={spec.id || `spec-${i}`} className="flex items-center justify-between py-2 border-b border-white/5 group">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight group-hover:text-slate-400 transition-colors">{spec.clave}</span>
                                    <span className="text-xs font-black text-white">{spec.valor}</span>
                                 </div>
                               ))}
                            </div>
                         ) : (
                            <div className="py-8 flex flex-col items-center justify-center text-center opacity-30">
                               <Package className="w-8 h-8 mb-2" />
                               <p className="text-xs font-medium italic">Sin especificaciones técnicas adicionales.</p>
                            </div>
                         )}
                       </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="componentes"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-6 pb-10"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-black text-white uppercase tracking-tighter flex items-center gap-2">
                        <Package className="w-6 h-6 text-indigo-400" />
                        Inventario del Equipo
                      </h3>
                      <button 
                        onClick={() => setIsInstallModalOpen(true)}
                        className="flex items-center gap-2 px-3 sm:px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 active:scale-95 cursor-pointer shrink-0"
                      >
                        <Plus className="w-4 h-4 shrink-0" /> <span className="hidden sm:inline">Instalar Repuesto</span>
                      </button>
                    </div>

                    {loading ? (
                      <div className="py-20 text-center text-slate-500 italic">Cargando componentes...</div>
                    ) : componentes.length === 0 ? (
                      <div className="py-20 flex flex-col items-center justify-center bg-white/5 rounded-[2.5rem] border border-dashed border-white/10 text-slate-500">
                        <Package className="w-12 h-12 mb-4 opacity-10" />
                        <p className="font-medium italic">Este equipo no tiene piezas adicionales registradas.</p>
                      </div>
                    ) : (
                      <ul className="space-y-4">
                        {componentes.map((comp) => (
                          <li key={comp.ui_id} className="flex flex-col bg-black/30 rounded-3xl border border-white/5 overflow-hidden group hover:border-indigo-500/30 transition-all p-1">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 gap-4">
                                
                                {/* Lado Izquierdo: La Ficha Base (1) */}
                                <div className="flex items-center gap-4 overflow-hidden w-full sm:w-auto">
                                  <div className={`p-3 rounded-2xl shrink-0 ${comp.tipo_item === 'TRAZABLE' ? 'bg-indigo-600/20 text-indigo-400' : 'bg-slate-500/10 text-slate-500'}`}>
                                    {comp.tipo_item === 'TRAZABLE' ? <Package className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-xs font-black text-white uppercase tracking-wider">{comp.nombre}</span>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[10px] font-bold ${comp.tipo_item === 'TRAZABLE' ? 'text-indigo-400' : 'text-slate-400'}`}>
                                            {comp.valor}
                                        </span>
                                        {comp.tipo_item === 'GENERICO' && (
                                            <span className="px-1.5 py-0.5 bg-slate-500/20 text-slate-400 text-[8px] font-black rounded uppercase">Sin Repuesto Asignado</span>
                                        )}
                                        {comp.tipo_item === 'Huerfano' && (
                                            <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-400 text-[8px] font-black rounded uppercase">Pieza Física No Enlistada</span>
                                        )}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Lado Derecho: La pieza Física (1) */}
                                {comp.id_fisico && (
                                    <div className="flex flex-col items-start sm:items-end w-full sm:w-auto bg-white/5 sm:bg-transparent p-3 sm:p-0 rounded-xl">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Pieza Instalada</p>
                                        <div className="flex items-center gap-2">
                                            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                                            <span className="text-xs font-bold text-white font-mono">{comp.serie || 'Sin Número de Serie'}</span>
                                        </div>
                                        {comp.nne && <span className="text-[9px] text-slate-400 font-bold uppercase mt-1">NNE: {comp.nne}</span>}
                                    </div>
                                )}
                            </div>

                            {/* Especificaciones extra de la pieza física, si las hay */}
                            {comp.especificaciones && comp.especificaciones.length > 0 && (
                                <div className="px-5 pb-5 pt-2">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-black/40 rounded-2xl border border-white/5">
                                        {comp.especificaciones.map((spec, idx) => (
                                            <div key={idx} className="flex flex-col">
                                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{spec.clave}</span>
                                                <span className="text-[10px] font-bold text-slate-300">{spec.valor}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer Fijo */}
            <div className="p-6 sm:p-8 border-t border-white/5 bg-[#0f1523] shrink-0 z-20 flex justify-end">
              <button 
                onClick={onClose}
                className="bg-white/5 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-widest px-8 py-4 rounded-xl transition-all border border-white/10 hover:border-white/20 cursor-pointer active:scale-95"
              >
                Cerrar Detalle
              </button>
            </div>

            {/* Modal de instalación */}
            <InstalarRepuestoModal 
               isOpen={isInstallModalOpen}
               onClose={() => setIsInstallModalOpen(false)}
               equipo={equipo}
               onInstalled={() => {
                 fetchComponentes(); // Recargar lista
                 if (onEquipoUpdated) onEquipoUpdated();
               }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default EquipoDetalleModal;
