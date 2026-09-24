import React from 'react';
import { ExpressionBuilder } from './ExpressionBuilder.jsx';
import { AccountPicker } from './AccountPicker.jsx';

export const AccountRefEditor = ({
  value,
  onChange,
  pack,
  scope = 'TENANT',
  chart = [],
  documentType,
  lineContext = false,
  readOnly = false
}) => {
  const kind = value?.kind || 'ROLE';

  const handleKindChange = (newKind) => {
    if (readOnly) return;
    if (newKind === 'ROLE') {
      const defaultRole = pack?.accountRoles?.[0]?.code || 'PURCHASES_MERCHANDISE';
      onChange({ kind: 'ROLE', roleCode: defaultRole });
    } else if (newKind === 'LITERAL') {
      onChange({ kind: 'LITERAL', accountCode: chart[0]?.codigo || '' });
    } else if (newKind === 'BY_OPERATION_TYPE') {
      onChange({
        kind: 'BY_OPERATION_TYPE',
        byOperationType: {},
        fallback: { roleCode: pack?.accountRoles?.[0]?.code || 'PURCHASES_MERCHANDISE' }
      });
    }
  };

  const currentRole = pack?.accountRoles?.find(r => r.code === value?.roleCode);
  const hasQualifier = !!currentRole?.qualifier;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      {/* Selector de tipo de referencia */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {!readOnly && (
          <select
            className="input"
            value={kind}
            onChange={(e) => handleKindChange(e.target.value)}
            style={{ fontSize: '11px', padding: '4px 8px', width: '140px' }}
          >
            <option value="ROLE">Por Rol Normativo</option>
            <option value="BY_OPERATION_TYPE">Por Operación</option>
            {scope === 'TENANT' && <option value="LITERAL">Cuenta Específica</option>}
          </select>
        )}

        {/* Editor según kind */}
        <div style={{ flex: 1 }}>
          {kind === 'ROLE' && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
              <select
                className="input mono"
                disabled={readOnly}
                value={value?.roleCode || ''}
                onChange={(e) => onChange({ ...value, roleCode: e.target.value })}
                style={{ fontSize: '11px', padding: '4px 8px', flex: 1 }}
              >
                {(pack?.accountRoles || []).map(r => (
                  <option key={r.code} value={r.code}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>

              {hasQualifier && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                    Calificador ({currentRole.qualifier.name}):
                  </span>
                  <ExpressionBuilder
                    value={value?.qualifierFrom}
                    onChange={(expr) => onChange({ ...value, qualifierFrom: expr })}
                    expectedType="STRING"
                    documentType={documentType}
                    lineContext={lineContext}
                    readOnly={readOnly}
                  />
                </div>
              )}
            </div>
          )}

          {kind === 'LITERAL' && (
            <AccountPicker
              chart={chart}
              value={value?.accountCode}
              onChange={(code) => onChange({ ...value, accountCode: code })}
              disabled={readOnly}
            />
          )}

          {kind === 'BY_OPERATION_TYPE' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '6px', background: 'var(--color-surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600 }}>Mapeo por tipo de operación de línea:</div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Fallback (por defecto):</span>
                <select
                  className="input mono"
                  disabled={readOnly}
                  value={value?.fallback?.roleCode || ''}
                  onChange={(e) => onChange({
                    ...value,
                    fallback: { roleCode: e.target.value }
                  })}
                  style={{ fontSize: '11px', padding: '2px 6px' }}
                >
                  {(pack?.accountRoles || []).map(r => (
                    <option key={r.code} value={r.code}>{r.name} ({r.code})</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

