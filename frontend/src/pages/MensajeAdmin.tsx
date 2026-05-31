import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageSquare, CheckCircle2, AlertCircle, Loader2, Server, Package, ClipboardList, PenTool, X, Search, MapPin, User, Calendar } from 'lucide-react';
import { apiRequest } from '../services/api';
import SearchInput from '../components/common/SearchInput';
import Select from '../components/common/Select';
import { matchesSearch } from '../utils/search';
import { useToast } from '../context/ToastContext';

const MensajeAdmin = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  // Datos para carga
  const [equipos, setEquipos] = useState([]);
  const [repuestos, setRepuestos] = useState([]);
  
  // Estados del formulario
  const [busquedaEquipo, setBusquedaEquipo] = useState('');
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null);
  const [repuestoSeleccionado, setRepuestoSeleccionado] = useState('');
  const [cantidadRepuesto, setCantidadRepuesto] = useState(1);
  const [tareaRealizada, setTareaRealizada] = useState('');
  const [notas, setNotas] = useState('');

  // Buscador de equipos
  const [sugerencias, setSugerencias] = useState([]);
  const [showSugerencias, setShowSugerencias] = useState(false);
  const sugerenciasRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
        try {
            const [equiposData, repuestosData] = await Promise.all([
                apiRequest('/equipos').catch(() => []),
                apiRequest('/componentes').catch(() => [])
            ]);
            setEquipos(equiposData || []);
            setRepuestos(repuestosData || []);
        } catch (error) {
            console.error("Error cargando catálogos:", error);
        }
    };
    fetchData();
  }, []);

  // Buscador local inteligente
  useEffect(() => {
    if (busquedaEquipo.length < 2 || (equipoSeleccionado && (equipoSeleccionado.ine === busquedaEquipo || equipoSeleccionado.serie === busquedaEquipo))) {
      setSugerencias([]);
      setShowSugerencias(false);
      return;
    }

    const filtered = equipos.filter(eq => matchesSearch(eq, busquedaEquipo)).slice(0, 5);
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

  const seleccionarEquipo = (equipo) => {
    setEquipoSeleccionado(equipo);
    setBusquedaEquipo(equipo.ine);
    setShowSugerencias(false);
  };

  const limpiarEquipo = () => {
    setEquipoSeleccionado(null);
    setBusquedaEquipo('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!tareaRealizada.trim() && !notas.trim()) {
        showToast("Debes ingresar al menos la tarea realizada o una nota", "error");
        return;
    }

    // Armar el mensaje estructurado de forma elegante
    let mensajeFinal = '';
    
    if (equipoSeleccionado) {
        mensajeFinal += `🔴 EQUIPO AFECTADO:\n${equipoSeleccionado.ine}\n\n`;
    }
    
    if (repuestoSeleccionado) {
        const rep = repuestos.find(r => r.id === parseInt(repuestoSeleccionado));
        if (rep) {
            mensajeFinal += `📦 REPUESTO UTILIZADO:\n${cantidadRepuesto}x ${rep.nombre} (S/N: ${rep.serie || rep.nne || 'S/D'})\n\n`;
        }
    }

    if (tareaRealizada.trim()) {
        mensajeFinal += `🛠️ TAREA REALIZADA:\n${tareaRealizada.trim()}\n\n`;
    }

    if (notas.trim()) {
        mensajeFinal += `📝 NOTAS ADICIONALES:\n${notas.trim()}`;
    }

    try {
      setLoading(true);
      await apiRequest('/usuarios/mensajes', {
        method: 'POST',
        body: JSON.stringify({ mensaje: mensajeFinal.trim() })
      });
      showToast("Mensaje Enviado", "Tu reporte ha sido enviado al administrador.", "success");
      
      // Limpiar todo después de enviar
      setBusquedaEquipo('');
      setEquipoSeleccionado(null);
      setRepuestoSeleccionado('');
      setCantidadRepuesto(1);
      setTareaRealizada('');
      setNotas('');
      
    } catch (error) {
      console.error("Error al enviar nota:", error);
      showToast("Error de Envío", "No se pudo conectar con el servidor.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      <div className="text-center space-y-2">
        <div className="inline-flex p-4 bg-indigo-500/10 rounded-3xl mb-4">
          <MessageSquare className="w-8 h-8 text-indigo-400" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">Reportar Mantenimiento</h1>
        <p className="text-slate-400 font-medium">Registra los equipos intervenidos y repuestos utilizados. La administración será notificada en tiempo real.</p>
      </div>

      <motion.form 
        onSubmit={handleSubmit}
        className="bg-white/5 p-6 sm:p-10 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-8 relative overflow-hidden"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none" />
        
        {/* BLOQUE: EQUIPO AFECTADO */}
        <div className="space-y-4" ref={sugerenciasRef}>
          <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest pl-1 flex items-center gap-2">
             <Server className="w-3.5 h-3.5" /> Equipo a Intervenir (Opcional)
          </label>
          <div className="relative group">
             <SearchInput
                value={busquedaEquipo}
                onChange={(e) => setBusquedaEquipo(e.target.value)}
                placeholder="Buscar INE, Serie, Marca..."
                className="w-full bg-slate-900/50"
             />
             
             {equipoSeleccionado && (
                <button 
                  type="button" 
                  onClick={limpiarEquipo}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-rose-400 bg-slate-800 p-1 rounded-full cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
             )}
          </div>

          <AnimatePresence>
            {showSugerencias && sugerencias.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-50 left-6 sm:left-10 right-6 sm:right-10 mt-1 bg-[#161f31] border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
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
                className="p-3 sm:p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center gap-3"
            >
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                <div className="flex-1">
                  <p className="text-white text-sm font-bold tracking-wide">
                      {equipoSeleccionado.ine}
                  </p>
                  <p className="text-indigo-400/80 text-xs font-medium">NNE: {equipoSeleccionado.nne || 'S/D'} / Serie: {equipoSeleccionado.serie || 'S/D'}</p>
                </div>
            </motion.div>
          )}
        </div>

        {/* BLOQUE: REPUESTOS */}
        <div className="space-y-4">
           <div className="flex flex-col sm:flex-row gap-4">
             <div className="flex-1">
               <Select
                 label="Repuesto Utilizado"
                 icon={Package}
                 value={repuestoSeleccionado}
                 onChange={(e) => setRepuestoSeleccionado(e.target.value)}
                 placeholder="-- Ningún repuesto --"
                 options={repuestos.map(r => ({ 
                   value: r.id, 
                   label: `${r.nombre} (Max: ${r.cantidad})` 
                 }))}
               />
             </div>
             {repuestoSeleccionado && (
               <div className="w-full sm:w-32 shrink-0">
                 <input
                   type="number"
                   min="1"
                   max={repuestos.find(r => r.id === parseInt(repuestoSeleccionado))?.cantidad || 1}
                   value={cantidadRepuesto}
                   onChange={(e) => {
                     const maxStock = repuestos.find(r => r.id === parseInt(repuestoSeleccionado))?.cantidad || 1;
                     let val = parseInt(e.target.value);
                      if (isNaN(val)) {
                        setCantidadRepuesto(1);
                      } else {
                       if (val > maxStock) val = maxStock;
                       if (val < 1) val = 1;
                       setCantidadRepuesto(val);
                     }
                   }}
                    onBlur={() => {
                      if (!cantidadRepuesto || isNaN(cantidadRepuesto)) setCantidadRepuesto(1);
                    }}
                   className="w-full bg-slate-900/50 text-white px-5 py-3.5 rounded-2xl border border-white/10 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-center font-bold"
                   placeholder="Cant."
                 />
               </div>
             )}
          </div>
        </div>

        {/* BLOQUE: TAREA REALIZADA */}
        <div className="space-y-4">
          <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest pl-1 flex items-center gap-2">
             <ClipboardList className="w-3.5 h-3.5" /> Tarea Realizada
          </label>
          <input
            type="text"
            value={tareaRealizada}
            onChange={(e) => setTareaRealizada(e.target.value)}
            disabled={loading}
            placeholder="Ej: Cambio de cable red, Limpieza, etc."
            className="w-full bg-slate-900/50 text-white px-5 py-4 rounded-2xl border border-white/10 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-600 font-medium"
          />
        </div>

        {/* BLOQUE: NOTAS */}
        <div className="space-y-4">
          <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest pl-1 flex items-center gap-2">
             <PenTool className="w-3.5 h-3.5" /> Notas Adicionales
          </label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            disabled={loading}
            placeholder="Escribe aquí cualquier observación adicional..."
            rows={4}
            className="w-full bg-slate-900/50 text-white px-5 py-4 rounded-2xl border border-white/10 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-600 font-medium resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading || (!tareaRealizada.trim() && !notas.trim())}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 group relative overflow-hidden disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              Enviar Reporte
            </>
          )}
        </button>
      </motion.form>

      <div className="bg-amber-500/5 border border-amber-500/10 p-6 rounded-3xl">
        <p className="text-amber-200/60 text-[11px] font-medium leading-relaxed italic text-center">
          "Recuerde utilizar el buscador inteligente para seleccionar el equipo exacto sobre el cual se deba reportar la falla. El descuadre de inventario será responsabilidad del técnico a cargo."
        </p>
      </div>
    </div>
  );
};

export default MensajeAdmin;
