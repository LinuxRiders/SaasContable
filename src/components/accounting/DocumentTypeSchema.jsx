import React from 'react';
import { AlertTriangle, CheckCircle2, FileText, Layers, ShieldCheck, Link2 } from 'lucide-react';

export const DocumentTypeSchema = ({ schema }) => {
  if (!schema) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* Banner de aviso si no genera asiento */}
      {!schema.generatesEntry && (
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-warning-bg, #FEF3C7)',
          border: '1px solid var(--color-warning-border, #FCD34D)',
          color: 'var(--color-warning-text, #92400E)'
        }}>
          <AlertTriangle size={20} />
          <div>
            <strong>Documento solo de referencia</strong>
            <p style={{ margin: 0, fontSize: '12px' }}>
              Este tipo de documento no genera asiento contable directo ({schema.name}). Se utiliza para trazabilidad operativa o sustento complementario.
            </p>
          </div>
        </div>
      )}

      {/* Resumen de configuración */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-sm)', background: 'var(--color-surface-subtle)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
        <div>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block' }}>Código / Familia</span>
          <span className="mono" style={{ fontWeight: 600 }}>{schema.code}</span> ({schema.family})
        </div>
        <div>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block' }}>Partes Exigidas</span>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
            {(schema.requiredPartyRoles || []).map(r => (
              <span key={r} className="badge badge--neutral" style={{ fontSize: '10px' }}>{r}</span>
            ))}
          </div>
        </div>
        <div>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block' }}>Libro Sugerido</span>
          <span className="mono">{schema.defaultLegalBookCode || schema.legalBookCode || '—'}</span>
        </div>
        <div>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block' }}>Líneas obligatorias</span>
          <span>{schema.linesRequired ? 'Sí' : 'Opcionales'}</span>
        </div>
      </div>

      {/* Referencias obligatorias / admitidas */}
      {schema.reference && (
        <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Link2 size={16} color="var(--color-primary)" />
            <strong style={{ fontSize: '13px' }}>Requisito de Referencia Documentaria</strong>
            {schema.reference.required ? (
              <span className="badge badge--warning">Obligatoria</span>
            ) : (
              <span className="badge badge--subtle">Opcional</span>
            )}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Tipos de comprobante referenciables: {(schema.reference.documentTypeCodes || []).join(', ') || 'Cualquiera'}
          </div>
        </div>
      )}

      {/* Impuestos y retenciones admitidos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
        <div style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Impuestos Admitidos</span>
          {(schema.allowedTaxCodes || []).length > 0 ? (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {schema.allowedTaxCodes.map(tax => (
                <span key={tax} className="badge badge--primary mono">{tax}</span>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Ninguno</span>
          )}
        </div>

        <div style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Retenciones Admitidas</span>
          {(schema.allowedWithholdingCodes || []).length > 0 ? (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {schema.allowedWithholdingCodes.map(wh => (
                <span key={wh} className="badge badge--secondary mono">{wh}</span>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Ninguna</span>
          )}
        </div>
      </div>

      {/* Campos de Cabecera */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <FileText size={16} color="var(--color-primary)" />
          <h4 style={{ margin: 0, fontSize: '14px' }}>Campos de Cabecera (Header Fields)</h4>
        </div>
        <div className="table-responsive" style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-subtle)', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px' }}>Clave</th>
                <th style={{ padding: '8px 12px' }}>Etiqueta</th>
                <th style={{ padding: '8px 12px' }}>Tipo</th>
                <th style={{ padding: '8px 12px', textAlign: 'center' }}>Obligatorio</th>
              </tr>
            </thead>
            <tbody>
              {(schema.headerFields || []).length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '12px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    Sin campos específicos de cabecera.
                  </td>
                </tr>
              ) : (
                schema.headerFields.map(f => (
                  <tr key={f.key} style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                    <td className="mono" style={{ padding: '8px 12px', fontWeight: 500 }}>{f.key}</td>
                    <td style={{ padding: '8px 12px' }}>{f.label}</td>
                    <td style={{ padding: '8px 12px' }}><span className="badge badge--neutral mono">{f.type}</span></td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      {f.required ? <span className="badge badge--danger" style={{ fontSize: '10px' }}>Requerido</span> : <span style={{ color: 'var(--color-text-muted)' }}>Opcional</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Campos de Línea */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Layers size={16} color="var(--color-primary)" />
          <h4 style={{ margin: 0, fontSize: '14px' }}>Campos de Detalle / Línea (Line Fields)</h4>
        </div>
        <div className="table-responsive" style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-subtle)', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px' }}>Clave</th>
                <th style={{ padding: '8px 12px' }}>Etiqueta</th>
                <th style={{ padding: '8px 12px' }}>Tipo</th>
                <th style={{ padding: '8px 12px', textAlign: 'center' }}>Obligatorio</th>
              </tr>
            </thead>
            <tbody>
              {(schema.lineFields || []).length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '12px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    Sin campos específicos de línea.
                  </td>
                </tr>
              ) : (
                schema.lineFields.map(f => (
                  <tr key={f.key} style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                    <td className="mono" style={{ padding: '8px 12px', fontWeight: 500 }}>{f.key}</td>
                    <td style={{ padding: '8px 12px' }}>{f.label}</td>
                    <td style={{ padding: '8px 12px' }}><span className="badge badge--neutral mono">{f.type}</span></td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      {f.required ? <span className="badge badge--danger" style={{ fontSize: '10px' }}>Requerido</span> : <span style={{ color: 'var(--color-text-muted)' }}>Opcional</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reglas de Coherencia */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <ShieldCheck size={16} color="var(--color-primary)" />
          <h4 style={{ margin: 0, fontSize: '14px' }}>Reglas de Coherencia Aritmética y Estructural</h4>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {(schema.coherenceRules || []).length === 0 ? (
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', padding: '8px', fontStyle: 'italic' }}>
              No define reglas de coherencia específicas.
            </div>
          ) : (
            schema.coherenceRules.map(rule => (
              <div key={rule.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-subtle)', border: '1px solid var(--color-border-subtle)' }}>
                <CheckCircle2 size={16} color="var(--color-success)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '12px' }}>{rule.id}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{rule.description}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

