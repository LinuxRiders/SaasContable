import React from 'react';
import { SplitEditor } from './SplitEditor.jsx';
import { Plus, Trash2, Tag, Layers } from 'lucide-react';

export const ActionEditor = ({
  action = {},
  onChange,
  isLineRule = false,
  readOnly = false,
  accounts = []
}) => {
  const isSplit = isLineRule && Array.isArray(action.split);

  const handleModeChange = (mode) => {
    if (readOnly) return;
    if (mode === 'split') {
      const defaultSplit = [
        { account: accounts[0]?.codigo || '6011101', costCenter: '', basisPoints: 6000 },
        { account: accounts[1]?.codigo || '6011101', costCenter: '', basisPoints: 4000 }
      ];
      onChange({
        split: defaultSplit,
        tags: action.tags
      });
    } else {
      onChange({
        baseAccount: accounts[0]?.codigo || '6011101',
        costCenter: '',
        tags: action.tags
      });
    }
  };

  const handleFieldChange = (field, val) => {
    if (readOnly) return;
    onChange({
      ...action,
      [field]: val === '' ? undefined : val
    });
  };

  // Manejo de Etiquetas Analíticas (tags)
  const tags = action.tags || {};
  const tagEntries = Object.entries(tags);

  const handleTagChange = (oldKey, newKey, val) => {
    if (readOnly) return;
    const nextTags = { ...tags };
    if (oldKey !== newKey) {
      delete nextTags[oldKey];
    }
    if (newKey.trim()) {
      nextTags[newKey.trim()] = val;
    }
    onChange({ ...action, tags: Object.keys(nextTags).length > 0 ? nextTags : undefined });
  };

  const handleAddTag = () => {
    if (readOnly) return;
    const newKey = `tag_${tagEntries.length + 1}`;
    onChange({
      ...action,
      tags: { ...tags, [newKey]: '' }
    });
  };

  const handleRemoveTag = (key) => {
    if (readOnly) return;
    const nextTags = { ...tags };
    delete nextTags[key];
    onChange({ ...action, tags: Object.keys(nextTags).length > 0 ? nextTags : undefined });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* 1. Reglas de Línea */}
      {isLineRule ? (
        <div>
          {/* Selector de Modo: Cuenta Única vs Prorrateo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-color)' }}>
              Efecto en la línea:
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className={`btn btn--sm ${!isSplit ? 'btn--primary' : 'btn--secondary'}`}
                onClick={() => handleModeChange('single')}
                disabled={readOnly}
                style={{ fontSize: '11px', padding: '4px 10px' }}
              >
                Cuenta Contable Única
              </button>
              <button
                type="button"
                className={`btn btn--sm ${isSplit ? 'btn--primary' : 'btn--secondary'}`}
                onClick={() => handleModeChange('split')}
                disabled={readOnly}
                style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Layers size={12} />
                Prorrateo / División (%)
              </button>
            </div>
          </div>

          {isSplit ? (
            <SplitEditor
              split={action.split}
              onChange={(newSplit) => onChange({ ...action, split: newSplit, baseAccount: undefined, costCenter: undefined })}
              readOnly={readOnly}
              accounts={accounts}
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
                  Cuenta Base (Gasto / Costo / Ingreso):
                </label>
                <select
                  className="input-select"
                  value={action.baseAccount || ''}
                  onChange={(e) => handleFieldChange('baseAccount', e.target.value)}
                  disabled={readOnly}
                  style={{ width: '100%', fontSize: '12px', padding: '5px 8px' }}
                >
                  <option value="">-- Usar cuenta por defecto de la plantilla --</option>
                  {accounts.map(acc => (
                    <option key={acc.codigo} value={acc.codigo}>
                      {acc.codigo} - {acc.descripcion}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
                  Centro de Costo Específico:
                </label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="ej. CC-LOGISTICA (opcional)"
                  value={action.costCenter || ''}
                  onChange={(e) => handleFieldChange('costCenter', e.target.value)}
                  disabled={readOnly}
                  style={{ width: '100%', fontSize: '12px', padding: '5px 8px' }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 2. Reglas de Comprobante */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
              Sobrescribir Cuenta IGV:
            </label>
            <select
              className="input-select"
              value={action.taxAccount || ''}
              onChange={(e) => handleFieldChange('taxAccount', e.target.value)}
              disabled={readOnly}
              style={{ width: '100%', fontSize: '12px', padding: '5px 8px' }}
            >
              <option value="">-- Sin cambio (usar plantilla) --</option>
              {accounts.map(acc => (
                <option key={acc.codigo} value={acc.codigo}>
                  {acc.codigo} - {acc.descripcion}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
              Sobrescribir Contrapartida (42 / 12):
            </label>
            <select
              className="input-select"
              value={action.counterpartAccount || ''}
              onChange={(e) => handleFieldChange('counterpartAccount', e.target.value)}
              disabled={readOnly}
              style={{ width: '100%', fontSize: '12px', padding: '5px 8px' }}
            >
              <option value="">-- Sin cambio (usar plantilla) --</option>
              {accounts.map(acc => (
                <option key={acc.codigo} value={acc.codigo}>
                  {acc.codigo} - {acc.descripcion}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
              Centro de Costo por Defecto:
            </label>
            <input
              type="text"
              className="input-text"
              placeholder="ej. CC-ADMIN"
              value={action.defaultCostCenter || ''}
              onChange={(e) => handleFieldChange('defaultCostCenter', e.target.value)}
              disabled={readOnly}
              style={{ width: '100%', fontSize: '12px', padding: '5px 8px' }}
            />
          </div>
        </div>
      )}

      {/* 3. Etiquetas Analíticas Opcionales (Tags) */}
      <div style={{ marginTop: '4px', borderTop: '1px dashed var(--border-color)', paddingTop: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <Tag size={13} />
            <span>Etiquetas Analíticas (Opcional):</span>
          </div>

          {!readOnly && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={handleAddTag}
              style={{ fontSize: '11px', padding: '2px 6px', display: 'flex', alignItems: 'center', gap: '3px' }}
            >
              <Plus size={11} />
              Agregar etiqueta
            </button>
          )}
        </div>

        {tagEntries.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {tagEntries.map(([k, v], idx) => (
              <div 
                key={idx} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px', 
                  background: 'var(--bg-muted, #f1f5f9)', 
                  padding: '2px 6px', 
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)' 
                }}
              >
                <input
                  type="text"
                  placeholder="Clave"
                  value={k}
                  onChange={(e) => handleTagChange(k, e.target.value, v)}
                  disabled={readOnly}
                  style={{ width: '70px', fontSize: '11px', border: 'none', background: 'transparent', outline: 'none' }}
                />
                <span>:</span>
                <input
                  type="text"
                  placeholder="Valor"
                  value={v}
                  onChange={(e) => handleTagChange(k, k, e.target.value)}
                  disabled={readOnly}
                  style={{ width: '90px', fontSize: '11px', border: 'none', background: 'transparent', outline: 'none' }}
                />
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(k)}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-danger)', padding: 0 }}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Sin etiquetas analíticas asignadas.
          </div>
        )}
      </div>
    </div>
  );
};

export default ActionEditor;

