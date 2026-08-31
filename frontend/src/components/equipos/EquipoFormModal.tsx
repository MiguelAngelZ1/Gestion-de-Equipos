import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Plus, Save, X, Trash2, Loader2, Tag, Activity, MapPin, Shield } from 'lucide-react';
import Select from '../common/Select';

const InputError = ({ message }: any) => (
  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-[11px] font-medium text-[#ffb4ab] mt-1.5 ml-1">{message}</motion.p>
);

export default function EquipoFormModal({ isOpen, initialData, onClose, onSave, grados = [], ubicaciones = [], gruposComodidad = [], estados = [] }: any) {
  const [formData, setFormData] = useState<Record<string, any>>({
    ine: '', nne: '', serie: '', categoria_id: '', estado_id: '', ubicacion_id: '', grado_id: '', nombre: '', apellido: '', responsable_id: '', especificaciones: []
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
      setErrors({}); setShowErrorSummary(false); setIsSaving(false);
    }
  }, [isOpen, initialData]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.ine.trim()) e.ine = 'El INE es obligatorio';
    if (!formData.categoria_id) e.categoria_id = 'Debe seleccionar un grupo';
    if (!formData.estado_id) e.estado_id = 'Debe seleccionar un estado';
    if (!formData.ubicacion_id) e.ubicacion_id = 'Debe seleccionar una ubicación';
    if (!formData.grado_id) e.grado_id = 'Debe seleccionar un grado';
    if (!formData.nombre.trim()) e.nombre = 'El nombre es obligatorio';
    if (!formData.apellido.trim()) e.apellido = 'El apellido es obligatorio';
    setErrors(e); return Object.keys(e).length === 0;
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) { const n = { ...errors }; delete n[field]; setErrors(n); }
    if (showErrorSummary && Object.keys(errors).length <= 1) setShowErrorSummary(false);
  };

  const addEspecificacion = () => setFormData(prev => ({ ...prev, especificaciones: [...prev.especificaciones, { clave: '', valor: '' }] }));
  const updateEspecificacion = (index: number, field: string, value: string) => {
    setFormData(prev => { const s = [...prev.especificaciones]; s[index][field] = value; return { ...prev, especificaciones: s }; });
  };
  const removeEspecificacion = (index: number) => setFormData(prev => ({ ...prev, especificaciones: prev.especificaciones.filter((_: any, i: number) => i !== index) }));

  const handleSubmit = async (e: any) => {
    e.preventDefault(); if (isSaving) return;
    if (validate()) { setIsSaving(true); try { await onSave(formData); } finally { setIsSaving(false); } }
    else { setShowErrorSummary(true); document.querySelector('.modal-scroll-area')?.scrollTo({ top: 0, behavior: 'smooth' }); }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={!isSaving ? onClose : undefined} className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.97, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 8 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }} onClick={e => e.stopPropagation()} className="bg-[#1C1C1E] border border-white/5 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center gap-3 shrink-0">
              <span className="material-symbols-outlined text-[#e4e2e4] text-[24px]">inventory_2</span>
              <div className="min-w-0">
                <h2 className="text-[16px] font-semibold text-[#e4e2e4] leading-none">{formData.id ? 'Editar Equipo' : 'Nuevo Equipo'}</h2>
                <p className="text-xs text-[#c4c5d9] mt-0.5">{formData.id ? `ID: ${formData.id}` : 'Registra un nuevo activo en el inventario.'}</p>
              </div>
              <button onClick={onClose} disabled={isSaving} className="ml-auto w-8 h-8 grid place-items-center rounded-full hover:bg-white/5 text-[#c4c5d9] disabled:opacity-50">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar modal-scroll-area space-y-4">
              {showErrorSummary && (
                <div className="bg-[#ffb4ab]/10 border border-[#ffb4ab]/15 rounded-xl p-3 flex items-start gap-2">
                  <Trash2 className="w-4 h-4 text-[#ffb4ab] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-[#ffb4ab]">Información faltante</p>
                    <p className="text-xs text-[#ffb4ab]/70 mt-0.5">Completa los campos obligatorios resaltados.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold tracking-wide text-[#e4e2e4] flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#b8c3ff]" /> IDENTIFICACIÓN BÁSICA</h3>
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${errors.ine ? 'text-[#ffb4ab]' : 'text-[#c4c5d9]'}`}>INE <span className="text-[#ffb4ab]">*</span></label>
                    <input type="text" placeholder="Ej: COMPUTADORA DE ESCRITORIO" value={formData.ine} onChange={e => handleChange('ine', e.target.value)} disabled={isSaving} className={`w-full bg-[#131315] border text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#b8c3ff]/40 transition-colors ${errors.ine ? 'border-[#ffb4ab]/50 bg-[#ffb4ab]/5' : 'border-white/5'}`} />
                    {errors.ine && <InputError message={errors.ine} />}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#c4c5d9] mb-1.5">NNE</label>
                    <input type="text" placeholder="Ej: 7010-00-111-2222" value={formData.nne} onChange={e => handleChange('nne', e.target.value)} disabled={isSaving} className="w-full bg-[#131315] border border-white/5 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-white/10" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#c4c5d9] mb-1.5">Número de Serie</label>
                    <input type="text" placeholder="Ej: SN-XXXXXXXX" value={formData.serie} onChange={e => handleChange('serie', e.target.value)} disabled={isSaving} className="w-full bg-[#131315] border border-white/5 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-white/10" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="hidden md:block text-xs font-bold tracking-wide opacity-0 select-none flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-transparent" /> -</h3>
                  <Select label="Grupo Comodidad" icon={Tag} required value={formData.categoria_id} onChange={(e: any) => handleChange('categoria_id', e.target.value)} disabled={isSaving} error={errors.categoria_id} placeholder="Seleccione Grupo" options={gruposComodidad.map((cat: any) => ({ value: cat.id, label: cat.nombre }))} />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold tracking-wide text-[#e4e2e4] flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#b8c3ff]" /> ESTADO Y UBICACIÓN</h3>
                  <Select label="Estado Operativo" icon={Activity} required value={formData.estado_id} onChange={(e: any) => handleChange('estado_id', e.target.value)} disabled={isSaving} error={errors.estado_id} placeholder="Seleccione Estado" options={estados.map((est: any) => ({ value: est.id, label: est.nombre }))} />
                  <Select label="Ubicación Fija" icon={MapPin} required value={formData.ubicacion_id} onChange={(e: any) => handleChange('ubicacion_id', e.target.value)} disabled={isSaving} error={errors.ubicacion_id} placeholder="Seleccione Ubicación" options={ubicaciones.map((u: any) => ({ value: u.id, label: u.nombre }))} />
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-bold tracking-wide text-[#e4e2e4] flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#b8c3ff]" /> RESPONSABLE DEL EQUIPO</h3>
                  <Select label="Grado" icon={Shield} required value={formData.grado_id} onChange={(e: any) => handleChange('grado_id', e.target.value)} disabled={isSaving} error={errors.grado_id} placeholder="Selecciona el Grado" options={grados.map((g: any) => ({ value: g.id, label: `${g.abreviatura} - ${g.grado_completo}` }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${errors.nombre ? 'text-[#ffb4ab]' : 'text-[#c4c5d9]'}`}>Nombre <span className="text-[#ffb4ab]">*</span></label>
                      <input type="text" placeholder="Nombre" value={formData.nombre} onChange={e => handleChange('nombre', e.target.value)} disabled={isSaving} className={`w-full bg-[#131315] border text-sm rounded-xl px-3 py-2.5 ${errors.nombre ? 'border-[#ffb4ab]/50 bg-[#ffb4ab]/5' : 'border-white/5'}`} />
                      {errors.nombre && <InputError message={errors.nombre} />}
                    </div>
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${errors.apellido ? 'text-[#ffb4ab]' : 'text-[#c4c5d9]'}`}>Apellido <span className="text-[#ffb4ab]">*</span></label>
                      <input type="text" placeholder="Apellido" value={formData.apellido} onChange={e => handleChange('apellido', e.target.value)} disabled={isSaving} className={`w-full bg-[#131315] border text-sm rounded-xl px-3 py-2.5 ${errors.apellido ? 'border-[#ffb4ab]/50 bg-[#ffb4ab]/5' : 'border-white/5'}`} />
                      {errors.apellido && <InputError message={errors.apellido} />}
                    </div>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold tracking-wide text-[#e4e2e4] flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#b8c3ff]" /> ESPECIFICACIONES TÉCNICAS</h3>
                    <button type="button" onClick={addEspecificacion} disabled={isSaving} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#c4c5d9] hover:text-white disabled:opacity-50">
                      <Plus className="w-3.5 h-3.5" /> Agregar
                    </button>
                  </div>
                  {formData.especificaciones.length === 0 ? (
                    <div className="text-center py-8 bg-[#131315] border border-dashed border-white/5 rounded-xl">
                      <p className="text-xs font-semibold text-[#c4c5d9]">Sin especificaciones añadidas.</p>
                      <p className="text-xs text-[#6b7280] mt-1">Añade detalles como RAM, CPU, disco, etc.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {formData.especificaciones.map((spec: any, index: number) => (
                        <div key={index} className="flex gap-2 items-center bg-[#131315] border border-white/5 rounded-xl p-2">
                          <input type="text" placeholder="Campo (Ej: RAM)" value={spec.clave} onChange={e => updateEspecificacion(index, 'clave', e.target.value)} disabled={isSaving} className="flex-1 bg-transparent text-sm placeholder:text-zinc-600 focus:outline-none" />
                          <span className="text-zinc-600">:</span>
                          <input type="text" placeholder="Valor (Ej: 16GB)" value={spec.valor} onChange={e => updateEspecificacion(index, 'valor', e.target.value)} disabled={isSaving} className="flex-[2] bg-transparent text-sm placeholder:text-zinc-600 focus:outline-none" />
                          <button type="button" onClick={() => removeEspecificacion(index)} disabled={isSaving} className="p-1.5 text-red-400 hover:text-red-300">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-white/5 flex justify-end gap-2 shrink-0">
              <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-[#c4c5d9] hover:text-white disabled:opacity-50">Cancelar</button>
              <button onClick={handleSubmit} disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-white hover:text-white inline-flex items-center gap-2 disabled:opacity-50">
                {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</> : <><Save className="w-4 h-4" /> {formData.id ? 'Actualizar' : 'Guardar en Inventario'}</>}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
