import React, { useState, useEffect, useCallback } from 'react';
import { useAccounting } from '../../context/AccountingContext.jsx';
import { getDemoSettings, setFxServiceDown, resetDemoData } from '../../services/ingestion/index.js';
import { RefreshCw, Database, WifiOff, Wifi, AlertTriangle } from 'lucide-react';

/**
 * Controles de simulación y demostración (CA-18.2, CA-18.3, T093).
 * Incluye:
 * - Interruptor para simular la caída del servicio de tipo de cambio.
 * - Botón para reiniciar datos de demostración a valores de fábrica.
 * - Indicador de almacenamiento utilizado en localStorage (KB).
 */
export const DemoControls = ({ ctx, onReset }) => {
  const { recargarDesdeAlmacenamiento } = useAccounting();
  const [fxDown, setFxDown] = useState(false);
  const [storageBytes, setStorageBytes] = useState(0);
  const [isResetting, setIsResetting] = useState(false);

  const refreshSettings = useCallback(() => {
    try {
      const settings = getDemoSettings(ctx || {});
      setFxDown(!!settings.fxServiceDown);
      setStorageBytes(settings.storageUsageBytes || 0);
    } catch (err) {
      console.error('Error al leer configuración demo:', err);
    }
  }, [ctx]);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  const handleToggleFx = () => {
    const nextVal = !fxDown;
    setFxServiceDown(ctx || {}, { down: nextVal });
    setFxDown(nextVal);
    refreshSettings();
  };

  const handleReset = async () => {
    const ok = window.confirm(
      '¿Desea reiniciar todos los datos de demostración a los valores iniciales de fábrica?\n\n' +
      'Se conservará la sesión activa, pero se restablecerán empresas, catálogos, comprobantes y plantillas.'
    );
    if (!ok) return;

    setIsResetting(true);
    try {
      resetDemoData(ctx || {});
      if (recargarDesdeAlmacenamiento) {
        recargarDesdeAlmacenamiento();
      }
      refreshSettings();
      if (onReset) {
        onReset();
      }
    } catch (err) {
      console.error('Error al reiniciar datos demo:', err);
      alert('Error al reiniciar datos de demostración: ' + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  const storageKb = (storageBytes / 1024).toFixed(1);

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '10px 16px',
        background: fxDown ? 'var(--color-warning-bg)' : 'var(--bg-subtle)',
        border: `1px solid ${fxDown ? 'var(--color-warning-border)' : 'var(--border-light)'}`,
        borderRadius: 'var(--radius-md)',
        marginBottom: '16px',
        fontSize: '12px',
        transition: 'all var(--transition-fast)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        {/* Interruptor FX Down */}
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            fontWeight: 500,
            color: fxDown ? 'var(--color-warning-dark)' : 'var(--text-main)',
            userSelect: 'none'
          }}
        >
          <input
            type="checkbox"
            checked={fxDown}
            onChange={handleToggleFx}
            style={{ cursor: 'pointer', width: '15px', height: '15px' }}
          />
          {fxDown ? <WifiOff size={14} color="var(--color-warning-dark)" /> : <Wifi size={14} color="var(--color-success)" />}
          <span>Simular caída del servicio de tipo de cambio</span>
        </label>

        {fxDown && (
          <span
            className="badge badge--warning"
            style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <AlertTriangle size={11} />
            Servicio FX fuera de línea (usará tasa anterior provisional)
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Uso de almacenamiento */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-muted)'
          }}
          title={`Uso de almacenamiento: ${storageBytes.toLocaleString()} bytes`}
        >
          <Database size={13} />
          <span>Almacenamiento:</span>
          <strong className="mono" style={{ color: 'var(--text-main)' }}>{storageKb} KB</strong>
        </div>

        {/* Botón reset demo */}
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={handleReset}
          disabled={isResetting}
          style={{ fontSize: '11px', padding: '4px 10px' }}
          title="Restablece las empresas, catálogo de cuentas, plantillas y comprobantes de prueba"
        >
          <RefreshCw size={12} className={isResetting ? 'spin' : ''} />
          <span>{isResetting ? 'Reiniciando...' : 'Reiniciar datos demo'}</span>
        </button>
      </div>
    </div>
  );
};

export default DemoControls;

