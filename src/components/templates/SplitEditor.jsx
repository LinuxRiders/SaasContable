import React from 'react';
import { Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';

export const SplitEditor = ({
  split = [],
  onChange,
  readOnly = false,
  accounts = []
}) => {
  const parts = Array.isArray(split) ? split : [];

  const totalPoints = parts.reduce((sum, p) => sum + (Number(p.basisPoints) || 0), 0);
  const totalPercent = (totalPoints / 100).toFixed(2);
  const isValidSum = totalPoints === 10000;

  const handlePartChange = (idx, field, val) => {
    if (readOnly) return;
    const newParts = [...parts];
    newParts[idx] = {
      ...newParts[idx],
      [field]: val
    };
    onChange(newParts);
  };

  const handleAddPart = () => {
    if (readOnly) return;
    const remainingPoints = Math.max(0, 10000 - totalPoints);
    const newPart = {
      account: accounts.length > 0 ? accounts[0].codigo : '6011101',
      costCenter: '',
      basisPoints: remainingPoints > 0 ? remainingPoints : 1000
    };
    onChange([...parts, newPart]);
  };

  const handleRemovePart = (idx) => {
    if (readOnly) return;
    if (parts.length <= 2) {
      alert('Un prorrateo requiere al menos 2 partes contables.');
      return;
    }
    const newParts = parts.filter((_, i) => i !== idx);
    onChange(newParts);
  };

  return (
    <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px', background: 'var(--bg-subtle, #f8fafc)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <strong style={{ fontSize: '13px' }}>Prorrateo de Línea (Split)</strong>
          <span 
            className={`badge badge--${isValidSum ? 'success' : 'danger'}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
          >
            {isValidSum ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
            Total: {totalPercent}% / 100% ({totalPoints} / 10,000 pts)
          </span>
        </div>

        {!readOnly && (
          <button
            type="button"
            className="btn btn--secondary"
            onClick={handleAddPart}
            style={{ fontSize: '11px', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <Plus size={12} />
            Agregar Parte
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {parts.map((part, idx) => {
          const percent = ((Number(part.basisPoints) || 0) / 100).toFixed(2);

          return (
            <div 
              key={idx} 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 140px 110px auto', 
                gap: '8px', 
                alignItems: 'center',
                background: 'var(--bg-card, #ffffff)',
                padding: '6px 10px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)'
              }}
            >
              {/* Cuenta Contable */}
              <div>
                <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>Cuenta Destino:</label>
                <select
                  className="input-select"
                  value={part.account}
                  onChange={(e) => handlePartChange(idx, 'account', e.target.value)}
                  disabled={readOnly}
                  style={{ width: '100%', fontSize: '12px', padding: '4px 6px' }}
                >
                  {accounts.map(acc => (
                    <option key={acc.codigo} value={acc.codigo}>
                      {acc.codigo} - {acc.descripcion}
                    </option>
                  ))}
                </select>
              </div>

              {/* Centro de Costo */}
              <div>
                <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>Centro de Costo:</label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="ej. CC-ADMIN"
                  value={part.costCenter || ''}
                  onChange={(e) => handlePartChange(idx, 'costCenter', e.target.value)}
                  disabled={readOnly}
                  style={{ width: '100%', fontSize: '12px', padding: '4px 6px' }}
                />
              </div>

              {/* Porcentaje / Puntos Básicos */}
              <div>
                <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>Porcentaje (%):</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="100"
                    className="input-text"
                    value={percent}
                    onChange={(e) => {
                      const p = parseFloat(e.target.value) || 0;
                      const bps = Math.round(p * 100);
                      handlePartChange(idx, 'basisPoints', bps);
                    }}
                    disabled={readOnly}
                    style={{ width: '70px', fontSize: '12px', padding: '4px 6px' }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>%</span>
                </div>
              </div>

              {/* Eliminar */}
              {!readOnly && (
                <div style={{ paddingTop: '14px' }}>
                  <button
                    type="button"
                    className="btn btn--icon btn--ghost"
                    onClick={() => handleRemovePart(idx)}
                    title="Eliminar parte"
                    style={{ color: 'var(--color-danger)' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!isValidSum && (
        <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--color-danger-dark)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <AlertCircle size={13} />
          <span>La suma de los porcentajes debe ser exactamente 100.00% (actualmente {totalPercent}%).</span>
        </div>
      )}
    </div>
  );
};

export default SplitEditor;

