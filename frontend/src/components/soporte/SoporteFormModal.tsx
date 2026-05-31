import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Server, ClipboardList, Calendar, User, Search, AlertCircle, DollarSign, Wrench, Loader2 } from 'lucide-react';
import { apiRequest } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import SearchInput from '../common/SearchInput';
import Select from '../common/Select';
import { matchesSearch } from '../../utils/search';

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
        } catch (error) {
            console.error("Error fetching equipos for search:", error);
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

  // Buscador de equipos local
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

  // Cerrar sugerencias al hacer clic fuera
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={!isSaving ? onClose : undefined}
              className="fixed inset-0 z-[200] flex items-center justify-center p-5 sm:p-6 bg-black/85 backdrop-blur-md h-[100dvh] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#0b1120] border border-white/20 shadow-[0_0_80px_rgba(0,0,0,0.8)] rounded-3xl sm:rounded-[2.5rem] w-full max-w-3xl relative overflow-hidden flex flex-col max-h-[calc(100dvh-40px)]"
              >
                <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-br from-indigo-600/20 to-transparent pointer-events-none"></div>

                <div className="p-4 sm:p-6 pb-4 border-b border-white/5 shrink-0 relative z-10 flex justify-between items-center">
                   <div className="flex flex-row items-center gap-3 pr-10 sm:pr-0">
                      <div className="bg-indigo-500/10 p-2 rounded-2xl border border-indigo-500/20 shrink-0">
                         <Wrench className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <h2 className="text-lg sm:text-xl font-black text-white tracking-tight leading-tight">
                            {formData.id ? 'Editar Intervención' : 'Nueva Tarea'}
                        </h2>
                      <p className="text-slate-500 text-[11px] sm:text-xs max-w-md font-medium">
                         Completa los detalles técnicos del mantenimiento.
                      </p>
                   </div>
                   </div>
                   <button 
                      onClick={onClose}
                      disabled={isSaving}
                      className={`p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-slate-400 hover:text-white transition-all group ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                   >
                      <X className="w-4 h-4 group-hover:scale-110 transition-transform" />
                   </button>
                </div>

                <div className="p-5 sm:p-6 flex-1 overflow-y-auto custom-scrollbar relative z-10">
                   <form id="soporte-form" onSubmit={handleSubmit} className="space-y-5">
                      {/* Buscador de Equipo */}
                      <div className="relative" ref={sugerenciasRef}>
                         <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400/80 mb-3 flex items-center gap-2">
                            <Server className="w-3.5 h-3.5" />
                            Equipo a Intervenir *
                         </label>
                          <div className={`relative group ${isSaving ? 'opacity-50' : ''}`}>
                             <SearchInput
                                disabled={isSaving}
                                value={busquedaEquipo}
                                onChange={(e) => setBusquedaEquipo(e.target.value)}
                                placeholder="INE, Serie, Procesador, Marca..."
                                className="w-full"
                             />
                             {loadingEquipos && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                   <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                                </div>
                             )}
                          </div>
                         
                         <AnimatePresence>
                            {!isSaving && showSugerencias && sugerencias.length > 0 && (
                               <motion.div 
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  className="absolute z-50 left-0 right-0 mt-2 bg-[#161f31] border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
                               >
                                  {sugerencias.map(eq => (
                                     <button
                                        key={eq.id}
                                        type="button"
                                        onClick={() => seleccionarEquipo(eq)}
                                        className="w-full px-5 py-4 hover:bg-white/5 flex items-center justify-between text-left transition-colors border-b border-white/5 last:border-0"
                                     >
                                        <div>
                                           <p className="text-white font-bold">{eq.ine}</p>
                                           <p className="text-slate-400 text-xs">NNE: {eq.nne || 'S/D'} - S/N: {eq.serie || 'S/D'}</p>
                                        </div>
                                        <span className="text-[10px] font-bold px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded-lg uppercase tracking-wider">
                                           Seleccionar
                                        </span>
                                     </button>
                                  ))}
                               </motion.div>
                            )}
                         </AnimatePresence>

                         {equipoSeleccionado && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mt-3 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center gap-3"
                            >
                               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                               <div>
                                  <p className="text-emerald-400 text-xs font-bold tracking-wide">
                                     Equipo Seleccionado: {equipoSeleccionado.ine}
                                  </p>
                                  <p className="text-emerald-500/80 text-[10px] font-medium mt-0.5 uppercase tracking-wider">
                                      NNE: {equipoSeleccionado.nne || 'S/D'} / Serie: {equipoSeleccionado.serie || 'S/D'}
                                  </p>
                               </div>
                            </motion.div>
                         )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                         {/* Técnico (Solo Lectura) */}
                         <div className={isSaving ? 'opacity-50' : ''}>
                            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400/80 mb-3 flex items-center gap-2">
                               <User className="w-3.5 h-3.5" />
                               Área Técnica
                            </label>
                            <div className="w-full bg-[#1e293b]/20 border border-white/5 text-slate-400 rounded-2xl px-5 py-4 font-black uppercase tracking-tighter text-sm">
                               SERVICIO TÉCNICO
                            </div>
                         </div>

                         {/* Fecha */}
                         <div className={isSaving ? 'opacity-50' : ''}>
                            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400/80 mb-3 flex items-center gap-2">
                               <Calendar className="w-3.5 h-3.5" />
                               Fecha de Intervención
                            </label>
                            <input
                               type="date"
                               name="fecha"
                               required
                               disabled={isSaving}
                               value={formData.fecha}
                               onChange={handleChange}
                               className="w-full bg-[#1e293b]/40 border border-white/10 text-white rounded-2xl px-5 py-4 focus:outline-none focus:border-indigo-500/50 transition-all font-medium"
                            />
                         </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                         {/* Tipo de Falla */}
                         <div className={`md:col-span-2 ${isSaving ? 'opacity-50' : ''}`}>
                            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400/80 mb-3 flex items-center gap-2">
                               <AlertCircle className="w-3.5 h-3.5" />
                               Tipo de Tarea
                            </label>
                            <Select
                               name="tipo_falla"
                               disabled={isSaving}
                               value={formData.tipo_falla}
                               onChange={handleChange}
                               options={[
                                  { value: "PREVENTIVO", label: "Mantenimiento Preventivo" },
                                  { value: "CORRECTIVO", label: "Mantenimiento Correctivo" },
                                  { value: "INSTALACION", label: "Instalación / Configuración" },
                                  { value: "REPARACION", label: "Reparación Crítica" },
                                  { value: "ACTUALIZACION", label: "Actualización de Hardware" }
                               ]}
                            />
                         </div>
                      </div>

                      {/* Tarea Realizada */}
                      <div className={isSaving ? 'opacity-50' : ''}>
                         <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400/80 mb-3 flex items-center gap-2">
                            <ClipboardList className="w-3.5 h-3.5" />
                            Detalle del Trabajo Realizado *
                         </label>
                         <textarea
                            name="tarea_realizada"
                            required
                            disabled={isSaving}
                             rows={5}
                            placeholder="Describe detalladamente el trabajo técnico realizado..."
                            value={formData.tarea_realizada}
                            onChange={handleChange}
                            className="w-full bg-[#1e293b]/40 border border-white/10 text-white placeholder:text-slate-600 rounded-2xl px-5 py-4 focus:outline-none focus:border-indigo-500/50 transition-all font-medium resize-none min-h-[120px]"
                         ></textarea>
                      </div>
                   </form>
                </div>

                <div className="p-3 sm:p-4 border-t border-white/5 shrink-0 bg-[#0b1120] z-20 flex flex-row justify-end gap-3">
                   <button 
                      type="button"
                      onClick={onClose}
                      disabled={isSaving}
                      className={`bg-white/5 hover:bg-white/10 text-slate-300 font-bold px-6 py-2.5 rounded-xl transition-all border border-white/10 hover:border-white/20 text-sm ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                   >
                      Cancelar
                   </button>
                   <button 
                      type="submit"
                      form="soporte-form"
                      disabled={isSaving}
                      className={`bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-2.5 rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] flex items-center justify-center gap-2 text-sm ${isSaving ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'}`}
                   >
                      {isSaving ? (
                        <>
                           <Loader2 className="w-4 h-4 animate-spin" />
                           Procesando...
                        </>
                      ) : (
                        <>
                           <Save className="w-4 h-4" />
                           {formData.id ? 'Guardar Cambios' : 'Registrar'}
                        </>
                      )}
                   </button>
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

// El modulo Wrench de lucide-react (importado arriba) se usa en el header.
export default SoporteFormModal;
