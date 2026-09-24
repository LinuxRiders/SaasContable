import React, { useState, useMemo } from 'react';
import { validateExpression } from '../../domain/accounting/expressions/validate.js';
import { Code, AlertCircle, Check } from 'lucide-react';

export const ExpressionBuilder = ({
  value,
  onChange,
  expectedType = 'MONEY',
  documentType,
  lineContext = false,
  readOnly = false
}) => {
  const [showJson, setShowJson] = useState(false);

  // Validación en tiempo real
  const validation = useMemo(() => {
    if (!value) {
      return { ok: false, errors: [{ reason: 'Expresión requerida' }] };
    }
    return validateExpression(value, { expectedType, documentType, lineContext });
  }, [value, expectedType, documentType, lineContext]);

  // Identificar el tipo de nodo actual
  const nodeType = useMemo(() => {
    if (!value) return 'EMPTY';
    if (typeof value === 'object') {
      if ('field' in value) return 'FIELD';
      if ('line' in value) return 'LINE';
      if ('const' in value) return 'CONST';
      if ('fn' in value) {
        if (['taxAmount', 'taxBase', 'taxRate', 'hasTax'].includes(value.fn)) return 'TAX';
        if (['withholdingAmount', 'withholdingBase', 'hasWithholding'].includes(value.fn)) return 'WITHHOLDING';
        return 'FN';
      }
    }
    return 'CONST';
  }, [value]);

  // Opciones de campos de cabecera compatibles
  const headerFieldOptions = useMemo(() => {
    const list = [];
    if (expectedType === 'MONEY') {
      list.push({ key: 'totals.netMinor', label: 'Neto / Base Imponible (totals.netMinor)' });
      list.push({ key: 'totals.taxMinor', label: 'Total Impuestos (totals.taxMinor)' });
      list.push({ key: 'totals.withheldMinor', label: 'Total Retenido (totals.withheldMinor)' });
      list.push({ key: 'totals.totalMinor', label: 'Total Comprobante (totals.totalMinor)' });
      list.push({ key: 'totals.payableMinor', label: 'Total a Pagar (totals.payableMinor)' });
    }
    if (expectedType === 'STRING') {
      list.push({ key: 'series', label: 'Serie (series)' });
      list.push({ key: 'number', label: 'Número (number)' });
      list.push({ key: 'currency', label: 'Moneda (currency)' });
    }
    if (documentType?.headerFields) {
      for (const h of documentType.headerFields) {
        list.push({ key: `fields.${h.key}`, label: `${h.label} (fields.${h.key}) [${h.type}]` });
      }
    }
    return list;
  }, [expectedType, documentType]);

  // Opciones de campos de línea compatibles
  const lineFieldOptions = useMemo(() => {
    const list = [];
    if (expectedType === 'MONEY') {
      list.push({ key: 'amountMinor', label: 'Importe de línea (line.amountMinor)' });
      list.push({ key: 'unitPriceMinor', label: 'Precio unitario (line.unitPriceMinor)' });
    }
    if (expectedType === 'STRING') {
      list.push({ key: 'description', label: 'Descripción (line.description)' });
      list.push({ key: 'itemCode', label: 'Código de ítem (line.itemCode)' });
      list.push({ key: 'operationTypeCode', label: 'Tipo de operación de línea (line.operationTypeCode)' });
    }
    if (documentType?.lineFields) {
      for (const f of documentType.lineFields) {
        list.push({ key: `fields.${f.key}`, label: `${f.label} (line.fields.${f.key}) [${f.type}]` });
      }
    }
    return list;
  }, [expectedType, documentType]);

  const handleModeChange = (newMode) => {
    if (readOnly) return;
    if (newMode === 'FIELD') {
      const defaultField = headerFieldOptions[0]?.key || 'totals.netMinor';
      onChange({ field: defaultField });
    } else if (newMode === 'LINE') {
      const defaultLine = lineFieldOptions[0]?.key || 'amountMinor';
      onChange({ line: defaultLine });
    } else if (newMode === 'TAX') {
      const taxCode = documentType?.allowedTaxCodes?.[0] || 'VAT';
      if (expectedType === 'BOOL') {
        onChange({ fn: 'hasTax', args: [taxCode] });
      } else {
        onChange({ fn: 'taxAmount', args: [taxCode] });
      }
    } else if (newMode === 'WITHHOLDING') {
      const whCode = documentType?.allowedWithholdingCodes?.[0] || 'INCOME_TAX_FEES';
      if (expectedType === 'BOOL') {
        onChange({ fn: 'hasWithholding', args: [whCode] });
      } else {
        onChange({ fn: 'withholdingAmount', args: [whCode] });
      }
    } else if (newMode === 'CONST') {
      if (expectedType === 'BOOL') onChange({ const: true });
      else if (expectedType === 'MONEY' || expectedType === 'INT') onChange({ const: 0 });
      else onChange({ const: '' });
    } else if (newMode === 'FN') {
      if (expectedType === 'BOOL') {
        onChange({ fn: 'eq', args: [{ line: 'operationTypeCode' }, 'MERCHANDISE_PURCHASE'] });
      } else if (expectedType === 'STRING') {
        onChange({ fn: 'concat', args: ['Glosa: ', { field: 'number' }] });
      } else {
        onChange({ fn: 'add', args: [{ field: 'totals.netMinor' }, { field: 'totals.taxMinor' }] });
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {/* Selector de modo / tipo de nodo */}
        {!readOnly && (
          <select
            className="input"
            value={nodeType}
            onChange={(e) => handleModeChange(e.target.value)}
            style={{ fontSize: '11px', padding: '4px 8px', maxWidth: '140px' }}
          >
            <option value="FIELD">Campo Comprobante</option>
            {lineContext && <option value="LINE">Campo de Línea</option>}
            <option value="TAX">Impuesto (Tributo)</option>
            <option value="WITHHOLDING">Retención</option>
            <option value="FN">Función / Cálculo</option>
            <option value="CONST">Constante / Fijo</option>
          </select>
        )}

        {/* Editor específico según modo */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
          {nodeType === 'FIELD' && (
            <select
              className="input mono"
              disabled={readOnly}
              value={value?.field || ''}
              onChange={(e) => onChange({ field: e.target.value })}
              style={{ fontSize: '11px', padding: '4px 8px', width: '100%' }}
            >
              {headerFieldOptions.map(opt => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
          )}

          {nodeType === 'LINE' && (
            <select
              className="input mono"
              disabled={readOnly}
              value={value?.line || ''}
              onChange={(e) => onChange({ line: e.target.value })}
              style={{ fontSize: '11px', padding: '4px 8px', width: '100%' }}
            >
              {lineFieldOptions.map(opt => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
          )}

          {nodeType === 'TAX' && (
            <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
              <span className="mono" style={{ fontSize: '11px', padding: '4px 6px', background: 'var(--color-surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
                {value?.fn || 'taxAmount'}
              </span>
              <select
                className="input mono"
                disabled={readOnly}
                value={value?.args?.[0] || 'VAT'}
                onChange={(e) => onChange({ fn: value?.fn || 'taxAmount', args: [e.target.value] })}
                style={{ fontSize: '11px', padding: '4px 8px', flex: 1 }}
              >
                {(documentType?.allowedTaxCodes || ['VAT']).map(code => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </div>
          )}

          {nodeType === 'WITHHOLDING' && (
            <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
              <span className="mono" style={{ fontSize: '11px', padding: '4px 6px', background: 'var(--color-surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
                {value?.fn || 'withholdingAmount'}
              </span>
              <select
                className="input mono"
                disabled={readOnly}
                value={value?.args?.[0] || 'INCOME_TAX_FEES'}
                onChange={(e) => onChange({ fn: value?.fn || 'withholdingAmount', args: [e.target.value] })}
                style={{ fontSize: '11px', padding: '4px 8px', flex: 1 }}
              >
                {(documentType?.allowedWithholdingCodes || ['INCOME_TAX_FEES']).map(code => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </div>
          )}

          {nodeType === 'CONST' && (
            <input
              type={expectedType === 'BOOL' ? 'checkbox' : expectedType === 'MONEY' || expectedType === 'INT' ? 'number' : 'text'}
              disabled={readOnly}
              className="input mono"
              value={value && typeof value === 'object' && 'const' in value ? value.const : value ?? ''}
              checked={value && typeof value === 'object' && 'const' in value ? !!value.const : !!value}
              onChange={(e) => {
                const val = expectedType === 'BOOL' ? e.target.checked : expectedType === 'MONEY' || expectedType === 'INT' ? Number(e.target.value) : e.target.value;
                onChange({ const: val });
              }}
              style={{ fontSize: '11px', padding: '4px 8px', width: '100%' }}
            />
          )}

          {nodeType === 'FN' && (
            <div className="mono" style={{ fontSize: '11px', color: 'var(--color-primary)', background: 'var(--color-surface-subtle)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
              {value?.fn}({JSON.stringify(value?.args || [])})
            </div>
          )}
        </div>

        {/* Botón ver JSON */}
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={() => setShowJson(!showJson)}
          style={{ padding: '2px 6px', fontSize: '10px', height: '24px' }}
          title="Ver / ocultar AST JSON"
        >
          <Code size={12} />
        </button>
      </div>

      {/* Alerta de validación si hay error */}
      {!validation.ok && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--color-danger, #DC2626)' }}>
          <AlertCircle size={12} />
          <span>{validation.errors?.map(e => e.reason).join('; ')}</span>
        </div>
      )}

      {/* Visor JSON solo lectura */}
      {showJson && (
        <pre className="mono" style={{ margin: '4px 0 0', padding: '6px', fontSize: '10px', background: '#1E293B', color: '#E2E8F0', borderRadius: 'var(--radius-sm)', overflowX: 'auto' }}>
          {JSON.stringify(value, null, 2)}
        </pre>
      )}
    </div>
  );
};

