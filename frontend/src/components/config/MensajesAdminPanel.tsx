import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Mail, MailOpen, CheckCircle2, AlertCircle, Loader2, Trash2, ExternalLink, User, Wrench } from 'lucide-react';
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
        if (equipoMatch) setSelectedEquipo(equipoMatch);
        else showToast('Error', 'Equipo no encontrado.', 'error');
      } catch { showToast('Error', 'Error al cargar equipo.', 'error'); }
      finally { setLoadingEquipo(false); }
    }
  };

  const fetchMensajes = async () => {
    try { setLoading(true); const data = await apiRequest('/usuarios/mensajes-admin'); setMensajes(data || []); setError(null); }
    catch { setError("No se pudieron cargar los mensajes."); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchMensajes(); }, []);
  const marcarComoLeido = async (id) => { try { await apiRequest(`/usuarios/mensajes-admin/${id}/leido`, { method: 'PUT' }); setMensajes(prev => prev.map(m => m.id === id ? { ...m, leido: 1 } : m)); } catch {} };
  const marcarTodoLeido = async () => { try { await apiRequest('/usuarios/mensajes-admin/leido/todos', { method: 'PUT' }); setMensajes(prev => prev.map(m => ({ ...m, leido: 1 }))); } catch {} };
  const limpiarLeidos = async () => { try { await apiRequest('/usuarios/mensajes-admin/leidos/limpiar', { method: 'DELETE' }); setMensajes(prev => prev.filter(m => !m.leido)); } catch {} };

  if (loading && mensajes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-6 h-6 rounded-full border-2 border-zinc-800 border-t-white animate-spin mb-3" />
        <span className="text-xs font-semibold text-zinc-500">Cargando bandeja...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-3 shrink-0">
        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
          <Mail className="w-4 h-4 text-zinc-500" /> Bandeja
          <span className="text-zinc-600 font-medium normal-case tracking-normal">{mensajes.length ? `· ${mensajes.length}` : ''}</span>
        </h3>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={marcarTodoLeido} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white text-xs font-medium transition-colors cursor-pointer">
            <CheckCircle2 className="w-3.5 h-3.5" /> Leer todas
          </button>
          <button onClick={limpiarLeidos} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-transparent hover:bg-white/5 text-zinc-500 hover:text-red-400 text-xs font-medium transition-colors cursor-pointer">
            <Trash2 className="w-3.5 h-3.5" /> Limpiar leídas
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {mensajes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 bg-zinc-900 border border-dashed border-zinc-800 rounded-xl">
          <CheckCircle2 className="w-8 h-8 text-zinc-600 mb-3" />
          <p className="text-sm text-zinc-500">Sin notas nuevas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 auto-rows-min content-start flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
          {mensajes.map((msg) => {
            const raw = msg.mensaje || '';
            const equipoMatch = raw.match(/EQUIPO AFECTADO:\s*([^\n]+?)(?=\s*(?:🛠|TAREA REALIZADA:|$))/);
            const tareaMatch = raw.match(/TAREA REALIZADA:\s*([^\n]+)/);
            const ine = equipoMatch ? equipoMatch[1].replace(/^[🔴\s]+/, '').trim() : null;
            const tarea = tareaMatch ? tareaMatch[1].trim() : null;
            const hasStructured = !!ine;
            return (
            <div key={msg.id} onClick={() => !msg.leido && marcarComoLeido(msg.id)} className={`bg-zinc-900 border rounded-xl p-3 flex flex-col gap-2 transition-colors h-fit ${msg.leido ? 'border-zinc-800 opacity-60' : 'border-zinc-800 hover:border-zinc-700 cursor-pointer'}`}>
              <div className="flex items-center gap-2">
                {msg.leido ? <MailOpen className="w-4 h-4 text-zinc-600 shrink-0" /> : <User className="w-4 h-4 text-zinc-500 shrink-0" />}
                <span className={`text-sm font-semibold truncate ${msg.leido ? 'text-zinc-500' : 'text-white'}`}>{msg.remitente}</span>
                {!msg.leido && <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 ml-auto" />}
                <span className="text-xs text-zinc-500 shrink-0 ml-auto">{msg.fecha ? format((typeof msg.fecha === 'string' && !msg.fecha.includes('T') && !msg.fecha.includes('Z')) ? new Date(msg.fecha.replace(' ', 'T') + 'Z') : new Date(msg.fecha), "dd/MM/yy HH:mm", { locale: es }) : ''}</span>
              </div>
              {hasStructured ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-sm font-medium truncate">
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                    <span className={`truncate ${msg.leido ? 'text-zinc-500' : 'text-zinc-300'}`}>EQUIPO AFECTADO: {ine}</span>
                  </div>
                  {tarea && (
                    <div className="flex items-center gap-1.5 text-sm truncate">
                      <Wrench className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span className={`truncate ${msg.leido ? 'text-zinc-500' : 'text-zinc-400'}`}>TAREA REALIZADA: {tarea}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className={`text-sm leading-relaxed line-clamp-4 ${msg.leido ? 'text-zinc-500' : 'text-zinc-300'}`}>{raw}</p>
              )}
              {/EQUIPO AFECTADO/.test(raw) && (
                <div className="pt-2 border-t border-zinc-800">
                  <button onClick={(e) => handleVerDetalles(e, raw)} disabled={loadingEquipo} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50">
                    {loadingEquipo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />} Ver equipo
                  </button>
                </div>
              )}
            </div>
          )})}
        </div>
      )}

      {selectedEquipo && typeof document !== 'undefined' && createPortal(
        <EquipoDetalleModal isOpen={!!selectedEquipo} equipo={selectedEquipo} estados={[]} onClose={() => setSelectedEquipo(null)} onEquipoUpdated={() => {}} />,
        document.body
      )}
    </div>
  );
};
export default MensajesAdminPanel;
