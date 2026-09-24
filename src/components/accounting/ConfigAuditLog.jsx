import React, { useState } from 'react';
import {
  History,
  Filter,
  Search,
  Eye,
  ShieldAlert,
  CheckCircle,
  FileCode,
  MapPin,
  ListFilter,
  RefreshCw,
  Clock,
  User
} from 'lucide-react';
import { Modal } from '../Modal.jsx';

const ACTION_LABELS = {
  ACCOUNT_MAPPING_SAVED: { label: 'Mapa Guardado', color: '#6366F1', bg: '#EEF2FF' },
  CLASSIFICATION_RULE_SAVED: { label: 'Regla Guardada', color: '#0EA5E9', bg: '#F0F9FF' },
  CLASSIFICATION_RULE_STATUS_CHANGED: { label: 'Estado Regla', color: '#F59E0B', bg: '#FEF3C7' },
  TEMPLATE_CREATED: { label: 'Plantilla Creada', color: '#8B5CF6', bg: '#F5F3FF' },
  TEMPLATE_DUPLICATED: { label: 'Plantilla Duplicada', color: '#8B5CF6', bg: '#F5F3FF' },
  TEMPLATE_DRAFT_SAVED: { label: 'Borrador Guardado', color: '#3B82F6', bg: '#EFF6FF' },
  TEMPLATE_VERSION_CREATED: { label: 'Versión Creada', color: '#10B981', bg: '#ECFDF5' },
  TEMPLATE_TESTS_RUN: { label: 'Pruebas Ejecutadas', color: '#06B6D4', bg: '#ECFEFF' },
  TEMPLATE_ACTIVATED: { label: 'Plantilla Activada', color: '#059669', bg: '#D1FAE5' },
  TEMPLATE_DEACTIVATED: { label: 'Plantilla Desactivada', color: '#D97706', bg: '#FEF3C7' },
  TEMPLATE_RETIRED: { label: 'Plantilla Retirada', color: '#DC2626', bg: '#FEE2E2' },
  TEMPLATE_USAGE_RECORDED: { label: 'Uso Registrado', color: '#64748B', bg: '#F1F5F9' },
  ACTION_DENIED: { label: 'Acción Denegada (SoD)', color: '#E11D48', bg: '#FFE4E6' }
};

