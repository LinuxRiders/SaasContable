import React, { useState, useMemo } from 'react';
import { TemplateLineEditor } from './TemplateLineEditor.jsx';
import { TestCasesPanel } from './TestCasesPanel.jsx';
import { ActivationPanel } from './ActivationPanel.jsx';
import { VersionHistory } from './VersionHistory.jsx';
import { validateTemplateVersion } from '../../domain/accounting/templateValidation.js';
import { Save, Copy, Plus, AlertCircle, AlertTriangle, CheckCircle2, Lock, FileCode, CheckSquare, Power, History } from 'lucide-react';

export const TemplateEditor = ({
  template,
  versionNumber = 1,
  pack,
  chart = [],
  tenantMapping = { entries: [] },
  activation = null,
  activations = [],
  usageMap = {},
  onSaveDraft,
  onDuplicate,
  onRunTests = null,
  onActivate = null,
  onDeactivate = null,
  onCreateVersion = null,
  onMarkUsedForDemo = null,
  saving = false,
  canEdit = true
}) => {
  const isPack = template?.scope === 'PACK';
  const isReadOnly = isPack || !canEdit;
  const initialVersion = useMemo(() => {
    if (!template) return null;
    return template.versions?.find(v => v.version === versionNumber) || template.versions?.[0] || template;
  }, [template, versionNumber]);

  const [activeTab, setActiveTab] = useState('rules'); // 'rules' | 'tests' | 'activation' | 'history'

  const [header, setHeader] = useState(() => ({
    code: template?.code || '',
    name: template?.name || '',
    documentTypeCode: initialVersion?.documentTypeCode || pack?.documentTypes?.[0]?.code || 'INVOICE',
    perspective: initialVersion?.perspective || 'RECEIVED',
    operationTypeCode: initialVersion?.operationTypeCode || '',
    priority: initialVersion?.priority || 0,
    legalBookCode: initialVersion?.legalBookCode || '',
    glosa: typeof initialVersion?.glosa === 'string' ? initialVersion.glosa : ''
  }));

  const [lines, setLines] = useState(() => {
    return (initialVersion?.lines || []).map(l => ({ ...l }));
  });

  const [testCases, setTestCases] = useState(() => {
    return (initialVersion?.testCases || []).map(tc => ({ ...tc }));
  });

  const selectedDocType = useMemo(() => {
    return pack?.documentTypes?.find(d => d.code === header.documentTypeCode);
  }, [pack, header.documentTypeCode]);

  const allowedPerspectives = useMemo(() => {
    return selectedDocType?.allowedPerspectives || ['RECEIVED', 'ISSUED', 'INTERNAL'];
  }, [selectedDocType]);

  const allowedOperations = useMemo(() => {
    if (selectedDocType?.operationTypesByPerspective && selectedDocType.operationTypesByPerspective[header.perspective]) {
      return selectedDocType.operationTypesByPerspective[header.perspective];
    }
    return (pack?.operationTypes || [])
      .filter(op => op.allowedPerspectives?.includes(header.perspective))
      .map(op => op.code);
  }, [selectedDocType, pack, header.perspective]);

  // Validación en tiempo real del borrador
  const validation = useMemo(() => {
    const draftVersion = {
      ...header,
      lines,
      testCases
    };
    return validateTemplateVersion(draftVersion, { pack, scope: template?.scope || 'TENANT' });
  }, [header, lines, testCases, pack, template]);

  const handleHeaderChange = (field, value) => {
    if (isPack) return;
    setHeader(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'documentTypeCode') {
        const dt = pack?.documentTypes?.find(d => d.code === value);
        if (dt && dt.allowedPerspectives && !dt.allowedPerspectives.includes(next.perspective)) {
          next.perspective = dt.allowedPerspectives[0];
        }
      }
      return next;
    });
  };

  const handleAddLine = (side = 'DEBIT') => {
    if (isPack) return;
    const newLine = {
      id: `l_${Date.now()}`,
      side,
      accountRef: { kind: 'ROLE', roleCode: pack?.accountRoles?.[0]?.code || 'PURCHASES_MERCHANDISE' },
      amount: { field: 'totals.netMinor' },
      balancingLine: false,
      forEachDocumentLine: false
    };
    setLines([...lines, newLine]);
  };

  const handleUpdateLine = (index, updatedLine) => {
    if (isPack) return;
    const copy = [...lines];
    copy[index] = updatedLine;
    setLines(copy);
  };

  const handleMoveUp = (index) => {
    if (isPack || index === 0) return;
    const copy = [...lines];
    const temp = copy[index];
    copy[index] = copy[index - 1];
    copy[index - 1] = temp;
    setLines(copy);
  };

  const handleMoveDown = (index) => {
    if (isPack || index === lines.length - 1) return;
    const copy = [...lines];
    const temp = copy[index];
    copy[index] = copy[index + 1];
    copy[index + 1] = temp;
    setLines(copy);
  };

  const handleDeleteLine = (index) => {
    if (isPack || lines.length <= 2) return;
    const copy = lines.filter((_, i) => i !== index);
    setLines(copy);
  };

  const handleSave = () => {
    if (isPack || !onSaveDraft) return;
    onSaveDraft({
      ...header,
      lines,
      testCases
    });
  };

  // Versión actual con líneas y casos editados para pasar a los paneles
  const currentVersionObj = useMemo(() => ({
    ...(initialVersion || {}),
    ...header,
    lines,
    testCases
  }), [initialVersion, header, lines, testCases]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md, 16px)' }}>
      {/* Barra superior de pestañas y acciones */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--border-light, #E2E8F0)',
        paddingBottom: '10px'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className={`btn btn--sm ${activeTab === 'rules' ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setActiveTab('rules')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FileCode size={14} />
            <span>Reglas Contables ({lines.length})</span>
          </button>

          <button
            type="button"
            className={`btn btn--sm ${activeTab === 'tests' ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setActiveTab('tests')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <CheckSquare size={14} />
            <span>Casos de Prueba ({testCases.length})</span>
          </button>

          <button
            type="button"
            className={`btn btn--sm ${activeTab === 'activation' ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setActiveTab('activation')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Power size={14} />
            <span>Activación Empresa</span>
          </button>

          <button
            type="button"
            className={`btn btn--sm ${activeTab === 'history' ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setActiveTab('history')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <History size={14} />
            <span>Versiones ({template?.versions?.length || 1})</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {canEdit && (
            isPack ? (
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => onDuplicate && onDuplicate(template.id, versionNumber)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Copy size={14} />
                <span>Duplicar como plantilla de empresa</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={handleSave}
                disabled={saving || !validation.ok}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Save size={14} />
                <span>{saving ? 'Guardando...' : 'Guardar borrador'}</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Aviso si es plantilla PACK */}
      {isPack && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 14px',
          background: 'var(--bg-subtle, #F8FAFC)',
          borderRadius: 'var(--radius-sm, 6px)',
          border: '1px solid var(--border-light, #E2E8F0)',
          fontSize: '12px'
        }}>
          <Lock size={15} color="var(--text-muted, #64748B)" />
          <div>
            <strong>Plantilla Oficial del Paquete Normativo (Solo Lectura):</strong> Las reglas base de la jurisdicción son inmutables (RD-10). Para modificarlas o agregar casos propios, duplíquela como plantilla de la empresa.
          </div>
        </div>
      )}

      {/* Errores y Advertencias de Validación */}
      {validation.errors.length > 0 && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm, 6px)',
          background: 'var(--color-danger-bg, #FEE2E2)',
          border: '1px solid var(--color-danger-border, #FCA5A5)',
          color: 'var(--color-danger-text, #991B1B)',
          fontSize: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, marginBottom: '4px' }}>
            <AlertCircle size={14} />
            <span>Errores que impiden guardar la plantilla:</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {validation.errors.map((err, i) => (
              <li key={i}>[{err.path}] {err.message}</li>
            ))}
          </ul>
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div style={{
          padding: '8px 12px',
          borderRadius: 'var(--radius-sm, 6px)',
          background: 'var(--color-warning-bg, #FEF3C7)',
          border: '1px solid var(--color-warning-border, #FCD34D)',
          color: 'var(--color-warning-text, #92400E)',
          fontSize: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
            <AlertTriangle size={14} />
            <span>Advertencias:</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {validation.warnings.map((w, i) => (
              <li key={i}>[{w.path}] {w.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* PESTAÑA 1: REGLAS CONTABLES */}
      {activeTab === 'rules' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md, 16px)' }}>
          {/* Cabecera de la plantilla */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px',
            padding: '16px',
            background: 'var(--bg-surface, #FFFFFF)',
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px solid var(--border-light, #E2E8F0)'
          }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Código:</label>
              <input
                type="text"
                className="input mono"
                disabled={isReadOnly}
                value={header.code}
                onChange={(e) => handleHeaderChange('code', e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Nombre:</label>
              <input
                type="text"
                className="input"
                disabled={isReadOnly}
                value={header.name}
                onChange={(e) => handleHeaderChange('name', e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Tipo de Comprobante:</label>
              <select
                className="input"
                disabled={isReadOnly}
                value={header.documentTypeCode}
                onChange={(e) => handleHeaderChange('documentTypeCode', e.target.value)}
              >
                {(pack?.documentTypes || []).map(dt => (
                  <option key={dt.code} value={dt.code}>{dt.name} ({dt.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Perspectiva:</label>
              <select
                className="input"
                disabled={isReadOnly}
                value={header.perspective}
                onChange={(e) => handleHeaderChange('perspective', e.target.value)}
              >
                {allowedPerspectives.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Tipo de Operación:</label>
              <select
                className="input mono"
                disabled={isReadOnly}
                value={header.operationTypeCode}
                onChange={(e) => handleHeaderChange('operationTypeCode', e.target.value)}
              >
                {allowedOperations.map(op => (
                  <option key={op} value={op}>{op}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Libro Legal:</label>
              <select
                className="input mono"
                disabled={isReadOnly}
                value={header.legalBookCode}
                onChange={(e) => handleHeaderChange('legalBookCode', e.target.value)}
              >
                {(pack?.legalBooks || []).map(b => (
                  <option key={b.code} value={b.code}>{b.name} ({b.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Prioridad:</label>
              <input
                type="number"
                className="input mono"
                disabled={isReadOnly}
                value={header.priority}
                onChange={(e) => handleHeaderChange('priority', Number(e.target.value))}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Glosa del Asiento:</label>
              <input
                type="text"
                className="input"
                disabled={isReadOnly}
                value={header.glosa}
                onChange={(e) => handleHeaderChange('glosa', e.target.value)}
              />
            </div>
          </div>

          {/* Lista de Líneas de la Plantilla */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '14px' }}>Líneas Contables Declaradas ({lines.length})</h4>

              {!isReadOnly && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => handleAddLine('DEBIT')}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                  >
                    <Plus size={13} />
                    <span>Agregar DEBE</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => handleAddLine('CREDIT')}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                  >
                    <Plus size={13} />
                    <span>Agregar HABER</span>
                  </button>
                </div>
              )}
            </div>

            {lines.map((line, idx) => (
              <TemplateLineEditor
                key={line.id || idx}
                line={line}
                index={idx}
                totalLines={lines.length}
                onChange={(updated) => handleUpdateLine(idx, updated)}
                onMoveUp={() => handleMoveUp(idx)}
                onMoveDown={() => handleMoveDown(idx)}
                onDelete={() => handleDeleteLine(idx)}
                pack={pack}
                scope={template?.scope}
                chart={chart}
                documentType={selectedDocType}
                readOnly={isReadOnly}
              />
            ))}
          </div>
        </div>
      )}

      {/* PESTAÑA 2: CASOS DE PRUEBA */}
      {activeTab === 'tests' && (
        <TestCasesPanel
          template={template}
          version={currentVersionObj}
          pack={pack}
          chart={chart}
          tenantMapping={tenantMapping}
          onRunTests={onRunTests ? () => onRunTests(template.id, versionNumber) : null}
          onUpdateTestCases={setTestCases}
          readOnly={isReadOnly}
        />
      )}

      {/* PESTAÑA 3: ACTIVACIÓN EN EMPRESA */}
      {activeTab === 'activation' && (
        <ActivationPanel
          template={template}
          version={currentVersionObj}
          activation={activation}
          onActivate={onActivate}
          onDeactivate={onDeactivate}
          readOnly={!canEdit}
        />
      )}

      {/* PESTAÑA 4: HISTORIAL DE VERSIONES E INMUTABILIDAD (RD-10) */}
      {activeTab === 'history' && (
        <VersionHistory
          template={template}
          activations={activations}
          usageMap={usageMap}
          onCreateVersion={onCreateVersion}
          onMarkUsedForDemo={onMarkUsedForDemo}
          isPack={isPack}
          canEdit={canEdit}
        />
      )}
    </div>
  );
};
