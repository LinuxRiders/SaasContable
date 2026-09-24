import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * Formatea importes en unidades menores (céntimos) a representación decimal.
 * @param {number} amountMinor
 * @param {string} [currency='PEN']
 * @returns {string}
 */
function formatMinor(amountMinor, currency = 'PEN') {
  if (amountMinor === undefined || amountMinor === null || isNaN(amountMinor)) return '—';
  const val = amountMinor / 100;
  const symbol = currency === 'PEN' ? 'S/ ' : currency === 'USD' ? '$ ' : `${currency} `;
  return `${symbol}${val.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Tabla técnica de visualización de líneas de asiento contable.
 *
 * @param {Object} props
 * @param {Array} props.lines - Líneas generadas o esperadas
 * @param {string} [props.functionalCurrency='PEN']
 * @param {string} [props.title]
 * @param {boolean} [props.compact=false]
 */
export const EntryLinesTable = ({
  lines = [],
  functionalCurrency = 'PEN',
  title = null,
  compact = false
}) => {
  let totalDebit = 0;
  let totalCredit = 0;

  for (const l of lines) {
    const amt = l.functionalAmountMinor || 0;
    if (l.side === 'DEBIT') {
      totalDebit += amt;
    } else if (l.side === 'CREDIT') {
      totalCredit += amt;
    }
  }

  const diff = Math.abs(totalDebit - totalCredit);
  const isBalanced = lines.length > 0 && diff === 0;

  return (
    <div style={{
      border: '1px solid var(--border-light, #E2E8F0)',
      borderRadius: 'var(--radius-md, 8px)',
      background: 'var(--bg-surface, #FFFFFF)',
      overflow: 'hidden',
      fontSize: compact ? '11px' : '12px'
    }}>
      {title && (
        <div style={{
          padding: '8px 12px',
          background: 'var(--bg-subtle, #F8FAFC)',
          borderBottom: '1px solid var(--border-light, #E2E8F0)',
          fontWeight: 700,
          color: 'var(--text-main, #0F172A)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{title}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748B)', fontWeight: 500 }}>
            {lines.length} {lines.length === 1 ? 'línea' : 'líneas'}
          </span>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-subtle, #F8FAFC)', borderBottom: '1px solid var(--border-light, #E2E8F0)' }}>
              <th style={{ padding: '6px 10px', width: '36px', color: 'var(--text-muted, #64748B)' }}>#</th>
              <th style={{ padding: '6px 10px', width: '70px', color: 'var(--text-muted, #64748B)' }}>Lado</th>
              <th style={{ padding: '6px 10px', width: '110px', color: 'var(--text-muted, #64748B)' }}>Cuenta</th>
              <th style={{ padding: '6px 10px', color: 'var(--text-muted, #64748B)' }}>Descripción</th>
              <th style={{ padding: '6px 10px', color: 'var(--text-muted, #64748B)' }}>Rol Origen</th>
              <th style={{ padding: '6px 10px', textAlign: 'right', color: 'var(--text-muted, #64748B)' }}>Imp. Original</th>
              <th style={{ padding: '6px 10px', width: '60px', textAlign: 'center', color: 'var(--text-muted, #64748B)' }}>T.C.</th>
              <th style={{ padding: '6px 10px', textAlign: 'right', color: 'var(--text-muted, #64748B)' }}>Imp. Funcional</th>
              <th style={{ padding: '6px 10px', color: 'var(--text-muted, #64748B)' }}>Dimensiones</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted, #64748B)' }}>
                  No hay líneas de asiento registradas
                </td>
              </tr>
            ) : (
              lines.map((line, idx) => {
                const isDebit = line.side === 'DEBIT';
                const hasOriginal = line.originalCurrency && line.originalCurrency !== (line.functionalCurrency || functionalCurrency);

                return (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid var(--border-light, #E2E8F0)',
                      backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--bg-subtle, #F8FAFC)'
                    }}
                  >
                    <td style={{ padding: '6px 10px', color: 'var(--text-muted, #64748B)', fontFamily: 'var(--font-mono)' }}>
                      {line.lineNo || idx + 1}
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-xs, 4px)',
                        fontWeight: 700,
                        fontSize: '10px',
                        backgroundColor: isDebit ? 'var(--color-info-bg, #EFF6FF)' : 'var(--color-warning-bg, #FFFBEB)',
                        color: isDebit ? 'var(--color-info-dark, #1E40AF)' : 'var(--color-warning-dark, #92400E)',
                        border: `1px solid ${isDebit ? 'var(--color-info-border, #BFDBFE)' : 'var(--color-warning-border, #FDE68A)'}`
                      }}>
                        {isDebit ? 'DEBE' : 'HABER'}
                      </span>
                    </td>
                    <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {line.accountCode || '—'}
                    </td>
                    <td style={{ padding: '6px 10px', color: 'var(--text-main, #0F172A)' }}>
                      {line.accountDescription || '—'}
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      {line.role ? (
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          padding: '1px 4px',
                          background: 'var(--bg-muted, #F1F5F9)',
                          borderRadius: 'var(--radius-xs, 4px)',
                          color: 'var(--text-muted, #64748B)'
                        }}>
                          {line.role}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted, #64748B)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      {hasOriginal
                        ? formatMinor(line.originalAmountMinor, line.originalCurrency)
                        : '—'}
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                      {line.fxRateMilli ? (line.fxRateMilli / 1000).toFixed(3) : '—'}
                    </td>
                    <td style={{
                      padding: '6px 10px',
                      textAlign: 'right',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      color: isDebit ? 'var(--color-info-dark, #1E40AF)' : 'var(--color-warning-dark, #92400E)'
                    }}>
                      {formatMinor(line.functionalAmountMinor, line.functionalCurrency || functionalCurrency)}
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      {line.dimensions && Object.keys(line.dimensions).length > 0 ? (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {Object.entries(line.dimensions).map(([k, v]) => (
                            <span
                              key={k}
                              style={{
                                fontSize: '10px',
                                padding: '1px 5px',
                                borderRadius: 'var(--radius-xs, 4px)',
                                background: 'var(--bg-muted, #F1F5F9)',
                                color: 'var(--text-main, #0F172A)',
                                border: '1px solid var(--border-light, #E2E8F0)'
                              }}
                            >
                              {k}: <strong>{String(v)}</strong>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted, #64748B)' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {lines.length > 0 && (
            <tfoot>
              <tr style={{
                background: 'var(--bg-subtle, #F8FAFC)',
                borderTop: '2px solid var(--border-medium, #CBD5E1)',
                fontWeight: 700
              }}>
                <td colSpan={4} style={{ padding: '8px 10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isBalanced ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: 'var(--color-success-dark, #065F46)',
                        background: 'var(--color-success-bg, #ECFDF5)',
                        border: '1px solid var(--color-success-border, #A7F3D0)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm, 6px)',
                        fontSize: '11px'
                      }}>
                        <CheckCircle2 size={13} />
                        Asiento Cuadrado (Σ Debe = Σ Haber)
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: 'var(--color-danger-dark, #991B1B)',
                        background: 'var(--color-danger-bg, #FEF2F2)',
                        border: '1px solid var(--color-danger-border, #FECACA)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm, 6px)',
                        fontSize: '11px'
                      }}>
                        <AlertCircle size={13} />
                        Descuadrado (Diferencia: {formatMinor(diff, functionalCurrency)})
                      </span>
                    )}
                  </div>
                </td>
                <td colSpan={3} style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-muted, #64748B)' }}>
                  Totales:
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                  <div style={{ color: 'var(--color-info-dark, #1E40AF)' }}>
                    D: {formatMinor(totalDebit, functionalCurrency)}
                  </div>
                  <div style={{ color: 'var(--color-warning-dark, #92400E)' }}>
                    H: {formatMinor(totalCredit, functionalCurrency)}
                  </div>
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

