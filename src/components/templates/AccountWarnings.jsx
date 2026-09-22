import React from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';

/**
 * Muestra advertencias de cuentas contables inexistentes o no imputables para una plantilla
 * @param {Object} props
 * @param {Array<{accountCode: string, problem: 'NOT_FOUND'|'NOT_POSTABLE'}>} props.warnings
 * @param {Function} [props.onNavigateToPlan]
 */
export const AccountWarnings = ({ warnings = [], onNavigateToPlan }) => {
  if (!warnings || warnings.length === 0) {
    return null;
  }

  const problemLabels = {
    NOT_FOUND: 'no existe en el catálogo de la empresa',
    NOT_POSTABLE: 'no es cuenta de uso (no es imputable)'
  };

  return (
    <div
      style={{
        marginTop: '8px',
        padding: '8px 12px',
        borderRadius: '6px',
        backgroundColor: '#FFFBEB',
        border: '1px solid #FCD34D',
        color: '#92400E',
        fontSize: '12px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, marginBottom: '4px' }}>
        <AlertTriangle size={14} color="#D97706" />
        <span>Advertencia de Cuentas Contables ({warnings.length}):</span>
      </div>

      <ul style={{ margin: '4px 0 6px 18px', padding: 0 }}>
        {warnings.map((w, idx) => (
          <li key={idx} style={{ marginBottom: '2px' }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{w.accountCode}</span>: {problemLabels[w.problem] || w.problem}
          </li>
        ))}
      </ul>

      {onNavigateToPlan && (
        <button
          type="button"
          onClick={onNavigateToPlan}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'none',
            border: 'none',
            padding: 0,
            color: '#B45309',
            fontWeight: 600,
            cursor: 'pointer',
            textDecoration: 'underline',
            fontSize: '11px'
          }}
        >
          <span>Abrir Catálogo de Cuentas</span>
          <ExternalLink size={11} />
        </button>
      )}
    </div>
  );
};

export default AccountWarnings;

