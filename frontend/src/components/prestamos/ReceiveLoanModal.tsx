import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Loader2, CheckCircle2, X } from 'lucide-react';
import { apiRequest } from '../../services/api';

const spring = { type: 'spring' as const, stiffness: 400, damping: 30 };

const ReceiveLoanModal = ({ isOpen, onClose, prestamo, onConfirm }) => {
  const [estados, setEstados] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEstadoId, setSelectedEstadoId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEstados = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/config/estados');
      setEstados(data.filter((e: any) => !e.nombre.toLowerCase().includes('prestamo')));
      const defaultState = data.find((e: any) => e.nombre.toLowerCase().includes('operativo') || e.nombre.toLowerCase().includes('servicio')) || data[0];
      if (defaultState) setSelectedEstadoId(defaultState.id);
    } catch (err) {
      setError("No se pudieron cargar los estados del sistema.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchEstados();
      setSelectedEstadoId(null);
      setError(null);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!selectedEstadoId) {
      setError("Por favor, selecciona un estado para el equipo.");
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm(selectedEstadoId);
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al procesar la devolución.");
    } finally {
      setSubmitting(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md h-[100dvh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 cursor-pointer"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={spring}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0f172a] border border-white/20 shadow-2xl rounded-2xl sm:rounded-[2rem] w-full max-w-md relative overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white tracking-tight">Recibir Equipo</h3>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Finalizar Préstamo</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-500 group">
                <X className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              {/* Equipo Info */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Equipo Identificado</p>
                <h4 className="text-lg font-black text-white">{prestamo?.equipos?.ine}</h4>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Solicitante:</span>
                  <span className="text-[10px] text-slate-300 font-black">{prestamo?.solicitante}</span>
                </div>
              </div>

              {/* Status Selection */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 border-l-2 border-indigo-500 ml-1">
                  ¿En qué estado se recibe el equipo?
                </label>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-1.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                    {estados.map((estado) => (
                      <button
                        key={estado.id}
                        onClick={() => setSelectedEstadoId(estado.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left group ${
                          selectedEstadoId === estado.id
                            ? 'bg-indigo-600/20 border-indigo-500/50 shadow-lg shadow-indigo-600/10'
                            : 'bg-white/[0.03] border-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-2.5 h-2.5 rounded-full shadow-sm"
                            style={{ backgroundColor: estado.color_hex || '#4f46e5' }}
                          />
                          <span className={`text-xs font-bold uppercase tracking-wide ${selectedEstadoId === estado.id ? 'text-white' : 'text-slate-400'}`}>
                            {estado.nombre}
                          </span>
                        </div>
                        {selectedEstadoId === estado.id && (
                          <div className="bg-indigo-500 rounded-full p-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2.5 text-rose-400 text-[11px] font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 sm:p-4 border-t border-white/10 bg-white/[0.01]">
              <div className="flex gap-2.5">
                <button
                  onClick={onClose}
                  disabled={submitting}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 font-bold py-2.5 rounded-xl transition-all border border-white/10 text-sm cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={submitting || !selectedEstadoId}
                  className={`flex-[1.5] py-2.5 rounded-xl font-black text-sm transition-all shadow-xl flex items-center justify-center gap-2 ${
                    submitting || !selectedEstadoId
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 active:scale-95 cursor-pointer'
                  }`}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Confirmar
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ReceiveLoanModal;
