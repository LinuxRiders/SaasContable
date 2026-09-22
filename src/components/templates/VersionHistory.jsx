import React, { useState } from 'react';
import { Modal } from '../Modal.jsx';
import { 
  History, 
  CheckCircle2, 
  Clock, 
  Layers, 
  Eye, 
  GitCompare, 
  AlertTriangle,
  ArrowRight,
  FileText
} from 'lucide-react';

export const VersionHistory = ({
  template,
  currentVersionNum,
  onSelectVersion,
  onEditNewVersion,
  onRetireTemplate,
  isAdmin = false,
  readOnly = false
}) => {
  const [diffModalVersion, setDiffModalVersion] = useState(null);

  const versions = template?.versions || [];
  const hasDraft = versions.some(v => v.status === 'DRAFT');
  const isRetired = Boolean(template?.retiredAt);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Cabecera y Acciones Rápidas de Versionado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <History size={15} />
            Historial de Versiones y Trazabilidad (CA-22)
          </h4>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
            Las versiones activadas son inmutables. Toda modificación genera una versión nueva en borrador.
          </p>
        </div>

        {isAdmin && !readOnly && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {!hasDraft && !isRetired && (
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={onEditNewVersion}
                style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                title="Copia la versión actual activa a un nuevo borrador v(max+1)"
              >
                <GitCompare size={13} />
                Editar (Nueva Versión)
              </button>
            )}

            {!isRetired && (
              <button
                type="button"
                className="btn btn--danger btn--sm btn--ghost"
                onClick={onRetireTemplate}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--color-danger)' }}
                title="Pasa la versión activa a RETIRADA y desactiva la plantilla"
              >
                <AlertTriangle size={13} />
                Retirar Plantilla
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabla de Versiones */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table" style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-subtle, #f8fafc)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '8px 12px' }}>Versión</th>
              <th style={{ padding: '8px 12px' }}>Estado</th>
              <th style={{ padding: '8px 12px' }}>Basada en</th>
              <th style={{ padding: '8px 12px' }}>Activación</th>
              <th style={{ padding: '8px 12px' }}>Diferencias</th>
              <th style={{ padding: '8px 12px', textAlign: 'right' }}>Asientos Generados</th>
              <th style={{ padding: '8px 12px', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => {
              const isSelected = v.version === currentVersionNum;
              const hasDiffs = Array.isArray(v.diffFromPrevious) && v.diffFromPrevious.length > 0;

              return (
                <tr 
                  key={v.version} 
                  style={{ 
                    borderBottom: '1px solid var(--border-color)',
                    background: isSelected ? 'rgba(37,99,235,0.06)' : 'transparent'
                  }}
                >
                  {/* Versión */}
                  <td style={{ padding: '8px 12px', fontWeight: 700 }} className="mono">
                    v{v.version} {isSelected && <span style={{ color: 'var(--primary-color)', fontSize: '10px' }}>(Viendo)</span>}
                  </td>

                  {/* Estado */}
                  <td style={{ padding: '8px 12px' }}>
                    <span 
                      className={`badge badge--${v.status === 'ACTIVE' ? 'success' : v.status === 'DRAFT' ? 'warning' : 'neutral'}`}
                      style={{ fontSize: '10px', fontWeight: 700 }}
                    >
                      {v.status}
                    </span>
                  </td>

                  {/* Basada en */}
                  <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>
                    {v.basedOnVersion ? `v${v.basedOnVersion}` : 'Inicial'}
                  </td>

                  {/* Activación */}
                  <td style={{ padding: '8px 12px' }}>
                    {v.activatedAt ? (
                      <div>
                        <div>{new Date(v.activatedAt).toLocaleDateString()} {new Date(v.activatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>por {v.activatedBy}</div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>No activada</span>
                    )}
                  </td>

                  {/* Botón Modal de Diferencias */}
                  <td style={{ padding: '8px 12px' }}>
                    {hasDiffs ? (
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => setDiffModalVersion(v)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '2px 6px' }}
                      >
                        <GitCompare size={12} />
                        Ver comparativa ({v.diffFromPrevious.length})
                      </button>
                    ) : v.version === 1 ? (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Versión inicial</span>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sin diferencias registradas</span>
                    )}
                  </td>

                  {/* Asientos generados */}
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }} className="mono">
                    {v.usageCount || 0}
                  </td>

                  {/* Acciones */}
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => onSelectVersion(v.version)}
                      style={{ fontSize: '11px', padding: '2px 6px' }}
                    >
                      {isSelected ? 'Actual' : 'Cargar en editor'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal: Comparativa de Cambios entre Versiones */}
      <Modal
        isOpen={Boolean(diffModalVersion)}
        onClose={() => setDiffModalVersion(null)}
        title={`Comparativa de Cambios en Versión v${diffModalVersion?.version || ''}`}
        maxWidth="600px"
        footer={
          <button className="btn btn--secondary" onClick={() => setDiffModalVersion(null)}>
            Cerrar
          </button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Resumen de modificaciones respecto a la versión anterior (
            <strong>v{diffModalVersion?.basedOnVersion || (diffModalVersion?.version ? diffModalVersion.version - 1 : 1)}</strong>):
          </div>

          <div 
            style={{ 
              background: 'var(--bg-subtle, #f8fafc)', 
              borderRadius: '6px', 
              padding: '12px', 
              border: '1px solid var(--border-color)',
              maxHeight: '360px',
              overflowY: 'auto'
            }}
          >
            {diffModalVersion?.diffFromPrevious && diffModalVersion.diffFromPrevious.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                {diffModalVersion.diffFromPrevious.map((item, idx) => (
                  <li key={idx} style={{ lineHeight: 1.5 }}>
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>
                No se registraron diferencias para esta versión.
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default VersionHistory;

