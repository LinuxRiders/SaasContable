import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useIngestionContext } from '../hooks/useIngestionContext.js';
import { MetricCard } from '../components/MetricCard.jsx';
import { EntryDetailModal } from '../components/ingestion/EntryDetailModal.jsx';
import { TraceabilityModal } from '../components/ingestion/TraceabilityModal.jsx';
import { queryPendingApproval } from '../services/ingestion/index.js';
import { formatMoney } from '../domain/ingestion/money.js';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Eye, 
  History, 
  RefreshCw, 
  Filter, 
  ShieldCheck, 
  FileText,
  DollarSign,
  Info
} from 'lucide-react';

export const PendientesAprobacionView = () => {
  const ctx = useIngestionContext();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filtros
  const [provisionalOnly, setProvisionalOnly] = useState(false);

  // Modales
  const [detailItem, setDetailItem] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTraceId, setSelectedTraceId] = useState(null);
  const [isTraceModalOpen, setIsTraceModalOpen] = useState(false);

  // Cargar datos
  const loadPendingData = useCallback(async () => {
    if (!ctx?.tenantId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await queryPendingApproval(ctx, {
        provisionalOnly
      });

      if (res.ok) {
        setItems(res.data?.items || []);
        setTotal(res.data?.total || 0);
      } else {
        setError(res.error?.message || 'Error al consultar pendientes de aprobación');
      }
    } catch (err) {
      setError(err.message || 'Error inesperado al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [ctx, provisionalOnly]);

  useEffect(() => {
    loadPendingData();
  }, [loadPendingData]);

  // Recargar si hay cambios de almacenamiento en otra pestaña
  useEffect(() => {
    const handleStorageChange = () => {
      loadPendingData();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadPendingData]);

  // Métricas
  const metrics = useMemo(() => {
    const humanReviewCount = items.filter(i => i.requiresHumanReview).length;
    const penCount = items.filter(i => i.currency === 'PEN').length;
    const usdCount = items.filter(i => i.currency === 'USD').length;

    return {
      total,
      humanReviewCount,
      penCount,
      usdCount
    };
  }, [items, total]);

  const handleOpenDetail = (item) => {
    setDetailItem(item);
    setIsDetailModalOpen(true);
  };

  const handleOpenTrace = (traceId) => {
    setSelectedTraceId(traceId);
    setIsTraceModalOpen(true);
  };

  return (
    <div className="content-body" style={{ padding: '2rem' }}>
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ margin: 0, color: 'var(--text-color)' }}>Pendientes de Aprobación</h2>
            <span className="badge badge--info" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={13} />
              Solo lectura (RF-13)
            </span>
          </div>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>
            Asientos contables validados y cuadrados en espera del ciclo de aprobación Maker-Checker.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn btn--secondary"
            onClick={loadPendingData}
            disabled={loading}
            title="Actualizar lista"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid-metrics" style={{ marginBottom: '1.5rem' }}>
        <MetricCard
          title="Total Pendientes"
          value={metrics.total}
          subtext="Asientos balanceados listos para aprobación"
          badgeText="PENDING"
          badgeType="info"
        />
        <MetricCard
          title="Revisión Humana"
          value={metrics.humanReviewCount}
          subtext="Por tasa de cambio provisional"
          badgeText={metrics.humanReviewCount > 0 ? 'ATENCIÓN' : 'AL DÍA'}
          badgeType={metrics.humanReviewCount > 0 ? 'warning' : 'success'}
        />
        <MetricCard
          title="En Soles (PEN)"
          value={metrics.penCount}
          subtext="Moneda funcional estándar"
          badgeText="PEN"
          badgeType="neutral"
        />
        <MetricCard
          title="En Dólares (USD)"
          value={metrics.usdCount}
          subtext="Convertidos al tipo de cambio SUNAT"
          badgeText="USD"
          badgeType="neutral"
        />
      </div>

      {/* Barra de Filtros */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '13px' }}>
            <Filter size={15} />
            <span style={{ fontWeight: 600 }}>Filtros:</span>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={provisionalOnly}
              onChange={(e) => setProvisionalOnly(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <span>Solo comprobantes con tasa provisional (requieren revisión humana)</span>
          </label>
        </div>

        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Mostrando <strong>{items.length}</strong> de <strong>{total}</strong> asientos
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="callout callout--danger" style={{ marginBottom: '1.5rem' }}>
          <AlertTriangle size={16} />
          <div>{error}</div>
        </div>
      )}

      {/* Tabla de Asientos */}
      <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
        {items.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={40} style={{ color: 'var(--color-success)', margin: '0 auto 12px', display: 'block', opacity: 0.8 }} />
            <h4 style={{ margin: '0 0 6px', color: 'var(--text-color)' }}>No hay asientos pendientes de aprobación</h4>
            <p style={{ margin: 0, fontSize: '13px' }}>
              {provisionalOnly 
                ? 'No se encontraron asientos con tipo de cambio provisional.' 
                : 'Todos los comprobantes recibidos están procesados o en bandeja de excepciones.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-subtle, #f8fafc)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Cód. Seguimiento</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Operación</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Contraparte</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Comprobante</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Emisión</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'right' }}>Total Original</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'right' }}>Total PEN</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Plantilla</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Revisión</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {/* Código de Seguimiento */}
                    <td style={{ padding: '10px 14px' }}>
                      <span 
                        className="mono" 
                        style={{ 
                          fontSize: '11px', 
                          background: 'var(--bg-muted, #f1f5f9)', 
                          padding: '2px 6px', 
                          borderRadius: '4px',
                          cursor: 'pointer' 
                        }}
                        title={`TraceId: ${row.traceId} (clic para ver trazabilidad)`}
                        onClick={() => handleOpenTrace(row.traceId)}
                      >
                        {row.traceId ? `${row.traceId.slice(0, 8)}...` : '-'}
                      </span>
                    </td>

                    {/* Operación */}
                    <td style={{ padding: '10px 14px' }}>
                      <span className={`badge badge--${row.operationType === 'COMPRA' ? 'info' : 'success'}`}>
                        {row.operationType}
                      </span>
                    </td>

                    {/* Contraparte */}
                    <td style={{ padding: '10px 14px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.counterpartyName}>
                      {row.counterpartyName || <span style={{ color: 'var(--text-muted)' }}>Sin identificar</span>}
                    </td>

                    {/* Comprobante */}
                    <td style={{ padding: '10px 14px', fontWeight: 500 }} className="mono">
                      {row.documentNumber || '-'}
                    </td>

                    {/* Fecha de Emisión */}
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>
                      {row.issueDate || '-'}
                    </td>

                    {/* Total Original */}
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }} className="mono">
                      {formatMoney(row.totalCents, row.currency)}
                    </td>

                    {/* Total en PEN */}
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-color)' }} className="mono">
                      {row.currency !== 'PEN' ? formatMoney(row.functionalTotalCents, 'PEN') : '-'}
                    </td>

                    {/* Plantilla y versión */}
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: '12px' }}>
                        <strong>{row.templateId || 'N/A'}</strong> {row.templateVersion ? `v${row.templateVersion}` : ''}
                      </span>
                    </td>

                    {/* Estado / Revisión */}
                    <td style={{ padding: '10px 14px' }}>
                      {row.requiresHumanReview ? (
                        <span 
                          className="badge badge--warning" 
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                          title="Tasa de cambio provisional: requiere aprobación humana"
                        >
                          <AlertTriangle size={12} />
                          Requiere revisión humana
                        </span>
                      ) : (
                        <span 
                          className="badge badge--neutral"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)' }}
                        >
                          <CheckCircle2 size={12} style={{ color: 'var(--color-success)' }} />
                          Listo para aprobación
                        </span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                        <button
                          className="btn btn--icon btn--ghost"
                          title="Ver detalle del asiento y comprobante"
                          onClick={() => handleOpenDetail(row)}
                          style={{ padding: '4px 6px' }}
                        >
                          <Eye size={15} />
                        </button>

                        <button
                          className="btn btn--icon btn--ghost"
                          title="Ver trazabilidad completa"
                          onClick={() => handleOpenTrace(row.traceId)}
                          style={{ padding: '4px 6px' }}
                        >
                          <History size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Aviso legal y de control interno */}
      <div className="callout callout--neutral" style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <Info size={16} style={{ marginTop: '2px', flexShrink: 0, color: 'var(--text-muted)' }} />
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          <strong>Control de Integridad (CA-13.3):</strong> Esta vista es de solo consulta. Los asientos en estado <em>Pendiente de aprobación</em> no afectan el Libro Diario, Mayor, Balance de Comprobación ni liquidaciones de impuestos hasta que un usuario con rol <strong>Checker</strong> diferente al creador (Maker) apruebe formalmente el asiento.
        </div>
      </div>

      {/* Modal de Detalle del Asiento */}
      <EntryDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        item={detailItem}
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

export default PendientesAprobacionView;
