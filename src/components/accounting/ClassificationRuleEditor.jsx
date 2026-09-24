import React, { useState, useMemo } from 'react';
import { ExpressionBuilder } from './ExpressionBuilder.jsx';
import { Save, Code, AlertCircle } from 'lucide-react';

export const ClassificationRuleEditor = ({
  rule = null,
  pack = null,
  onSave = null,
  onCancel = null,
  saving = false
}) => {
  const isEditing = Boolean(rule?.id);

  const [name, setName] = useState(rule?.name || '');
  const [scope, setScope] = useState(rule?.scope || 'DOCUMENT');
  const [priority, setPriority] = useState(rule?.priority ?? 10);
  const [operationTypeCode, setOperationTypeCode] = useState(
    rule?.operationTypeCode || pack?.operationTypes?.[0]?.code || 'MERCHANDISE_PURCHASE'
  );
  const [status, setStatus] = useState(rule?.status || 'ACTIVE');

  const [condition, setCondition] = useState(() => {
    if (rule?.condition) return rule.condition;
    return { const: true };
  });

  const [rawJsonMode, setRawJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState(() => JSON.stringify(rule?.condition || { const: true }, null, 2));
  const [jsonError, setJsonError] = useState(null);

  // Esquema de unión con todos los campos de tipos de comprobante del paquete
  const unionDocType = useMemo(() => {
    const union = { code: 'UNION', headerFields: [], lineFields: [] };
    for (const dt of (pack?.documentTypes || [])) {
      for (const hf of (dt.headerFields || [])) {
        if (!union.headerFields.some(f => f.key === hf.key)) union.headerFields.push(hf);
      }
      for (const lf of (dt.lineFields || [])) {
        if (!union.lineFields.some(f => f.key === lf.key)) union.lineFields.push(lf);
      }
    }
    return union;
  }, [pack]);

  const handleJsonChange = (text) => {
    setJsonText(text);
    try {
      const parsed = JSON.parse(text);
      setCondition(parsed);
      setJsonError(null);
    } catch (err) {
      setJsonError('JSON sintácticamente inválido');
    }
  };

  const handleBuilderChange = (newNode) => {
    setCondition(newNode);
    setJsonText(JSON.stringify(newNode, null, 2));
    setJsonError(null);
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert('El nombre de la regla es obligatorio.');
      return;
    }

    if (jsonError) {
      alert('Corrija los errores en la expresión JSON antes de guardar.');
      return;
    }

    if (!onSave) return;

    onSave({
      ...(rule || {}),
      name: name.trim(),
      scope,
      priority: Number(priority),
      operationTypeCode,
      status,
      condition
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px'
      }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
            Nombre de la Regla:
          </label>
          <input
            type="text"
            className="input"
            placeholder="Ej. Proveedor de servicios recurrentes"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
            Alcance de Evaluación:
          </label>
          <select
            className="input"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
          >
            <option value="DOCUMENT">DOCUMENTO (cabecera)</option>
            <option value="LINE">LÍNEA (ítem individual)</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
            Prioridad (mayor prioridad gana):
          </label>
          <input
            type="number"
            className="input mono"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          />
        </div>

        <div>
          <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
            Tipo de Operación Resultante:
          </label>
          <select
            className="input mono"
            value={operationTypeCode}
            onChange={(e) => setOperationTypeCode(e.target.value)}
          >
            {(pack?.operationTypes || []).map(op => (
              <option key={op.code} value={op.code}>{op.code}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
            Estado Inicial:
          </label>
          <select
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="ACTIVE">ACTIVA</option>
            <option value="PROPOSED">PROPUESTA (Inactiva)</option>
          </select>
        </div>
      </div>

      {/* Selector de Condición con ExpressionBuilder o JSON */}
      <div style={{
        border: '1px solid var(--border-light, #E2E8F0)',
        borderRadius: 'var(--radius-md, 8px)',
        padding: '14px',
        background: 'var(--bg-subtle, #F8FAFC)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>
              Condición Lógica de Activación (AST booleano)
            </h4>
            <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748B)' }}>
              Debe evaluar a VERDADERO (`BOOL`) para que la regla sea aplicada al {scope === 'LINE' ? 'ítem de línea' : 'documento'}.
            </div>
          </div>

          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() => setRawJsonMode(!rawJsonMode)}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
          >
            <Code size={13} />
            <span>{rawJsonMode ? 'Usar Constructor Visual' : 'Modo JSON Directo'}</span>
          </button>
        </div>

        {rawJsonMode ? (
          <div>
            <textarea
              className="input mono"
              rows={8}
              value={jsonText}
              onChange={(e) => handleJsonChange(e.target.value)}
              style={{ width: '100%', fontSize: '11px' }}
            />
            {jsonError && (
              <div style={{ color: 'var(--color-danger, #DC2626)', fontSize: '11px', marginTop: '4px' }}>
                {jsonError}
              </div>
            )}
          </div>
        ) : (
          <ExpressionBuilder
            value={condition}
            onChange={handleBuilderChange}
            expectedType="BOOL"
            documentType={unionDocType}
            lineContext={scope === 'LINE'}
          />
        )}
      </div>

      {/* Botones de acción */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={onCancel}
          disabled={saving}
        >
          Cancelar
        </button>

        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={handleSave}
          disabled={saving || Boolean(jsonError)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Save size={14} />
          <span>{saving ? 'Guardando regla...' : (isEditing ? 'Guardar cambios' : 'Crear regla')}</span>
        </button>
      </div>
    </div>
  );
};

