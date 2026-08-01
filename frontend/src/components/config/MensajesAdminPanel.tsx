import React, { useState, useEffect } from 'react';
import { Mail, MailOpen, CheckCircle2, AlertCircle, Loader2, Trash2, ExternalLink } from 'lucide-react';
import { apiRequest } from '../../services/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '../../context/ToastContext';
import EquipoDetalleModal from '../equipos/EquipoDetalleModal';

const MensajesAdminPanel = () => {
  const [mensajes, setMensajes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEquipo, setSelectedEquipo] = useState(null);
  const [loadingEquipo, setLoadingEquipo] = useState(false);
  const { showToast } = useToast();

  const handleVerDetalles = async (e, mensajeStr) => {
    e.stopPropagation();
    const match = mensajeStr.match(/🔴 EQUIPO AFECTADO:\n([^\n]+)/);
    if (match && match[1]) {
      const ine = match[1].trim();
      setLoadingEquipo(true);
      try {
        const equiposData = await apiRequest('/equipos');
        const equiposList = equiposData?.data || equiposData || [];
        const equipoMatch = equiposList.find((eq: any) => eq.ine === ine);
        if (equipoMatch) {
           setSelectedEquipo(equipoMatch);
        } else {
           showToast('Error', 'Equipo no encontrado en la base de datos.', 'error');
        }
      } catch (err) {
        showToast('Error', 'Error al cargar detalles del equipo.', 'error');
      } finally {
        setLoadingEquipo(false);
      }
    }
  };

  const fetchMensajes = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/usuarios/mensajes-admin');
      setMensajes(data || []);
      setError(null);
    } catch (err) {
      setError("No se pudieron cargar los mensajes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMensajes();
  }, []);

  const marcarComoLeido = async (id) => {
    try {
      await apiRequest(`/usuarios/mensajes-admin/${id}/leido`, {
        method: 'PUT'
      });
      setMensajes(prev => prev.map(m => m.id === id ? { ...m, leido: 1 } : m));
    } catch {
      // silent
    }
  };

  const marcarTodoLeido = async () => {
    try {
      await apiRequest('/usuarios/mensajes-admin/leido/todos', { method: 'PUT' });
      setMensajes(prev => prev.map(m => ({ ...m, leido: 1 })));
    } catch {
      // silent
    }
  };

  const limpiarLeidos = async () => {
    try {
      await apiRequest('/usuarios/mensajes-admin/leidos/limpiar', { method: 'DELETE' });
      setMensajes(prev => prev.filter(m => !m.leido));
    } catch {
      // silent
    }
  };

  if (loading && mensajes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
        <span className="text-slate-500 font-medium text-sm">Cargando bandeja de entrada...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-500">
      <div className="sm:bg-indigo-500/10 sm:border border-indigo-500/20 sm:p-6 sm:rounded-[2rem]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-white font-black text-xl flex items-center gap-3">
              <Mail className="w-6 h-6 text-indigo-400" />
              Bandeja de Notas
            </h3>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              Aquí aparecerán todos los reportes, sugerencias o notas. Haz clic en una nota para marcarla como leída.
            </p>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap">
            <button 
              onClick={marcarTodoLeido}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-lg sm:rounded-xl transition-colors border border-indigo-500/20 hover:border-indigo-500/40"
            >
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Leer Todas</span>
              <span className="sm:hidden">Leer</span>
            </button>
            <button 
              onClick={limpiarLeidos}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-lg sm:rounded-xl transition-colors border border-rose-500/20 hover:border-rose-500/40"
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Limpiar Leídas</span>
              <span className="sm:hidden">Limpiar</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-3 text-rose-400">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      <div className="sm:bg-white/[0.02] sm:border border-white/5 sm:rounded-[2rem] overflow-hidden">
        {mensajes.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium">
            <CheckCircle2 className="w-12 h-12 text-emerald-500/50 mx-auto mb-4" />
            <p>¡Todo limpio! No tienes notas nuevas.</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {mensajes.map((msg) => (
              <li 
                key={msg.id} 
                onClick={() => !msg.leido && marcarComoLeido(msg.id)}
                className={`p-3 sm:p-6 transition-colors ${msg.leido ? 'bg-transparent' : 'bg-indigo-500/[0.03] hover:bg-white/[0.04] cursor-pointer'}`}
              >
                <div className="flex gap-3 sm:gap-4">
                  <div className="shrink-0 mt-1">
                    {msg.leido ? (
                      <MailOpen className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
                    ) : (
                      <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5 sm:space-y-2 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-bold text-sm sm:text-base ${msg.leido ? 'text-slate-400' : 'text-white'} truncate`}>
                        {msg.remitente}
                      </span>
                      <span className="text-[8px] sm:text-[10px] uppercase font-bold tracking-widest text-slate-500 whitespace-nowrap shrink-0">
                        {msg.fecha ? format(
                          (typeof msg.fecha === 'string' && !msg.fecha.includes('T') && !msg.fecha.includes('Z')) 
                            ? new Date(msg.fecha.replace(' ', 'T') + 'Z') 
                            : new Date(msg.fecha), 
                          "dd MMM yyyy, HH:mm", { locale: es }
                        ) : 'Fecha desconocida'}
                      </span>
                    </div>
                    <p className={`text-sm leading-relaxed whitespace-pre-line ${msg.leido ? 'text-slate-500' : 'text-slate-300 font-medium'}`}>
                      {msg.mensaje}
                    </p>
                    {/🔴 EQUIPO AFECTADO:\n([^\n]+)/.test(msg.mensaje) && (
                      <div className="pt-3">
                        <button
                          onClick={(e) => handleVerDetalles(e, msg.mensaje)}
                          disabled={loadingEquipo}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors border border-indigo-500/20 hover:border-indigo-500/40 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loadingEquipo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                          Ver Detalles de Equipo
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <EquipoDetalleModal 
        isOpen={!!selectedEquipo} 
        equipo={selectedEquipo} 
        estados={[]}
        onClose={() => setSelectedEquipo(null)} 
        onEquipoUpdated={() => {}}
      />
    </div>
  );
};

export default MensajesAdminPanel;
