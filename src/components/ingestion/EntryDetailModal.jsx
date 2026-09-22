import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal.jsx';
import * as repository from '../../services/storage/repository.js';
import { getRawPayload } from '../../services/ingestion/index.js';
import { 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Copy, 
  Check, 
  Hash, 
  Building2, 
  Calendar, 
  DollarSign,
  AlertTriangle 
} from 'lucide-react';

/**
 * Modal para visualizar el detalle de un asiento generado, documento canónico
 * y payload crudo original (CA-10.3, CA-02.4, CA-20.4, T066).
 */
export const EntryDetailModal = ({ isOpen, onClose, item, ctx }) => {
  const [activeTab, setActiveTab] = useState('entry'); // 'entry' | 'raw'
  const [entry, setEntry] = useState(null);
  const [document, setDocument] = useState(null);
  const [rawPayload, setRawPayload] = useState(null);
  const [catalogMap, setCatalogMap] = useState({});
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !item) {
      setEntry(null);
      setDocument(null);
      setRawPayload(null);
      return;
    }

    setLoading(true);
    const tenantId = ctx?.tenantId || item.tenantId || '01';

    // 1. Cargar catálogo de cuentas para resolver descripciones
    const catalog = repository.getCollection(tenantId, 'chartOfAccounts') || [];
    const catMap = {};
    catalog.forEach(acc => {
      catMap[acc.codigo] = acc.descripcion;
    });
    setCatalogMap(catMap);

    const docId = item.documentId || item.duplicateOfDocumentId;

    // 2. Buscar JournalEntry
    const entries = repository.getCollection(tenantId, 'journalEntries') || [];
    let foundEntry = null;
    if (item.journalEntryId) {
      foundEntry = entries.find(e => e.id === item.journalEntryId);
    } else if (docId) {
      foundEntry = entries.find(e => e.documentId === docId || e.canonicalDocRef === docId);
    } else if (item.traceId) {
      foundEntry = entries.find(e => e.traceId === item.traceId);
    } else if (item.id) {
      foundEntry = entries.find(e => e.id === item.id);
    }
    setEntry(foundEntry);

    // 3. Buscar CanonicalDocument
    const docs = repository.getCollection(tenantId, 'documents') || [];
    let foundDoc = null;
    if (docId) {
      foundDoc = docs.find(d => d.id === docId);
    } else if (foundEntry?.documentId) {
      foundDoc = docs.find(d => d.id === foundEntry.documentId);
    } else if (foundEntry?.canonicalDocRef) {
      foundDoc = docs.find(d => d.id === foundEntry.canonicalDocRef);
    } else if (item.traceId) {
      foundDoc = docs.find(d => d.traceId === item.traceId);
    }
    setDocument(foundDoc);

    // 4. Buscar RawPayload
    const rawPayloadId = foundEntry?.rawPayloadId || foundDoc?.rawPayloadRef || item.rawPayloadId;
    if (rawPayloadId) {
      getRawPayload(ctx || { tenantId }, { rawPayloadId }).then(res => {
        if (res.ok) setRawPayload(res.data);
      });
    } else if (item.traceId) {
      const payloads = repository.getCollection(tenantId, 'rawPayloads') || [];
      const foundPayload = payloads.find(p => p.traceId === item.traceId);
      setRawPayload(foundPayload || null);
    }

    setLoading(false);
  }, [isOpen, item, ctx]);

  const handleCopy = () => {
    if (rawPayload?.content) {
      navigator.clipboard.writeText(rawPayload.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  // Formato de céntimos a Soles
  const fmtMoney = (cents) => {
    if (cents === undefined || cents === null) return '0.00';
    return (cents / 100).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Cálculo de totales Debe y Haber
  let totalDebitCents = 0;
  let totalCreditCents = 0;
  if (entry?.lines) {
    entry.lines.forEach(l => {
      if (l.side === 'D') totalDebitCents += (l.functionalAmountCents || 0);
      if (l.side === 'H') totalCreditCents += (l.functionalAmountCents || 0);
    });
  }
  const isBalanced = totalDebitCents === totalCreditCents;
  const origCurrency = document?.currency || entry?.currency || 'PEN';
  const isForeignCurrency = origCurrency !== 'PEN';
  const origSymbol = origCurrency === 'USD' ? '$' : origCurrency;

  const title = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <FileText size={18} color="var(--color-accent)" />
      <span>Detalle de Comprobante: {document?.seriesAndNumber || item?.fileName || 'Comprobante'}</span>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="780px"
      footer={
        <button className="btn btn--secondary" onClick={onClose}>
          Cerrar
        </button>
      }
    >
      <div className="tabs-bar" style={{ marginBottom: '16px' }}>
        <button
          className={`tab-btn ${activeTab === 'entry' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('entry')}
        >
          Asiento Contable
        </button>
        <button
          className={`tab-btn ${activeTab === 'raw' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('raw')}
        >
          Contenido Original ({rawPayload?.contentType || 'Evidencia'})
        </button>
      </div>

      {activeTab === 'entry' && (
        <div>
          {/* Cabecera del documento y metadatos del asiento */}
          <div style={{ 
            background: 'var(--bg-subtle)', 
            padding: '12px 16px', 
            borderRadius: 'var(--radius-sm)', 
            marginBottom: '16px',
            border: '1px solid var(--border-light)'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <div>
                <span className="form-label" style={{ marginBottom: '2px' }}>Emisor</span>
                <div style={{ fontWeight: 600, fontSize: '12.5px' }}>
                  {document?.issuer?.name || '—'}
                </div>
                <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  RUC: {document?.issuer?.fiscalId || '—'}
                </div>
              </div>
              <div>
                <span className="form-label" style={{ marginBottom: '2px' }}>Receptor</span>
                <div style={{ fontWeight: 600, fontSize: '12.5px' }}>
                  {document?.receiver?.name || '—'}
                </div>
                <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  RUC: {document?.receiver?.fiscalId || '—'}
                </div>
              </div>
              <div>
                <span className="form-label" style={{ marginBottom: '2px' }}>Emisión y Moneda</span>
                <div style={{ fontSize: '12.5px' }}>
                  {document?.issueDate || '—'} &bull; <strong>{origCurrency}</strong>
                </div>
                <div className="mono" style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  {isForeignCurrency ? (
                    <span>
                      {origSymbol} {fmtMoney(document?.totalCents)} ({origCurrency}) &rarr; S/ {fmtMoney(totalDebitCents)}
                    </span>
                  ) : (
                    <span>Total: S/ {fmtMoney(document?.totalCents)}</span>
                  )}
                </div>
              </div>
              <div>
                <span className="form-label" style={{ marginBottom: '2px' }}>Plantilla y Versión</span>
                <div style={{ fontSize: '12.5px', fontWeight: 600 }}>
                  {entry?.templateId || item?.templateId || '—'} 
                  <span className="badge badge--neutral" style={{ marginLeft: '6px' }}>
                    v{entry?.templateVersion || '1'}
                  </span>
                </div>
                <div style={{ fontSize: '11.5px', marginTop: '2px' }}>
                  Estado:{' '}
                  {entry?.state === 'PENDING_APPROVAL' ? (
                    <span className="badge badge--info">Por Aprobar</span>
                  ) : entry?.state === 'PENDING_INPUT' ? (
                    <span className="badge badge--warning">En Bandeja</span>
                  ) : (
                    <span className="badge badge--neutral">{entry?.state || item?.entryState || 'Sin Asiento'}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Información de tipo de cambio FX */}
          {entry?.fx && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '16px',
              background: entry.provisionalFxRate ? 'var(--color-warning-bg)' : 'var(--color-info-bg)',
              border: `1px solid ${entry.provisionalFxRate ? 'var(--color-warning-border)' : 'var(--color-info-border)'}`,
              fontSize: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DollarSign size={15} color={entry.provisionalFxRate ? 'var(--color-warning-dark)' : 'var(--color-info)'} />
                <span>
                  <strong>Tipo de Cambio SUNAT:</strong> S/ {(entry.fx.rateMilli / 1000).toFixed(3)}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>
                  (Cotización al {entry.fx.rateDate || document?.issueDate})
                </span>
              </div>
              {entry.provisionalFxRate ? (
                <span className="badge badge--warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <AlertTriangle size={11} /> Tasa provisional (requiere revisión humana)
                </span>
              ) : (
                <span className="badge badge--success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={11} /> Tasa oficial del día
                </span>
              )}
            </div>
          )}

          {/* Alerta si tiene motivos de observación (PENDING_INPUT) */}
          {entry?.pendingReasons && entry.pendingReasons.length > 0 && (
            <div className="callout callout--warning" style={{ marginBottom: '16px' }}>
              <AlertCircle size={16} />
              <div>
                <strong>Observaciones pendientes ({entry.pendingReasons.length}):</strong>
                <ul style={{ paddingLeft: '18px', marginTop: '4px' }}>
                  {entry.pendingReasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Tabla de líneas contables */}
          {entry?.lines && entry.lines.length > 0 ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Líneas del Asiento ({entry.lines.length})
                </h4>
                {isBalanced ? (
                  <span className="badge badge--success" style={{ fontSize: '10.5px' }}>
                    <CheckCircle2 size={11} /> Balance Cuadrado
                  </span>
                ) : (
                  <span className="badge badge--danger" style={{ fontSize: '10.5px' }}>
                    <AlertCircle size={11} /> Descuadrado
                  </span>
                )}
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '30px' }}>#</th>
                      <th>Cuenta</th>
                      <th>Descripción Cuenta</th>
                      <th>Centro Costo</th>
                      <th>Regla Aplicada</th>
                      {isForeignCurrency && (
                        <th className="text-right">Monto Original ({origCurrency})</th>
                      )}
                      <th className="text-right">Debe (S/)</th>
                      <th className="text-right">Haber (S/)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entry.lines.map((line, idx) => (
                      <tr key={idx}>
                        <td className="mono" style={{ color: 'var(--text-muted)' }}>{line.lineNo || idx + 1}</td>
                        <td className="mono" style={{ fontWeight: 600 }}>{line.accountCode}</td>
                        <td style={{ fontSize: '12px' }}>
                          {catalogMap[line.accountCode] || '—'}
                        </td>
                        <td>
                          {line.costCenter ? (
                            <span className="badge badge--neutral mono" style={{ fontSize: '10.5px' }}>
                              {line.costCenter}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-subtle)' }}>—</span>
                          )}
                        </td>
                        <td>
                          {line.ruleId ? (
                            <span className="badge badge--info mono" style={{ fontSize: '10.5px' }}>
                              {line.ruleId}
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Por defecto</span>
                          )}
                        </td>
                        {isForeignCurrency && (
                          <td className="text-right mono">
                            {line.originalAmountCents !== undefined && line.originalAmountCents !== null ? (
                              <span>{origSymbol} {fmtMoney(line.originalAmountCents)}</span>
                            ) : (
                              <span style={{ color: 'var(--text-subtle)' }}>—</span>
                            )}
                          </td>
                        )}
                        <td className="text-right mono" style={{ fontWeight: line.side === 'D' ? 600 : 400 }}>
                          {line.side === 'D' ? fmtMoney(line.functionalAmountCents) : '0.00'}
                        </td>
                        <td className="text-right mono" style={{ fontWeight: line.side === 'H' ? 600 : 400 }}>
                          {line.side === 'H' ? fmtMoney(line.functionalAmountCents) : '0.00'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--bg-subtle)', fontWeight: 700 }}>
                      <td colSpan={isForeignCurrency ? 6 : 5} className="text-right" style={{ fontSize: '12px' }}>
                        TOTALES (PEN):
                      </td>
                      <td className="text-right mono">{fmtMoney(totalDebitCents)}</td>
                      <td className="text-right mono">{fmtMoney(totalCreditCents)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No se generó asiento contable para este comprobante (posiblemente fallido o rechazado).
            </div>
          )}
        </div>
      )}

      {activeTab === 'raw' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              <span>Archivo: <strong>{rawPayload?.fileName || item?.fileName || '—'}</strong></span>
              {rawPayload?.contentSha256 && (
                <span style={{ marginLeft: '12px' }} className="mono">
                  SHA-256: {rawPayload.contentSha256.slice(0, 16)}...
                </span>
              )}
            </div>
            <button
              className="btn btn--secondary btn--sm"
              onClick={handleCopy}
              disabled={!rawPayload?.content}
            >
              {copied ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>

          <pre
            className="mono"
            style={{
              background: '#0F172A',
              color: '#F8FAFC',
              padding: '14px',
              borderRadius: 'var(--radius-sm)',
              maxHeight: '360px',
              overflow: 'auto',
              fontSize: '11.5px',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          >
            {rawPayload?.content || 'No hay contenido disponible para este registro.'}
          </pre>
        </div>
      )}
    </Modal>
  );
};

export default EntryDetailModal;
