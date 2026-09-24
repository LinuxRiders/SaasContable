import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  FileCheck,
  Compass,
  Tag,
  FileCode,
  Calculator,
  ChevronDown,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { EntryLinesTable } from './EntryLinesTable.jsx';

/**
 * Visualizador de traza de simulación contable de 5 pasos según SDD §5.4 y contracts/domain-api.md §7.
 *
 * @param {Object} props
 * @param {Object} props.result - Resultado de interpretDocument / simulateDocument { ok, entry, trace, stoppedAt, pending }
 * @param {string} [props.functionalCurrency='PEN']
 */
export const SimulationTrace = ({ result, functionalCurrency = 'PEN' }) => {
  const [expandedStep, setExpandedStep] = React.useState(null);

  if (!result) {
    return (
      <div style={{
        padding: '32px',
        textAlign: 'center',
        color: 'var(--text-secondary, #64748B)',
        background: 'var(--bg-subtle, #F8FAFC)',
        borderRadius: 'var(--radius-md, 8px)',
        border: '1px dashed var(--border-light, #CBD5E1)'
      }}>
        <Calculator size={32} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
        <div style={{ fontWeight: 600 }}>Sin simulación activa</div>
        <div style={{ fontSize: '13px', marginTop: '4px' }}>
          Selecciona un comprobante de ejemplo o ingresa un documento canónico para simular la contabilización.
        </div>
      </div>
    );
  }

  const stepsDef = [
    { key: 'SCHEMA', label: '1. Validación de Esquema', icon: FileCheck },
    { key: 'PERSPECTIVE', label: '2. Resolución de Perspectiva', icon: Compass },
    { key: 'CLASSIFICATION', label: '3. Clasificación de la Operación', icon: Tag },
    { key: 'SELECTION', label: '4. Selección de Plantilla AST', icon: FileCode },
    { key: 'EVALUATION', label: '5. Evaluación Contable', icon: Calculator }
  ];

  const traceSteps = result.trace?.steps || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Banner de estado general */}
      <div style={{
        padding: '14px 18px',
        borderRadius: 'var(--radius-md, 8px)',
        border: `1px solid ${result.ok ? '#86EFAC' : '#FCA5A5'}`,
        background: result.ok ? '#F0FDF4' : '#FEF2F2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {result.ok ? (
            <CheckCircle2 size={24} color="#16A34A" />
          ) : (
            <AlertCircle size={24} color="#DC2626" />
          )}
          <div>
            <div style={{ fontWeight: 700, color: result.ok ? '#15803D' : '#B91C1C' }}>
              {result.ok ? 'Contabilización Simulada con Éxito' : `Simulación Detenida en etapa: ${result.stoppedAt}`}
            </div>
            <div style={{ fontSize: '12px', color: result.ok ? '#166534' : '#991B1B', marginTop: '2px' }}>
              {result.ok
                ? `Asiento cuadrado con ${result.entry?.lines?.length || 0} líneas bajo la plantilla ${result.entry?.templateId} (v${result.entry?.templateVersion})`
                : (result.pending?.[0]?.message || 'El documento requiere atención antes de poder contabilizarse')}
            </div>
          </div>
        </div>

        {result.ok && result.entry?.legalBookCode && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontWeight: 700,
            padding: '4px 8px',
            borderRadius: '4px',
            background: '#DCFCE7',
            color: '#166534'
          }}>
            <BookOpen size={13} />
            {result.entry.legalBookCode}
          </div>
        )}
      </div>

      {/* Pasos de la traza */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        background: 'var(--bg-surface, #FFFFFF)',
        border: '1px solid var(--border-light, #E2E8F0)',
        borderRadius: 'var(--radius-md, 8px)',
        padding: '12px'
      }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #64748B)', marginBottom: '4px' }}>
          TRAZA DE EJECUCIÓN PASO A PASO
        </div>

        {stepsDef.map((def, idx) => {
          const stepData = traceSteps.find(s => s.step === def.key);
          const isExecuted = !!stepData;
          const isOk = stepData?.ok === true;
          const isStopped = result.stoppedAt === def.key;
          const isExpanded = expandedStep === def.key;
          const StepIcon = def.icon;

          let statusBadge = (
            <span style={{ fontSize: '11px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={13} /> Omitido
            </span>
          );

          if (isExecuted) {
            if (isOk) {
              statusBadge = (
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#16A34A', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={14} color="#16A34A" /> Correcto
                </span>
              );
            } else {
              statusBadge = (
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#DC2626', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle size={14} color="#DC2626" /> Detenido
                </span>
              );
            }
          }

          return (
            <div
              key={def.key}
              style={{
                border: `1px solid ${isStopped ? '#F87171' : isOk ? '#BBF7D0' : '#E2E8F0'}`,
                borderRadius: '6px',
                background: isStopped ? '#FEF2F2' : isOk ? '#F0FDF4' : '#F8FAFC',
                overflow: 'hidden'
              }}
            >
              <div
                onClick={() => setExpandedStep(isExpanded ? null : def.key)}
                style={{
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <StepIcon size={16} color={isStopped ? '#DC2626' : isOk ? '#16A34A' : '#64748B'} />
                  <span style={{ fontWeight: 600, fontSize: '13px', color: isStopped ? '#B91C1C' : isOk ? '#15803D' : '#334155' }}>
                    {def.label}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {statusBadge}
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
              </div>

              {/* Detalle desplegable del paso */}
              {isExpanded && (
                <div style={{
                  padding: '12px 16px',
                  background: 'var(--bg-surface, #FFFFFF)',
                  borderTop: '1px solid var(--border-light, #E2E8F0)',
                  fontSize: '12px'
                }}>
                  {def.key === 'SCHEMA' && (
                    <div>
                      {isOk ? (
                        <div style={{ color: '#166534' }}>
                          Tipo de documento verificado: <strong>{stepData.documentTypeCode}</strong>.
                          Esquema normativo y coherencia aritmética conformes.
                        </div>
                      ) : (
                        <div>
                          <div style={{ color: '#B91C1C', fontWeight: 600, marginBottom: '6px' }}>
                            Errores encontrados en el esquema:
                          </div>
                          <ul style={{ margin: 0, paddingLeft: '18px', color: '#DC2626' }}>
                            {(stepData?.errors || result.pending || []).map((err, i) => (
                              <li key={i} style={{ marginBottom: '4px' }}>
                                <strong>{err.reasonCode || err.code}:</strong> {err.message}
                                {err.details?.errors && (
                                  <ul style={{ paddingLeft: '16px', marginTop: '2px', color: '#475569' }}>
                                    {err.details.errors.map((sub, j) => (
                                      <li key={j}>{sub.field ? `[${sub.field}] ` : ''}{sub.message}</li>
                                    ))}
                                  </ul>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {def.key === 'PERSPECTIVE' && (
                    <div>
                      {isOk ? (
                        <div style={{ color: '#166534' }}>
                          Perspectiva resuelta: <strong>{stepData.perspective}</strong> ({stepData.perspective === 'RECEIVED' ? 'Comprobante recibido / Compras' : 'Comprobante emitido / Ventas'}).
                        </div>
                      ) : (
                        <div style={{ color: '#DC2626' }}>
                          No se pudo resolver la perspectiva del comprobante. El identificador fiscal del tenant no coincide con ninguna de las partes del documento.
                        </div>
                      )}
                    </div>
                  )}

                  {def.key === 'CLASSIFICATION' && (
                    <div>
                      {isOk ? (
                        <div>
                          <div style={{ color: '#166534', marginBottom: '6px' }}>
                            Operación clasificada como: <strong>{stepData.operationTypeCode}</strong> (decidida por: <code>{stepData.decidedBy}</code>).
                          </div>
                          {stepData.lineOperationTypes && Object.keys(stepData.lineOperationTypes).length > 0 && (
                            <div style={{ marginTop: '6px' }}>
                              <span style={{ fontWeight: 600 }}>Clasificación por línea:</span>
                              <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px' }}>
                                {Object.entries(stepData.lineOperationTypes).map(([lineNo, opCode]) => (
                                  <li key={lineNo}>Línea {lineNo}: <code>{opCode}</code></li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ color: '#DC2626' }}>
                          La operación no pudo ser clasificada automáticamente. Se requiere crear o activar una regla de clasificación para este proveedor o concepto.
                        </div>
                      )}
                    </div>
                  )}

                  {def.key === 'SELECTION' && (
                    <div>
                      {isOk ? (
                        <div style={{ color: '#166534' }}>
                          Plantilla seleccionada: <strong>{stepData.templateId}</strong> (versión {stepData.version}, alcance: {stepData.scope}).
                        </div>
                      ) : (
                        <div style={{ color: '#DC2626' }}>
                          No se encontró una plantilla activa para la terna de este documento, o existe ambigüedad de prioridad entre dos plantillas.
                        </div>
                      )}
                    </div>
                  )}

                  {def.key === 'EVALUATION' && (
                    <div>
                      {isOk ? (
                        <div style={{ color: '#166534' }}>
                          Evaluación completada. Se generaron <strong>{stepData.linesCount}</strong> líneas de asiento contable balanceadas (Debe = Haber).
                        </div>
                      ) : (
                        <div>
                          <div style={{ color: '#B91C1C', fontWeight: 600, marginBottom: '6px' }}>
                            Pendientes de resolución contable:
                          </div>
                          <ul style={{ margin: 0, paddingLeft: '18px', color: '#DC2626' }}>
                            {(stepData?.errors || result.pending || []).map((err, i) => (
                              <li key={i} style={{ marginBottom: '4px' }}>
                                <strong>{err.reasonCode || err.code}:</strong> {err.message}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Asiento generado (si fue exitoso) */}
      {result.ok && result.entry?.lines && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {result.entry.glosa && (
            <div style={{
              padding: '8px 14px',
              borderRadius: '6px',
              background: '#F1F5F9',
              border: '1px solid #CBD5E1',
              fontSize: '12px',
              color: '#334155'
            }}>
              <strong>Glosa contable:</strong> {result.entry.glosa}
            </div>
          )}

          <EntryLinesTable
            lines={result.entry.lines}
            functionalCurrency={functionalCurrency}
            title="Asiento Contable Generado por el Motor"
          />
        </div>
      )}
    </div>
  );
};

