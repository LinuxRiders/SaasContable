import React, { useState, useEffect, useCallback } from 'react';
import { useIngestionContext } from '../hooks/useIngestionContext.js';
import { ReadOnlyPeriodBanner } from '../components/ingestion/ReadOnlyPeriodBanner.jsx';
import { DemoControls } from '../components/ingestion/DemoControls.jsx';
import { BatchSummary } from '../components/ingestion/BatchSummary.jsx';
import { EntryDetailModal } from '../components/ingestion/EntryDetailModal.jsx';
import { TraceabilityModal } from '../components/ingestion/TraceabilityModal.jsx';
import { 
  listTemplates, 
  listSampleCatalog, 
  ingestBatch, 
  queryIntakeResults 
} from '../services/ingestion/index.js';
import { 
  UploadCloud, 
  FileText, 
  Layers, 
  Play, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Eye, 
  Trash2, 
  HelpCircle,
  ExternalLink,
  History 
} from 'lucide-react';

export const IngestionView = () => {
  const ctx = useIngestionContext();

  // Estados de carga de datos
  const [templates, setTemplates] = useState([]);
  const [companyHasActivations, setCompanyHasActivations] = useState(true);
  const [samples, setSamples] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  
  // Archivos a procesar (combinación de UPLOAD y SAMPLE_CATALOG)
  const [filesToProcess, setFilesToProcess] = useState([]);
  const [selectedSampleIds, setSelectedSampleIds] = useState([]);

  // Estado del proceso
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState(null);
  const [lastBatch, setLastBatch] = useState(null);

  // Pestañas de evidencia recibida (Intake)
  const [intakeTab, setIntakeTab] = useState('ALL'); // 'ALL' | 'ACCEPTED' | 'FAILED' | 'REJECTED'
  const [intakeItems, setIntakeItems] = useState([]);
  const [intakeTotal, setIntakeTotal] = useState(0);
  const [intakeLoading, setIntakeLoading] = useState(false);

  // Modal de detalle
  const [selectedDetailItem, setSelectedDetailItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Modal de trazabilidad
  const [selectedTraceId, setSelectedTraceId] = useState(null);
  const [isTraceModalOpen, setIsTraceModalOpen] = useState(false);

  // 1. Cargar plantillas activas de la empresa
  const loadTemplates = useCallback(async () => {
    if (!ctx?.tenantId) return;
    try {
      const res = await listTemplates(ctx);
      if (res.ok) {
        setTemplates(res.data.templates || []);
        setCompanyHasActivations(res.data.companyHasActivations);
        if (res.data.templates?.length > 0 && !selectedTemplateId) {
          setSelectedTemplateId(res.data.templates[0].templateId);
        }
      }
    } catch (err) {
      console.error('Error al cargar plantillas:', err);
    }
  }, [ctx, selectedTemplateId]);

  // 2. Cargar catálogo de ejemplos demo
  const loadSamples = useCallback(async () => {
    if (!ctx?.tenantId) return;
    try {
      const res = await listSampleCatalog(ctx);
      if (res.ok) {
        setSamples(res.data || []);
      }
    } catch (err) {
      console.error('Error al cargar catálogo demo:', err);
    }
  }, [ctx]);

  // 3. Cargar resultados de evidencia recibida (Intake)
  const loadIntake = useCallback(async () => {
    if (!ctx?.tenantId) return;
    setIntakeLoading(true);
    try {
      let outcomeFilter;
      if (intakeTab === 'ALL') outcomeFilter = undefined;
      else if (intakeTab === 'DUPLICATE') outcomeFilter = 'DUPLICATES';
      else outcomeFilter = intakeTab;

      const res = await queryIntakeResults(ctx, { outcome: outcomeFilter });
      if (res.ok) {
        setIntakeItems(res.data.items || []);
        setIntakeTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error('Error al consultar evidencia recibida:', err);
    } finally {
      setIntakeLoading(false);
    }
  }, [ctx, intakeTab]);

  useEffect(() => {
    loadTemplates();
    loadSamples();
  }, [ctx?.tenantId]);

  useEffect(() => {
    loadIntake();
  }, [ctx?.tenantId, intakeTab]);

  // Manejador de subida de archivos físicos
  const handleFileUpload = (e) => {
    const uploadedFiles = Array.from(e.target.files || []);
    if (!uploadedFiles.length) return;

    uploadedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        setFilesToProcess((prev) => [
          ...prev,
          {
            source: 'UPLOAD',
            fileName: file.name,
            sizeBytes: file.size,
            content
          }
        ]);
      };
      reader.readAsText(file);
    });

    e.target.value = null; // Reset input
  };

  // Manejador de selección de ejemplos del catálogo
  const handleToggleSample = (sample) => {
    const isSelected = selectedSampleIds.includes(sample.sampleId);
    if (isSelected) {
      setSelectedSampleIds((prev) => prev.filter((id) => id !== sample.sampleId));
      if (sample.isBatch && sample.batchFiles) {
        setFilesToProcess((prev) => prev.filter((f) => f.sampleBatchId !== sample.sampleId));
      } else {
        setFilesToProcess((prev) => prev.filter((f) => f.sampleId !== sample.sampleId));
      }
    } else {
      setSelectedSampleIds((prev) => [...prev, sample.sampleId]);
      if (sample.isBatch && sample.batchFiles) {
        const batchItems = sample.batchFiles.map((bf) => ({
          source: 'SAMPLE_CATALOG',
          sampleBatchId: sample.sampleId,
          fileName: bf.fileName,
          sizeBytes: bf.content.length,
          content: bf.content
        }));
        setFilesToProcess((prev) => [...prev, ...batchItems]);
      } else {
        setFilesToProcess((prev) => [
          ...prev,
          {
            source: 'SAMPLE_CATALOG',
            sampleId: sample.sampleId,
            fileName: sample.fileName,
            sizeBytes: sample.content.length,
            content: sample.content
          }
        ]);
      }
    }
  };

  const handleRemoveFile = (index) => {
    const fileToRemove = filesToProcess[index];
    if (fileToRemove.sampleBatchId) {
      setSelectedSampleIds((prev) => prev.filter((id) => id !== fileToRemove.sampleBatchId));
    } else if (fileToRemove.sampleId) {
      setSelectedSampleIds((prev) => prev.filter((id) => id !== fileToRemove.sampleId));
    }
    setFilesToProcess((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearAll = () => {
    setFilesToProcess([]);
    setSelectedSampleIds([]);
  };

  // Procesar Lote
  const handleProcessBatch = async () => {
    if (!selectedTemplateId || filesToProcess.length === 0) return;

    setIsProcessing(true);
    setProcessError(null);

    try {
      const res = await ingestBatch(ctx, {
        templateId: selectedTemplateId,
        items: filesToProcess
      });

      if (res.ok) {
        setLastBatch(res.data);
        setFilesToProcess([]);
        setSelectedSampleIds([]);
        loadIntake();
      } else {
        setProcessError(res.error?.message || 'Error al procesar el lote.');
      }
    } catch (err) {
      setProcessError(err.message || 'Error inesperado de comunicación.');
    } finally {
      setIsProcessing(false);
    }
  };

  const openDetail = (item) => {
    setSelectedDetailItem(item);
    setIsModalOpen(true);
  };

  const openTraceability = (traceId) => {
    setSelectedTraceId(traceId);
    setIsTraceModalOpen(true);
  };

  return (
    <div className="content-body">
      {/* Título de la vista */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UploadCloud size={22} color="var(--color-accent)" />
            Ingestión de Comprobantes Electrónicos
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Recepción, validación de pertenencia y traducción automática a asientos contables
          </span>
        </div>
      </div>

      {/* Controles de demostración y simulación */}
      <DemoControls
        ctx={ctx}
        onReset={() => {
          loadTemplates();
          loadSamples();
          loadIntake();
          setLastBatch(null);
          setFilesToProcess([]);
          setSelectedSampleIds([]);
        }}
      />

      {/* Banner de solo lectura si el periodo está cerrado */}
      {ctx?.readOnly && <ReadOnlyPeriodBanner periodo={ctx?.activePeriod?.nombrePeriodo} />}

      {/* Alerta si la empresa no tiene activaciones */}
      {!companyHasActivations && (
        <div className="callout callout--warning">
          <AlertTriangle size={16} />
          <div>
            <strong>Esta empresa no tiene plantillas activas;</strong> solicítelas al administrador en el Banco de Plantillas.
          </div>
        </div>
      )}

      {/* Mensaje de error general de lote */}
      {processError && (
        <div className="callout callout--warning" style={{ borderColor: 'var(--color-danger-border)', background: 'var(--color-danger-bg)', color: 'var(--color-danger-dark)' }}>
          <AlertCircle size={16} />
          <div>
            <strong>Error en el lote:</strong> {processError}
          </div>
        </div>
      )}

      {/* Formulario de Ingestión */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-md)',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: 'var(--shadow-xs)'
      }}>
        <div className="form-row" style={{ alignItems: 'flex-start' }}>
          {/* Selector de plantilla activa */}
          <div className="form-group" style={{ flex: '1', minWidth: '260px' }}>
            <label className="form-label form-label--required">
              Plantilla Contable para el Lote
            </label>
            <select
              className="form-control"
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              disabled={ctx?.readOnly || !companyHasActivations || isProcessing}
            >
              {templates.length === 0 ? (
                <option value="">(Sin plantillas disponibles)</option>
              ) : (
                templates.map((t) => (
                  <option key={t.templateId} value={t.templateId}>
                    {t.code} — {t.name} ({t.operationType}) [v{t.version}]
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Subida de Archivos */}
          <div className="form-group" style={{ flex: '1', minWidth: '260px' }}>
            <label className="form-label">
              Cargar Archivos Locales (.xml, .json)
            </label>
            <input
              type="file"
              multiple
              accept=".xml,.json"
              className="form-control"
              onChange={handleFileUpload}
              disabled={ctx?.readOnly || !companyHasActivations || isProcessing}
            />
          </div>
        </div>

        {/* Catálogo de Ejemplos Demo */}
        {samples.length > 0 && (
          <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-light)', paddingTop: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span className="form-label" style={{ marginBottom: 0 }}>
                Catálogo de Ejemplos Demo SUNAT
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Haga clic para agregar o quitar comprobantes de prueba
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {samples.map((s) => {
                const isSelected = selectedSampleIds.includes(s.sampleId);
                return (
                  <button
                    key={s.sampleId}
                    type="button"
                    className={`btn btn--sm ${isSelected ? 'btn--accent' : 'btn--secondary'}`}
                    onClick={() => handleToggleSample(s)}
                    disabled={ctx?.readOnly || !companyHasActivations || isProcessing}
                    style={{ fontSize: '11px', padding: '4px 9px' }}
                  >
                    <FileText size={12} />
                    <span>{s.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Bandeja de preparación de comprobantes a procesar */}
        {filesToProcess.length > 0 && (
          <div style={{ marginTop: '16px', background: 'var(--bg-subtle)', padding: '12px 16px', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                Comprobantes preparados para envío ({filesToProcess.length} de máx. 50):
              </span>
              <button
                className="btn btn--secondary btn--sm"
                onClick={handleClearAll}
                disabled={isProcessing}
                style={{ padding: '2px 6px', fontSize: '11px' }}
              >
                <Trash2 size={12} />
                <span>Vaciar lista</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '110px', overflowY: 'auto' }}>
              {filesToProcess.map((f, idx) => (
                <span
                  key={idx}
                  className="badge badge--neutral"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px' }}
                >
                  <span className="mono" style={{ fontSize: '10.5px' }}>{f.fileName}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(idx)}
                    disabled={isProcessing}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Botón de acción Procesar */}
        <div style={{ marginTop: '18px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleProcessBatch}
            disabled={
              ctx?.readOnly ||
              !companyHasActivations ||
              !selectedTemplateId ||
              filesToProcess.length === 0 ||
              isProcessing
            }
          >
            {isProcessing ? (
              <>
                <RefreshCw size={14} className="spin" />
                <span>Procesando lote ({filesToProcess.length})...</span>
              </>
            ) : (
              <>
                <Play size={14} />
                <span>Procesar Lote ({filesToProcess.length})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Resumen del último lote procesado */}
      {lastBatch && (
        <BatchSummary batch={lastBatch} onViewDetail={openDetail} />
      )}

      {/* Historial de Evidencia Recibida (Intake Results) */}
      <div style={{ marginTop: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} />
            Historial de Evidencia Recibida ({intakeTotal})
          </h3>
          <button
            className="btn btn--secondary btn--sm"
            onClick={loadIntake}
            disabled={intakeLoading}
          >
            <RefreshCw size={12} className={intakeLoading ? 'spin' : ''} />
            <span>Actualizar</span>
          </button>
        </div>

        {/* Pestañas de filtro de evidencia */}
        <div className="tabs-bar">
          <button
            className={`tab-btn ${intakeTab === 'ALL' ? 'tab-btn--active' : ''}`}
            onClick={() => setIntakeTab('ALL')}
          >
            Todos
          </button>
          <button
            className={`tab-btn ${intakeTab === 'ACCEPTED' ? 'tab-btn--active' : ''}`}
            onClick={() => setIntakeTab('ACCEPTED')}
          >
            Aceptados
          </button>
          <button
            className={`tab-btn ${intakeTab === 'DUPLICATE' ? 'tab-btn--active' : ''}`}
            onClick={() => setIntakeTab('DUPLICATE')}
          >
            Duplicados
          </button>
          <button
            className={`tab-btn ${intakeTab === 'FAILED' ? 'tab-btn--active' : ''}`}
            onClick={() => setIntakeTab('FAILED')}
          >
            Fallidos
          </button>
          <button
            className={`tab-btn ${intakeTab === 'REJECTED' ? 'tab-btn--active' : ''}`}
            onClick={() => setIntakeTab('REJECTED')}
          >
            Rechazados
          </button>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha Recepción</th>
                <th>Archivo</th>
                <th>Resultado</th>
                <th>Motivo / Razón</th>
                <th className="mono">Trace ID</th>
                <th className="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {intakeLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    Cargando historial de evidencia...
                  </td>
                </tr>
              ) : intakeItems.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No hay registros de evidencia con el filtro seleccionado.
                  </td>
                </tr>
              ) : (
                intakeItems.map((item) => (
                  <tr key={item.rawPayloadId}>
                    <td style={{ fontSize: '12px' }}>
                      {item.receivedAt ? new Date(item.receivedAt).toLocaleString('es-PE') : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={14} color="var(--text-muted)" />
                        <span style={{ fontWeight: 500 }}>{item.fileName}</span>
                      </div>
                    </td>
                    <td>
                      {item.outcome === 'ACCEPTED' ? (
                        <span className="badge badge--success"><CheckCircle2 size={11} /> Aceptado</span>
                      ) : item.outcome === 'DUPLICATE' ? (
                        <span className="badge badge--warning"><AlertCircle size={11} /> Duplicado</span>
                      ) : item.outcome === 'DUPLICATE_WITH_DIFF' ? (
                        <span className="badge badge--danger" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                          <AlertTriangle size={11} /> Duplicado con Diferencias
                        </span>
                      ) : item.outcome === 'FAILED' ? (
                        <span className="badge badge--danger"><XCircle size={11} /> Fallido</span>
                      ) : item.outcome === 'REJECTED' || item.outcome === 'REJECTED_NOT_TENANT' ? (
                        <span className="badge badge--danger"><XCircle size={11} /> Rechazado</span>
                      ) : (
                        <span className="badge badge--neutral">{item.outcome}</span>
                      )}
                    </td>
                    <td style={{ fontSize: '12px' }}>
                      {item.outcome === 'DUPLICATE_WITH_DIFF' ? (
                        <div style={{ color: 'var(--color-danger-dark)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <AlertTriangle size={13} color="var(--color-danger)" />
                          <span>{item.outcomeReason}</span>
                        </div>
                      ) : (
                        <span style={{ color: item.outcomeReason ? 'var(--color-danger-dark)' : 'var(--text-muted)' }}>
                          {item.outcomeReason || (item.outcome === 'DUPLICATE' ? 'Comprobante duplicado' : 'Correcto')}
                        </span>
                      )}
                    </td>
                    <td className="mono" style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>
                      {item.traceId?.slice(0, 10)}...
                    </td>
                    <td className="text-center">
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          className="btn btn--secondary btn--sm"
                          onClick={() => openDetail(item)}
                          style={{ padding: '2px 8px' }}
                          title="Ver evidencia"
                        >
                          <Eye size={12} />
                          <span>Ver</span>
                        </button>
                        {item.traceId && (
                          <button
                            className="btn btn--secondary btn--sm"
                            onClick={() => openTraceability(item.traceId)}
                            style={{ padding: '2px 8px' }}
                            title="Ver trazabilidad completa y auditoría"
                          >
                            <History size={12} />
                            <span>Trazabilidad</span>
                          </button>
                        )}
                        {item.duplicateOfDocumentId && (
                          <button
                            className="btn btn--secondary btn--sm"
                            onClick={() => openDetail({ duplicateOfDocumentId: item.duplicateOfDocumentId })}
                            style={{ padding: '2px 8px', borderColor: 'var(--color-warning-border)', color: 'var(--color-warning-dark)' }}
                            title="Ver documento y asiento original"
                          >
                            <ExternalLink size={12} />
                            <span>Original</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalle */}
      <EntryDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        item={selectedDetailItem}
        ctx={ctx}
      />

      {/* Modal de Trazabilidad */}
      <TraceabilityModal
        isOpen={isTraceModalOpen}
        onClose={() => setIsTraceModalOpen(false)}
        traceId={selectedTraceId}
        ctx={ctx}
      />
    </div>
  );
};

export default IngestionView;