export const ConfigAuditLog = ({
  logs = [],
  loading = false,
  onRefresh = null,
  actionFilter = '',
  onActionFilterChange = null,
  fromDate = '',
  onFromDateChange = null,
  toDate = '',
  onToDateChange = null
}) => {
  const [selectedLog, setSelectedLog] = useState(null);

  const formatDateTime = (isoString) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('es-PE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const getActionBadge = (action) => {
    const meta = ACTION_LABELS[action] || { label: action, color: '#64748B', bg: '#F1F5F9' };
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 600,
          color: meta.color,
          backgroundColor: meta.bg,
          border: `1px solid ${meta.color}30`
        }}
      >
        {action === 'ACTION_DENIED' && <ShieldAlert size={12} />}
        {meta.label}
      </span>
    );
  };

  const renderDetailSummary = (log) => {
    if (!log.detail) return '—';
    if (log.action === 'ACCOUNT_MAPPING_SAVED') {
      const changed = log.detail.changedRoles?.length || 0;
      return `Versión ${log.detail.version} (${changed} roles actualizados, ${log.detail.totalEntries || 0} totales)`;
    }
    if (log.action === 'CLASSIFICATION_RULE_SAVED') {
      return `Regla v${log.detail.version} [${log.detail.scope || 'DOC'}] - Estado: ${log.detail.status}`;
    }
    if (log.action === 'CLASSIFICATION_RULE_STATUS_CHANGED') {
      return `Cambio de estado: ${log.detail.fromStatus} → ${log.detail.toStatus}`;
    }
    if (log.action === 'TEMPLATE_CREATED' || log.action === 'TEMPLATE_DUPLICATED') {
      return `Plantilla '${log.detail.code || log.entityId}' (${log.detail.name || ''})`;
    }
    if (log.action === 'TEMPLATE_VERSION_CREATED') {
      return `Nueva versión ${log.detail.version} generada a partir de v${log.detail.fromVersion}`;
    }
    if (log.action === 'TEMPLATE_ACTIVATED') {
      return `Activada v${log.detail.version} con prioridad ${log.detail.priority}`;
    }
    if (log.action === 'TEMPLATE_DEACTIVATED') {
      return `Desactivada versión activa anterior`;
    }
    if (log.action === 'TEMPLATE_RETIRED') {
      return `Plantilla retirada del catálogo`;
    }
    if (log.action === 'ACTION_DENIED') {
      return <span style={{ color: '#E11D48', fontWeight: 600 }}>{log.detail.reason || 'Operación no permitida para el rol'}</span>;
    }
    return JSON.stringify(log.detail).slice(0, 60);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md, 16px)' }}>
      {/* Barra de Filtros */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '12px 16px',
        background: 'var(--bg-surface, #FFFFFF)',
        border: '1px solid var(--border-light, #E2E8F0)',
        borderRadius: 'var(--radius-md, 8px)'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
          {/* Filtro por acción */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={14} color="var(--text-muted, #64748B)" />
            <select
              value={actionFilter}
              onChange={(e) => onActionFilterChange && onActionFilterChange(e.target.value)}
              style={{
                fontSize: '13px',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm, 6px)',
                border: '1px solid var(--border-light, #CBD5E1)',
                background: 'var(--bg-surface, #FFFFFF)'
              }}
            >
              <option value="">Todas las acciones</option>
              <option value="TEMPLATE_">Plantillas Contables (TEMPLATE_*)</option>
              <option value="ACCOUNT_">Mapa de Cuentas (ACCOUNT_*)</option>
              <option value="CLASSIFICATION_">Reglas de Clasificación (CLASSIFICATION_*)</option>
              <option value="ACTION_DENIED">Acciones Denegadas (ACTION_DENIED)</option>
            </select>
          </div>

          {/* Filtro por fechas */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} color="var(--text-muted, #64748B)" />
            <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748B)' }}>Desde:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => onFromDateChange && onFromDateChange(e.target.value)}
              style={{
                fontSize: '12px',
                padding: '5px 8px',
                borderRadius: 'var(--radius-sm, 6px)',
                border: '1px solid var(--border-light, #CBD5E1)'
              }}
            />
            <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748B)' }}>Hasta:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => onToDateChange && onToDateChange(e.target.value)}
              style={{
                fontSize: '12px',
                padding: '5px 8px',
                borderRadius: 'var(--radius-sm, 6px)',
                border: '1px solid var(--border-light, #CBD5E1)'
              }}
            />
          </div>
        </div>

        {onRefresh && (
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={onRefresh}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            <span>Actualizar</span>
          </button>
        )}
      </div>

      {/* Tabla de Eventos */}
      <div style={{
        border: '1px solid var(--border-light, #E2E8F0)',
        borderRadius: 'var(--radius-md, 8px)',
        background: 'var(--bg-surface, #FFFFFF)',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-subtle, #F8FAFC)', borderBottom: '1px solid var(--border-light, #E2E8F0)' }}>
              <th style={{ padding: '10px 12px', width: '170px', color: 'var(--text-muted, #64748B)' }}>Fecha y Hora</th>
              <th style={{ padding: '10px 12px', width: '190px', color: 'var(--text-muted, #64748B)' }}>Acción</th>
              <th style={{ padding: '10px 12px', width: '150px', color: 'var(--text-muted, #64748B)' }}>Usuario / Rol</th>
              <th style={{ padding: '10px 12px', width: '160px', color: 'var(--text-muted, #64748B)' }}>Entidad</th>
              <th style={{ padding: '10px 12px', color: 'var(--text-muted, #64748B)' }}>Detalle</th>
              <th style={{ padding: '10px 12px', width: '70px', textAlign: 'center', color: 'var(--text-muted, #64748B)' }}>Ver</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted, #64748B)' }}>
                  Cargando eventos de auditoría...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted, #64748B)' }}>
                  <History size={28} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                  <div>No se encontraron registros de auditoría con los filtros aplicados.</div>
                </td>
              </tr>
            ) : (
              logs.map((log, idx) => (
                <tr
                  key={log.id || idx}
                  style={{
                    borderBottom: '1px solid var(--border-light, #E2E8F0)',
                    backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--bg-subtle, #F8FAFC)'
                  }}
                >
                  <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-main, #0F172A)' }}>
                    {formatDateTime(log.at)}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {getActionBadge(log.action)}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                      <User size={13} color="var(--text-muted, #64748B)" />
                      <span>{log.userId}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748B)' }}>
                      Rol: {log.role}
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-main, #0F172A)' }}>
                      {log.entityType}
                    </span>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted, #64748B)' }}>
                      {log.entityId}
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '12px' }}>
                    {renderDetailSummary(log)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <button
                      type="button"
                      className="btn btn--secondary btn--xs"
                      onClick={() => setSelectedLog(log)}
                      title="Ver evento completo"
                      style={{ padding: '4px 8px' }}
                    >
                      <Eye size={13} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Detalle del Evento de Auditoría */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Detalle del Evento de Auditoría"
        maxWidth="640px"
      >
        {selectedLog && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              padding: '12px',
              background: 'var(--bg-subtle, #F8FAFC)',
              borderRadius: 'var(--radius-sm, 6px)',
              fontSize: '12px'
            }}>
              <div>
                <span style={{ color: 'var(--text-muted, #64748B)' }}>Acción: </span>
                <strong>{selectedLog.action}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted, #64748B)' }}>Fecha: </span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{formatDateTime(selectedLog.at)}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted, #64748B)' }}>Usuario: </span>
                <strong>{selectedLog.userId}</strong> ({selectedLog.role})
              </div>
              <div>
                <span style={{ color: 'var(--text-muted, #64748B)' }}>Empresa: </span>
                <strong>{selectedLog.tenantId}</strong>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: 'var(--text-muted, #64748B)' }}>Trace ID: </span>
                <code style={{ fontSize: '11px', background: '#E2E8F0', padding: '2px 4px', borderRadius: '3px' }}>
                  {selectedLog.traceId}
                </code>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: 'var(--text-muted, #64748B)' }}>Entidad: </span>
                <strong>{selectedLog.entityType}</strong> (ID: {selectedLog.entityId})
              </div>
            </div>

            <div>
              <h4 style={{ margin: '0 0 8px', fontSize: '13px' }}>Carga Útil / Detalle del Evento</h4>
              <pre style={{
                background: '#0F172A',
                color: '#38BDF8',
                padding: '12px',
                borderRadius: 'var(--radius-sm, 6px)',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                overflowX: 'auto',
                maxHeight: '260px'
              }}>
                {JSON.stringify(selectedLog.detail || {}, null, 2)}
              </pre>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setSelectedLog(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
