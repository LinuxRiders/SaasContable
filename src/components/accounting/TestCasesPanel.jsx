import React, { useState } from 'react';
import { Play, Plus, CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronRight, Check, Trash2, Edit3, Code } from 'lucide-react';
import { EntryLinesTable } from './EntryLinesTable.jsx';
import { SAMPLE_DOCUMENTS } from '../../data/jurisdictions/index.js';
import { runTests } from '../../domain/accounting/testRunner.js';

export const TestCasesPanel = ({
  template,
  version,
  pack,
  chart = [],
  tenantMapping = { entries: [] },
  onRunTests = null,
  testRun = null,
  onUpdateTestCases = null,
  readOnly = false
}) => {
  const isReadOnly = readOnly || template?.scope === 'PACK';
  const testCases = version?.testCases || [];

  const [localResults, setLocalResults] = useState(testRun?.results || null);
  const [running, setRunning] = useState(false);
  const [expandedCaseId, setExpandedCaseId] = useState(testCases[0]?.id || null);

  // Estado para modal / formulario de nuevo caso
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCase, setNewCase] = useState({
    id: `tc-${testCases.length + 1}`,
    description: '',
    mappingSource: 'TENANT',
    sampleDocId: SAMPLE_DOCUMENTS[0]?.id || '',
    customJson: '',
    fxRateMilli: '',
    expectedType: 'LINES'
  });

  const handleExecuteTests = async () => {
    setRunning(true);
    try {
      if (onRunTests) {
        const res = await onRunTests();
        if (res && res.results) {
          setLocalResults(res.results);
        }
      } else {
        const results = runTests(version, {
          pack,
          tenantMapping,
          chart,
          functionalCurrency: pack?.defaultFunctionalCurrency || 'PEN'
        });
        setLocalResults(results.results);
      }
    } catch (err) {
      console.error('Error running template tests:', err);
    } finally {
      setRunning(false);
    }
  };

  const getCaseResult = (caseId) => {
    if (!localResults) return null;
    return localResults.find(r => r.testCaseId === caseId);
  };

  const allPassed = localResults && localResults.length > 0 && localResults.every(r => r.status === 'PASS');
  const failedCount = localResults ? localResults.filter(r => r.status === 'FAIL').length : 0;

  const handleTakeActualAsExpected = (caseId) => {
    if (isReadOnly || !onUpdateTestCases) return;
    const result = getCaseResult(caseId);
    if (!result || !result.actual || !result.actual.lines) return;

    const updated = testCases.map(tc => {
      if (tc.id !== caseId) return tc;
      return {
        ...tc,
        expected: {
          lines: result.actual.lines.map(l => ({
            side: l.side,
            accountCode: l.accountCode,
            functionalAmountMinor: l.functionalAmountMinor,
            dimensions: l.dimensions || {}
          }))
        }
      };
    });

    onUpdateTestCases(updated);
  };

  const handleDeleteCase = (caseId) => {
    if (isReadOnly || !onUpdateTestCases) return;
    const updated = testCases.filter(tc => tc.id !== caseId);
    onUpdateTestCases(updated);
  };

  const handleSaveNewCase = () => {
    if (isReadOnly || !onUpdateTestCases) return;

    let inputDoc = null;
    if (newCase.sampleDocId) {
      const sample = SAMPLE_DOCUMENTS.find(s => s.id === newCase.sampleDocId);
      if (sample) inputDoc = sample.document;
    }

    if (!inputDoc && newCase.customJson) {
      try {
        inputDoc = JSON.parse(newCase.customJson);
      } catch (e) {
        alert('El JSON del documento canónico es inválido.');
        return;
      }
    }

    if (!inputDoc) {
      alert('Debe seleccionar un documento de ejemplo o pegar un JSON válido.');
      return;
    }

    const created = {
      id: newCase.id || `tc-${Date.now()}`,
      description: newCase.description || 'Caso de prueba personalizado',
      mappingSource: newCase.mappingSource || 'TENANT',
      fxRateMilli: newCase.fxRateMilli ? Number(newCase.fxRateMilli) : null,
      input: inputDoc,
      expected: {
        lines: []
      }
    };

    onUpdateTestCases([...testCases, created]);
    setShowAddModal(false);
    setExpandedCaseId(created.id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md, 16px)' }}>
      {/* Barra superior de acciones y estado */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 16px',
        background: 'var(--bg-surface, #FFFFFF)',
        borderRadius: 'var(--radius-md, 8px)',
        border: '1px solid var(--border-light, #E2E8F0)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={handleExecuteTests}
            disabled={running || testCases.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Play size={14} fill="currentColor" />
            <span>{running ? 'Ejecutando pruebas...' : 'Ejecutar Pruebas Contables'}</span>
          </button>

          {!isReadOnly && (
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => setShowAddModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={14} />
              <span>Nuevo caso</span>
            </button>
          )}
        </div>

        <div>
          {localResults ? (
            allPassed ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm, 6px)',
                background: 'var(--color-success-bg, #ECFDF5)',
                color: 'var(--color-success-dark, #065F46)',
                border: '1px solid var(--color-success-border, #A7F3D0)',
                fontWeight: 600,
                fontSize: '12px'
              }}>
                <CheckCircle2 size={16} />
                Todas las pruebas pasaron ({localResults.length}/{localResults.length})
              </span>
            ) : (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm, 6px)',
                background: 'var(--color-danger-bg, #FEF2F2)',
                color: 'var(--color-danger-dark, #991B1B)',
                border: '1px solid var(--color-danger-border, #FECACA)',
                fontWeight: 600,
                fontSize: '12px'
              }}>
                <XCircle size={16} />
                {failedCount} de {localResults.length} {failedCount === 1 ? 'caso falló' : 'casos fallaron'}
              </span>
            )
          ) : (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm, 6px)',
              background: 'var(--bg-subtle, #F8FAFC)',
              color: 'var(--text-muted, #64748B)',
              border: '1px solid var(--border-light, #E2E8F0)',
              fontSize: '12px'
            }}>
              <AlertTriangle size={14} />
              Pruebas pendientes de ejecución
            </span>
          )}
        </div>
      </div>

      {/* Lista de casos de prueba */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {testCases.length === 0 ? (
          <div style={{
            padding: '24px',
            textAlign: 'center',
            background: 'var(--bg-surface, #FFFFFF)',
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px dashed var(--border-medium, #CBD5E1)',
            color: 'var(--text-muted, #64748B)'
          }}>
            Esta versión de plantilla no tiene casos de prueba definidos.
            Se requiere al menos un caso de prueba positivo para activarla (RD-10).
          </div>
        ) : (
          testCases.map((tc, idx) => {
            const isExpanded = expandedCaseId === tc.id;
            const res = getCaseResult(tc.id);
            const passed = res?.status === 'PASS';
            const failed = res?.status === 'FAIL';

            return (
              <div
                key={tc.id || idx}
                style={{
                  background: 'var(--bg-surface, #FFFFFF)',
                  border: '1px solid var(--border-light, #E2E8F0)',
                  borderRadius: 'var(--radius-md, 8px)',
                  overflow: 'hidden'
                }}
              >
                {/* Cabecera del caso */}
                <div
                  onClick={() => setExpandedCaseId(isExpanded ? null : tc.id)}
                  style={{
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: isExpanded ? 'var(--bg-subtle, #F8FAFC)' : 'transparent',
                    borderBottom: isExpanded ? '1px solid var(--border-light, #E2E8F0)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '12px' }}>
                      {tc.id}
                    </span>
                    <span style={{ fontSize: '13px', color: 'var(--text-main, #0F172A)', fontWeight: 500 }}>
                      {tc.description || 'Sin descripción'}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      color: 'var(--text-muted, #64748B)',
                      padding: '1px 6px',
                      borderRadius: 'var(--radius-xs, 4px)',
                      background: 'var(--bg-muted, #F1F5F9)'
                    }}>
                      Mapa: {tc.mappingSource || 'TENANT'}
                    </span>
                    {tc.fxRateMilli && (
                      <span style={{
                        fontSize: '11px',
                        color: 'var(--text-muted, #64748B)',
                        padding: '1px 6px',
                        borderRadius: 'var(--radius-xs, 4px)',
                        background: 'var(--bg-muted, #F1F5F9)',
                        fontFamily: 'var(--font-mono)'
                      }}>
                        T.C.: {(tc.fxRateMilli / 1000).toFixed(3)}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {res ? (
                      passed ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: 'var(--color-success-dark, #065F46)',
                          background: 'var(--color-success-bg, #ECFDF5)',
                          border: '1px solid var(--color-success-border, #A7F3D0)',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm, 6px)'
                        }}>
                          <CheckCircle2 size={13} />
                          PASS
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: 'var(--color-danger-dark, #991B1B)',
                          background: 'var(--color-danger-bg, #FEF2F2)',
                          border: '1px solid var(--color-danger-border, #FECACA)',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm, 6px)'
                        }}>
                          <XCircle size={13} />
                          FAIL
                        </span>
                      )
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748B)' }}>
                        Sin ejecutar
                      </span>
                    )}

                    {!isReadOnly && (
                      <button
                        type="button"
                        className="btn btn--icon btn--ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCase(tc.id);
                        }}
                        title="Eliminar caso de prueba"
                        style={{ padding: '4px' }}
                      >
                        <Trash2 size={14} color="var(--color-danger, #DC2626)" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Contenido expandido del caso */}
                {isExpanded && (
                  <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Diferencias si falló */}
                    {failed && res?.diffs && res.diffs.length > 0 && (
                      <div style={{
                        padding: '10px 14px',
                        background: 'var(--color-danger-bg, #FEF2F2)',
                        border: '1px solid var(--color-danger-border, #FECACA)',
                        borderRadius: 'var(--radius-sm, 6px)',
                        color: 'var(--color-danger-dark, #991B1B)',
                        fontSize: '12px'
                      }}>
                        <div style={{ fontWeight: 700, marginBottom: '4px' }}>
                          Diferencias detectadas en la ejecución:
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '20px' }}>
                          {res.diffs.map((d, i) => (
                            <li key={i}>{d}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Botón para tomar resultado actual como esperado */}
                    {!isReadOnly && failed && res?.actual?.lines && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn btn--secondary btn--sm"
                          onClick={() => handleTakeActualAsExpected(tc.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}
                        >
                          <Check size={13} />
                          <span>Tomar resultado actual como esperado</span>
                        </button>
                      </div>
                    )}

                    {/* Comparación Esperado vs Obtenido */}
                    <div style={{ display: 'grid', gridTemplateColumns: res?.actual?.lines ? '1fr 1fr' : '1fr', gap: '12px' }}>
                      <div>
                        <EntryLinesTable
                          title="Líneas Esperadas"
                          lines={tc.expected?.lines || []}
                          functionalCurrency={pack?.defaultFunctionalCurrency || 'PEN'}
                          compact={true}
                        />
                      </div>

                      {res?.actual?.lines && (
                        <div>
                          <EntryLinesTable
                            title="Líneas Obtenidas (Resultado Actual)"
                            lines={res.actual.lines}
                            functionalCurrency={pack?.defaultFunctionalCurrency || 'PEN'}
                            compact={true}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal para agregar caso de prueba */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: 'var(--bg-surface, #FFFFFF)',
            borderRadius: 'var(--radius-lg, 10px)',
            width: '100%',
            maxWidth: '560px',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--border-light, #E2E8F0)',
              fontWeight: 700,
              fontSize: '15px'
            }}>
              Agregar Caso de Prueba Contable
            </div>

            <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Identificador del caso:
                </label>
                <input
                  type="text"
                  className="input mono"
                  value={newCase.id}
                  onChange={(e) => setNewCase({ ...newCase, id: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Descripción:
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ej. Factura de compra con detracciones"
                  value={newCase.description}
                  onChange={(e) => setNewCase({ ...newCase, description: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Documento de Ejemplo del Paquete:
                </label>
                <select
                  className="input"
                  value={newCase.sampleDocId}
                  onChange={(e) => setNewCase({ ...newCase, sampleDocId: e.target.value })}
                >
                  <option value="">-- Personalizado (JSON) --</option>
                  {SAMPLE_DOCUMENTS.map(sd => (
                    <option key={sd.id} value={sd.id}>
                      {sd.title} ({sd.id})
                    </option>
                  ))}
                </select>
              </div>

              {!newCase.sampleDocId && (
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Documento Canónico (JSON):
                  </label>
                  <textarea
                    className="input mono"
                    rows={4}
                    placeholder="Pegar objeto CanonicalDocument JSON..."
                    value={newCase.customJson}
                    onChange={(e) => setNewCase({ ...newCase, customJson: e.target.value })}
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Origen del Mapa de Cuentas:
                  </label>
                  <select
                    className="input"
                    value={newCase.mappingSource}
                    onChange={(e) => setNewCase({ ...newCase, mappingSource: e.target.value })}
                  >
                    <option value="TENANT">Mapa de la Empresa (TENANT)</option>
                    <option value="INLINE">Mapa en línea (INLINE)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Tipo de Cambio FX (fxRateMilli):
                  </label>
                  <input
                    type="number"
                    className="input mono"
                    placeholder="Ej. 3745 para 3.745"
                    value={newCase.fxRateMilli}
                    onChange={(e) => setNewCase({ ...newCase, fxRateMilli: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div style={{
              padding: '12px 18px',
              borderTop: '1px solid var(--border-light, #E2E8F0)',
              background: 'var(--bg-subtle, #F8FAFC)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px'
            }}>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => setShowAddModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={handleSaveNewCase}
              >
                Agregar caso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

