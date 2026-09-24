import React, { useState } from 'react';
import {
  History,
  GitBranch,
  Plus,
  PlayCircle,
  ChevronDown,
  ChevronRight,
  User,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

/**
 * Componente para el historial de versiones de una plantilla contable (RD-10, T097).
 * Muestra versiones con autor, fecha, estado por empresa, uso y diff desplegable;
 * botones "Crear nueva versión" y "Marcar como usada (demo)".
 *
 * @param {Object} props
 * @param {Object} props.template - Plantilla AST completa
 * @param {Array<Object>} [props.activations=[]] - Activaciones del tenant
 * @param {Record<string, number>} [props.usageMap={}] - Mapa de uso { '<templateId>@<version>': number }
 * @param {(fromVersion: number) => Promise<void>|void} [props.onCreateVersion] - Callback para crear nueva versión
 * @param {(version: number) => Promise<void>|void} [props.onMarkUsedForDemo] - Callback para marcar uso demo
 * @param {boolean} [props.isPack=false]
 */
export const VersionHistory = ({
  template,
  activations = [],
  usageMap = {},
  onCreateVersion,
  onMarkUsedForDemo,
  isPack = false,
  canEdit = true
}) => {
  const [expandedDiffs, setExpandedDiffs] = useState({});
  const [actionLoading, setActionLoading] = useState(null);

  const versions = Array.isArray(template?.versions) ? [...template.versions].reverse() : [];

  const toggleDiff = (vNum) => {
    setExpandedDiffs(prev => ({
      ...prev,
      [vNum]: !prev[vNum]
    }));
  };

  const handleCreateVersion = async (vNum) => {
    if (!onCreateVersion) return;
    setActionLoading(`create_${vNum}`);
    try {
      await onCreateVersion(vNum);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkUsed = async (vNum) => {
    if (!onMarkUsedForDemo) return;
    setActionLoading(`used_${vNum}`);
    try {
      await onMarkUsedForDemo(vNum);
    } finally {
      setActionLoading(null);
    }
  };

  if (!template) {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Encabezado del Historial */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        background: 'var(--bg-subtle, #F8FAFC)',
        borderRadius: 'var(--radius-md, 8px)',
        border: '1px solid var(--border-light, #CBD5E1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <History size={18} color="#475569" />
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#1E293B' }}>
              Historial de Versiones e Inmutabilidad (RD-10)
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
              Una versión con asientos generados o activada no se puede editar; se crea una nueva versión con trazabilidad diff.
            </div>
          </div>
        </div>

        {!isPack && versions.length > 0 && (
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => handleCreateVersion(versions[0].version)}
            disabled={!!actionLoading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
          >
            <Plus size={14} />
            <span>Crear nueva versión (v{versions[0].version + 1})</span>
          </button>
        )}
      </div>

      {/* Lista de Versiones */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {versions.map((ver) => {
          const vNum = ver.version;
          const usageKey = `${template.id}@${vNum}`;
          const usage = usageMap[usageKey] || ver.usage || 0;
          const isUsed = usage > 0;
          const isExpanded = !!expandedDiffs[vNum];

          const act = activations.find(a => a.templateId === template.id && a.version === vNum);
          const actStatus = act?.status || 'INACTIVE';

          const diffList = ver.diffFromPrevious || [];

          return (
            <div
              key={vNum}
              style={{
                border: '1px solid var(--border-light, #CBD5E1)',
                borderRadius: '8px',
                background: 'var(--bg-surface, #FFFFFF)',
                overflow: 'hidden'
              }}
            >
              {/* Fila principal de la versión */}
              <div style={{
                padding: '14px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                background: ver.status === 'PUBLISHED' ? '#F8FAFC' : '#FFFFFF'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    background: ver.status === 'PUBLISHED' ? '#DCFCE7' : '#FEF3C7',
                    color: ver.status === 'PUBLISHED' ? '#166534' : '#92400E',
                    fontWeight: 700,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <GitBranch size={14} />
                    v{vNum}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px', color: '#1E293B' }}>
                        Estado: <span style={{ textTransform: 'uppercase' }}>{ver.status}</span>
                      </span>

                      {/* Badge de activación */}
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        background: actStatus === 'ACTIVE' ? '#BBF7D0' : actStatus === 'SUPERSEDED' ? '#E2E8F0' : '#F1F5F9',
                        color: actStatus === 'ACTIVE' ? '#166534' : actStatus === 'SUPERSEDED' ? '#475569' : '#64748B'
                      }}>
                        {actStatus === 'ACTIVE' ? 'Activa en la empresa' : actStatus === 'SUPERSEDED' ? 'Superada' : 'Inactiva'}
                      </span>

                      {/* Badge de uso contable */}
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        background: isUsed ? '#FEE2E2' : '#F1F5F9',
                        color: isUsed ? '#991B1B' : '#475569'
                      }}>
                        {usage} {usage === 1 ? 'asiento generado' : 'asientos generados'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={12} /> {ver.createdBy || 'sistema'}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} /> {ver.createdAt ? new Date(ver.createdAt).toLocaleString('es-PE') : '—'}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Layers size={12} /> {(ver.lines || []).length} líneas declaradas
                      </span>
                    </div>
                  </div>
                </div>

                {/* Acciones de la versión */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Botón para marcar uso demo */}
                  {!isPack && canEdit && (
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => handleMarkUsed(vNum)}
                      disabled={actionLoading === `used_${vNum}`}
                      title="Simula un asiento generado para bloquear la edición de esta versión (RD-10 demo)"
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                    >
                      <PlayCircle size={13} />
                      <span>Marcar como usada (demo)</span>
                    </button>
                  )}

                  {/* Botón para crear nueva versión desde esta */}
                  {!isPack && canEdit && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => handleCreateVersion(vNum)}
                      disabled={actionLoading === `create_${vNum}`}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                    >
                      <Plus size={13} />
                      <span>Nueva versión</span>
                    </button>
                  )}

                  {/* Toggle Diff */}
                  {vNum > 1 && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => toggleDiff(vNum)}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                    >
                      <span>Diff</span>
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  )}
                </div>
              </div>

              {/* Panel de Diff desplegable */}
              {isExpanded && (
                <div style={{
                  padding: '12px 16px',
                  background: '#F8FAFC',
                  borderTop: '1px solid var(--border-light, #CBD5E1)',
                  fontSize: '12px'
                }}>
                  <div style={{ fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Diferencias respecto a la versión anterior (v{vNum - 1}):
                  </div>

                  {diffList.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: '18px', color: '#1E293B' }}>
                      {diffList.map((d, idx) => (
                        <li key={idx} style={{ marginBottom: '3px' }}>
                          <code>{d}</code>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{ color: '#64748B', fontStyle: 'italic' }}>
                      No se registraron cambios estructurales respecto a v{vNum - 1} o aún no se ha guardado un borrador modificado.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
