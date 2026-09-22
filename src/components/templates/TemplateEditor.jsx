import React, { useState, useEffect, useCallback } from 'react';
import { RuleList } from './RuleList.jsx';
import { TestCasesPanel } from './TestCasesPanel.jsx';
import { VersionHistory } from './VersionHistory.jsx';
import { 
  getTemplate, 
  saveTemplateDraft, 
  runTemplateTests, 
  activateTemplateVersion, 
  deleteTemplateDraft,
  editTemplate,
  retireTemplate 
} from '../../services/ingestion/index.js';
import * as repository from '../../services/storage/repository.js';
import { mockPlanContable } from '../../data/mockPlanContable.js';
import { 
  Save, 
  Play, 
  CheckCircle2, 
  Trash2, 
  ArrowLeft, 
  AlertTriangle, 
  AlertCircle, 
  Sliders, 
  FileCheck, 
  Layers,
  Lock
} from 'lucide-react';

export const TemplateEditor = ({
  templateId,
  onClose,
  onSaved,
  ctx
}) => {
  const [template, setTemplate] = useState(null);
  const [selectedVersionNum, setSelectedVersionNum] = useState(1);
  const [activeTab, setActiveTab] = useState('rules'); // 'rules' | 'testCases'

  // Estado editable del borrador
  const [draftName, setDraftName] = useState('');
  const [draftDefaults, setDraftDefaults] = useState({
    baseAccount: '6011101',
    taxAccount: '4011101',
    counterpartAccount: '4212101',
    appliesIgv: true,
    requiresCostCenter: false,
    defaultCostCenter: ''
  });
  const [documentRules, setDocumentRules] = useState([]);
  const [lineRules, setLineRules] = useState([]);
  const [testCases, setTestCases] = useState([]);
  const [lastTestRun, setLastTestRun] = useState(null);

  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningTests, setRunningTests] = useState(false);
  const [activating, setActivating] = useState(false);
  const [errorFeedback, setErrorFeedback] = useState(null);
  const [successFeedback, setSuccessFeedback] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [accountErrors, setAccountErrors] = useState([]);

  // Catálogo de cuentas para selectores
  const accounts = mockPlanContable.filter(a => a.esCuentaU === true);

  // Cargar plantilla completa
  const loadTemplateData = useCallback(async () => {
    if (!templateId) return;
    setLoading(true);
    setErrorFeedback(null);

    try {
      const res = await getTemplate(ctx, { templateId });
      if (res.ok) {
        const tpl = res.data;
        setTemplate(tpl);

        // Elegir versión: preferir DRAFT, sino ACTIVE, sino la primera
        const draftV = (tpl.versions || []).find(v => v.status === 'DRAFT');
        const activeV = (tpl.versions || []).find(v => v.status === 'ACTIVE');
        const chosenV = draftV || activeV || tpl.versions?.[0];

        if (chosenV) {
          setSelectedVersionNum(chosenV.version);
          setDraftName(tpl.name || '');
          setDraftDefaults(chosenV.defaults || {});
          setDocumentRules(chosenV.documentRules || []);
          setLineRules(chosenV.lineRules || []);
          setTestCases(chosenV.testCases || []);
          setLastTestRun(chosenV.lastTestRun || null);
        }
      } else {
        setErrorFeedback(res.error?.message || 'Error al cargar la plantilla');
      }
    } catch (err) {
      setErrorFeedback(err.message || 'Error al cargar la plantilla');
    } finally {
      setLoading(false);
    }
  }, [templateId, ctx]);

  useEffect(() => {
    loadTemplateData();
  }, [loadTemplateData]);

  // Cambiar versión seleccionada
  const handleSelectVersion = (versionNum) => {
    setSelectedVersionNum(versionNum);
    const v = (template?.versions || []).find(v => v.version === versionNum);
    if (v) {
      setDraftDefaults(v.defaults || {});
      setDocumentRules(v.documentRules || []);
      setLineRules(v.lineRules || []);
      setTestCases(v.testCases || []);
      setLastTestRun(v.lastTestRun || null);
      setValidationErrors([]);
      setAccountErrors([]);
      setErrorFeedback(null);
      setSuccessFeedback(null);
    }
  };

  const currentVersion = (template?.versions || []).find(v => v.version === selectedVersionNum);
  const isDraft = currentVersion?.status === 'DRAFT';
  const isAdmin = ctx?.role === 'ADMIN';
  const readOnly = !isDraft || !isAdmin;

  // 1. Guardar Borrador
  const handleSaveDraft = async () => {
    if (readOnly) return;
    setSaving(true);
    setErrorFeedback(null);
    setSuccessFeedback(null);
    setValidationErrors([]);
    setAccountErrors([]);

    try {
      const draftPayload = {
        name: draftName,
        defaults: draftDefaults,
        documentRules,
        lineRules,
        testCases
      };

      const res = await saveTemplateDraft(ctx, {
        templateId: template.templateId,
        version: selectedVersionNum,
        draft: draftPayload
      });

      if (res.ok) {
        setSuccessFeedback('Borrador guardado exitosamente.');
        if (res.data.accountErrors?.length > 0) {
          setAccountErrors(res.data.accountErrors);
        }
        await loadTemplateData();
        if (onSaved) onSaved();
      } else {
        setErrorFeedback(res.error?.message || 'Error al guardar el borrador');
        if (Array.isArray(res.error?.details)) {
          setValidationErrors(res.error.details);
        }
      }
    } catch (err) {
      setErrorFeedback(err.message || 'Error inesperado al guardar');
    } finally {
      setSaving(false);
    }
  };

  // 2. Ejecutar Pruebas
  const handleRunTests = async () => {
    setRunningTests(true);
    setErrorFeedback(null);
    setSuccessFeedback(null);

    try {
      // Guardar primero si es borrador
      if (isDraft && !readOnly) {
        await saveTemplateDraft(ctx, {
          templateId: template.templateId,
          version: selectedVersionNum,
          draft: {
            name: draftName,
            defaults: draftDefaults,
            documentRules,
            lineRules,
            testCases
          }
        });
      }

      const res = await runTemplateTests(ctx, {
        templateId: template.templateId,
        version: selectedVersionNum
      });

      if (res.ok) {
        setLastTestRun(res.data);
        if (res.data.allPassed) {
          setSuccessFeedback('Todas las pruebas pasaron con éxito.');
        } else {
          setErrorFeedback('Existen casos que fallaron o reglas sin cobertura.');
        }
        await loadTemplateData();
      } else {
        setErrorFeedback(res.error?.message || 'Error al ejecutar pruebas');
      }
    } catch (err) {
      setErrorFeedback(err.message || 'Error inesperado al ejecutar pruebas');
    } finally {
      setRunningTests(false);
    }
  };

  // 3. Activar Versión
  const handleActivate = async () => {
    if (readOnly) return;
    setActivating(true);
    setErrorFeedback(null);
    setSuccessFeedback(null);

    try {
      const res = await activateTemplateVersion(ctx, {
        templateId: template.templateId,
        version: selectedVersionNum
      });

      if (res.ok) {
        setSuccessFeedback(`Versión ${selectedVersionNum} activada exitosamente.`);
        await loadTemplateData();
        if (onSaved) onSaved();
      } else {
        let msg = res.error?.message || 'No se puede activar la versión.';
        if (res.error?.code === 'TEMPLATE_NOT_READY' && Array.isArray(res.error?.details)) {
          const detailMap = {
            NO_TEST_CASES: 'Debe definir al menos 1 caso de prueba.',
            NO_TEST_RUN: 'Debe ejecutar las pruebas antes de activar.',
            OUTDATED_TEST_RUN: 'Las pruebas están desactualizadas (se modificó el borrador posteriormente).',
            TESTS_FAILED: 'Uno o más casos de prueba fallaron.',
            UNCOVERED_RULES: 'Existen reglas que no son ejercitadas por ningún caso de prueba.',
            ACCOUNT_ERRORS: 'Hay cuentas contables que no existen o no son de uso en el PCGE.'
          };
          const missingTexts = res.error.details.map(d => detailMap[d] || d);
          msg += ` Faltan condiciones: ${missingTexts.join('; ')}`;
        }
        setErrorFeedback(msg);
      }
    } catch (err) {
      setErrorFeedback(err.message || 'Error al activar versión');
    } finally {
      setActivating(false);
    }
  };

  // 4. Eliminar Borrador
  const handleDeleteDraft = async () => {
    if (readOnly) return;
    if (!window.confirm(`¿Está seguro de eliminar el borrador de la versión ${selectedVersionNum}?`)) {
      return;
    }

    try {
      const res = await deleteTemplateDraft(ctx, {
        templateId: template.templateId,
        version: selectedVersionNum
      });

      if (res.ok) {
        if (res.data.templateDeleted) {
          alert('Plantilla eliminada por completo al no tener otras versiones.');
          if (onClose) onClose();
        } else {
          setSuccessFeedback('Borrador eliminado.');
          await loadTemplateData();
        }
        if (onSaved) onSaved();
      } else {
        setErrorFeedback(res.error?.message || 'Error al eliminar borrador');
      }
    } catch (err) {
      setErrorFeedback(err.message || 'Error al eliminar');
    }
  };

  // 5. Crear nueva versión a partir de la activa (CA-22.2)
  const handleEditNewVersion = async () => {
    if (!isAdmin) return;
    try {
      const res = await editTemplate(ctx, { templateId: template.templateId });
      if (res.ok) {
        setSuccessFeedback(`Borrador de versión v${res.data.version.version} listo para edición.`);
        await loadTemplateData();
        handleSelectVersion(res.data.version.version);
        setActiveTab('rules');
        if (onSaved) onSaved();
      } else {
        setErrorFeedback(res.error?.message || 'Error al crear nueva versión');
      }
    } catch (err) {
      setErrorFeedback(err.message || 'Error inesperado al crear nueva versión');
    }
  };

  // 6. Retirar plantilla sin reemplazo (CA-22.5)
  const handleRetireTemplate = async () => {
    if (!isAdmin) return;
    if (!window.confirm(`¿Está seguro de retirar la plantilla '${template.name}'? Dejará de estar disponible para todas las empresas.`)) {
      return;
    }
    try {
      const res = await retireTemplate(ctx, { templateId: template.templateId });
      if (res.ok) {
        setSuccessFeedback('Plantilla retirada exitosamente.');
        await loadTemplateData();
        if (onSaved) onSaved();
      } else {
        setErrorFeedback(res.error?.message || 'Error al retirar plantilla');
      }
    } catch (err) {
      setErrorFeedback(err.message || 'Error al retirar plantilla');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Cargando editor de plantillas...
      </div>
    );
  }

  if (!template) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-danger)' }}>{errorFeedback || 'Plantilla no encontrada'}</p>
        <button className="btn btn--secondary" onClick={onClose}>Volver</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Barra de Navegación / Volver */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={onClose}
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <ArrowLeft size={14} />
            Volver al Banco
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, color: 'var(--text-color)' }}>
                {template.code} — {template.name}
              </h3>
              <span className={`badge badge--${template.operationType === 'COMPRA' ? 'info' : 'success'}`}>
                {template.operationType}
              </span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }} className="mono">
              ID: {template.templateId} | Creado por {template.createdBy}
            </span>
          </div>
        </div>

        {/* Selector de Versión y Estado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600 }}>Versión:</label>
          <select
            className="input-select"
            value={selectedVersionNum}
            onChange={(e) => handleSelectVersion(Number(e.target.value))}
            style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 700 }}
          >
            {(template.versions || []).map(v => (
              <option key={v.version} value={v.version}>
                v{v.version} ({v.status}) {v.version === template.activeVersion ? '★ ACTIVA' : ''}
              </option>
            ))}
          </select>

          <span 
            className={`badge badge--${currentVersion?.status === 'ACTIVE' ? 'success' : currentVersion?.status === 'DRAFT' ? 'warning' : 'neutral'}`}
            style={{ fontSize: '11px', fontWeight: 700 }}
          >
            {currentVersion?.status}
          </span>

          {readOnly && (
            <span className="badge badge--neutral" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
              <Lock size={12} />
              Solo lectura
            </span>
          )}
        </div>
      </div>

      {/* Avisos y Retroalimentación */}
      {errorFeedback && (
        <div className="callout callout--danger" style={{ margin: 0 }}>
          <AlertCircle size={16} />
          <div>{errorFeedback}</div>
        </div>
      )}

      {successFeedback && (
        <div className="callout callout--success" style={{ margin: 0 }}>
          <CheckCircle2 size={16} />
          <div>{successFeedback}</div>
        </div>
      )}

      {accountErrors.length > 0 && (
        <div className="callout callout--warning" style={{ margin: 0 }}>
          <AlertTriangle size={16} />
          <div>
            <strong>Advertencia de catálogo PCGE (CA-19.2):</strong> Algunas cuentas usadas no existen o no son de uso en el plan contable semilla:
            <ul style={{ margin: '4px 0 0', paddingLeft: '16px' }}>
              {accountErrors.map((ae, i) => (
                <li key={i}>Cuenta <strong>{ae.accountCode}</strong>: {ae.problem}</li>
              ))}
            </ul>
            <em>El borrador se guardó, pero no podrá activarse hasta corregir las cuentas.</em>
          </div>
        </div>
      )}

      {/* Tarjeta de Cuentas por Defecto (Defaults) */}
      <div className="card" style={{ padding: '14px' }}>
        <h4 style={{ margin: '0 0 10px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sliders size={15} />
          Cuentas y Configuración por Defecto (Defaults v{selectedVersionNum})
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
              Cuenta Base (Gasto / Ingreso):
            </label>
            <select
              className="input-select"
              value={draftDefaults.baseAccount || ''}
              onChange={(e) => setDraftDefaults({ ...draftDefaults, baseAccount: e.target.value })}
              disabled={readOnly}
              style={{ width: '100%', fontSize: '12px', padding: '5px 8px' }}
            >
              {accounts.map(a => (
                <option key={a.codigo} value={a.codigo}>{a.codigo} - {a.descripcion}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
              Cuenta de Impuesto (IGV):
            </label>
            <select
              className="input-select"
              value={draftDefaults.taxAccount || ''}
              onChange={(e) => setDraftDefaults({ ...draftDefaults, taxAccount: e.target.value })}
              disabled={readOnly}
              style={{ width: '100%', fontSize: '12px', padding: '5px 8px' }}
            >
              {accounts.map(a => (
                <option key={a.codigo} value={a.codigo}>{a.codigo} - {a.descripcion}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
              Cuenta Contrapartida (42 / 12):
            </label>
            <select
              className="input-select"
              value={draftDefaults.counterpartAccount || ''}
              onChange={(e) => setDraftDefaults({ ...draftDefaults, counterpartAccount: e.target.value })}
              disabled={readOnly}
              style={{ width: '100%', fontSize: '12px', padding: '5px 8px' }}
            >
              {accounts.map(a => (
                <option key={a.codigo} value={a.codigo}>{a.codigo} - {a.descripcion}</option>
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
              placeholder="ej. CC-ADMIN (opcional)"
              value={draftDefaults.defaultCostCenter || ''}
              onChange={(e) => setDraftDefaults({ ...draftDefaults, defaultCostCenter: e.target.value })}
              disabled={readOnly}
              style={{ width: '100%', fontSize: '12px', padding: '5px 8px' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: readOnly ? 'default' : 'pointer' }}>
            <input
              type="checkbox"
              checked={draftDefaults.appliesIgv !== false}
              onChange={(e) => setDraftDefaults({ ...draftDefaults, appliesIgv: e.target.checked })}
              disabled={readOnly}
            />
            <span>Aplica IGV Crédito/Débito</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: readOnly ? 'default' : 'pointer' }}>
            <input
              type="checkbox"
              checked={Boolean(draftDefaults.requiresCostCenter)}
              onChange={(e) => setDraftDefaults({ ...draftDefaults, requiresCostCenter: e.target.checked })}
              disabled={readOnly}
            />
            <span>Exige Centro de Costo Obligatorio</span>
          </label>
        </div>
      </div>

      {/* Pestañas: Reglas vs Casos de Prueba vs Historial */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border-color)' }}>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'rules' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('rules')}
          style={{
            padding: '8px 16px',
            border: 'none',
            background: activeTab === 'rules' ? 'var(--bg-card)' : 'transparent',
            borderBottom: activeTab === 'rules' ? '2px solid var(--primary-color)' : 'none',
            fontWeight: activeTab === 'rules' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          Reglas Condicionales ({documentRules.length + lineRules.length})
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'testCases' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('testCases')}
          style={{
            padding: '8px 16px',
            border: 'none',
            background: activeTab === 'testCases' ? 'var(--bg-card)' : 'transparent',
            borderBottom: activeTab === 'testCases' ? '2px solid var(--primary-color)' : 'none',
            fontWeight: activeTab === 'testCases' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          Casos de Prueba ({testCases.length})
          {lastTestRun && (
            <span className={`badge badge--${lastTestRun.allPassed ? 'success' : 'danger'}`} style={{ fontSize: '10px' }}>
              {lastTestRun.allPassed ? 'OK' : 'FAIL'}
            </span>
          )}
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'history' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('history')}
          style={{
            padding: '8px 16px',
            border: 'none',
            background: activeTab === 'history' ? 'var(--bg-card)' : 'transparent',
            borderBottom: activeTab === 'history' ? '2px solid var(--primary-color)' : 'none',
            fontWeight: activeTab === 'history' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          Historial de Versiones ({template?.versions?.length || 0})
        </button>
      </div>

      {/* Contenido de la pestaña */}
      <div className="card" style={{ padding: '16px' }}>
        {activeTab === 'rules' && (
          <RuleList
            documentRules={documentRules}
            lineRules={lineRules}
            onChange={(dRules, lRules) => {
              setDocumentRules(dRules);
              setLineRules(lRules);
            }}
            readOnly={readOnly}
            accounts={accounts}
            errors={validationErrors}
          />
        )}
        {activeTab === 'testCases' && (
          <TestCasesPanel
            testCases={testCases}
            onChange={(newCases) => setTestCases(newCases)}
            lastTestRun={lastTestRun}
            onRunTests={handleRunTests}
            running={runningTests}
            readOnly={readOnly}
            accounts={accounts}
          />
        )}
        {activeTab === 'history' && (
          <VersionHistory
            template={template}
            currentVersionNum={selectedVersionNum}
            onSelectVersion={(vNum) => {
              handleSelectVersion(vNum);
            }}
            onEditNewVersion={handleEditNewVersion}
            onRetireTemplate={handleRetireTemplate}
            isAdmin={isAdmin}
            readOnly={readOnly}
          />
        )}
      </div>

      {/* Barra de Acciones Final (Botones) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isDraft && isAdmin && (
            <button
              type="button"
              className="btn btn--danger btn--ghost"
              onClick={handleDeleteDraft}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-danger)' }}
            >
              <Trash2 size={14} />
              Eliminar Borrador
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={onClose}
          >
            Cerrar
          </button>

          {isDraft && isAdmin && (
            <>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={handleSaveDraft}
                disabled={saving || runningTests || activating}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Save size={14} />
                {saving ? 'Guardando...' : 'Guardar Borrador'}
              </button>

              <button
                type="button"
                className="btn btn--primary"
                onClick={handleActivate}
                disabled={saving || runningTests || activating}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <CheckCircle2 size={14} />
                {activating ? 'Activando...' : 'Activar Versión'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateEditor;

