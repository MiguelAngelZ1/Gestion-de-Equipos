import React, { useState } from 'react';
import { API_BASE, getAuthToken } from '../../services/api';
import {
    Download,
    UploadCloud,
    Database,
    FileSpreadsheet,
    RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '../../context/ToastContext';

const BackupPanel = () => {
    const { showToast } = useToast();
    const [actionLoading, setActionLoading] = useState(false);

    const handleExportExcel = async () => {
        try {
            setActionLoading(true);
            const token = getAuthToken();
            const response = await fetch(`${API_BASE}/exportar-excel`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Inventario_Backup_${new Date().toISOString().split('T')[0]}.xlsx`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                showToast("Reporte Generado", "El archivo Excel se ha descargado correctamente.", "success");
            } else {
                showToast("Error de Exportación", "No se pudo generar el archivo Excel. Inténtalo de nuevo más tarde.", "error");
            }
        } catch (error) {
            console.error("Error exporting excel:", error);
            showToast("Error de Red", "No se pudo conectar con el servidor para la exportación.", "error");
        } finally {
            setActionLoading(false);
        }
    };

    const handleCloudBackup = async () => {
        try {
            setActionLoading(true);
            const token = getAuthToken();
            const response = await fetch(`${API_BASE}/respaldo-drive`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                showToast("Respaldo Exitoso", data.message || 'La copia de seguridad ha sido guardada en Google Drive.', "success");
            } else {
                showToast("Error en la Nube", data.error || 'No se pudo guardar el respaldo en la nube.', "error");
            }
        } catch (error) {
            console.error("Error cloud backup:", error);
            showToast("Error de Red", "No se pudo conectar con el servidor para la exportación a la nube.", "error");
        } finally {
            setActionLoading(false);
        }
    };

    const handleManualSync = async () => {
        try {
            setActionLoading(true);
            const token = getAuthToken();
            const response = await fetch(`${API_BASE}/sync/run`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                showToast("Sincronización Exitosa", "Los datos se han sincronizado correctamente con la nube.", "success");
            } else {
                showToast("Error de Sincronización", data.error || 'No se pudo completar la sincronización.', "error");
            }
        } catch (error) {
            console.error("Error manual sync:", error);
            showToast("Error de Red", "No se pudo conectar con el servidor para la sincronización.", "error");
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-500">
            {/* Actions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4 sm:gap-6">
                {/* Excel Export */}
                <motion.div
                    whileHover={{ y: -5 }}
                    className="bg-emerald-600/5 border border-emerald-500/20 p-5 sm:p-6 rounded-2xl sm:rounded-[2rem] flex flex-col justify-between group hover:bg-emerald-600/10 transition-all relative overflow-hidden"
                >
                    <div className="absolute -top-10 -right-10 opacity-5 group-hover:rotate-12 transition-transform">
                        <FileSpreadsheet className="w-40 h-40 text-emerald-500" />
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/30 group-hover:scale-110 transition-transform shrink-0">
                                <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                            </div>
                            <h4 className="text-white text-base font-black tracking-tight mt-1">Exportar a Excel</h4>
                        </div>
                        <p className="text-slate-500 text-[11px] font-medium leading-relaxed">Descarga una copia completa de tu inventario en formato .xlsx</p>
                    </div>
                    <button
                        onClick={handleExportExcel}
                        disabled={actionLoading}
                        className="mt-6 w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-emerald-600/10"
                    >
                        {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        Descargar Reporte
                    </button>
                </motion.div>

                {/* Cloud Backup (Drive) */}
                <motion.div
                    whileHover={{ y: -5 }}
                    className="bg-sky-600/5 border border-sky-500/20 p-5 sm:p-6 rounded-2xl sm:rounded-[2rem] flex flex-col justify-between group hover:bg-sky-600/10 transition-all relative overflow-hidden"
                >
                    <div className="absolute -top-10 -right-10 opacity-5 group-hover:rotate-12 transition-transform">
                        <UploadCloud className="w-40 h-40 text-sky-500" />
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="w-12 h-12 bg-sky-500/20 rounded-xl flex items-center justify-center border border-sky-500/30 group-hover:scale-110 transition-transform shrink-0">
                                <UploadCloud className="w-6 h-6 text-sky-400" />
                            </div>
                            <h4 className="text-white text-base font-black tracking-tight mt-1">Exportar a la Nube (Drive)</h4>
                        </div>
                        <p className="text-slate-500 text-[11px] font-medium leading-relaxed">Sube una copia encriptada de respaldo a tu cuenta de Google Drive.</p>
                    </div>
                    <button
                        onClick={handleCloudBackup}
                        disabled={actionLoading}
                        className="mt-6 w-full bg-sky-600 hover:bg-sky-500 text-white py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-sky-600/10"
                    >
                        {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                        Subir a la nube
                    </button>
                </motion.div>

            </div>
        </div>
    );
};

export default BackupPanel;
