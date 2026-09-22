import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal.jsx';
import { getTraceability } from '../../services/ingestion/index.js';
import * as repository from '../../services/storage/repository.js';
import { 
  History, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ShieldAlert, 
  Copy, 
  Check, 
  Layers, 
  Code, 
  Calendar, 
  DollarSign, 
  ArrowRight,
  UserCheck,
  ShieldCheck
} from 'lucide-react';

const ACTION_LABELS = {
  RAW_RECEIVED: 'Evidencia recibida',
  DUPLICATE_DETECTED: 'Duplicado detectado',
  PARSE_FAILED: 'Error de interpretación',
  REJECTED_NOT_TENANT: 'Rechazado: emisor/receptor ajeno',
  DOCUMENT_CANONICALIZED: 'Documento interpretado',
  DRAFT_CREATED: 'Asiento borrador creado',
  SENT_TO_STAGING: 'Enviado a bandeja de observaciones',
  STAGING_UPDATED: 'Actualizado en bandeja',
  TEMPLATE_CHANGED: 'Plantilla cambiada',
  REVALIDATED: 'Revalidado contra catálogo/versión',
  MOVED_TO_PENDING_APPROVAL: 'Avanzado a pendiente de aprobación',
  ENTRY_CANCELLED: 'Asiento cancelado',
  ACTION_DENIED: 'Acción denegada (permisos / control SoD)',
  INVALID_TRANSITION: 'Transición inválida',
  CONFLICT: 'Conflicto de versión concurrente',
  DEMO_RESET: 'Reinicio de datos semilla',
  TEMPLATE_VERSION_CHANGED: 'Versión de plantilla actualizada'
};

const ACTION_BADGES = {
  RAW_RECEIVED: 'badge--neutral',
  DUPLICATE_DETECTED: 'badge--warning',
  PARSE_FAILED: 'badge--danger',
  REJECTED_NOT_TENANT: 'badge--danger',
  DOCUMENT_CANONICALIZED: 'badge--info',
  DRAFT_CREATED: 'badge--info',
  SENT_TO_STAGING: 'badge--warning',
  STAGING_UPDATED: 'badge--info',
  TEMPLATE_CHANGED: 'badge--info',
  REVALIDATED: 'badge--info',
  MOVED_TO_PENDING_APPROVAL: 'badge--success',
  ENTRY_CANCELLED: 'badge--danger',
  ACTION_DENIED: 'badge--danger',
  TEMPLATE_VERSION_CHANGED: 'badge--warning'
};

/**
 * Modal de Trazabilidad y Auditoría Completa (HU-06, RF-17, CA-17.2, T097).
 * Vista de solo lectura con auditoría cronológica, evidencia, canónico, plantilla y asiento.
 */
