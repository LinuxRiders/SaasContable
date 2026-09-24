import React from 'react';
import { Edit2, CheckCircle, Ban, Power, ShieldAlert, Sparkles } from 'lucide-react';

export const ClassificationRuleList = ({
  rules = [],
  pack = null,
  onEditRule = null,
  onActivate = null,
  onRetire = null,
  canEdit = true
}) => {
  return (
    <div style={{
      border: '1px solid var(--border-light, #E2E8F0)',
      borderRadius: 'var(--radius-md, 8px)',
      background: 'var(--bg-surface, #FFFFFF)',
      overflow: 'hidden'
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
        <thead>
          <tr style={{ background: 'var(--bg-subtle, #F8FAFC)', borderBottom: '1px solid var(--border-light, #E2E8F0)' }}>
            <th style={{ padding: '10px 12px', width: '70px', color: 'var(--text-muted, #64748B)' }}>Prioridad</th>
            <th style={{ padding: '10px 12px', color: 'var(--text-muted, #64748B)' }}>Nombre de la Regla</th>
            <th style={{ padding: '10px 12px', width: '100px', color: 'var(--text-muted, #64748B)' }}>Alcance</th>
            <th style={{ padding: '10px 12px', color: 'var(--text-muted, #64748B)' }}>Operación Resultante</th>
            <th style={{ padding: '10px 12px', width: '110px', color: 'var(--text-muted, #64748B)' }}>Estado</th>
            <th style={{ padding: '10px 12px', width: '60px', color: 'var(--text-muted, #64748B)' }}>Versión</th>
            {canEdit && (
              <th style={{ padding: '10px 12px', width: '140px', textAlign: 'right', color: 'var(--text-muted, #64748B)' }}>
                Acciones
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rules.length === 0 ? (
            <tr>
              <td colSpan={canEdit ? 7 : 6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted, #64748B)' }}>
                No hay reglas de clasificación configuradas.
              </td>
            </tr>
          ) : (
            rules.map((r, idx) => {
              const isActive = r.status === 'ACTIVE';
              const isProposed = r.status === 'PROPOSED';
              const isRetired = r.status === 'RETIRED';

              return (
                <tr
                  key={r.id || idx}
                  style={{
                    borderBottom: '1px solid var(--border-light, #E2E8F0)',
                    backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--bg-subtle, #F8FAFC)'
                  }}
                >
                  <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    {r.priority ?? 0}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-main, #0F172A)' }}>
                      {r.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748B)', fontFamily: 'var(--font-mono)' }}>
                      ID: {r.id}
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-xs, 4px)',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: r.scope === 'LINE' ? 'var(--color-info-bg, #EFF6FF)' : 'var(--bg-muted, #F1F5F9)',
                      color: r.scope === 'LINE' ? 'var(--color-info-dark, #1E40AF)' : 'var(--text-main, #0F172A)',
                      border: `1px solid ${r.scope === 'LINE' ? 'var(--color-info-border, #BFDBFE)' : 'var(--border-light, #E2E8F0)'}`
                    }}>
                      {r.scope === 'LINE' ? 'LÍNEA' : 'DOCUMENTO'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {r.operationTypeCode}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {isActive && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-sm, 6px)',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: 'var(--color-success-bg, #ECFDF5)',
                        color: 'var(--color-success-dark, #065F46)',
                        border: '1px solid var(--color-success-border, #A7F3D0)'
                      }}>
                        <CheckCircle size={12} />
                        ACTIVA
                      </span>
                    )}
                    {isProposed && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-sm, 6px)',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: 'var(--color-warning-bg, #FFFBEB)',
                        color: 'var(--color-warning-dark, #92400E)',
                        border: '1px solid var(--color-warning-border, #FDE68A)'
                      }}>
                        <Sparkles size={12} />
                        PROPUESTA
                      </span>
                    )}
                    {isRetired && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-sm, 6px)',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: 'var(--bg-muted, #F1F5F9)',
                        color: 'var(--text-muted, #64748B)',
                        border: '1px solid var(--border-light, #E2E8F0)'
                      }}>
                        <Ban size={12} />
                        RETIRADA
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted, #64748B)' }}>
                    v{r.version || 1}
                  </td>
                  {canEdit && (
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn btn--icon btn--ghost"
                          onClick={() => onEditRule && onEditRule(r)}
                          title="Editar regla"
                        >
                          <Edit2 size={14} />
                        </button>

                        {!isActive && onActivate && (
                          <button
                            type="button"
                            className="btn btn--secondary btn--sm"
                            onClick={() => onActivate(r.id)}
                            style={{ fontSize: '11px', padding: '2px 6px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Activar regla"
                          >
                            <Power size={12} />
                            <span>Activar</span>
                          </button>
                        )}

                        {isActive && onRetire && (
                          <button
                            type="button"
                            className="btn btn--danger btn--sm"
                            onClick={() => onRetire(r.id)}
                            style={{ fontSize: '11px', padding: '2px 6px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Retirar regla"
                          >
                            <Ban size={12} />
                            <span>Retirar</span>
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

