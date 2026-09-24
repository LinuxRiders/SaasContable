import React from 'react';
import { AccountRefEditor } from './AccountRefEditor.jsx';
import { ExpressionBuilder } from './ExpressionBuilder.jsx';
import { ArrowUp, ArrowDown, Trash2, Scale } from 'lucide-react';

export const TemplateLineEditor = ({
  line,
  index,
  totalLines,
  onChange,
  onMoveUp,
  onMoveDown,
  onDelete,
  pack,
  scope = 'TENANT',
  chart = [],
  documentType,
  readOnly = false
}) => {
  const isLineContext = !!line.forEachDocumentLine;

  const handleUpdate = (field, val) => {
    if (readOnly) return;
    onChange({ ...line, [field]: val });
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      padding: '12px',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      position: 'relative'
    }}>
      {/* Cabecera de la línea: Lado, ID y Controles de orden */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="mono" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)' }}>
            #{index + 1}
          </span>

          <select
            className="input mono"
            disabled={readOnly}
            value={line.side}
            onChange={(e) => handleUpdate('side', e.target.value)}
            style={{
              fontWeight: 700,
              fontSize: '12px',
              padding: '2px 8px',
              color: line.side === 'DEBIT' ? 'var(--color-primary)' : 'var(--color-success)',
              borderColor: line.side === 'DEBIT' ? 'var(--color-primary)' : 'var(--color-success)'
            }}
          >
            <option value="DEBIT">DEBE (DEBIT)</option>
            <option value="CREDIT">HABER (CREDIT)</option>
          </select>

          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', cursor: readOnly ? 'default' : 'pointer' }}>
            <input
              type="checkbox"
              disabled={readOnly}
              checked={!!line.forEachDocumentLine}
              onChange={(e) => handleUpdate('forEachDocumentLine', e.target.checked)}
            />
            <span>Por cada línea del documento</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', cursor: readOnly ? 'default' : 'pointer', marginLeft: '6px' }}>
            <input
              type="checkbox"
              disabled={readOnly}
              checked={!!line.balancingLine}
              onChange={(e) => handleUpdate('balancingLine', e.target.checked)}
            />
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Scale size={12} color="var(--color-warning, #D97706)" />
              <span>Línea de cuadre</span>
            </span>
          </label>
        </div>

        {/* Botones de orden y eliminación */}
        {!readOnly && (
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              disabled={index === 0}
              onClick={onMoveUp}
              style={{ padding: '2px 6px' }}
              title="Mover arriba"
            >
              <ArrowUp size={12} />
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              disabled={index === totalLines - 1}
              onClick={onMoveDown}
              style={{ padding: '2px 6px' }}
              title="Mover abajo"
            >
              <ArrowDown size={12} />
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              disabled={totalLines <= 2}
              onClick={onDelete}
              style={{ padding: '2px 6px', color: 'var(--color-danger, #DC2626)' }}
              title="Eliminar línea"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Editor de Cuenta / Referencia */}
      <div>
        <span style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
          Cuenta Contable:
        </span>
        <AccountRefEditor
          value={line.accountRef}
          onChange={(ref) => handleUpdate('accountRef', ref)}
          pack={pack}
          scope={scope}
          chart={chart}
          documentType={documentType}
          lineContext={isLineContext}
          readOnly={readOnly}
        />
      </div>

      {/* Editor de Importe y Condición */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
            Importe (Expresión MONEY):
          </span>
          <ExpressionBuilder
            value={line.amount}
            onChange={(expr) => handleUpdate('amount', expr)}
            expectedType="MONEY"
            documentType={documentType}
            lineContext={isLineContext}
            readOnly={readOnly}
          />
        </div>

        <div>
          <span style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
            Emitir Cuando (Condición BOOL opcional):
          </span>
          <ExpressionBuilder
            value={line.emitWhen}
            onChange={(expr) => handleUpdate('emitWhen', expr)}
            expectedType="BOOL"
            documentType={documentType}
            lineContext={isLineContext}
            readOnly={readOnly}
          />
        </div>
      </div>
    </div>
  );
};

