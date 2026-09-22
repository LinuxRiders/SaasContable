import React from 'react';
import { Plus, Trash2, Layers, CheckSquare, CornerDownRight } from 'lucide-react';

const DOC_FIELDS = [
  { id: 'issuer.fiscalId', label: 'RUC Emisor', type: 'text', placeholder: 'ej. 20555555551' },
  { id: 'issuer.name', label: 'Razón Social Emisor', type: 'text', placeholder: 'ej. TRANSPORTES ANDINOS' },
  { id: 'receiver.fiscalId', label: 'RUC Receptor', type: 'text', placeholder: 'ej. 20450656934' },
  { id: 'receiver.name', label: 'Razón Social Receptor', type: 'text', placeholder: 'ej. PACHATUSANTREK' },
  { id: 'currency', label: 'Moneda', type: 'enum', options: ['PEN', 'USD'] },
  { id: 'totalCents', label: 'Total Comprobante (Soles)', type: 'amount', placeholder: '0.00' },
  { id: 'issueDate', label: 'Fecha de Emisión', type: 'date' },
  { id: 'operationType', label: 'Tipo de Operación', type: 'enum', options: ['COMPRA', 'VENTA'] }
];

const LINE_FIELDS = [
  { id: 'line.description', label: 'Descripción del Ítem', type: 'text', placeholder: 'ej. FLETE, LUZ, AGUA' },
  { id: 'line.amountCents', label: 'Monto Base Ítem (Soles)', type: 'amount', placeholder: '0.00' },
  { id: 'line.taxCode', label: 'Tipo de Impuesto', type: 'enum', options: ['IGV', 'EXO', 'INA'] }
];

const OPERATORS_BY_TYPE = {
  text: [
    { id: 'contains', label: 'Contiene texto' },
    { id: 'startsWith', label: 'Empieza con' },
    { id: 'equals', label: 'Es exactamente igual a' },
    { id: 'in', label: 'Está en la lista (separada por comas)' }
  ],
  amount: [
    { id: 'equals', label: 'Es igual a (=)' },
    { id: 'gt', label: 'Mayor que (>)' },
    { id: 'gte', label: 'Mayor o igual que (>=)' },
    { id: 'lt', label: 'Menor que (<)' },
    { id: 'lte', label: 'Menor o igual que (<=)' },
    { id: 'between', label: 'Entre rango [mín, máx]' }
  ],
  date: [
    { id: 'equals', label: 'Fecha igual a (=)' },
    { id: 'gt', label: 'Posterior a (>)' },
    { id: 'gte', label: 'Desde / Posterior o igual (>=)' },
    { id: 'lt', label: 'Anterior a (<)' },
    { id: 'lte', label: 'Hasta / Anterior o igual (<=)' },
    { id: 'between', label: 'Entre fechas [desde, hasta]' }
  ],
  enum: [
    { id: 'equals', label: 'Es igual a' },
    { id: 'in', label: 'Es cualquiera de' }
  ]
};

function getFieldMeta(fieldId) {
  return [...DOC_FIELDS, ...LINE_FIELDS].find(f => f.id === fieldId) || {
    id: fieldId,
    label: fieldId,
    type: 'text'
  };
}

