import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useIngestionContext } from '../hooks/useIngestionContext.js';
import { MetricCard } from '../components/MetricCard.jsx';
import { Modal } from '../components/Modal.jsx';
import { ReadOnlyPeriodBanner } from '../components/ingestion/ReadOnlyPeriodBanner.jsx';
import ReasonBadges, { REASON_CONFIG } from '../components/ingestion/ReasonBadges.jsx';
import { EntryDetailModal } from '../components/ingestion/EntryDetailModal.jsx';
import { TraceabilityModal } from '../components/ingestion/TraceabilityModal.jsx';
import { 
  queryStaging, 
  updateStagingEntries, 
  revalidateEntries, 
  cancelEntry, 
  listTemplates 
} from '../services/ingestion/index.js';
import { formatMoney } from '../domain/ingestion/money.js';
import { 
  Inbox, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Filter, 
  Tag, 
  Layers, 
  CheckSquare, 
  Eye, 
  ArrowRight, 
  X, 
  XCircle, 
  AlertCircle,
  History 
} from 'lucide-react';

export const BandejaView = () => {
  const ctx = useIngestionContext();

  // Estados de carga y datos
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [templates, setTemplates] = useState([]);

  // Filtros
  const [filterReason, setFilterReason] = useState('');
  const [filterOperation, setFilterOperation] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterCurrency, setFilterCurrency] = useState('');
  const [filterOverdueOnly, setFilterOverdueOnly] = useState(false);

  // Selección de filas
  const [selectedIds, setSelectedIds] = useState([]);

  // Notificación de resultado de acciones
  const [actionFeedback, setActionFeedback] = useState(null);

  // Modales
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completeCostCenter, setCompleteCostCenter] = useState('CC-ADMIN');
  const [completeProjectTag, setCompleteProjectTag] = useState('');

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedNewTemplateId, setSelectedNewTemplateId] = useState('');

  const [detailItem, setDetailItem] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [cancelItem, setCancelItem] = useState(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState(null);

  const [selectedTraceId, setSelectedTraceId] = useState(null);
  const [isTraceModalOpen, setIsTraceModalOpen] = useState(false);

  // 1. Cargar datos de la bandeja
  const loadStagingData = useCallback(async () => {
    if (!ctx?.tenantId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await queryStaging(ctx, {
        reason: filterReason || undefined,
        operationType: filterOperation || undefined,
        from: filterFrom || undefined,
        to: filterTo || undefined,
        currency: filterCurrency || undefined,
        overdueOnly: filterOverdueOnly || undefined,
        page: 1,
        pageSize: 100
      });

      if (res.ok) {
        setItems(res.data.items || []);
        setTotal(res.data.total || 0);
      } else {
        setError(res.error?.message || 'Error al consultar la bandeja');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [ctx, filterReason, filterOperation, filterFrom, filterTo, filterCurrency, filterOverdueOnly]);

  // 2. Cargar plantillas activas de la empresa para el modal de cambio de plantilla
  const loadTemplatesData = useCallback(async () => {
    if (!ctx?.tenantId) return;
    try {
      const res = await listTemplates(ctx);
      if (res.ok) {
        setTemplates(res.data.templates || []);
      }
    } catch {
      // Ignorar errores de plantillas en segundo plano
    }
  }, [ctx]);

  useEffect(() => {
    loadStagingData();
  }, [loadStagingData]);

  useEffect(() => {
    loadTemplatesData();
  }, [loadTemplatesData]);

  // 3. Sincronización multi-pestaña mediante evento storage (R-09)
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key && ctx?.tenantId && e.key.includes(ctx.tenantId)) {
        loadStagingData();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [ctx?.tenantId, loadStagingData]);

  // Limpiar selección si los items cambian y ya no contienen los seleccionados
  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => items.some((it) => it.id === id)));
  }, [items]);

  // Cálculos para MetricCards
  const metrics = useMemo(() => {
    const totalCount = items.length;
    const overdueCount = items.filter((i) => i.overdue).length;
    const missingCCCount = items.filter((i) => i.pendingReasons.includes('MISSING_COST_CENTER')).length;
    const unbalCount = items.filter((i) => 
      i.pendingReasons.includes('UNBALANCED') || 
      i.pendingReasons.includes('INCONSISTENT_AMOUNTS') || 
      i.pendingReasons.includes('ACCOUNT_NOT_FOUND')
    ).length;

    return { totalCount, overdueCount, missingCCCount, unbalCount };
  }, [items]);

  // Elementos seleccionados actualmente
  const selectedItems = useMemo(() => {
    return items.filter((it) => selectedIds.includes(it.id));
  }, [items, selectedIds]);

  // Intersección de allowedActions de los elementos seleccionados
  const canPerform = useMemo(() => {
    const isMaker = ctx?.role === 'MAKER';
    const isWritable = isMaker && !ctx?.readOnly;

    if (selectedItems.length === 0 || !isWritable) {
      return { complete: false, changeTemplate: false, revalidate: false };
    }

    const complete = selectedItems.every((it) => it.allowedActions.includes('COMPLETE'));
    const changeTemplate = selectedItems.every((it) => it.allowedActions.includes('CHANGE_TEMPLATE'));
    const revalidate = selectedItems.every((it) => it.allowedActions.includes('REVALIDATE'));

    return { complete, changeTemplate, revalidate };
  }, [selectedItems, ctx]);

  // Manejador de selección de todas las filas
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(items.map((it) => it.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Acción: Completar CC y etiquetas
  const handleExecuteComplete = async () => {
    if (!completeCostCenter) return;
    setLoading(true);
    setActionFeedback(null);

    try {
      const updates = selectedItems.map((item) => ({
        id: item.id,
        expectedVersion: item.entityVersion,
        costCenter: completeCostCenter,
        analyticTags: completeProjectTag ? { proyecto: completeProjectTag } : undefined
      }));

      const res = await updateStagingEntries(ctx, { updates });
      setIsCompleteModalOpen(false);

      if (res.ok) {
        const advanced = res.data.results.filter((r) => r.status === 'ADVANCED').length;
        const stillPending = res.data.results.filter((r) => r.status === 'STILL_PENDING').length;
        const conflicts = res.data.results.filter((r) => r.status === 'CONFLICT').length;
        const errors = res.data.results.filter((r) => r.status === 'ERROR').length;

        setActionFeedback({
          type: conflicts > 0 || errors > 0 ? 'warning' : 'success',
          message: `Acción completada: ${advanced} avanzado(s) a aprobación, ${stillPending} aún pendiente(s)${conflicts > 0 ? `, ${conflicts} conflicto(s) de versión` : ''}${errors > 0 ? `, ${errors} error(es)` : ''}.`
        });

        setSelectedIds([]);
        loadStagingData();
      } else {
        setActionFeedback({ type: 'danger', message: res.error?.message || 'Error al actualizar asientos' });
      }
    } catch (err) {
      setActionFeedback({ type: 'danger', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Acción: Cambiar Plantilla
  const handleExecuteChangeTemplate = async () => {
    if (!selectedNewTemplateId) return;
    setLoading(true);
    setActionFeedback(null);

    try {
      const updates = selectedItems.map((item) => ({
        id: item.id,
        expectedVersion: item.entityVersion,
        templateId: selectedNewTemplateId
      }));

      const res = await updateStagingEntries(ctx, { updates });
      setIsTemplateModalOpen(false);

      if (res.ok) {
        const advanced = res.data.results.filter((r) => r.status === 'ADVANCED').length;
        const stillPending = res.data.results.filter((r) => r.status === 'STILL_PENDING').length;
        const conflicts = res.data.results.filter((r) => r.status === 'CONFLICT').length;

        setActionFeedback({
          type: conflicts > 0 ? 'warning' : 'success',
          message: `Plantilla cambiada: ${advanced} comprobante(s) avanzaron a aprobación, ${stillPending} continúan pendientes.`
        });

        setSelectedIds([]);
        loadStagingData();
      } else {
        setActionFeedback({ type: 'danger', message: res.error?.message || 'Error al cambiar plantilla' });
      }
    } catch (err) {
      setActionFeedback({ type: 'danger', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Acción: Revalidar Lote
  const handleExecuteRevalidate = async () => {
    setLoading(true);
    setActionFeedback(null);

    try {
      const itemsToRevalidate = selectedItems.map((item) => ({
        id: item.id,
        expectedVersion: item.entityVersion
      }));

      const res = await revalidateEntries(ctx, { items: itemsToRevalidate });

      if (res.ok) {
        const advanced = res.data.results.filter((r) => r.status === 'ADVANCED').length;
        const stillPending = res.data.results.filter((r) => r.status === 'STILL_PENDING').length;
        const conflicts = res.data.results.filter((r) => r.status === 'CONFLICT').length;

        setActionFeedback({
          type: conflicts > 0 ? 'warning' : 'success',
          message: `Revalidación completada: ${advanced} pasaron a aprobación, ${stillPending} continúan con observaciones${conflicts > 0 ? `, ${conflicts} conflicto(s)` : ''}.`
        });

        setSelectedIds([]);
        loadStagingData();
      } else {
        setActionFeedback({ type: 'danger', message: res.error?.message || 'Error al revalidar asientos' });
      }
    } catch (err) {
      setActionFeedback({ type: 'danger', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Acción: Abrir modal de cancelación
  const openCancelModal = (item) => {
    setCancelItem(item);
    setCancelReason('');
    setCancelError(null);
    setIsCancelModalOpen(true);
  };

  // Acción: Confirmar cancelación
  const handleExecuteCancel = async () => {
    if (!cancelItem || cancelReason.trim().length < 10) return;
    setLoading(true);
    setCancelError(null);

    try {
      const res = await cancelEntry(ctx, {
        id: cancelItem.id,
        expectedVersion: cancelItem.entityVersion,
        reason: cancelReason.trim()
      });

      if (res.ok) {
        setIsCancelModalOpen(false);
        setActionFeedback({
          type: 'success',
          message: `Comprobante ${cancelItem.documentNumber || cancelItem.id} cancelado correctamente.`
        });
        setSelectedIds((prev) => prev.filter((id) => id !== cancelItem.id));
        loadStagingData();
      } else {
        setCancelError(res.error?.message || 'Error al cancelar comprobante');
      }
    } catch (err) {
      setCancelError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Abrir detalle del asiento
  const openDetail = (item) => {
    setDetailItem({
      journalEntryId: item.id,
      id: item.id,
      traceId: item.traceId,
      documentNumber: item.documentNumber,
      tenantId: ctx?.tenantId
    });
    setIsDetailModalOpen(true);
  };

  // Abrir trazabilidad y auditoría
  const openTraceability = (traceId) => {
    setSelectedTraceId(traceId);
    setIsTraceModalOpen(true);
  };

  if (!ctx) {
    return (
      <div className="content-body" style={{ padding: '2rem' }}>
        <div className="card">
          <p>Seleccione una empresa y asegúrese de haber iniciado sesión para acceder a la bandeja.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content-body" style={{ padding: '2rem' }}>
      {/* 1. Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Inbox size={22} color="var(--color-primary)" />
            <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.4rem' }}>Bandeja de Excepciones</h2>
          </div>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>
            Comprobantes que requieren corrección o datos adicionales (centro de costos, revalidación o cambio de plantilla) antes de ingresar al libro contable.
          </p>
        </div>

        <button
          className="btn btn--secondary btn--sm"
          onClick={() => { loadStagingData(); loadTemplatesData(); }}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* 2. Banner de Periodo Cerrado si corresponde */}
      {ctx.readOnly && <ReadOnlyPeriodBanner periodo={ctx.activePeriod?.nombrePeriodo} />}

      {/* 3. MetricCards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <MetricCard
          title="Pendientes en Bandeja"
          value={metrics.totalCount}
          subtext="Comprobantes observados"
          badgeText="Total"
          badgeType="neutral"
        />
        <MetricCard
          title="Atrasados (> 48h)"
          value={metrics.overdueCount}
          subtext="Prioridad de atención alta"
          badgeText={metrics.overdueCount > 0 ? 'Atención' : 'Al día'}
          badgeType={metrics.overdueCount > 0 ? 'danger' : 'success'}
        />
        <MetricCard
          title="Falta Centro de Costo"
          value={metrics.missingCCCount}
          subtext="Completar CC para avanzar"
          badgeText="Accionable"
          badgeType="info"
        />
        <MetricCard
          title="Descuadres y Errores"
          value={metrics.unbalCount}
          subtext="Requieren cambio de plantilla o anulación"
          badgeText="Crítico"
          badgeType="warning"
        />
      </div>

      {/* 4. Feedback Banner */}
      {actionFeedback && (
        <div
          className={`callout callout--${actionFeedback.type}`}
          style={{ marginBottom: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {actionFeedback.type === 'success' && <CheckCircle2 size={16} />}
            {actionFeedback.type === 'warning' && <AlertTriangle size={16} />}
            {actionFeedback.type === 'danger' && <AlertCircle size={16} />}
            <span>{actionFeedback.message}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* 5. Filtros */}
      <div className="card" style={{ marginBottom: '1.2rem', padding: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', fontSize: '13px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
            <Filter size={15} />
            <strong>Filtros:</strong>
          </div>

          {/* Filtro por Motivo */}
          <div>
            <select
              className="input-select"
              value={filterReason}
              onChange={(e) => setFilterReason(e.target.value)}
              style={{ padding: '4px 8px', fontSize: '12px' }}
            >
              <option value="">Todos los motivos</option>
              {Object.entries(REASON_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Operación */}
          <div>
            <select
              className="input-select"
              value={filterOperation}
              onChange={(e) => setFilterOperation(e.target.value)}
              style={{ padding: '4px 8px', fontSize: '12px' }}
            >
              <option value="">Todas las operaciones</option>
              <option value="COMPRA">Compras</option>
              <option value="VENTA">Ventas</option>
            </select>
          </div>

          {/* Filtro por Moneda */}
          <div>
            <select
              className="input-select"
              value={filterCurrency}
              onChange={(e) => setFilterCurrency(e.target.value)}
              style={{ padding: '4px 8px', fontSize: '12px' }}
            >
              <option value="">Todas las monedas</option>
              <option value="PEN">PEN (Soles)</option>
              <option value="USD">USD (Dólares)</option>
            </select>
          </div>

          {/* Filtro Fecha Desde */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Desde:</span>
            <input
              type="date"
              className="input-text"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              style={{ padding: '3px 6px', fontSize: '12px', width: '130px' }}
            />
          </div>

          {/* Filtro Fecha Hasta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Hasta:</span>
            <input
              type="date"
              className="input-text"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              style={{ padding: '3px 6px', fontSize: '12px', width: '130px' }}
            />
          </div>

          {/* Filtro Solo Atrasados */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', marginLeft: 'auto' }}>
            <input
              type="checkbox"
              checked={filterOverdueOnly}
              onChange={(e) => setFilterOverdueOnly(e.target.checked)}
            />
            <span style={{ fontWeight: 500, color: filterOverdueOnly ? 'var(--color-danger-dark)' : 'var(--text-main)' }}>
              Solo atrasados (&gt; 48 h)
            </span>
          </label>

          {(filterReason || filterOperation || filterFrom || filterTo || filterCurrency || filterOverdueOnly) && (
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => {
                setFilterReason('');
                setFilterOperation('');
                setFilterFrom('');
                setFilterTo('');
                setFilterCurrency('');
                setFilterOverdueOnly(false);
              }}
              style={{ padding: '2px 8px', fontSize: '11px' }}
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* 6. Barra de Acciones de Lote */}
      {selectedIds.length > 0 && (
        <div
          style={{
            background: 'var(--color-accent-subtle)',
            border: '1px solid var(--color-accent-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--color-accent)' }}>
            <CheckSquare size={16} />
            <span>{selectedIds.length} comprobante(s) seleccionado(s)</span>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className="btn btn--primary btn--sm"
              onClick={() => setIsCompleteModalOpen(true)}
              disabled={!canPerform.complete || loading}
              title={
                !canPerform.complete 
                  ? 'La acción "Completar" no está permitida para todos los motivos de la selección o el usuario no es Maker.' 
                  : 'Asignar centro de costos y etiquetas'
              }
              style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <Tag size={13} />
              <span>Completar CC y etiquetas</span>
            </button>

            <button
              className="btn btn--secondary btn--sm"
              onClick={() => setIsTemplateModalOpen(true)}
              disabled={!canPerform.changeTemplate || loading}
              title={
                !canPerform.changeTemplate 
                  ? 'La acción "Cambiar plantilla" no está permitida para los motivos seleccionados.' 
                  : 'Seleccionar otra plantilla'
              }
              style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <Layers size={13} />
              <span>Cambiar plantilla</span>
            </button>

            <button
              className="btn btn--secondary btn--sm"
              onClick={handleExecuteRevalidate}
              disabled={!canPerform.revalidate || loading}
              title={
                !canPerform.revalidate 
                  ? 'La acción "Revalidar" requiere que todos los seleccionados tengan motivos revalidables.' 
                  : 'Revaluar contra catálogo, periodos y reglas activas'
              }
              style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Revalidar lote</span>
            </button>
          </div>
        </div>
      )}

      {/* 7. Tabla de Resultados */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-light)' }}>
                <th style={{ width: '38px', textAlign: 'center', padding: '10px 8px' }}>
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selectedIds.length === items.length}
                    onChange={handleSelectAll}
                    disabled={items.length === 0}
                  />
                </th>
                <th style={{ textAlign: 'left', padding: '10px' }}>Tipo</th>
                <th style={{ textAlign: 'left', padding: '10px' }}>Comprobante</th>
                <th style={{ textAlign: 'left', padding: '10px' }}>Emisor / Receptor</th>
                <th style={{ textAlign: 'left', padding: '10px' }}>Fecha</th>
                <th style={{ textAlign: 'right', padding: '10px' }}>Total</th>
                <th style={{ textAlign: 'left', padding: '10px' }}>Motivos de Excepción</th>
                <th style={{ textAlign: 'left', padding: '10px' }}>Antigüedad</th>
                <th style={{ textAlign: 'center', padding: '10px', width: '150px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                    Consultando bandeja de excepciones...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <CheckCircle2 size={32} color="var(--color-success)" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                    <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>Bandeja al día</strong>
                    No hay comprobantes pendientes de resolución con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid var(--border-light)',
                        background: isSelected ? 'var(--color-accent-subtle)' : undefined
                      }}
                    >
                      <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(item.id)}
                        />
                      </td>
                      <td>
                        <span className={`badge ${item.operationType === 'VENTA' ? 'badge--success' : 'badge--info'}`}>
                          {item.operationType}
                        </span>
                      </td>
                      <td>
                        <strong className="mono" style={{ fontSize: '12px' }}>
                          {item.documentNumber || 'S/N'}
                        </strong>
                      </td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.counterpartyName}>
                        {item.counterpartyName || '—'}
                      </td>
                      <td className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {item.issueDate || '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }} className="mono">
                        {formatMoney(item.totalCents, item.currency)}
                      </td>
                      <td>
                        <ReasonBadges reasons={item.pendingReasons} />
                      </td>
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span className="mono" style={{ fontSize: '12px', color: item.overdue ? 'var(--color-danger-dark)' : 'var(--text-muted)' }}>
                            {item.ageHours} h
                          </span>
                          {item.overdue && (
                            <span className="badge badge--danger" title="Superó las 48 h reglamentarias en bandeja (CA-10.4)">
                              Atrasado
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                          <button
                            className="btn btn--secondary btn--sm"
                            onClick={() => openDetail(item)}
                            style={{ padding: '2px 8px', fontSize: '11px' }}
                            title="Ver detalle contable y documento"
                          >
                            <Eye size={12} />
                            <span>Ver</span>
                          </button>
                          {item.traceId && (
                            <button
                              className="btn btn--secondary btn--sm"
                              onClick={() => openTraceability(item.traceId)}
                              style={{ padding: '2px 8px', fontSize: '11px' }}
                              title="Ver trazabilidad completa y auditoría"
                            >
                              <History size={12} />
                              <span>Trazabilidad</span>
                            </button>
                          )}
                          <button
                            className="btn btn--secondary btn--sm"
                            onClick={() => openCancelModal(item)}
                            disabled={ctx?.role !== 'MAKER' || ctx?.readOnly || loading}
                            style={{
                              padding: '2px 8px',
                              fontSize: '11px',
                              color: 'var(--color-danger-dark)',
                              borderColor: 'var(--color-danger-border)'
                            }}
                            title={
                              ctx?.role !== 'MAKER' 
                                ? 'Solo un usuario Maker puede cancelar comprobantes' 
                                : ctx?.readOnly 
                                ? 'Periodo cerrado: solo lectura' 
                                : 'Cancelar comprobante'
                            }
                          >
                            <XCircle size={12} color="var(--color-danger)" />
                            <span>Cancelar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 8. Modal: Completar Centro de Costo y Etiquetas */}
      <Modal
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        title="Completar Centro de Costo y Etiquetas"
        maxWidth="500px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button className="btn btn--secondary" onClick={() => setIsCompleteModalOpen(false)}>
              Cancelar
            </button>
            <button
              className="btn btn--primary"
              onClick={handleExecuteComplete}
              disabled={!completeCostCenter || loading}
            >
              Guardar y Reevaluar
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Se aplicará el centro de costo a los <strong>{selectedIds.length}</strong> comprobante(s) seleccionados. El motor contable recalculará las líneas y verificará si cumplen para avanzar a aprobación.
          </p>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', marginBottom: '6px' }}>
              Centro de Costo:
            </label>
            <select
              className="input-select"
              value={completeCostCenter}
              onChange={(e) => setCompleteCostCenter(e.target.value)}
              style={{ width: '100%', padding: '6px 8px' }}
            >
              <option value="CC-ADMIN">CC-ADMIN (Administración General)</option>
              <option value="CC-LOGISTICA">CC-LOGISTICA (Operaciones y Logística)</option>
              <option value="CC-VENTAS">CC-VENTAS (Comercial y Marketing)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', marginBottom: '6px' }}>
              Etiqueta de Proyecto / Centro (opcional):
            </label>
            <input
              type="text"
              className="input-text"
              placeholder="Ej. PROYECTO-CUSCO-2026"
              value={completeProjectTag}
              onChange={(e) => setCompleteProjectTag(e.target.value)}
              style={{ width: '100%', padding: '6px 8px' }}
            />
          </div>
        </div>
      </Modal>

      {/* 9. Modal: Cambiar Plantilla */}
      <Modal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        title="Cambiar Plantilla Contable"
        maxWidth="520px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button className="btn btn--secondary" onClick={() => setIsTemplateModalOpen(false)}>
              Cancelar
            </button>
            <button
              className="btn btn--primary"
              onClick={handleExecuteChangeTemplate}
              disabled={!selectedNewTemplateId || loading}
            >
              Aplicar Nueva Plantilla
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Seleccione la nueva plantilla activa que se utilizará para regenerar los asientos contables de los <strong>{selectedIds.length}</strong> comprobante(s) seleccionados.
          </p>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', marginBottom: '6px' }}>
              Plantilla Destino:
            </label>
            <select
              className="input-select"
              value={selectedNewTemplateId}
              onChange={(e) => setSelectedNewTemplateId(e.target.value)}
              style={{ width: '100%', padding: '6px 8px' }}
            >
              <option value="">-- Seleccionar Plantilla --</option>
              {templates.map((tpl) => (
                <option key={tpl.templateId} value={tpl.templateId}>
                  {tpl.templateId} - {tpl.name} ({tpl.operationType})
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* 10. Modal: Cancelar Comprobante */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title={`Cancelar Comprobante ${cancelItem?.documentNumber || ''}`}
        maxWidth="520px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button className="btn btn--secondary" onClick={() => setIsCancelModalOpen(false)}>
              Volver
            </button>
            <button
              className="btn btn--danger"
              onClick={handleExecuteCancel}
              disabled={cancelReason.trim().length < 10 || loading}
              style={{ background: 'var(--color-danger)', color: '#fff' }}
            >
              Confirmar Cancelación
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="callout callout--danger" style={{ margin: 0 }}>
            <AlertTriangle size={16} />
            <div>
              <strong>Advertencia:</strong> Esta acción cancelará permanentemente el asiento del comprobante{' '}
              <strong>{cancelItem?.documentNumber}</strong>. El comprobante quedará en estado CANCELADO y no podrá reactivarse.
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', marginBottom: '6px' }}>
              Motivo o Justificación de Cancelación (mínimo 10 caracteres):
            </label>
            <textarea
              className="input-text"
              rows={3}
              placeholder="Ej. El proveedor emitió el comprobante por error o fue anulado con nota de crédito."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              style={{ width: '100%', padding: '6px 8px', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px' }}>
              <span style={{ color: cancelReason.trim().length < 10 ? 'var(--color-danger-dark)' : 'var(--color-success-dark)' }}>
                {cancelReason.trim().length < 10 
                  ? `Faltan ${10 - cancelReason.trim().length} caracter(es)` 
                  : 'Longitud válida'}
              </span>
              <span className="mono" style={{ color: 'var(--text-muted)' }}>
                {cancelReason.trim().length} / 10 mín.
              </span>
            </div>
          </div>

          {cancelError && (
            <div className="callout callout--danger" style={{ margin: 0 }}>
              <AlertCircle size={14} />
              <span>{cancelError}</span>
            </div>
          )}
        </div>
      </Modal>

      {/* 11. Modal de Detalle */}
      <EntryDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        item={detailItem}
        ctx={ctx}
      />

      {/* 12. Modal de Trazabilidad */}
      <TraceabilityModal
        isOpen={isTraceModalOpen}
        onClose={() => setIsTraceModalOpen(false)}
        traceId={selectedTraceId}
        ctx={ctx}
      />
    </div>
  );
};
export default BandejaView;