export const TraceabilityModal = ({ isOpen, onClose, traceId, ctx }) => {
  const [activeTab, setActiveTab] = useState('timeline'); // 'timeline' | 'evidence' | 'document' | 'template' | 'entry'
  const [traceData, setTraceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [catalogMap, setCatalogMap] = useState({});

  useEffect(() => {
    if (!isOpen || !traceId) {
      setTraceData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    // Cargar mapa del catálogo de cuentas de la empresa para nombres legibles
    const tenantId = ctx?.tenantId || '01';
    const catalog = repository.getCollection(tenantId, 'chartOfAccounts') || [];
    const catMap = {};
    catalog.forEach(acc => {
      catMap[acc.codigo] = acc.descripcion;
    });
    setCatalogMap(catMap);

    getTraceability(ctx, { traceId })
      .then(res => {
        if (res.ok) {
          setTraceData(res.data);
        } else {
          setError(res.error?.message || 'Error al consultar la trazabilidad.');
        }
      })
      .catch(err => {
        setError(err.message || 'Error de conexión.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, traceId, ctx]);

  const handleCopyTraceId = () => {
    if (traceId) {
      navigator.clipboard.writeText(traceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const fmtMoney = (cents) => {
    if (cents === undefined || cents === null) return '0.00';
    return (cents / 100).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (!isOpen) return null;

  const { rawPayload, document, entry, template, events = [] } = traceData || {};

  const title = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <History size={18} color="var(--color-accent)" />
      <span>Trazabilidad y Auditoría: {document?.seriesAndNumber || rawPayload?.fileName || traceId?.slice(0, 8)}</span>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="860px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <ShieldCheck size={14} color="var(--color-success)" />
            <span>Registro inmutable append-only protegido por RD-01 y RD-07</span>
          </div>
          <button className="btn btn--secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      }
    >
      {/* Barra superior con traceId y badge */}
      <div style={{
        background: 'var(--bg-subtle)',
        padding: '10px 14px',
        borderRadius: 'var(--radius-sm)',
        marginBottom: '14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px',
        border: '1px solid var(--border-light)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>CÓDIGO DE SEGUIMIENTO:</span>
          <span className="mono" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>{traceId}</span>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={handleCopyTraceId}
            style={{ padding: '2px 6px', fontSize: '10px' }}
            title="Copiar Trace ID"
          >
            {copied ? <Check size={11} color="var(--color-success)" /> : <Copy size={11} />}
            <span>{copied ? 'Copiado' : 'Copiar'}</span>
          </button>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span className="badge badge--neutral" style={{ fontSize: '10.5px' }}>
            Empresa: {ctx?.tenantId || '01'}
          </span>
          {entry && (
            <span className={`badge ${entry.state === 'PENDING_APPROVAL' ? 'badge--success' : entry.state === 'PENDING_INPUT' ? 'badge--warning' : 'badge--neutral'}`} style={{ fontSize: '10.5px' }}>
              Estado: {entry.state}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Cargando trazabilidad completa...
        </div>
      ) : error ? (
        <div className="callout callout--warning" style={{ borderColor: 'var(--color-danger-border)', background: 'var(--color-danger-bg)', color: 'var(--color-danger-dark)' }}>
          <ShieldAlert size={16} />
          <div>
            <strong>Acceso no permitido o registro no encontrado:</strong> {error}
          </div>
        </div>
      ) : (
        <div>
          {/* Pestañas de secciones */}
          <div className="tabs-bar" style={{ marginBottom: '16px' }}>
            <button
              className={`tab-btn ${activeTab === 'timeline' ? 'tab-btn--active' : ''}`}
              onClick={() => setActiveTab('timeline')}
            >
              Línea de Tiempo ({events.length})
            </button>
            <button
              className={`tab-btn ${activeTab === 'entry' ? 'tab-btn--active' : ''}`}
              onClick={() => setActiveTab('entry')}
              disabled={!entry}
            >
              Asiento Contable
            </button>
            <button
              className={`tab-btn ${activeTab === 'template' ? 'tab-btn--active' : ''}`}
              onClick={() => setActiveTab('template')}
              disabled={!template}
            >
              Plantilla y Reglas
            </button>
            <button
              className={`tab-btn ${activeTab === 'document' ? 'tab-btn--active' : ''}`}
              onClick={() => setActiveTab('document')}
              disabled={!document}
            >
              Documento Canónico
            </button>
            <button
              className={`tab-btn ${activeTab === 'evidence' ? 'tab-btn--active' : ''}`}
              onClick={() => setActiveTab('evidence')}
              disabled={!rawPayload}
            >
              Evidencia Original
            </button>
          </div>

          {/* 1. LÍNEA DE TIEMPO (AUDIT EVENTS) */}
          {activeTab === 'timeline' && (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {events.map((ev, idx) => (
                  <div
                    key={ev.id || idx}
                    style={{
                      border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 14px',
                      background: ev.action === 'ACTION_DENIED' ? 'var(--color-danger-bg)' : 'var(--bg-surface)',
                      borderColor: ev.action === 'ACTION_DENIED' ? 'var(--color-danger-border)' : 'var(--border-light)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`badge ${ACTION_BADGES[ev.action] || 'badge--neutral'}`} style={{ fontSize: '11px', fontWeight: 600 }}>
                          {ACTION_LABELS[ev.action] || ev.action}
                        </span>
                        <span className="mono" style={{ fontSize: '10.5px', color: 'var(--text-subtle)' }}>
                          {ev.action}
                        </span>
                      </div>
                      <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(ev.at).toLocaleString('es-PE')}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: 'var(--text-main)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <UserCheck size={13} color="var(--text-muted)" />
                        <span>Usuario: <strong>{ev.userId || 'SYSTEM'}</strong></span>
                        <span className="badge badge--neutral" style={{ fontSize: '10px', padding: '1px 5px' }}>{ev.role || 'SISTEMA'}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Entidad: <span className="mono">{ev.entityType}</span> ({ev.entityId?.slice(0, 12)}...)
                      </div>
                    </div>

                    {/* Detalle relevante */}
                    {ev.detail && Object.keys(ev.detail).length > 0 && (
                      <div style={{
                        marginTop: '8px',
                        background: 'rgba(0,0,0,0.02)',
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-xs)',
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        borderTop: '1px solid var(--border-light)'
                      }}>
                        {ev.detail.reason && <div><strong>Motivo:</strong> {ev.detail.reason}</div>}
                        {ev.detail.reasons && Array.isArray(ev.detail.reasons) && (
                          <div><strong>Observaciones:</strong> {ev.detail.reasons.join(', ')}</div>
                        )}
                        {ev.detail.newState && <div><strong>Nuevo Estado:</strong> {ev.detail.newState}</div>}
                        {ev.detail.previousVersion && (
                          <div><strong>Versión anterior:</strong> v{ev.detail.previousVersion} &rarr; <strong>Nueva:</strong> v{ev.detail.newVersion}</div>
                        )}
                        {ev.detail.message && <div>{ev.detail.message}</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. ASIENTO CONTABLE */}
          {activeTab === 'entry' && entry && (
            <div>
              <div style={{ 
                background: 'var(--bg-subtle)', 
                padding: '12px', 
                borderRadius: 'var(--radius-sm)', 
                marginBottom: '12px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '8px',
                fontSize: '12px'
              }}>
                <div>
                  <span className="form-label">ID Asiento</span>
                  <div className="mono" style={{ fontSize: '11px' }}>{entry.id}</div>
                </div>
                <div>
                  <span className="form-label">Operación y Moneda</span>
                  <div>{entry.operationType} &bull; <strong>{entry.currency || 'PEN'}</strong></div>
                </div>
                <div>
                  <span className="form-label">Plantilla y Versión</span>
                  <div>{entry.templateId} (v{entry.templateVersion})</div>
                </div>
                <div>
                  <span className="form-label">Estado</span>
                  <div className="badge badge--info">{entry.state}</div>
                </div>
              </div>

              {entry.fx && (
                <div style={{
                  padding: '8px 12px',
                  background: entry.provisionalFxRate ? 'var(--color-warning-bg)' : 'var(--color-info-bg)',
                  border: `1px solid ${entry.provisionalFxRate ? 'var(--color-warning-border)' : 'var(--color-info-border)'}`,
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '12px',
                  fontSize: '11.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <DollarSign size={14} />
                  <span><strong>Tipo de Cambio SUNAT:</strong> S/ {(entry.fx.rateMilli / 1000).toFixed(3)} ({entry.fx.rateDate})</span>
                  {entry.provisionalFxRate && (
                    <span className="badge badge--warning">Tasa provisional</span>
                  )}
                </div>
              )}

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '30px' }}>#</th>
                      <th>Cuenta</th>
                      <th>Descripción</th>
                      <th>Centro Costo</th>
                      <th>Regla</th>
                      <th className="text-right">Debe (S/)</th>
                      <th className="text-right">Haber (S/)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(entry.lines || []).map((l, i) => (
                      <tr key={i}>
                        <td className="mono">{l.lineNo || i + 1}</td>
                        <td className="mono" style={{ fontWeight: 600 }}>{l.accountCode}</td>
                        <td style={{ fontSize: '11.5px' }}>{catalogMap[l.accountCode] || '—'}</td>
                        <td className="mono" style={{ fontSize: '11px' }}>{l.costCenter || '—'}</td>
                        <td className="mono" style={{ fontSize: '11px' }}>{l.ruleId || 'defaults'}</td>
                        <td className="text-right mono">{l.side === 'D' ? fmtMoney(l.functionalAmountCents) : '0.00'}</td>
                        <td className="text-right mono">{l.side === 'H' ? fmtMoney(l.functionalAmountCents) : '0.00'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. PLANTILLA Y REGLAS */}
          {activeTab === 'template' && template && (
            <div>
              <div style={{
                background: 'var(--bg-subtle)',
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '14px',
                border: '1px solid var(--border-light)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                    {template.code} — {template.name}
                  </h4>
                  <span className="badge badge--neutral">Versión {template.version}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px', fontSize: '12px' }}>
                  <div>
                    <span className="form-label">Cuenta Base</span>
                    <span className="mono">{template.defaults?.baseAccount || '—'}</span>
                  </div>
                  <div>
                    <span className="form-label">Cuenta IGV</span>
                    <span className="mono">{template.defaults?.taxAccount || '—'}</span>
                  </div>
                  <div>
                    <span className="form-label">Contrapartida</span>
                    <span className="mono">{template.defaults?.counterpartAccount || '—'}</span>
                  </div>
                  <div>
                    <span className="form-label">Exige Centro de Costo</span>
                    <span>{template.defaults?.requiresCostCenter ? 'Sí' : 'No'}</span>
                  </div>
                </div>
              </div>

              {/* Reglas aplicadas en este documento */}
              <div style={{ marginBottom: '14px' }}>
                <span className="form-label" style={{ marginBottom: '6px' }}>Reglas de Negocio Aplicadas en este Asiento:</span>
                {entry?.appliedRules && entry.appliedRules.length > 0 ? (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {entry.appliedRules.map((r, i) => (
                      <span key={i} className="badge badge--info mono" style={{ fontSize: '11px', padding: '3px 8px' }}>
                        {r}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Se aplicaron las cuentas y configuraciones por defecto de la plantilla (sin reglas condicionales activadas).
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 4. DOCUMENTO CANÓNICO */}
          {activeTab === 'document' && document && (
            <div>
              <div style={{
                background: 'var(--bg-subtle)',
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '14px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '8px',
                fontSize: '12px'
              }}>
                <div>
                  <span className="form-label">Emisor</span>
                  <div><strong>{document.issuer?.name}</strong></div>
                  <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>RUC: {document.issuer?.fiscalId}</div>
                </div>
                <div>
                  <span className="form-label">Receptor</span>
                  <div><strong>{document.receiver?.name}</strong></div>
                  <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>RUC: {document.receiver?.fiscalId}</div>
                </div>
                <div>
                  <span className="form-label">Comprobante</span>
                  <div className="mono">{document.seriesAndNumber}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Fecha: {document.issueDate} &bull; Moneda: {document.currency}</div>
                </div>
                <div>
                  <span className="form-label">Total Documento</span>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>
                    {document.currency === 'USD' ? '$' : 'S/'} {fmtMoney(document.totals?.totalAmount ?? document.totalCents)}
                  </div>
                </div>
              </div>

              <span className="form-label" style={{ marginBottom: '6px' }}>Líneas de Detalle del Comprobante:</span>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '30px' }}>#</th>
                      <th>Descripción Ítem / Servicio</th>
                      <th>Tributo</th>
                      <th className="text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(document.lines || []).map((l, i) => (
                      <tr key={i}>
                        <td className="mono">{l.lineNo || i + 1}</td>
                        <td>{l.description}</td>
                        <td><span className="badge badge--neutral">{l.taxType || l.taxCode || 'IGV'}</span></td>
                        <td className="text-right mono">{fmtMoney(l.amountCents ?? l.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. EVIDENCIA ORIGINAL */}
          {activeTab === 'evidence' && rawPayload && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '12px' }}>
                <div>
                  Archivo: <strong>{rawPayload.fileName}</strong> &bull; Tamaño: {(rawPayload.sizeBytes / 1024).toFixed(1)} KB
                  {rawPayload.contentSha256 && (
                    <span style={{ marginLeft: '12px' }} className="mono">
                      SHA-256: {rawPayload.contentSha256.slice(0, 16)}...
                    </span>
                  )}
                </div>
              </div>
              <pre
                className="mono"
                style={{
                  background: '#0F172A',
                  color: '#F8FAFC',
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  maxHeight: '380px',
                  overflow: 'auto',
                  fontSize: '11.5px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                {rawPayload.content || 'Sin contenido de evidencia.'}
              </pre>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default TraceabilityModal;

