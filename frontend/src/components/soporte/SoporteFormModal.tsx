import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Server, ClipboardList, Calendar, User, Search, AlertCircle, DollarSign, Wrench, Loader2 } from 'lucide-react';
import { apiRequest } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import SearchInput from '../common/SearchInput';
import Select from '../common/Select';
import { matchesSearch } from '../../utils/search';

const spring = { type: 'spring' as const, stiffness: 400, damping: 30 };
const getStatusColor = (n) => {
  const s = (n || '').toLowerCase().trim();
  if (s === 'e/s' || s.includes('en servicio') || s.includes('bueno')) return '#22c55e';
  if (s === 'f/s' || s.includes('fuera') || s.includes('malo')) return '#ef4444';
  if (s.includes('mant')) return '#eab308';
  if (s.includes('prest')) return '#f97316';
  return '#71717a';
};

const SoporteFormModal = ({ isOpen, initialData, onClose, onSave }) => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState<{
    equipo_id: string;
    equipo_display: string;
    responsable: string;
    tarea_realizada: string;
    fecha: string;
    tipo_falla: string;
    id?: string;
  }>({
    equipo_id: '',
    equipo_display: '',
    responsable: 'SERVICIO TÉCNICO',
    tarea_realizada: '',
    fecha: new Date().toISOString().split('T')[0],
    tipo_falla: 'PREVENTIVO'
  });

  const [busquedaEquipo, setBusquedaEquipo] = useState('');
  const [equipos, setEquipos] = useState([]);
  const [sugerencias, setSugerencias] = useState([]);
  const [showSugerencias, setShowSugerencias] = useState(false);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null);
  const sugerenciasRef = useRef(null);
  const [loadingEquipos, setLoadingEquipos] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
        try {
            setLoadingEquipos(true);
            const data = await apiRequest('/equipos');
            setEquipos(data?.data || data || []);
        } catch {
            // silent
        } finally {
            setLoadingEquipos(false);
        }
    };

    if (isOpen) {
      fetchData();
      if (initialData && Object.keys(initialData).length > 0) {
        setFormData({
          id: initialData.id,
          equipo_id: initialData.equipo_id || '',
          equipo_display: initialData.ine || initialData.equipo_id || '',
          responsable: 'SERVICIO TÉCNICO',
          tarea_realizada: initialData.tarea_realizada || '',
          fecha: initialData.fecha ? initialData.fecha.split('T')[0] : new Date().toISOString().split('T')[0],
          tipo_falla: initialData.tipo_falla || 'PREVENTIVO'
        });
        setBusquedaEquipo(initialData.ine || initialData.equipo_id || '');
      } else {
        setFormData({
          equipo_id: '',
          equipo_display: '',
          responsable: 'SERVICIO TÉCNICO',
          tarea_realizada: '',
          fecha: new Date().toISOString().split('T')[0],
          tipo_falla: 'PREVENTIVO'
        });
        setBusquedaEquipo('');
        setEquipoSeleccionado(null);
      }
      setIsSaving(false);
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (busquedaEquipo.length < 2 || (equipoSeleccionado && (equipoSeleccionado.ine === busquedaEquipo || equipoSeleccionado.serie === busquedaEquipo))) {
      setSugerencias([]);
      setShowSugerencias(false);
      return;
    }

    const filtered = equipos.filter(eq => matchesSearch(eq, busquedaEquipo)).slice(0, 6);
    setSugerencias(filtered);
    setShowSugerencias(filtered.length > 0);
  }, [busquedaEquipo, equipos, equipoSeleccionado]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sugerenciasRef.current && !sugerenciasRef.current.contains(event.target)) {
        setShowSugerencias(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const seleccionarEquipo = (equipo) => {
    setEquipoSeleccionado(equipo);
    setBusquedaEquipo(equipo.ine);
    setFormData(prev => ({ ...prev, equipo_id: equipo.id }));
    setShowSugerencias(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    if (!formData.equipo_id) {
      showToast(
        "Equipo Requerido",
        "Debes buscar y seleccionar un equipo válido de la lista de sugerencias antes de continuar.",
        "error"
      );
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {isOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={!isSaving ? onClose : undefined} className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.97, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 8 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }} onClick={e => e.stopPropagation()} className="bg-[#1C1C1E] border border-white/5 rounded-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
                <div className="p-4 border-b border-white/5 flex items-center gap-3 shrink-0">
                  <span className="material-symbols-outlined text-[#e4e2e4] text-[24px]">build</span>
                  <div className="min-w-0">
                    <h2 className="text-[16px] font-semibold text-[#e4e2e4] leading-none">{formData.id ? 'Editar Intervención' : 'Nueva Tarea'}</h2>
                    <p className="text-xs text-[#c4c5d9] mt-0.5">Completa los detalles técnicos del mantenimiento.</p>
                  </div>
                  <button onClick={onClose} disabled={isSaving} className="ml-auto w-8 h-8 grid place-items-center rounded-full hover:bg-white/5 text-[#c4c5d9] disabled:opacity-50">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 flex-1 overflow-y-auto custom-scrollbar overscroll-contain space-y-4" style={{ overscrollBehavior: 'contain' }}>
                   <form id="soporte-form" onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div className="relative lg:col-span-1" ref={sugerenciasRef}>
                         <label className="block text-xs font-semibold mb-1.5 text-[#c4c5d9]">Equipo a Intervenir <span className="text-[#ffb4ab]">*</span></label>
                          <div className={`relative group ${isSaving ? 'opacity-50' : ''}`}>
                             <SearchInput
                                disabled={isSaving}
                                value={busquedaEquipo}
                                onChange={(e) => setBusquedaEquipo(e.target.value)}
                                placeholder="INE, Serie, Procesador, Marca..."
                                className="w-full"
                             />
                             {loadingEquipos && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                   <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                                </div>
                             )}
                          </div>
                         
                         <AnimatePresence>
                            {!isSaving && showSugerencias && sugerencias.length > 0 && (
                               <motion.div initial={{ opacity: 0, scale: 0.97, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -6 }} transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }} className="absolute z-50 left-0 mt-3 bg-[#27272A] border border-zinc-700 rounded-2xl shadow-2xl p-2 origin-top-left w-max min-w-full max-w-[min(420px,calc(100vw-32px))]">
                                  <div className="absolute -top-1 left-6 w-2 h-2 bg-[#27272A] border-l border-t border-zinc-700 rotate-45" />
                                  <div className="space-y-1">
                                  {sugerencias.map(eq => (
                                     <button key={eq.id} type="button" onClick={() => seleccionarEquipo(eq)} className="w-full px-3 py-2.5 hover:bg-white/[0.06] rounded-xl text-left transition-colors cursor-pointer flex items-start gap-3">
                                        <span className="relative shrink-0 mt-0.5">
                                          <Server className="w-4 h-4 text-zinc-400" />
                                          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#27272A]" style={{ background: getStatusColor(eq.estado) }} />
                                        </span>
                                         <span className="min-w-0 flex-1 space-y-0.5">
                                          <p className="text-[#e4e2e4] font-semibold text-sm leading-none whitespace-nowrap">{eq.ine || 'Sin INE'}</p>
                                          <p className="text-[#c4c5d9] text-[11px] leading-none break-words">{eq.responsable || 'S/A'}</p>
                                          <p className="text-[#c4c5d9] text-[11px] leading-none break-words">{eq.ubicacion || 'S/U'}</p>
                                        </span>
                                     </button>
                                  ))}
                                  </div>
                               </motion.div>
                            )}
                         </AnimatePresence>

                         {equipoSeleccionado && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2.5 flex items-start gap-3">
                               <span className="relative shrink-0 mt-0.5">
                                 <Server className="w-4 h-4 text-zinc-400" />
                                 <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#1C1C1E]" style={{ background: getStatusColor(equipoSeleccionado.estado) }} />
                               </span>
                               <span className="min-w-0 flex-1 space-y-0.5">
                                 <p className="text-[#e4e2e4] font-semibold text-sm leading-none whitespace-nowrap">{equipoSeleccionado.ine || 'Sin INE'}</p>
                                 <p className="text-[#c4c5d9] text-[11px] leading-none break-words">{equipoSeleccionado.responsable || equipoSeleccionado.responsable_nombre || 'S/A'}</p>
                                 <p className="text-[#c4c5d9] text-[11px] leading-none break-words">{equipoSeleccionado.ubicacion || equipoSeleccionado.ubicacion_nombre || 'S/U'}</p>
                               </span>
                            </motion.div>
                         )}
                       </div>
                         <div className={isSaving ? 'opacity-50' : ''}>
                            <label className="block text-xs font-semibold mb-1.5 text-[#c4c5d9]">Fecha de Intervención</label>
                            <input type="date" name="fecha" required disabled={isSaving} value={formData.fecha} onChange={handleChange} className="w-full bg-[#131315] border border-white/5 text-[#e4e2e4] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#b8c3ff]/40 text-sm [color-scheme:dark]" />
                         </div>
                         <div className={isSaving ? 'opacity-50' : ''}>
                            <label className="block text-xs font-semibold mb-1.5 text-[#c4c5d9]">Tipo de Tarea</label>
                            <Select name="tipo_falla" disabled={isSaving} value={formData.tipo_falla} onChange={handleChange} options={[{ value: "PREVENTIVO", label: "Mantenimiento Preventivo" },{ value: "CORRECTIVO", label: "Mantenimiento Correctivo" },{ value: "INSTALACION", label: "Instalación / Configuración" },{ value: "REPARACION", label: "Reparación Crítica" },{ value: "ACTUALIZACION", label: "Actualización de Hardware" }]} />
                         </div>
                      </div>

                      <div className={isSaving ? 'opacity-50' : ''}>
                         <label className="block text-xs font-semibold mb-1.5 text-[#c4c5d9]">Detalle del Trabajo Realizado <span className="text-[#ffb4ab]">*</span></label>
                         <textarea name="tarea_realizada" required disabled={isSaving} rows={4} placeholder="Describe detalladamente el trabajo..." value={formData.tarea_realizada} onChange={handleChange} className="w-full bg-[#131315] border border-white/5 text-[#e4e2e4] placeholder:text-zinc-600 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#b8c3ff]/40 resize-none min-h-[100px] text-sm" />
                      </div>
                   </form>
                </div>
                <div className="p-4 border-t border-white/5 flex justify-end gap-2 shrink-0">
                   <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-[#c4c5d9] hover:text-white disabled:opacity-50">Cancelar</button>
                   <button type="submit" form="soporte-form" disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-white inline-flex items-center gap-2 disabled:opacity-50">{isSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Procesando...</> : <><Save className="w-4 h-4" />{formData.id ? 'Guardar Cambios' : 'Registrar'}</>}</button>
                </div>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default SoporteFormModal;
