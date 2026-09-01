import React, { useState } from 'react';
import { API_BASE } from '../../services/api';
import { Download, UploadCloud, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const BackupPanel = () => {
    const { showToast } = useToast();
    const [actionLoading, setActionLoading] = useState(false);
    const handleExportExcel = async () => {
        try {
            setActionLoading(true);
            const response = await fetch(`${API_BASE}/exportar-excel`, { credentials: 'include' });
            if (response.ok) {
                const blob = await response.blob(); const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = `Inventario_Backup_${new Date().toISOString().split('T')[0]}.xlsx`; document.body.appendChild(a); a.click(); a.remove();
                showToast("Reporte Generado", "Excel descargado.", "success");
            } else showToast("Error", "No se pudo generar el Excel.", "error");
        } catch { showToast("Error", "No se pudo conectar.", "error"); } finally { setActionLoading(false); }
    };
    const handleCloudBackup = async () => {
        try {
            setActionLoading(true);
            const response = await fetch(`${API_BASE}/respaldo-drive`, { method: 'POST', credentials: 'include' });
            const data = await response.json();
            if (response.ok) showToast("Respaldo Exitoso", data.message || 'Guardado en Drive.', "success");
            else showToast("Error", data.error || 'No se pudo guardar.', "error");
        } catch { showToast("Error", "No se pudo conectar.", "error"); } finally { setActionLoading(false); }
    };
    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-zinc-500" /> Exportar a Excel</h4>
                    <p className="text-xs text-zinc-500">Copia completa del inventario en .xlsx</p>
                    <button onClick={handleExportExcel} disabled={actionLoading} className="inline-flex items-center justify-center gap-1.5 bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white border border-transparent px-3 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer">
                        {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Descargar
                    </button>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2"><UploadCloud className="w-4 h-4 text-zinc-500" /> Exportar a Drive</h4>
                    <p className="text-xs text-zinc-500">Copia encriptada en Google Drive.</p>
                    <button onClick={handleCloudBackup} disabled={actionLoading} className="inline-flex items-center justify-center gap-1.5 bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white border border-transparent px-3 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer">
                        {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />} Subir a la nube
                    </button>
                </div>
            </div>
        </div>
    );
};
export default BackupPanel;
