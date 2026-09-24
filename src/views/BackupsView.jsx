import React from 'react';
import { DownloadCloud, UploadCloud, RefreshCcw, Database, AlertTriangle } from 'lucide-react';
import { useAccounting } from '../context/AccountingContext';
import { resetDemoData } from '../services/ingestion/index.js';

export const BackupsView = () => {
  const { empresas, cerrarSesion, recargarDesdeAlmacenamiento, sesionUsuario, empresaActiva } = useAccounting();

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ empresas, fechaExportacion: new Date().toISOString() }, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `backup_estudio_${new Date().getTime()}.json`);
    dlAnchorElem.click();
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        alert(`Backup restaurado correctamente con ${json.empresas?.length || 0} empresas.`);
        // Reload app to apply
        window.location.reload();
      } catch (err) {
        alert("Error al parsear el backup JSON");
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (window.confirm("ATENCIÓN: Esto borrará todos los datos locales y restablecerá el sistema a los valores de fábrica (semilla), pero conservará su sesión activa. ¿Desea continuar?")) {
      const ctx = {
        tenantId: empresaActiva?.id || 'global',
        userId: sesionUsuario?.usuarioId || 'SYSTEM',
        role: sesionUsuario?.rol || 'UNKNOWN'
      };
      resetDemoData(ctx);
      recargarDesdeAlmacenamiento();
      alert("Sistema restaurado a datos semilla.");
    }
  };

  return (
    <div className="content-body">
      <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '2rem' }}>
          <Database size={24} color="var(--primary-color)" />
          <h2 style={{ margin: 0, color: 'var(--text-color)' }}>Gestión de Copias de Seguridad</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
          
          <div style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
            <div style={{ backgroundColor: '#EFF6FF', padding: '1rem', borderRadius: '50%', color: '#2563EB' }}>
              <DownloadCloud size={24} />
            </div>
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>Exportar Respaldo Local (JSON)</h3>
              <p style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Genera un archivo JSON con la información completa del estudio, cartera de empresas, planes contables y vouchers registrados.
              </p>
              <button className="btn btn--primary" onClick={handleExport}>
                Descargar Backup Completo
              </button>
            </div>
          </div>

          <div style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
            <div style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '50%', color: '#475569' }}>
              <UploadCloud size={24} />
            </div>
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>Restaurar Respaldo</h3>
              <p style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Importa un archivo JSON generado previamente para restablecer toda la información.
              </p>
              <input type="file" accept=".json" onChange={handleImport} className="form-control" style={{ maxWidth: '300px' }} />
            </div>
          </div>

          <div style={{ padding: '1.5rem', border: '1px solid #FECACA', borderRadius: '8px', display: 'flex', gap: '1.5rem', alignItems: 'flex-start', backgroundColor: '#FEF2F2' }}>
            <div style={{ backgroundColor: '#FEE2E2', padding: '1rem', borderRadius: '50%', color: '#DC2626' }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#991B1B' }}>Zona de Peligro: Reset de Fábrica</h3>
              <p style={{ margin: '0 0 1rem 0', color: '#B91C1C', fontSize: '0.9rem' }}>
                Esta acción eliminará todos los datos de ingestión y catálogos modificados, y devolverá el sistema a su estado inicial de demostración (Semilla). Se conservará su sesión activa.
              </p>
              <button className="btn btn--primary" style={{ backgroundColor: '#DC2626', borderColor: '#DC2626' }} onClick={handleReset}>
                <RefreshCcw size={16} /> Restablecer a Datos Semilla
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
