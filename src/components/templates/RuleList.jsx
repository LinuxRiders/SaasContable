import React, { useState } from 'react';
import { ConditionBuilder } from './ConditionBuilder.jsx';
import { ActionEditor } from './ActionEditor.jsx';
import { 
  Plus, 
  Trash2, 
  Copy, 
  ArrowUp, 
  ArrowDown, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle, 
  SlidersHorizontal,
  FileText,
  ListOrdered
} from 'lucide-react';

export const RuleList = ({
  documentRules = [],
  lineRules = [],
  onChange,
  readOnly = false,
  accounts = [],
  errors = []
}) => {
  const [activeTab, setActiveTab] = useState('line'); // 'line' | 'document'
  const [expandedRuleIds, setExpandedRuleIds] = useState(new Set());

  const currentRules = activeTab === 'line' ? lineRules : documentRules;
  const isLineRule = activeTab === 'line';

  const toggleExpand = (ruleId) => {
    const next = new Set(expandedRuleIds);
    if (next.has(ruleId)) {
      next.delete(ruleId);
    } else {
      next.add(ruleId);
    }
    setExpandedRuleIds(next);
  };

  const handleUpdateRules = (updatedRules) => {
    if (readOnly) return;
    if (activeTab === 'line') {
      onChange(documentRules, updatedRules);
    } else {
      onChange(updatedRules, lineRules);
    }
  };

  const handleAddRule = () => {
    if (readOnly) return;
    const maxPriority = currentRules.reduce((max, r) => Math.max(max, r.priority || 0), 0);
    const newId = `R-${activeTab === 'line' ? 'LINE' : 'DOC'}-${Date.now().toString().slice(-4)}`;
    const newRule = {
      ruleId: newId,
      name: `Nueva regla ${currentRules.length + 1}`,
      priority: maxPriority + 1,
      when: {
        op: 'contains',
        field: isLineRule ? 'line.description' : 'issuer.name',
        value: ''
      },
      then: isLineRule 
        ? { baseAccount: accounts[0]?.codigo || '6011101', costCenter: '' }
        : { taxAccount: accounts.find(a => a.codigo === '4011101')?.codigo || '4011101' }
    };

    const nextRules = [...currentRules, newRule];
    handleUpdateRules(nextRules);

    const nextExpanded = new Set(expandedRuleIds);
    nextExpanded.add(newId);
    setExpandedRuleIds(nextExpanded);
  };

  const handleDuplicateRule = (rule, idx) => {
    if (readOnly) return;
    const maxPriority = currentRules.reduce((max, r) => Math.max(max, r.priority || 0), 0);
    const newId = `R-${activeTab === 'line' ? 'LINE' : 'DOC'}-${Date.now().toString().slice(-4)}`;
    const duplicated = JSON.parse(JSON.stringify(rule));
    duplicated.ruleId = newId;
    duplicated.name = `${rule.name} (Copia)`;
    duplicated.priority = maxPriority + 1;

    const nextRules = [...currentRules];
    nextRules.splice(idx + 1, 0, duplicated);
    handleUpdateRules(nextRules);

    const nextExpanded = new Set(expandedRuleIds);
    nextExpanded.add(newId);
    setExpandedRuleIds(nextExpanded);
  };

  const handleDeleteRule = (idx) => {
    if (readOnly) return;
    const nextRules = currentRules.filter((_, i) => i !== idx);
    handleUpdateRules(nextRules);
  };

  const handleMovePriority = (idx, direction) => {
    if (readOnly) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= currentRules.length) return;

    const nextRules = [...currentRules];
    const tempPrio = nextRules[idx].priority;
    nextRules[idx].priority = nextRules[targetIdx].priority;
    nextRules[targetIdx].priority = tempPrio;

    // Intercambiar orden en el array
    const temp = nextRules[idx];
    nextRules[idx] = nextRules[targetIdx];
    nextRules[targetIdx] = temp;

    handleUpdateRules(nextRules);
  };

  const handleRuleFieldChange = (idx, field, val) => {
    if (readOnly) return;
    const nextRules = [...currentRules];
    nextRules[idx] = {
      ...nextRules[idx],
      [field]: val
    };
    handleUpdateRules(nextRules);
  };

  // Filtrar errores de esta regla
  const getRuleErrors = (idx) => {
    const prefix = `${activeTab}Rules[${idx}]`;
    return errors.filter(e => e.path && e.path.startsWith(prefix));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Selector de tipo de reglas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className={`btn ${activeTab === 'line' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setActiveTab('line')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <ListOrdered size={15} />
            Reglas de Línea ({lineRules.length})
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'document' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setActiveTab('document')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <FileText size={15} />
            Reglas de Comprobante ({documentRules.length})
          </button>
        </div>

        {!readOnly && (
          <button
            type="button"
            className="btn btn--secondary"
            onClick={handleAddRule}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
          >
            <Plus size={14} />
            Agregar Regla
          </button>
        )}
      </div>

      {/* Lista de Reglas */}
      {currentRules.length === 0 ? (
        <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '6px' }}>
          <SlidersHorizontal size={32} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.6 }} />
          <h4 style={{ margin: '0 0 4px', color: 'var(--text-color)' }}>
            No hay reglas de {activeTab === 'line' ? 'línea' : 'comprobante'} definidas
          </h4>
          <p style={{ margin: 0, fontSize: '12px' }}>
            Las líneas se imputarán utilizando las cuentas y centros de costo por defecto de la plantilla.
          </p>
          {!readOnly && (
            <button
              type="button"
              className="btn btn--secondary"
              onClick={handleAddRule}
              style={{ marginTop: '12px', fontSize: '12px' }}
            >
              Crear primera regla
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {currentRules.map((rule, idx) => {
            const isExpanded = expandedRuleIds.has(rule.ruleId) || currentRules.length === 1;
            const ruleErrors = getRuleErrors(idx);
            const hasError = ruleErrors.length > 0;

            return (
              <div 
                key={rule.ruleId || idx}
                style={{
                  border: `1px solid ${hasError ? 'var(--color-danger)' : 'var(--border-color)'}`,
                  borderRadius: '6px',
                  background: 'var(--bg-card, #ffffff)',
                  overflow: 'hidden'
                }}
              >
                {/* Cabecera de la regla */}
                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: hasError ? 'var(--color-danger-light, #fee2e2)' : 'var(--bg-subtle, #f8fafc)',
                    borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    <button
                      type="button"
                      className="btn btn--icon btn--ghost"
                      onClick={() => toggleExpand(rule.ruleId)}
                      style={{ padding: '2px', color: 'var(--text-muted)' }}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    <span 
                      className="mono" 
                      style={{ 
                        fontSize: '11px', 
                        fontWeight: 700, 
                        background: 'var(--bg-muted)', 
                        padding: '2px 6px', 
                        borderRadius: '4px' 
                      }}
                      title="Prioridad de evaluación: menor número se evalúa primero"
                    >
                      Prio #{rule.priority}
                    </span>

                    <input
                      type="text"
                      className="input-text"
                      value={rule.name || ''}
                      onChange={(e) => handleRuleFieldChange(idx, 'name', e.target.value)}
                      disabled={readOnly}
                      placeholder="Nombre descriptivo de la regla"
                      style={{ flex: 1, maxWidth: '320px', fontSize: '13px', fontWeight: 600, padding: '3px 8px' }}
                    />

                    {hasError && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-danger)', fontSize: '11px', fontWeight: 600 }}>
                        <AlertCircle size={13} />
                        {ruleErrors.length} error(es)
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {!readOnly && (
                      <>
                        <button
                          type="button"
                          className="btn btn--icon btn--ghost"
                          onClick={() => handleMovePriority(idx, 'up')}
                          disabled={idx === 0}
                          title="Subir prioridad (evaluar antes)"
                          style={{ padding: '3px 6px' }}
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn btn--icon btn--ghost"
                          onClick={() => handleMovePriority(idx, 'down')}
                          disabled={idx === currentRules.length - 1}
                          title="Bajar prioridad (evaluar después)"
                          style={{ padding: '3px 6px' }}
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn btn--icon btn--ghost"
                          onClick={() => handleDuplicateRule(rule, idx)}
                          title="Duplicar regla"
                          style={{ padding: '3px 6px' }}
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn btn--icon btn--ghost"
                          onClick={() => handleDeleteRule(idx)}
                          title="Eliminar regla"
                          style={{ color: 'var(--color-danger)', padding: '3px 6px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Contenido expandible de la regla */}
                {isExpanded && (
                  <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Errores específicos */}
                    {hasError && (
                      <div className="callout callout--danger" style={{ padding: '8px 12px', margin: 0, fontSize: '12px' }}>
                        <ul style={{ margin: 0, paddingLeft: '16px' }}>
                          {ruleErrors.map((err, eIdx) => (
                            <li key={eIdx}><strong>{err.path}:</strong> {err.message}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Sección 1: Condiciones (CUÁNDO APLICA) */}
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                        1. Condición (SI SE CUMPLE):
                      </div>
                      <ConditionBuilder
                        condition={rule.when}
                        onChange={(newWhen) => handleRuleFieldChange(idx, 'when', newWhen)}
                        isLineRule={isLineRule}
                        readOnly={readOnly}
                      />
                    </div>

                    {/* Sección 2: Acción (QUÉ HACER) */}
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                        2. Acción Contable (ENTONCES ASIGNAR):
                      </div>
                      <ActionEditor
                        action={rule.then}
                        onChange={(newThen) => handleRuleFieldChange(idx, 'then', newThen)}
                        isLineRule={isLineRule}
                        readOnly={readOnly}
                        accounts={accounts}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RuleList;