export const ConditionBuilder = ({
  condition,
  onChange,
  isLineRule = false,
  readOnly = false,
  depth = 0
}) => {
  if (!condition) {
    condition = {
      op: 'contains',
      field: isLineRule ? 'line.description' : 'issuer.name',
      value: ''
    };
  }

  // Soporte de negación (op: 'not')
  const isNot = condition.op === 'not';
  const effectiveCond = isNot ? (condition.arg || {}) : condition;

  const isGroup = effectiveCond.op === 'and' || effectiveCond.op === 'or';

  const handleToggleNot = (checked) => {
    if (readOnly) return;
    if (checked) {
      onChange({ op: 'not', arg: effectiveCond });
    } else {
      onChange(effectiveCond);
    }
  };

  const handleTypeChange = (newType) => {
    if (readOnly) return;
    let newCond;
    if (newType === 'and' || newType === 'or') {
      newCond = {
        op: newType,
        args: [
          isGroup && effectiveCond.args?.[0] ? effectiveCond.args[0] : { op: 'contains', field: isLineRule ? 'line.description' : 'issuer.name', value: '' },
          isGroup && effectiveCond.args?.[1] ? effectiveCond.args[1] : { op: 'equals', field: 'currency', value: 'PEN' }
        ]
      };
    } else {
      newCond = {
        op: 'contains',
        field: isLineRule ? 'line.description' : 'issuer.name',
        value: ''
      };
    }

    if (isNot) {
      onChange({ op: 'not', arg: newCond });
    } else {
      onChange(newCond);
    }
  };

  const updateEffective = (updated) => {
    if (readOnly) return;
    if (isNot) {
      onChange({ op: 'not', arg: updated });
    } else {
      onChange(updated);
    }
  };

  // 1. Vista de Grupo (AND / OR)
  if (isGroup) {
    const groupOp = effectiveCond.op;
    const args = Array.isArray(effectiveCond.args) ? effectiveCond.args : [];

    const handleArgChange = (idx, newArg) => {
      const newArgs = [...args];
      newArgs[idx] = newArg;
      updateEffective({ ...effectiveCond, args: newArgs });
    };

    const handleAddArg = () => {
      const newArg = {
        op: 'contains',
        field: isLineRule ? 'line.description' : 'issuer.name',
        value: ''
      };
      updateEffective({ ...effectiveCond, args: [...args, newArg] });
    };

    const handleRemoveArg = (idx) => {
      if (args.length <= 2) {
        alert('Un grupo Y/O debe contener al menos 2 condiciones.');
        return;
      }
      const newArgs = args.filter((_, i) => i !== idx);
      updateEffective({ ...effectiveCond, args: newArgs });
    };

    return (
      <div 
        style={{
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          padding: '10px 12px',
          background: depth % 2 === 0 ? 'var(--bg-subtle, #f8fafc)' : 'var(--bg-card, #ffffff)',
          marginBottom: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-color)' }}>
              Tipo de condición:
            </span>
            <select
              className="input-select"
              value={groupOp}
              onChange={(e) => handleTypeChange(e.target.value)}
              disabled={readOnly}
              style={{ fontSize: '12px', padding: '3px 8px', fontWeight: 600 }}
            >
              <option value="and">Grupo Y (Todas las condiciones deben cumplirse)</option>
              <option value="or">Grupo O (Al menos una condición debe cumplirse)</option>
              <option value="simple">Cambiar a Condición Simple</option>
            </select>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: readOnly ? 'default' : 'pointer' }}>
            <input
              type="checkbox"
              checked={isNot}
              onChange={(e) => handleToggleNot(e.target.checked)}
              disabled={readOnly}
            />
            <span style={{ fontWeight: isNot ? 700 : 400, color: isNot ? 'var(--color-danger)' : 'var(--text-muted)' }}>
              Negar grupo (NO)
            </span>
          </label>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '8px', borderLeft: '3px solid var(--primary-color, #2563eb)' }}>
          {args.map((arg, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <div style={{ paddingTop: '6px', color: 'var(--text-muted)' }}>
                <CornerDownRight size={14} />
              </div>
              <div style={{ flex: 1 }}>
                <ConditionBuilder
                  condition={arg}
                  onChange={(newArg) => handleArgChange(idx, newArg)}
                  isLineRule={isLineRule}
                  readOnly={readOnly}
                  depth={depth + 1}
                />
              </div>
              {!readOnly && (
                <button
                  type="button"
                  className="btn btn--icon btn--ghost"
                  onClick={() => handleRemoveArg(idx)}
                  title="Eliminar condición"
                  style={{ color: 'var(--color-danger)', marginTop: '4px' }}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}

          {!readOnly && (
            <div style={{ marginTop: '4px' }}>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={handleAddArg}
                style={{ fontSize: '11px', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={12} />
                Agregar condición al grupo
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. Vista de Condición Simple con dos selectores en cascada
  const currentFieldId = effectiveCond.field || (isLineRule ? 'line.description' : 'issuer.name');
  const isLineField = currentFieldId.startsWith('line.');
  const category = isLineField ? 'line' : 'document';

  const fieldMeta = getFieldMeta(currentFieldId);
  const allowedOps = OPERATORS_BY_TYPE[fieldMeta.type] || OPERATORS_BY_TYPE.text;
  const currentOp = effectiveCond.op || 'contains';

  // Manejo de cambio de categoría (Selector Cascada 1)
  const handleCategoryChange = (newCat) => {
    if (readOnly) return;
    let nextFieldId;
    if (newCat === 'line') {
      nextFieldId = LINE_FIELDS[0].id;
    } else {
      nextFieldId = DOC_FIELDS[0].id;
    }
    const nextMeta = getFieldMeta(nextFieldId);
    const nextOps = OPERATORS_BY_TYPE[nextMeta.type] || OPERATORS_BY_TYPE.text;
    updateEffective({
      ...effectiveCond,
      field: nextFieldId,
      op: nextOps[0].id,
      value: nextMeta.type === 'amount' ? 0 : ''
    });
  };

  // Manejo de cambio de campo (Selector Cascada 2)
  const handleFieldChange = (newFieldId) => {
    if (readOnly) return;
    const nextMeta = getFieldMeta(newFieldId);
    const nextOps = OPERATORS_BY_TYPE[nextMeta.type] || OPERATORS_BY_TYPE.text;
    const opValid = nextOps.some(o => o.id === currentOp);
    const op = opValid ? currentOp : nextOps[0].id;

    let defVal = '';
    if (nextMeta.type === 'amount') defVal = 0;
    if (nextMeta.type === 'enum' && nextMeta.options) defVal = nextMeta.options[0];
    if (op === 'between') defVal = nextMeta.type === 'amount' ? [0, 10000] : ['', ''];

    updateEffective({
      ...effectiveCond,
      field: newFieldId,
      op,
      value: defVal
    });
  };

  // Manejo de cambio de operador
  const handleOpChange = (newOp) => {
    if (readOnly) return;
    let val = effectiveCond.value;
    if (newOp === 'between' && !Array.isArray(val)) {
      val = fieldMeta.type === 'amount' ? [0, 10000] : ['', ''];
    } else if (newOp !== 'between' && Array.isArray(val)) {
      val = val[0] || '';
    }
    updateEffective({
      ...effectiveCond,
      op: newOp,
      value: val
    });
  };

  // Render del control de valor
  const renderValueInput = () => {
    const val = effectiveCond.value !== undefined ? effectiveCond.value : '';

    if (currentOp === 'between') {
      const min = Array.isArray(val) ? val[0] : 0;
      const max = Array.isArray(val) ? val[1] : 0;

      if (fieldMeta.type === 'amount') {
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Mín: S/</span>
            <input
              type="number"
              step="0.01"
              className="input-text"
              value={((min || 0) / 100).toFixed(2)}
              onChange={(e) => {
                const cents = Math.round((parseFloat(e.target.value) || 0) * 100);
                updateEffective({ ...effectiveCond, value: [cents, max] });
              }}
              disabled={readOnly}
              style={{ width: '90px', padding: '4px 6px', fontSize: '12px' }}
            />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Máx: S/</span>
            <input
              type="number"
              step="0.01"
              className="input-text"
              value={((max || 0) / 100).toFixed(2)}
              onChange={(e) => {
                const cents = Math.round((parseFloat(e.target.value) || 0) * 100);
                updateEffective({ ...effectiveCond, value: [min, cents] });
              }}
              disabled={readOnly}
              style={{ width: '90px', padding: '4px 6px', fontSize: '12px' }}
            />
          </div>
        );
      }

      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            type={fieldMeta.type === 'date' ? 'date' : 'text'}
            className="input-text"
            value={min}
            onChange={(e) => updateEffective({ ...effectiveCond, value: [e.target.value, max] })}
            disabled={readOnly}
            style={{ width: '120px', padding: '4px 6px', fontSize: '12px' }}
          />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>a</span>
          <input
            type={fieldMeta.type === 'date' ? 'date' : 'text'}
            className="input-text"
            value={max}
            onChange={(e) => updateEffective({ ...effectiveCond, value: [min, e.target.value] })}
            disabled={readOnly}
            style={{ width: '120px', padding: '4px 6px', fontSize: '12px' }}
          />
        </div>
      );
    }

    if (fieldMeta.type === 'amount') {
      const soles = ((val || 0) / 100).toFixed(2);
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>S/</span>
          <input
            type="number"
            step="0.01"
            className="input-text"
            placeholder={fieldMeta.placeholder}
            value={soles}
            onChange={(e) => {
              const cents = Math.round((parseFloat(e.target.value) || 0) * 100);
              updateEffective({ ...effectiveCond, value: cents });
            }}
            disabled={readOnly}
            style={{ width: '120px', padding: '4px 6px', fontSize: '12px' }}
          />
        </div>
      );
    }

    if (fieldMeta.type === 'date') {
      return (
        <input
          type="date"
          className="input-text"
          value={val}
          onChange={(e) => updateEffective({ ...effectiveCond, value: e.target.value })}
          disabled={readOnly}
          style={{ width: '140px', padding: '4px 6px', fontSize: '12px' }}
        />
      );
    }

    if (fieldMeta.type === 'enum' && currentOp === 'equals') {
      return (
        <select
          className="input-select"
          value={val}
          onChange={(e) => updateEffective({ ...effectiveCond, value: e.target.value })}
          disabled={readOnly}
          style={{ minWidth: '100px', padding: '4px 6px', fontSize: '12px' }}
        >
          {(fieldMeta.options || []).map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    return (
      <input
        type="text"
        className="input-text"
        placeholder={fieldMeta.placeholder || 'Valor a comparar'}
        value={val}
        onChange={(e) => updateEffective({ ...effectiveCond, value: e.target.value })}
        disabled={readOnly}
        style={{ flex: 1, minWidth: '150px', padding: '4px 6px', fontSize: '12px' }}
      />
    );
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', padding: '4px 0' }}>
      {/* Selector Cascada 1: Categoría */}
      {isLineRule && (
        <select
          className="input-select"
          value={category}
          onChange={(e) => handleCategoryChange(e.target.value)}
          disabled={readOnly}
          style={{ width: '130px', padding: '4px 6px', fontSize: '12px', fontWeight: 600, background: 'var(--bg-muted)' }}
          title="Seleccionar ámbito: Comprobante o Línea"
        >
          <option value="line">Línea</option>
          <option value="document">Comprobante</option>
        </select>
      )}

      {/* Selector Cascada 2: Campo */}
      <select
        className="input-select"
        value={currentFieldId}
        onChange={(e) => handleFieldChange(e.target.value)}
        disabled={readOnly}
        style={{ width: '170px', padding: '4px 6px', fontSize: '12px' }}
      >
        {(category === 'line' ? LINE_FIELDS : DOC_FIELDS).map(f => (
          <option key={f.id} value={f.id}>{f.label}</option>
        ))}
      </select>

      {/* Operador */}
      <select
        className="input-select"
        value={currentOp}
        onChange={(e) => handleOpChange(e.target.value)}
        disabled={readOnly}
        style={{ width: '150px', padding: '4px 6px', fontSize: '12px' }}
      >
        {allowedOps.map(op => (
          <option key={op.id} value={op.id}>{op.label}</option>
        ))}
      </select>

      {/* Control de Valor */}
      {renderValueInput()}

      {/* Negar e Interruptor a Grupo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', cursor: readOnly ? 'default' : 'pointer' }} title="Invierte la lógica: se cumple si NO coincide">
          <input
            type="checkbox"
            checked={isNot}
            onChange={(e) => handleToggleNot(e.target.checked)}
            disabled={readOnly}
          />
          <span style={{ color: isNot ? 'var(--color-danger)' : 'var(--text-muted)' }}>NO</span>
        </label>

        {!readOnly && (
          <select
            className="input-select"
            value="simple"
            onChange={(e) => handleTypeChange(e.target.value)}
            style={{ fontSize: '11px', padding: '2px 4px', color: 'var(--text-muted)' }}
            title="Convertir en grupo Y / O"
          >
            <option value="simple">Simple</option>
            <option value="and">+ Grupo Y</option>
            <option value="or">+ Grupo O</option>
          </select>
        )}
      </div>
    </div>
  );
};

export default ConditionBuilder;

