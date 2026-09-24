import React, { useState } from 'react';
import { Calendar, Percent } from 'lucide-react';

export const TaxTable = ({ taxes = [], targetDate, onDateChange }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      {/* Selector de fecha */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', background: 'var(--color-surface)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Percent size={18} color="var(--color-primary)" />
          <div>
            <strong style={{ fontSize: '14px' }}>Tasas Impositivas y Retenciones</strong>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Consulte las alícuotas efectivas vigentes según la fecha del documento
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={16} color="var(--color-text-muted)" />
          <label htmlFor="tax-date-input" style={{ fontSize: '12px', fontWeight: 500 }}>Fecha de vigencia:</label>
          <input
            id="tax-date-input"
            type="date"
            className="input"
            value={targetDate}
            onChange={(e) => onDateChange && onDateChange(e.target.value)}
            style={{ width: '160px' }}
          />
        </div>
      </div>

      {/* Tabla de impuestos */}
      <div className="table-responsive" style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-subtle)', textAlign: 'left' }}>
              <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)' }}>Código / Nombre</th>
              <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)' }}>Naturaleza (Tipo)</th>
              <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)', textAlign: 'right' }}>Tasa Vigente</th>
              <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)' }}>Rol Recuperable / Crédito</th>
              <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)' }}>Rol Por Pagar / Débito</th>
              <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)' }}>Periodo Vigencia</th>
            </tr>
          </thead>
          <tbody>
            {taxes.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No se encontraron impuestos registrados en el paquete.
                </td>
              </tr>
            ) : (
              taxes.map(tax => {
                const hasRate = tax.rateBp !== null && tax.rateBp !== undefined;
                const percentStr = hasRate ? `${(tax.rateBp / 100).toFixed(2)}% (${tax.rateBp} bp)` : null;

                return (
                  <tr key={tax.code} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 600 }}>{tax.name}</div>
                      <div className="mono" style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{tax.code}</div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className="badge badge--neutral">{tax.type || tax.kind}</span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      {hasRate ? (
                        <span className="badge badge--success mono" style={{ fontSize: '12px' }}>{percentStr}</span>
                      ) : (
                        <span className="badge badge--warning" style={{ fontSize: '11px' }}>Sin tasa vigente</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {tax.recoverableAccountRole ? (
                        <span className="mono badge badge--subtle">{tax.recoverableAccountRole}</span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {tax.payableAccountRole ? (
                        <span className="mono badge badge--subtle">{tax.payableAccountRole}</span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {hasRate ? (
                        <div className="mono" style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          Desde: {tax.effectiveFrom || 'Inicio'}
                          {tax.effectiveTo ? ` | Hasta: ${tax.effectiveTo}` : ' | Indefinido'}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

