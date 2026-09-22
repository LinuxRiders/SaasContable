import React, { useState } from 'react';
import { 
  Play, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ChevronDown, 
  ChevronUp, 
  FileCheck,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { formatMoney } from '../../domain/ingestion/money.js';

export const TestCasesPanel = ({
  testCases = [],
  onChange,
  lastTestRun = null,
  onRunTests,
  running = false,
  readOnly = false,
  accounts = []
}) => {
  const [expandedCaseIds, setExpandedCaseIds] = useState(new Set());

  const toggleExpand = (caseId) => {
    const next = new Set(expandedCaseIds);
    if (next.has(caseId)) {
      next.delete(caseId);
    } else {
      next.add(caseId);
    }
    setExpandedCaseIds(next);
  };

  const handleAddTestCase = () => {
    if (readOnly) return;
    const newId = `TC-${testCases.length + 1}`;
    const newCase = {
      caseId: newId,
      name: `Caso de prueba ${testCases.length + 1}`,
      document: {
        currency: 'PEN',
        issueDate: '2026-09-15',
        issuer: { fiscalId: '20555555551', name: 'PROVEEDOR DEMO SAC' },
        receiver: { fiscalId: '20450656934', name: 'PACHATUSANTREK SAC' },
        lines: [
          { description: 'Servicio general', amountCents: 10000, taxCode: 'IGV' }
        ],
        taxableBaseCents: 10000,
        exemptBaseCents: 0,
        igvCents: 1800,
        totalCents: 11800
      },
      expectedLines: [
        { side: 'D', accountCode: '6011101', costCenter: '', functionalAmountCents: 10000 },
        { side: 'D', accountCode: '4011101', costCenter: '', functionalAmountCents: 1800 },
        { side: 'H', accountCode: '4212101', costCenter: '', functionalAmountCents: 11800 }
      ]
    };

    const next = [...testCases, newCase];
    onChange(next);

    const nextExp = new Set(expandedCaseIds);
    nextExp.add(newId);
    setExpandedCaseIds(nextExp);
  };

  const handleDeleteTestCase = (idx) => {
    if (readOnly) return;
    const next = testCases.filter((_, i) => i !== idx);
    onChange(next);
  };

  const handleUpdateTestCase = (idx, updated) => {
    if (readOnly) return;
    const next = [...testCases];
    next[idx] = updated;
    onChange(next);
  };

  // Helper para recalcular totales del documento del caso
  const handleRecalculateTotals = (doc) => {
    const lines = doc.lines || [];
    const base = lines.reduce((acc, l) => acc + (Number(l.amountCents) || 0), 0);
    const igv = Math.round(base * 0.18);
    return {
      ...doc,
      taxableBaseCents: base,
      exemptBaseCents: 0,
      igvCents: igv,
      totalCents: base + igv
    };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Barra Superior con botón Probar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h4 style={{ margin: 0, color: 'var(--text-color)' }}>Casos de Prueba Contables ({testCases.length})</h4>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
            Se exige que todos los casos pasen y cubran el 100% de las reglas antes de activar la versión.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {!readOnly && (
            <button
              type="button"
              className="btn btn--secondary"
              onClick={handleAddTestCase}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
            >
              <Plus size={14} />
              Agregar Caso
            </button>
          )}

          <button
            type="button"
            className="btn btn--primary"
            onClick={onRunTests}
            disabled={running || testCases.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <Play size={14} className={running ? 'spin' : ''} />
            {running ? 'Probando...' : 'Ejecutar Pruebas'}
          </button>
        </div>
      </div>

      {/* Banner de Resultado de la Última Ejecución */}
      {lastTestRun && (
        <div 
          className={`callout callout--${lastTestRun.allPassed ? 'success' : 'danger'}`}
          style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
              {lastTestRun.allPassed ? (
                <>
                  <CheckCircle2 size={16} />
                  <span>Pruebas Superadas con Éxito (100% de reglas cubiertas y catálogo válido)</span>
                </>
              ) : (
                <>
                  <XCircle size={16} />
                  <span>Las pruebas no pasaron o existen reglas sin cobertura</span>
                </>
              )}
            </div>
            <span style={{ fontSize: '11px', opacity: 0.8 }}>
              Ejecutado por {lastTestRun.by || 'ADMIN'} a las {new Date(lastTestRun.at).toLocaleTimeString()}
            </span>
          </div>

          {Array.isArray(lastTestRun.uncoveredRuleIds) && lastTestRun.uncoveredRuleIds.length > 0 && (
            <div style={{ fontSize: '12px', background: 'rgba(255,255,255,0.4)', padding: '6px 8px', borderRadius: '4px' }}>
              <strong>Reglas sin casos que las activen:</strong>{' '}
              {lastTestRun.uncoveredRuleIds.join(', ')}. 
              <em> (Debe agregar al menos un caso que active cada regla para poder activar la versión).</em>
            </div>
          )}
        </div>
      )}

      {/* Lista de Casos */}
      {testCases.length === 0 ? (
        <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '6px' }}>
          <FileCheck size={32} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.6 }} />
          <h4 style={{ margin: '0 0 4px', color: 'var(--text-color)' }}>No hay casos de prueba registrados</h4>
          <p style={{ margin: 0, fontSize: '12px' }}>
            Agregue al menos un caso de prueba para validar el cuadre Debe = Haber y verificar sus reglas.
          </p>
          {!readOnly && (
            <button
              type="button"
              className="btn btn--secondary"
              onClick={handleAddTestCase}
              style={{ marginTop: '12px', fontSize: '12px' }}
            >
              Crear primer caso
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {testCases.map((tc, idx) => {
            const isExpanded = expandedCaseIds.has(tc.caseId) || testCases.length === 1;
            const runResult = lastTestRun?.results?.find(r => r.caseId === tc.caseId);

            return (
              <div
                key={tc.caseId || idx}
                style={{
                  border: `1px solid ${runResult ? (runResult.passed ? 'var(--color-success)' : 'var(--color-danger)') : 'var(--border-color)'}`,
                  borderRadius: '6px',
                  background: 'var(--bg-card, #ffffff)',
                  overflow: 'hidden'
                }}
              >
                {/* Cabecera del Caso */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: runResult ? (runResult.passed ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)') : 'var(--bg-subtle, #f8fafc)',
                    borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    <button
                      type="button"
                      className="btn btn--icon btn--ghost"
                      onClick={() => toggleExpand(tc.caseId)}
                      style={{ padding: '2px', color: 'var(--text-muted)' }}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    <span className="mono" style={{ fontSize: '11px', fontWeight: 700 }}>
                      {tc.caseId}
                    </span>

                    <input
                      type="text"
                      className="input-text"
                      value={tc.name || ''}
                      onChange={(e) => handleUpdateTestCase(idx, { ...tc, name: e.target.value })}
                      disabled={readOnly}
                      placeholder="Nombre del caso de prueba"
                      style={{ flex: 1, maxWidth: '280px', fontSize: '12px', padding: '3px 8px' }}
                    />

                    {runResult && (
                      <span className={`badge badge--${runResult.passed ? 'success' : 'danger'}`} style={{ fontSize: '11px' }}>
                        {runResult.passed ? 'PASÓ' : 'FALLÓ'}
                      </span>
                    )}

                    {runResult?.appliedRuleIds?.length > 0 && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Reglas: {runResult.appliedRuleIds.join(', ')}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {!readOnly && (
                      <button
                        type="button"
                        className="btn btn--icon btn--ghost"
                        onClick={() => handleDeleteTestCase(idx)}
                        title="Eliminar caso de prueba"
                        style={{ color: 'var(--color-danger)', padding: '3px 6px' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Contenido del Caso */}
                {isExpanded && (
                  <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Documento de entrada del caso */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          1. Comprobante Simulado (Entrada):
                        </span>
                        {!readOnly && (
                          <button
                            type="button"
                            className="btn btn--ghost"
                            onClick={() => {
                              const rec = handleRecalculateTotals(tc.document);
                              handleUpdateTestCase(idx, { ...tc, document: rec });
                            }}
                            style={{ fontSize: '11px', padding: '2px 6px' }}
                          >
                            Recalcular IGV y Total
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', marginBottom: '10px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>Total Comprobante (S/):</label>
                          <input
                            type="number"
                            step="0.01"
                            className="input-text"
                            value={((tc.document?.totalCents || 0) / 100).toFixed(2)}
                            onChange={(e) => {
                              const cents = Math.round((parseFloat(e.target.value) || 0) * 100);
                              handleUpdateTestCase(idx, {
                                ...tc,
                                document: { ...tc.document, totalCents: cents }
                              });
                            }}
                            disabled={readOnly}
                            style={{ width: '100%', fontSize: '12px', padding: '4px 6px' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>Base Gravada (S/):</label>
                          <input
                            type="number"
                            step="0.01"
                            className="input-text"
                            value={((tc.document?.taxableBaseCents || 0) / 100).toFixed(2)}
                            onChange={(e) => {
                              const cents = Math.round((parseFloat(e.target.value) || 0) * 100);
                              handleUpdateTestCase(idx, {
                                ...tc,
                                document: { ...tc.document, taxableBaseCents: cents }
                              });
                            }}
                            disabled={readOnly}
                            style={{ width: '100%', fontSize: '12px', padding: '4px 6px' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>IGV (S/):</label>
                          <input
                            type="number"
                            step="0.01"
                            className="input-text"
                            value={((tc.document?.igvCents || 0) / 100).toFixed(2)}
                            onChange={(e) => {
                              const cents = Math.round((parseFloat(e.target.value) || 0) * 100);
                              handleUpdateTestCase(idx, {
                                ...tc,
                                document: { ...tc.document, igvCents: cents }
                              });
                            }}
                            disabled={readOnly}
                            style={{ width: '100%', fontSize: '12px', padding: '4px 6px' }}
                          />
                        </div>
                      </div>

                      {/* Líneas del Comprobante */}
                      <div style={{ background: 'var(--bg-subtle, #f8fafc)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600 }}>Líneas de Comprobante simuladas:</span>
                          {!readOnly && (
                            <button
                              type="button"
                              className="btn btn--ghost"
                              onClick={() => {
                                const curLines = tc.document?.lines || [];
                                const nextLines = [...curLines, { description: 'Item adicional', amountCents: 5000, taxCode: 'IGV' }];
                                const updatedDoc = handleRecalculateTotals({ ...tc.document, lines: nextLines });
                                handleUpdateTestCase(idx, { ...tc, document: updatedDoc });
                              }}
                              style={{ fontSize: '11px', padding: '2px 6px' }}
                            >
                              + Agregar línea
                            </button>
                          )}
                        </div>

                        {(tc.document?.lines || []).map((line, lIdx) => (
                          <div key={lIdx} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 90px auto', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                            <input
                              type="text"
                              className="input-text"
                              placeholder="Descripción del ítem"
                              value={line.description || ''}
                              onChange={(e) => {
                                const nextLines = [...(tc.document?.lines || [])];
                                nextLines[lIdx] = { ...line, description: e.target.value };
                                handleUpdateTestCase(idx, { ...tc, document: { ...tc.document, lines: nextLines } });
                              }}
                              disabled={readOnly}
                              style={{ fontSize: '12px', padding: '3px 6px' }}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <span style={{ fontSize: '11px' }}>S/</span>
                              <input
                                type="number"
                                step="0.01"
                                className="input-text"
                                value={((line.amountCents || 0) / 100).toFixed(2)}
                                onChange={(e) => {
                                  const cents = Math.round((parseFloat(e.target.value) || 0) * 100);
                                  const nextLines = [...(tc.document?.lines || [])];
                                  nextLines[lIdx] = { ...line, amountCents: cents };
                                  const updatedDoc = handleRecalculateTotals({ ...tc.document, lines: nextLines });
                                  handleUpdateTestCase(idx, { ...tc, document: updatedDoc });
                                }}
                                disabled={readOnly}
                                style={{ width: '80px', fontSize: '12px', padding: '3px 6px' }}
                              />
                            </div>
                            <select
                              className="input-select"
                              value={line.taxCode || 'IGV'}
                              onChange={(e) => {
                                const nextLines = [...(tc.document?.lines || [])];
                                nextLines[lIdx] = { ...line, taxCode: e.target.value };
                                handleUpdateTestCase(idx, { ...tc, document: { ...tc.document, lines: nextLines } });
                              }}
                              disabled={readOnly}
                              style={{ fontSize: '11px', padding: '3px 4px' }}
                            >
                              <option value="IGV">IGV</option>
                              <option value="EXO">EXO</option>
                              <option value="INA">INA</option>
                            </select>
                            {!readOnly && (
                              <button
                                type="button"
                                onClick={() => {
                                  const nextLines = (tc.document?.lines || []).filter((_, i) => i !== lIdx);
                                  const updatedDoc = handleRecalculateTotals({ ...tc.document, lines: nextLines });
                                  handleUpdateTestCase(idx, { ...tc, document: updatedDoc });
                                }}
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-danger)' }}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Líneas esperadas en el asiento contable */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          2. Asiento Contable Esperado (Salida):
                        </span>
                        {!readOnly && (
                          <button
                            type="button"
                            className="btn btn--secondary"
                            onClick={() => {
                              const exp = tc.expectedLines || [];
                              const nextExp = [...exp, { side: 'D', accountCode: '6011101', costCenter: '', functionalAmountCents: 1000 }];
                              handleUpdateTestCase(idx, { ...tc, expectedLines: nextExp });
                            }}
                            style={{ fontSize: '11px', padding: '2px 8px' }}
                          >
                            + Agregar línea esperada
                          </button>
                        )}
                      </div>

                      <table className="table" style={{ width: '100%', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-subtle)', textAlign: 'left' }}>
                            <th style={{ width: '80px', padding: '6px' }}>Lado</th>
                            <th style={{ padding: '6px' }}>Cuenta Contable</th>
                            <th style={{ width: '120px', padding: '6px' }}>Centro Costo</th>
                            <th style={{ width: '110px', padding: '6px', textAlign: 'right' }}>Monto PEN</th>
                            {!readOnly && <th style={{ width: '40px', padding: '6px' }}></th>}
                          </tr>
                        </thead>
                        <tbody>
                          {(tc.expectedLines || []).map((exp, eIdx) => (
                            <tr key={eIdx}>
                              <td style={{ padding: '4px 6px' }}>
                                <select
                                  className="input-select"
                                  value={exp.side}
                                  onChange={(e) => {
                                    const next = [...(tc.expectedLines || [])];
                                    next[eIdx] = { ...exp, side: e.target.value };
                                    handleUpdateTestCase(idx, { ...tc, expectedLines: next });
                                  }}
                                  disabled={readOnly}
                                  style={{ width: '70px', padding: '2px 4px', fontSize: '11px', fontWeight: 700 }}
                                >
                                  <option value="D">Debe (D)</option>
                                  <option value="H">Haber (H)</option>
                                </select>
                              </td>
                              <td style={{ padding: '4px 6px' }}>
                                <select
                                  className="input-select"
                                  value={exp.accountCode}
                                  onChange={(e) => {
                                    const next = [...(tc.expectedLines || [])];
                                    next[eIdx] = { ...exp, accountCode: e.target.value };
                                    handleUpdateTestCase(idx, { ...tc, expectedLines: next });
                                  }}
                                  disabled={readOnly}
                                  style={{ width: '100%', padding: '2px 6px', fontSize: '11px' }}
                                >
                                  {accounts.map(acc => (
                                    <option key={acc.codigo} value={acc.codigo}>
                                      {acc.codigo} - {acc.descripcion}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td style={{ padding: '4px 6px' }}>
                                <input
                                  type="text"
                                  className="input-text"
                                  placeholder="ej. CC-ADMIN"
                                  value={exp.costCenter || ''}
                                  onChange={(e) => {
                                    const next = [...(tc.expectedLines || [])];
                                    next[eIdx] = { ...exp, costCenter: e.target.value };
                                    handleUpdateTestCase(idx, { ...tc, expectedLines: next });
                                  }}
                                  disabled={readOnly}
                                  style={{ width: '100%', padding: '2px 6px', fontSize: '11px' }}
                                />
                              </td>
                              <td style={{ padding: '4px 6px', textAlign: 'right' }}>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="input-text"
                                  value={((exp.functionalAmountCents || 0) / 100).toFixed(2)}
                                  onChange={(e) => {
                                    const cents = Math.round((parseFloat(e.target.value) || 0) * 100);
                                    const next = [...(tc.expectedLines || [])];
                                    next[eIdx] = { ...exp, functionalAmountCents: cents };
                                    handleUpdateTestCase(idx, { ...tc, expectedLines: next });
                                  }}
                                  disabled={readOnly}
                                  style={{ width: '90px', padding: '2px 6px', fontSize: '11px', textAlign: 'right' }}
                                />
                              </td>
                              {!readOnly && (
                                <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = (tc.expectedLines || []).filter((_, i) => i !== eIdx);
                                      handleUpdateTestCase(idx, { ...tc, expectedLines: next });
                                    }}
                                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-danger)' }}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Comparación si la prueba corrió y falló */}
                    {runResult && !runResult.passed && runResult.actualLines && (
                      <div className="callout callout--danger" style={{ margin: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '12px', marginBottom: '4px' }}>
                          Líneas generadas reales vs. esperadas:
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                          <div>
                            <strong>Líneas Obtenidas por el Evaluador:</strong>
                            <ul style={{ margin: '4px 0 0', paddingLeft: '16px' }}>
                              {runResult.actualLines.map((act, aIdx) => (
                                <li key={aIdx}>
                                  [{act.side}] {act.accountCode} ({act.costCenter || 'Sin CC'}) : {formatMoney(act.functionalAmountCents, 'PEN')}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <strong>Líneas Esperadas:</strong>
                            <ul style={{ margin: '4px 0 0', paddingLeft: '16px' }}>
                              {(tc.expectedLines || []).map((exp, eIdx) => (
                                <li key={eIdx}>
                                  [{exp.side}] {exp.accountCode} ({exp.costCenter || 'Sin CC'}) : {formatMoney(exp.functionalAmountCents, 'PEN')}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
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

export default TestCasesPanel;

