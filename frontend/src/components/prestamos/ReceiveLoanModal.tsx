import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Loader2, CheckCircle2, X } from 'lucide-react';
import { apiRequest } from '../../services/api';

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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md h-[100dvh]"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#1C1C1E] border border-white/5 rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] shadow-2xl"
          >
            <div className="p-4 border-b border-white/5 flex items-center gap-3 shrink-0">
              <CheckCircle2 className="w-5 h-5 text-[#e4e2e4] shrink-0" />
              <div className="min-w-0">
                <h3 className="text-[16px] font-semibold text-[#e4e2e4] leading-none">Recibir Equipo</h3>
                <p className="text-xs text-[#c4c5d9] mt-0.5">Finalizar préstamo</p>
              </div>
              <button onClick={onClose} className="ml-auto w-8 h-8 grid place-items-center rounded-full hover:bg-white/5 text-[#c4c5d9]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="bg-[#131315] border border-white/5 rounded-xl p-4">
                <p className="text-xs text-[#c4c5d9] mb-1">Equipo identificado</p>
                <h4 className="text-base font-semibold text-[#e4e2e4]">{prestamo?.equipos?.ine}</h4>
                <p className="text-xs text-zinc-400 mt-1">Solicitante: {prestamo?.solicitante}</p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#c4c5d9]">¿En qué estado se recibe el equipo?</label>

                {loading ? (
                  <div className="space-y-1.5">
                    {[1,2,3].map(i => <div key={i} className="h-11 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse" />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-1.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                    {estados.map((estado) => {
                      const isSelected = selectedEstadoId === estado.id;
                      return (
                      <button
                        key={estado.id}
                        onClick={() => setSelectedEstadoId(estado.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-colors text-left ${
                          isSelected ? 'bg-white border-white text-zinc-900' : 'bg-[#131315] border-white/5 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: estado.color_hex || '#71717a' }} />
                          <span className={`text-xs font-semibold ${isSelected ? 'text-zinc-900' : 'text-[#c4c5d9]'}`}>{estado.nombre}</span>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-zinc-900" />}
                      </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3 bg-[#131315] border border-white/5 rounded-xl flex items-center gap-2.5 text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/5 flex justify-end gap-2 shrink-0">
              <button onClick={onClose} disabled={submitting} className="px-4 py-2 text-sm font-semibold text-[#c4c5d9] hover:text-white disabled:opacity-50">Cancelar</button>
              <button
                onClick={handleConfirm}
                disabled={submitting || !selectedEstadoId}
                className="px-4 py-2 text-sm font-semibold text-white inline-flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Procesando...</> : <><CheckCircle2 className="w-4 h-4" />Confirmar</>}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ReceiveLoanModal;
