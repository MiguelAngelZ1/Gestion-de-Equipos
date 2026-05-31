import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Plus, Save, X, Trash2, Loader2, Tag, Activity, MapPin, Shield } from 'lucide-react';
import Select from '../common/Select';

const InputError = ({ message }) => (
  <motion.p
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className="text-[10px] font-bold text-rose-400 mt-1.5 ml-1 uppercase tracking-wider"
  >
    {message}
  </motion.p>
);

const EquipoFormModal = ({ isOpen, initialData, onClose, onSave, grados = [], ubicaciones = [], gruposComodidad = [], estados = [] }: { isOpen: any; initialData?: any; onClose: any; onSave: any; grados?: any[]; ubicaciones?: any[]; gruposComodidad?: any[]; estados?: any[] }) => {
  const [formData, setFormData] = useState<Record<string, any>>({
    ine: '',
    nne: '',
    serie: '',
    categoria_id: '',
    estado_id: '',
    ubicacion_id: '',
    grado_id: '',
    nombre: '',
    apellido: '',
    responsable_id: '',
    especificaciones: []
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showErrorSummary, setShowErrorSummary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        id: initialData?.id || undefined,
        ine: initialData?.ine || '',
        nne: initialData?.nne || '',
        serie: initialData?.serie || '',
        categoria_id: initialData?.categoria_id || '',
        estado_id: initialData?.estado_id || '',
        ubicacion_id: initialData?.ubicacion_id || '',
        grado_id: initialData?.responsable_grado_id || initialData?.grado_id || '',
        nombre: initialData?.responsable_nombre || initialData?.nombre || '',
        apellido: initialData?.responsable_apellido || initialData?.apellido || '',
        responsable_id: initialData?.responsable_id || '',
        especificaciones: initialData?.especificaciones ? [...initialData.especificaciones] : []
      });
      setErrors({});
      setShowErrorSummary(false);
      setIsSaving(false);
    }
  }, [isOpen, initialData]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.ine.trim()) newErrors.ine = 'El INE es obligatorio';
    if (!formData.categoria_id) newErrors.categoria_id = 'Debe seleccionar un grupo';
    if (!formData.estado_id) newErrors.estado_id = 'Debe seleccionar un estado';
    if (!formData.ubicacion_id) newErrors.ubicacion_id = 'Debe seleccionar una ubicación';
    if (!formData.grado_id) newErrors.grado_id = 'Debe seleccionar un grado';
    if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es obligatorio';
    if (!formData.apellido.trim()) newErrors.apellido = 'El apellido es obligatorio';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar error del campo al escribir
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    if (showErrorSummary && Object.keys(errors).length <= 1) {
      setShowErrorSummary(false);
    }
  };

  const addEspecificacion = () => {
    setFormData(prev => ({
      ...prev,
      especificaciones: [...prev.especificaciones, { clave: '', valor: '' }]
    }));
  };

  const updateEspecificacion = (index, field, value) => {
    setFormData(prev => {
      const newSpecs = [...prev.especificaciones];
      newSpecs[index][field] = value;
      return { ...prev, especificaciones: newSpecs };
    });
  };

  const removeEspecificacion = (index) => {
    setFormData(prev => {
      const newSpecs = prev.especificaciones.filter((_, i) => i !== index);
      return { ...prev, especificaciones: newSpecs };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    
    if (validate()) {
      setIsSaving(true);
      try {
        await onSave(formData);
      } finally {
        setIsSaving(false);
      }
    } else {
      setShowErrorSummary(true);
      // Scroll al inicio del modal para ver el resumen de errores si es necesario
      const modalBody = document.querySelector('.modal-scroll-area');
      if (modalBody) modalBody.scrollTop = 0;
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={!isSaving ? onClose : undefined}
          className="fixed inset-0 z-[110] flex items-center justify-center p-5 sm:p-6 lg:p-12 bg-black/70 backdrop-blur-sm h-[100dvh] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0f1523] border border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-3xl sm:rounded-[2rem] w-full max-w-4xl relative flex flex-col max-h-[calc(100dvh-40px)] sm:max-h-[85vh]"
          >
            <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-br from-indigo-900/40 to-transparent pointer-events-none"></div>
            
            {/* Header Fijo */}
            <div className="p-5 sm:p-6 pb-4 border-b border-white/5 shrink-0 relative z-10">
              <button 
                onClick={onClose}
                disabled={isSaving}
                className={`absolute top-5 right-5 p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-slate-400 hover:text-white transition-colors z-50 shadow-lg backdrop-blur-md ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-row gap-4 items-center pr-10 sm:pr-16">
                 <div className="bg-indigo-500/10 p-3 rounded-2xl border border-indigo-500/20 shrink-0">
                    {formData.id ? <Edit2 className="w-6 h-6 text-indigo-400" /> : <Plus className="w-6 h-6 text-indigo-400" />}
                 </div>
                 <div className="min-w-0">
                    <h2 className="text-lg sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight break-words">
                        {formData.id ? 'Editar Equipo' : 'Nuevo Equipo'}
                     </h2>
                    <p className="text-[10px] sm:text-xs font-semibold text-slate-400 mt-1">
                       {formData.id ? `ID: ${formData.id}` : 'Registra un nuevo activo en el inventario.'}
                    </p>
                 </div>
              </div>
            </div>

            {/* Body Scrolleable (Formulario) */}
            <div className="p-6 sm:p-8 flex-1 overflow-y-auto custom-scrollbar modal-scroll-area relative z-10 bg-[#0B0F19]/50">
              
              <AnimatePresence>
                {showErrorSummary && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-start gap-3 overflow-hidden"
                  >
                    <Trash2 className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-rose-400 font-bold text-sm uppercase tracking-wider">Información faltante</h4>
                      <p className="text-rose-400/70 text-xs font-medium mt-1">Por favor complete todos los campos obligatorios resaltados en rojo para poder guardar el equipo.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {/* Datos Principales */}
                 <div className="space-y-5">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 pb-2 border-b border-white/10 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      Identificación Básica
                    </h3>
                    <div>
                       <label className={`block text-[10px] font-black uppercase tracking-[0.2em] mb-2 transition-colors ${errors.ine ? 'text-rose-400' : 'text-slate-500'}`}>
                         INE <span className="text-rose-500 ml-0.5">*</span>
                       </label>
                       <input 
                        type="text" 
                        placeholder="Ej: U2233-PC77" 
                        value={formData.ine} 
                        onChange={(e) => handleChange('ine', e.target.value)} 
                        disabled={isSaving}
                        className={`w-full bg-[#1e293b]/50 border text-white placeholder:text-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 transition-all font-medium ${isSaving ? 'opacity-50 cursor-not-allowed' : ''} ${errors.ine ? 'border-rose-500/50 focus:ring-rose-500/20 focus:border-rose-400 bg-rose-500/5' : 'border-white/10 focus:ring-indigo-500/40 focus:border-indigo-400 focus:bg-white/5'}`} 
                       />
                       {errors.ine && <InputError message={errors.ine} />}
                    </div>
                    <div>
                       <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">NNE</label>
                       <input type="text" disabled={isSaving} placeholder="Ej: 7010-00-111-2222" value={formData.nne} onChange={(e) => handleChange('nne', e.target.value)} className={`w-full bg-[#1e293b]/50 border border-white/10 text-white placeholder:text-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 focus:bg-white/5 transition-all font-medium ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`} />
                    </div>
                    <div>
                       <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Número de Serie</label>
                       <input type="text" disabled={isSaving} placeholder="Ej: SN-XXXXXXXX" value={formData.serie} onChange={(e) => handleChange('serie', e.target.value)} className={`w-full bg-[#1e293b]/50 border border-white/10 text-white placeholder:text-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 focus:bg-white/5 transition-all font-medium ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`} />
                    </div>
                     <Select
                        label="Grupo Comodidad"
                        icon={Tag}
                        required
                        value={formData.categoria_id}
                        onChange={(e) => handleChange('categoria_id', e.target.value)}
                        disabled={isSaving}
                        error={errors.categoria_id}
                        placeholder="Seleccione Grupo"
                        options={gruposComodidad.map(cat => ({ value: cat.id, label: cat.nombre }))}
                     />
                 </div>

                 <div className="space-y-5">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 pb-2 border-b border-white/10 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      Estado y Ubicación
                    </h3>
                     <Select
                        label="Estado Operativo"
                        icon={Activity}
                        required
                        value={formData.estado_id}
                        onChange={(e) => handleChange('estado_id', e.target.value)}
                        disabled={isSaving}
                        error={errors.estado_id}
                        placeholder="Seleccione Estado"
                        options={estados.map(est => ({ value: est.id, label: est.nombre }))}
                     />
                     <Select
                        label="Ubicación Fija"
                        icon={MapPin}
                        required
                        value={formData.ubicacion_id}
                        onChange={(e) => handleChange('ubicacion_id', e.target.value)}
                        disabled={isSaving}
                        error={errors.ubicacion_id}
                        placeholder="Seleccione Ubicación"
                        options={ubicaciones.map(u => ({ value: u.id, label: u.nombre }))}
                     />
                    
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mt-8 mb-4 pb-2 border-b border-white/10 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      Responsable del Equipo
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <Select
                            label="Grado"
                            icon={Shield}
                            required
                            value={formData.grado_id}
                            onChange={(e) => handleChange('grado_id', e.target.value)}
                            disabled={isSaving}
                            error={errors.grado_id}
                            placeholder="Selecciona el Grado"
                            options={grados.map(g => ({ value: g.id, label: `${g.abreviatura} - ${g.grado_completo}` }))}
                          />
                        </div>
                       <div>
                          <label className={`block text-[10px] font-black uppercase tracking-[0.2em] mb-2 transition-colors ${errors.nombre ? 'text-rose-400' : 'text-slate-500'}`}>
                            Nombre <span className="text-rose-500 ml-0.5">*</span>
                          </label>
                          <input 
                            type="text" 
                            disabled={isSaving}
                            placeholder="Nombre" 
                            value={formData.nombre} 
                            onChange={(e) => handleChange('nombre', e.target.value)} 
                            className={`w-full bg-[#1e293b]/50 border text-white placeholder:text-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 transition-all font-medium ${isSaving ? 'opacity-50 cursor-not-allowed' : ''} ${errors.nombre ? 'border-rose-500/50 focus:ring-rose-500/20 focus:border-rose-400 bg-rose-500/5' : 'border-white/10 focus:ring-indigo-500/40 focus:border-indigo-400 focus:bg-white/5'}`} 
                          />
                          {errors.nombre && <InputError message={errors.nombre} />}
                       </div>
                       <div>
                          <label className={`block text-[10px] font-black uppercase tracking-[0.2em] mb-2 transition-colors ${errors.apellido ? 'text-rose-400' : 'text-slate-500'}`}>
                            Apellido <span className="text-rose-500 ml-0.5">*</span>
                          </label>
                          <input 
                            type="text" 
                            disabled={isSaving}
                            placeholder="Apellido" 
                            value={formData.apellido} 
                            onChange={(e) => handleChange('apellido', e.target.value)} 
                            className={`w-full bg-[#1e293b]/50 border text-white placeholder:text-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 transition-all font-medium ${isSaving ? 'opacity-50 cursor-not-allowed' : ''} ${errors.apellido ? 'border-rose-500/50 focus:ring-rose-500/20 focus:border-rose-400 bg-rose-500/5' : 'border-white/10 focus:ring-indigo-500/40 focus:border-indigo-400 focus:bg-white/5'}`} 
                          />
                          {errors.apellido && <InputError message={errors.apellido} />}
                       </div>
                    </div>
                 </div>

                 {/* Especificaciones Técnicas */}
                 <div className="col-span-1 md:col-span-2 mt-4 pt-6 border-t border-white/10">
                    <div className="flex justify-between items-center mb-6">
                       <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        Especificaciones Técnicas
                       </h3>
                       <button 
                         type="button" 
                         onClick={addEspecificacion}
                         disabled={isSaving}
                         className={`flex items-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-black uppercase tracking-widest text-[10px] px-4 py-2.5 rounded-xl transition-all border border-indigo-500/20 ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                       >
                         <Plus className="w-3.5 h-3.5" /> Agregar Detalle
                       </button>
                    </div>

                    {formData.especificaciones.length === 0 ? (
                       <div className="text-center p-10 bg-white/[0.02] border border-white/5 rounded-3xl border-dashed">
                          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Sin especificaciones añadidas.</p>
                          <p className="text-slate-600 text-[10px] mt-2 max-w-xs mx-auto">Añade detalles técnicos como procesador, memoria RAM, capacidad de disco o material de fabricación.</p>
                       </div>
                    ) : (
                       <div className="space-y-3">
                          {formData.especificaciones.map((spec, index) => (
                             <motion.div 
                              key={index} 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-[#1e293b]/30 p-3 rounded-2xl border border-white/5 hover:border-white/10 transition-colors group"
                             >
                                <div className="flex-1 w-full bg-white/5 rounded-xl px-3 border border-transparent focus-within:border-indigo-500/30 transition-all">
                                   <input 
                                     type="text" 
                                     disabled={isSaving}
                                     placeholder="Campo (Ej: RAM)" 
                                     value={spec.clave} 
                                     onChange={(e) => updateEspecificacion(index, 'clave', e.target.value)} 
                                     className="w-full bg-transparent border-none text-white placeholder:text-slate-600 py-3 focus:outline-none text-[10px] font-black uppercase tracking-widest" 
                                   />
                                </div>
                                <div className="hidden sm:block text-slate-700 font-black">:</div>
                                <div className="flex-[2] w-full bg-white/5 rounded-xl px-3 border border-transparent focus-within:border-indigo-500/30 transition-all">
                                   <input 
                                     type="text" 
                                     disabled={isSaving}
                                     placeholder="Valor (Ej: 16GB DDR4)" 
                                     value={spec.valor} 
                                     onChange={(e) => updateEspecificacion(index, 'valor', e.target.value)} 
                                     className="w-full bg-transparent border-none text-white placeholder:text-slate-600 py-3 focus:outline-none text-xs font-bold" 
                                   />
                                </div>
                                <button 
                                  type="button"
                                  disabled={isSaving}
                                  onClick={() => removeEspecificacion(index)}
                                  className={`shrink-0 p-3 text-slate-500 hover:text-white hover:bg-rose-500/20 rounded-xl transition-all opacity-0 group-hover:opacity-100 ${isSaving ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                  title="Quitar Especificación"
                                >
                                   <Trash2 className="w-4 h-4" />
                                </button>
                             </motion.div>
                          ))}
                       </div>
                    )}
                 </div>
              </div>
            </div>

            {/* Footer Fijo */}
            <div className="p-4 sm:p-6 border-t border-white/5 shrink-0 bg-[#0f1523] z-20 flex flex-col sm:flex-row justify-end gap-3">
              <button 
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className={`bg-white/5 hover:bg-white/10 text-slate-400 font-black uppercase tracking-widest text-[10px] px-8 py-4 rounded-2xl transition-all border border-white/10 hover:border-white/20 active:scale-95 ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                Cancelar
              </button>
              <button 
                onClick={handleSubmit}
                disabled={isSaving}
                className={`bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[10px] px-10 py-4 rounded-2xl transition-all shadow-[0_0_30px_rgba(79,70,229,0.3)] flex items-center justify-center gap-3 active:scale-95 ${isSaving ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {formData.id ? 'Actualizar Equipo' : 'Guardar en Inventario'}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default EquipoFormModal;
