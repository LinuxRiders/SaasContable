import React, { useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, AlertTriangle, Power, PowerOff, ShieldCheck, Clock } from 'lucide-react';

export const ActivationPanel = ({
  template,
  version,
  activation = null,
  onActivate = null,
  onDeactivate = null,
  readOnly = false
}) => {
  const [loading, setLoading] = useState(false);
  const [blockedErrors, setBlockedErrors] = useState([]);
  const [successMessage, setSuccessMessage] = useState(null);

  const isActive = activation?.status === 'ACTIVE' && activation?.version === version?.version;
  const isOtherActive = activation?.status === 'ACTIVE' && activation?.version !== version?.version;
  const isSuperseded = activation?.status === 'SUPERSEDED' && activation?.version === version?.version;

  const handleActivate = async () => {
    if (!onActivate || loading || readOnly) return;
    setLoading(true);
    setBlockedErrors([]);
    setSuccessMessage(null);

    try {
      const res = await onActivate(template.id, version.version);
      if (res && !res.ok) {
        if (res.error?.code === 'ACTIVATION_BLOCKED' && res.error?.details?.errors) {
          setBlockedErrors(res.error.details.errors);
        } else {
          setBlockedErrors([{ code: res.error?.code || 'ERROR', message: res.error?.message || 'Error al activar plantilla' }]);
        }
      } else {
        setSuccessMessage(`Versión ${version.version} activada exitosamente para la empresa.`);
      }
    } catch (err) {
      setBlockedErrors([{ code: 'UNEXPECTED', message: err.message || 'Error inesperado' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!onDeactivate || loading || readOnly) return;
    setLoading(true);
    setBlockedErrors([]);
    setSuccessMessage(null);

    try {
      const res = await onDeactivate(template.id);
      if (res && !res.ok) {
        setBlockedErrors([{ code: res.error?.code || 'ERROR', message: res.error?.message || 'Error al desactivar' }]);
      } else {
        setSuccessMessage('Plantilla desactivada correctamente.');
      }
    } catch (err) {
      setBlockedErrors([{ code: 'UNEXPECTED', message: err.message || 'Error inesperado' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md, 16px)' }}>
      {/* Tarjeta de estado de activación */}
      <div style={{
        background: 'var(--bg-surface, #FFFFFF)',
        border: '1px solid var(--border-light, #E2E8F0)',
        borderRadius: 'var(--radius-md, 8px)',
        padding: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>
              Activación en la Empresa Actual
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted, #64748B)' }}>
              Solo las plantillas activas son seleccionadas por el motor contable para la generación de asientos (RD-16).
            </p>
          </div>

          <div>
            {isActive ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-full, 9999px)',
                background: 'var(--color-success-bg, #ECFDF5)',
                color: 'var(--color-success-dark, #065F46)',
                border: '1px solid var(--color-success-border, #A7F3D0)',
                fontWeight: 700,
                fontSize: '13px'
              }}>
                <CheckCircle2 size={16} />
                ACTIVA (Versión {version?.version})
              </span>
            ) : isOtherActive ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-full, 9999px)',
                background: 'var(--color-warning-bg, #FFFBEB)',
                color: 'var(--color-warning-dark, #92400E)',
                border: '1px solid var(--color-warning-border, #FDE68A)',
                fontWeight: 700,
                fontSize: '13px'
              }}>
                <AlertTriangle size={16} />
                OTRA VERSIÓN ACTIVA (v{activation.version})
              </span>
            ) : isSuperseded ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-full, 9999px)',
                background: 'var(--bg-muted, #F1F5F9)',
                color: 'var(--text-muted, #64748B)',
                border: '1px solid var(--border-light, #E2E8F0)',
                fontWeight: 600,
                fontSize: '13px'
              }}>
                <Clock size={16} />
                REEMPLAZADA (SUPERSEDED)
              </span>
            ) : (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-full, 9999px)',
                background: 'var(--bg-subtle, #F8FAFC)',
                color: 'var(--text-muted, #64748B)',
                border: '1px solid var(--border-light, #E2E8F0)',
                fontWeight: 600,
                fontSize: '13px'
              }}>
                <PowerOff size={16} />
                INACTIVA
              </span>
            )}
          </div>
        </div>

        {/* Metadatos de la activación actual */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          padding: '12px 16px',
          background: 'var(--bg-subtle, #F8FAFC)',
          borderRadius: 'var(--radius-sm, 6px)',
          fontSize: '12px',
          color: 'var(--text-main, #0F172A)',
          marginBottom: '16px'
        }}>
          <div>
            <span style={{ color: 'var(--text-muted, #64748B)', display: 'block' }}>Versión examinada:</span>
            <strong>v{version?.version}</strong> ({version?.status || 'DRAFT'})
          </div>
          <div>
            <span style={{ color: 'var(--text-muted, #64748B)', display: 'block' }}>Alcance:</span>
            <strong>{template?.scope === 'PACK' ? 'Paquete (PACK)' : 'Empresa (TENANT)'}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted, #64748B)', display: 'block' }}>Activada por:</span>
            <strong>{activation?.activatedBy || '—'}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted, #64748B)', display: 'block' }}>Fecha de activación:</span>
            <strong>{activation?.activatedAt ? new Date(activation.activatedAt).toLocaleString('es-PE') : '—'}</strong>
          </div>
        </div>

        {/* Mensaje de éxito */}
        {successMessage && (
          <div style={{
            padding: '10px 14px',
            background: 'var(--color-success-bg, #ECFDF5)',
            border: '1px solid var(--color-success-border, #A7F3D0)',
            borderRadius: 'var(--radius-sm, 6px)',
            color: 'var(--color-success-dark, #065F46)',
            fontSize: '13px',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Lista de errores si la activación está bloqueada */}
        {blockedErrors.length > 0 && (
          <div style={{
            padding: '12px 16px',
            background: 'var(--color-danger-bg, #FEF2F2)',
            border: '1px solid var(--color-danger-border, #FECACA)',
            borderRadius: 'var(--radius-sm, 6px)',
            color: 'var(--color-danger-dark, #991B1B)',
            fontSize: '13px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '6px' }}>
              <AlertCircle size={16} />
              <span>Activación bloqueada por las siguientes condiciones (RD-10, RD-16, RD-17):</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: '22px' }}>
              {blockedErrors.map((err, i) => (
                <li key={i} style={{ marginBottom: '4px' }}>
                  <strong style={{ fontFamily: 'var(--font-mono)' }}>[{err.code}]</strong> {err.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Botones de acción */}
        {!readOnly && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            {isActive ? (
              <button
                type="button"
                className="btn btn--danger btn--sm"
                onClick={handleDeactivate}
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <PowerOff size={14} />
                <span>{loading ? 'Desactivando...' : 'Desactivar esta plantilla'}</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={handleActivate}
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Power size={14} />
                <span>{loading ? 'Verificando y activando...' : `Activar versión ${version?.version}`}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Explicación de requisitos de activación */}
      <div style={{
        background: 'var(--bg-subtle, #F8FAFC)',
        border: '1px solid var(--border-light, #E2E8F0)',
        borderRadius: 'var(--radius-md, 8px)',
        padding: '16px',
        fontSize: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '8px' }}>
          <ShieldCheck size={16} color="var(--color-info-dark, #1E40AF)" />
          <span>Reglas de Activación Inquebrantables:</span>
        </div>
        <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-muted, #64748B)' }}>
          <li><strong>RD-10:</strong> Debe tener al menos un caso de prueba y todos deben pasar con el hash actual de la plantilla.</li>
          <li><strong>RD-17:</strong> Todos los roles de cuenta requeridos por la plantilla deben estar resueltos en el mapa de la empresa con cuentas vigentes y con imputación.</li>
          <li><strong>RD-16:</strong> No puede existir ambigüedad (otra plantilla activa con idéntica terna comprobante-perspectiva-operación, mismo alcance y prioridad).</li>
        </ul>
      </div>
    </div>
  );
};

