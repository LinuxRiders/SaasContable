import React from 'react';
import { MetricCard } from '../MetricCard.jsx';
import { FileText, Eye, AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';

/**
 * Componente que muestra el resumen de ejecución de un lote de ingestión
 * (CA-01.4, T065)
 */
export const BatchSummary = ({ batch, onViewDetail }) => {
  if (!batch || !batch.summary) return null;

  const { summary, items = [] } = batch;

  const getOutcomeBadge = (outcome, state) => {
    if (state === 'PENDING_APPROVAL') {
      return <span className="badge badge--info"><Clock size={12} /> Por Aprobar</span>;
    }
    if (state === 'PENDING_INPUT') {
      return <span className="badge badge--warning"><AlertCircle size={12} /> En Bandeja</span>;
    }
    switch (outcome) {
      case 'ACCEPTED':
        return <span className="badge badge--success"><CheckCircle2 size={12} /> Aceptado</span>;
      case 'DUPLICATE':
      case 'DUPLICATE_WITH_DIFF':
        return <span className="badge badge--warning"><AlertCircle size={12} /> Duplicado</span>;
      case 'FAILED':
        return <span className="badge badge--danger"><XCircle size={12} /> Fallido</span>;
      case 'REJECTED':
      case 'REJECTED_NOT_TENANT':
        return <span className="badge badge--danger"><XCircle size={12} /> Rechazado</span>;
      default:
        return <span className="badge badge--neutral">{outcome || 'Desconocido'}</span>;
    }
  };

  return (
    <div className="batch-summary" style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
          Resumen del Lote #{batch.id?.slice(-8) || ''}
        </h3>
        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
          Plantilla: <strong>{batch.templateId} v{batch.templateVersion}</strong>
        </span>
      </div>

      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
        <MetricCard title="Recibidos" value={summary.totalReceived ?? 0} />
        <MetricCard title="Aceptados" value={summary.acceptedCount ?? 0} badgeType="success" />
        <MetricCard title="Por Aprobar" value={summary.pendingApprovalCount ?? 0} badgeType="info" />
        <MetricCard title="En Bandeja" value={summary.stagedCount ?? 0} badgeType="warning" />
        <MetricCard title="Duplicados" value={summary.duplicateCount ?? 0} badgeType="warning" />
        <MetricCard title="Fallidos" value={summary.failedCount ?? 0} badgeType="danger" />
        <MetricCard title="Rechazados" value={summary.rejectedCount ?? 0} badgeType="danger" />
      </div>

      <div className="table-container" style={{ marginTop: '14px' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Archivo</th>
              <th>Resultado</th>
              <th>Estado Asiento</th>
              <th>Detalle / Motivo</th>
              <th className="text-center">Acción</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={idx}>
                <td className="mono" style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={14} color="var(--text-muted)" />
                    <span style={{ fontWeight: 500 }}>{it.fileName}</span>
                  </div>
                </td>
                <td>{getOutcomeBadge(it.outcome, it.entryState)}</td>
                <td>
                  {it.entryState ? (
                    <span className="mono" style={{ fontSize: '11px' }}>{it.entryState}</span>
                  ) : (
                    <span style={{ color: 'var(--text-subtle)' }}>—</span>
                  )}
                </td>
                <td style={{ fontSize: '12px', color: it.outcomeReason ? 'var(--color-danger-dark)' : 'var(--text-muted)' }}>
                  {it.outcomeReason || (it.pendingReasons?.length ? it.pendingReasons.join(', ') : 'Procesado correctamente')}
                </td>
                <td className="text-center">
                  {(it.journalEntryId || it.traceId) && onViewDetail && (
                    <button
                      className="btn btn--secondary btn--sm"
                      onClick={() => onViewDetail(it)}
                      title="Ver detalle de trazabilidad o asiento"
                      style={{ padding: '3px 8px' }}
                    >
                      <Eye size={13} />
                      <span>Ver</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BatchSummary;
