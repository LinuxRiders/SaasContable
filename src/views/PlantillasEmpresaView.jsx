import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccounting } from '../context/AccountingContext.jsx';
import { useIngestionContext } from '../hooks/useIngestionContext.js';
import { MetricCard } from '../components/MetricCard.jsx';
import { AccountWarnings } from '../components/templates/AccountWarnings.jsx';
import { 
  listCompanyTemplateActivations, 
  setCompanyTemplateActivation, 
  listTemplates 
} from '../services/ingestion/index.js';
import { 
  FileCode2, 
  RefreshCw, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Sliders, 
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';

/**
 * Vista de Plantillas de la Empresa (HU-10, RF-23, T120)
 * Permite a ADMIN activar/desactivar plantillas del banco con versión activa para la empresa,
 * mostrando advertencias de cuentas contables. AUDITOR y MAKER tienen acceso de solo lectura.
 * @param {Object} props
 * @param {Function} [props.onNavigate] Callback para navegar entre vistas (ej: 'plan')
 */
export const PlantillasEmpresaView = ({ onNavigate }) => {
  const { empresaActiva } = useAccounting();
  const ctx = useIngestionContext();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [errorFeedback, setErrorFeedback] = useState(null);
  const [successFeedback, setSuccessFeedback] = useState(null);

  // Filtros
  const [search, setSearch] = useState('');
  const [operationFilter, setOperationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '' | 'active' | 'inactive' | 'warnings'

  const role = ctx?.role;
  const isAdmin = role === 'ADMIN';
  const isAuditor = role === 'AUDITOR';
  const isMaker = role === 'MAKER';

  const loadData = useCallback(async () => {
    if (!ctx || !empresaActiva) return;
    setLoading(true);
    setErrorFeedback(null);

    try {
      if (isMaker) {
        // MAKER solo lista las activas mediante listTemplates
        const res = await listTemplates(ctx);
        if (res.ok) {
          const list = (res.data.templates || []).map(t => ({
            templateId: t.templateId,
            code: t.code,
            name: t.name,
            operationType: t.operationType,
            activeVersion: t.version,
            active: true,
            accountWarnings: []
          }));
          setTemplates(list);
        } else {
          setErrorFeedback(res.error?.message || 'Error al cargar plantillas activas');
        }
      } else {
        // ADMIN y AUDITOR usan listCompanyTemplateActivations
        const res = await listCompanyTemplateActivations(ctx);
        if (res.ok) {
          setTemplates(res.data || []);
        } else {
          setErrorFeedback(res.error?.message || 'Error al cargar activaciones de plantillas');
        }
      }
    } catch (err) {
      setErrorFeedback(err.message || 'Error inesperado al cargar plantillas');
    } finally {
      setLoading(false);
    }
  }, [ctx, empresaActiva, isMaker]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Manejador de activación / desactivación (solo ADMIN)
  const handleToggleActivation = async (templateId, currentActive) => {
    if (!isAdmin || updatingId) return;

    const nextActive = !currentActive;
    setUpdatingId(templateId);
    setErrorFeedback(null);
    setSuccessFeedback(null);

    try {
      const res = await setCompanyTemplateActivation(ctx, {
        templateId,
        active: nextActive
      });

      if (res.ok) {
        setSuccessFeedback(`Plantilla ${nextActive ? 'activada' : 'desactivada'} exitosamente.`);
        // Actualizar localmente el estado
        setTemplates(prev => prev.map(t => {
          if (t.templateId === templateId) {
            return {
              ...t,
              active: nextActive,
              accountWarnings: res.data.accountWarnings || t.accountWarnings
            };
          }
          return t;
        }));
      } else {
        setErrorFeedback(res.error?.message || 'Error al cambiar estado de la plantilla');
      }
    } catch (err) {
      setErrorFeedback(err.message || 'Error al comunicar con el servicio');
    } finally {
      setUpdatingId(null);
    }
  };

  // Métricas
  const metrics = useMemo(() => {
    const total = templates.length;
    const active = templates.filter(t => t.active).length;
    const compras = templates.filter(t => t.active && t.operationType === 'COMPRA').length;
    const ventas = templates.filter(t => t.active && t.operationType === 'VENTA').length;
    const withWarnings = templates.filter(t => t.accountWarnings && t.accountWarnings.length > 0).length;

    return { total, active, compras, ventas, withWarnings };
  }, [templates]);

  // Filtrado de plantillas
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const q = search.toLowerCase().trim();
      const matchSearch = !q ||
        t.code?.toLowerCase().includes(q) ||
        t.name?.toLowerCase().includes(q) ||
        t.templateId?.toLowerCase().includes(q);

      const matchOp = !operationFilter || t.operationType === operationFilter;

      let matchStatus = true;
      if (statusFilter === 'active') matchStatus = t.active;
      else if (statusFilter === 'inactive') matchStatus = !t.active;
      else if (statusFilter === 'warnings') matchStatus = t.accountWarnings && t.accountWarnings.length > 0;

      return matchSearch && matchOp && matchStatus;
    });
  }, [templates, search, operationFilter, statusFilter]);

  if (!empresaActiva) {
    return (
      <div className="content-body" style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Seleccione una empresa activa para gestionar sus plantillas contables.</p>
      </div>
    );
  }

  return (
    <div className="content-body">
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileCode2 size={22} color="var(--primary-color)" />
            Plantillas de la Empresa: {empresaActiva.razonSocial}
          </h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {isAdmin 
              ? 'Active o desactive las plantillas del banco global autorizadas para esta empresa y verifique su compatibilidad con el catálogo.'
              : isAuditor
              ? 'Vista de auditoría: consulta del catálogo de plantillas asignadas a la empresa y sus advertencias.'
              : 'Plantillas disponibles para registrar comprobantes de compras y ventas en esta empresa.'}
          </p>
        </div>

        <button
          className="btn btn--secondary"
          onClick={loadData}
          disabled={loading}
          title="Actualizar lista"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Alertas de Feedback */}
      {errorFeedback && (
        <div className="callout callout--danger" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <strong>Error:</strong> {errorFeedback}
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }} onClick={() => setErrorFeedback(null)}>×</button>
        </div>
      )}

      {successFeedback && (
        <div className="callout callout--success" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <strong>Éxito:</strong> {successFeedback}
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }} onClick={() => setSuccessFeedback(null)}>×</button>
        </div>
      )}

      {/* Métricas */}
      <div className="metrics-grid" style={{ marginBottom: '1.5rem' }}>
        <MetricCard
          title="Plantillas Activas"
          value={metrics.active}
          subtext={`de ${metrics.total} disponibles en el banco`}
          badgeText={isAdmin ? "CONFIGURABLE" : "DISPONIBLES"}
          badgeType="success"
        />
        <MetricCard
          title="Compras Habilitadas"
          value={metrics.compras}
          subtext="Mercadería, servicios y gastos"
          badgeText="EGRESOS"
          badgeType="info"
        />
        <MetricCard
          title="Ventas Habilitadas"
          value={metrics.ventas}
          subtext="Facturación local y servicios"
          badgeText="INGRESOS"
          badgeType="info"
        />
        <MetricCard
          title="Con Advertencias"
          value={metrics.withWarnings}
          subtext="Cuentas fuera de catálogo"
          badgeText={metrics.withWarnings > 0 ? "REVISIÓN" : "OK"}
          badgeType={metrics.withWarnings > 0 ? "warning" : "success"}
        />
      </div>

      {/* Banner informativo de rol */}
      {isMaker && (
        <div className="callout callout--info" style={{ marginBottom: '1rem', fontSize: '13px' }}>
          <Info size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
          Como <strong>Maker</strong>, solo puede visualizar las plantillas que han sido activadas por el Administrador para esta empresa.
        </div>
      )}

      {/* Barra de Búsqueda y Filtros */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por código, nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '32px' }}
            />
          </div>

          <select
            className="form-control"
            value={operationFilter}
            onChange={(e) => setOperationFilter(e.target.value)}
            style={{ width: '160px' }}
          >
            <option value="">Todas las Operaciones</option>
            <option value="COMPRA">Solo Compras</option>
            <option value="VENTA">Solo Ventas</option>
          </select>

          {!isMaker && (
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '180px' }}
            >
              <option value="">Todos los Estados</option>
              <option value="active">Solo Activas</option>
              <option value="inactive">Solo Inactivas</option>
              <option value="warnings">Con Advertencias</option>
            </select>
          )}

          {(search || operationFilter || statusFilter) && (
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => {
                setSearch('');
                setOperationFilter('');
                setStatusFilter('');
              }}
            >
              Limpiar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabla / Lista de Plantillas */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-muted)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
              <th style={{ padding: '10px 16px', fontSize: '12px', width: '70px' }}>ID</th>
              <th style={{ padding: '10px 16px', fontSize: '12px' }}>Código / Nombre</th>
              <th style={{ padding: '10px 16px', fontSize: '12px', width: '100px' }}>Operación</th>
              <th style={{ padding: '10px 16px', fontSize: '12px', width: '90px' }}>Versión</th>
              <th style={{ padding: '10px 16px', fontSize: '12px', width: '140px' }}>Estado Empresa</th>
              {isAdmin && <th style={{ padding: '10px 16px', fontSize: '12px', width: '120px', textAlign: 'center' }}>Acción</th>}
            </tr>
          </thead>
          <tbody>
            {filteredTemplates.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {loading ? 'Cargando plantillas...' : 'No se encontraron plantillas con los filtros seleccionados.'}
                </td>
              </tr>
            ) : (
              filteredTemplates.map(t => {
                const hasWarnings = t.accountWarnings && t.accountWarnings.length > 0;
                const isUpdating = updatingId === t.templateId;
                const hasNoActiveVersion = !t.activeVersion || t.retired;

                return (
                  <tr 
                    key={t.templateId} 
                    style={{ 
                      borderBottom: '1px solid var(--border-color)',
                      backgroundColor: !t.active ? 'rgba(0,0,0,0.02)' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '12px 16px', verticalAlign: 'top', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-muted)', fontSize: '12px' }}>
                      {t.templateId}
                    </td>

                    <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 600, color: t.active ? 'var(--text-color)' : 'var(--text-muted)', fontSize: '13px' }}>
                        {t.name}
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted)' }}>
                        {t.code}
                      </div>

                      {/* Advertencias de cuentas */}
                      <AccountWarnings 
                        warnings={t.accountWarnings} 
                        onNavigateToPlan={() => onNavigate?.('plan')} 
                      />
                    </td>

                    <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                      <span 
                        className={`badge badge--${t.operationType === 'COMPRA' ? 'info' : 'success'}`}
                        style={{ fontSize: '11px' }}
                      >
                        {t.operationType}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                      {t.activeVersion ? (
                        <span className="badge badge--neutral" style={{ fontSize: '11px', fontWeight: 600 }}>
                          v{t.activeVersion}
                        </span>
                      ) : (
                        <span className="badge badge--danger" style={{ fontSize: '10px' }}>
                          Sin versión
                        </span>
                      )}
                      {t.retired && (
                        <div style={{ fontSize: '10px', color: 'var(--color-danger)', marginTop: '2px' }}>
                          Retirada global
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                      {t.active ? (
                        <span 
                          className="badge badge--success"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                        >
                          <CheckCircle2 size={12} />
                          Activa
                        </span>
                      ) : (
                        <span 
                          className="badge badge--neutral"
                          style={{ fontSize: '11px', color: 'var(--text-muted)' }}
                        >
                          Inactiva
                        </span>
                      )}
                    </td>

                    {isAdmin && (
                      <td style={{ padding: '12px 16px', verticalAlign: 'top', textAlign: 'center' }}>
                        {hasNoActiveVersion ? (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }} title="Requiere versión activa en el banco">
                            No activable
                          </span>
                        ) : (
                          <button
                            type="button"
                            className={`btn btn--sm ${t.active ? 'btn--secondary' : 'btn--primary'}`}
                            onClick={() => handleToggleActivation(t.templateId, t.active)}
                            disabled={isUpdating}
                            style={{ minWidth: '95px' }}
                          >
                            {isUpdating ? 'Guardando...' : (t.active ? 'Desactivar' : 'Activar')}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PlantillasEmpresaView;

