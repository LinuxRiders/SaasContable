import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useIngestionContext } from '../hooks/useIngestionContext.js';
import { MetricCard } from '../components/MetricCard.jsx';
import { Modal } from '../components/Modal.jsx';
import { TemplateEditor } from '../components/templates/TemplateEditor.jsx';
import { listTemplateBank, createTemplate } from '../services/ingestion/index.js';
import { mockPlanContable } from '../data/mockPlanContable.js';
import { 
  FileCode2, 
  Plus, 
  RefreshCw, 
  Search, 
  CheckCircle2, 
  Clock, 
  Layers, 
  Lock, 
  ShieldCheck, 
  Sliders, 
  AlertCircle,
  Eye,
  Edit3
} from 'lucide-react';

export const PlantillasGlobalesView = () => {
  const ctx = useIngestionContext();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filtros
  const [search, setSearch] = useState('');
  const [operationFilter, setOperationFilter] = useState('');
  const [includeRetired, setIncludeRetired] = useState(false);

  // Editor seleccionado
  const [editingTemplateId, setEditingTemplateId] = useState(null);

  // Modal Nueva Plantilla
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newOperation, setNewOperation] = useState('COMPRA');
  const [newBaseAccount, setNewBaseAccount] = useState('6011101');
  const [newTaxAccount, setNewTaxAccount] = useState('4011101');
  const [newCounterpartAccount, setNewCounterpartAccount] = useState('4212101');
  const [newAppliesIgv, setNewAppliesIgv] = useState(true);
  const [newRequiresCC, setNewRequiresCC] = useState(false);
  const [newDefaultCC, setNewDefaultCC] = useState('');
  const [createError, setCreateError] = useState(null);
  const [creating, setCreating] = useState(false);

  const isAdmin = ctx?.role === 'ADMIN';
  const postableAccounts = mockPlanContable.filter(a => a.esCuentaU === true);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listTemplateBank(ctx, { includeRetired });
      if (res.ok) {
        setTemplates(res.data || []);
      } else {
        setError(res.error?.message || 'Error al listar las plantillas del banco');
      }
    } catch (err) {
      setError(err.message || 'Error inesperado al cargar plantillas');
    } finally {
      setLoading(false);
    }
  }, [ctx, includeRetired]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Filtrado
  const filteredTemplates = useMemo(() => {
    return templates.filter(tpl => {
      if (operationFilter && tpl.operationType !== operationFilter) {
        return false;
      }
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const codeMatch = tpl.code?.toLowerCase().includes(query);
        const nameMatch = tpl.name?.toLowerCase().includes(query);
        const idMatch = tpl.templateId?.toLowerCase().includes(query);
        return codeMatch || nameMatch || idMatch;
      }
      return true;
    });
  }, [templates, operationFilter, search]);

  // Métricas
  const metrics = useMemo(() => {
    const total = templates.length;
    const active = templates.filter(t => t.activeVersion !== null).length;
    const withDraft = templates.filter(t => t.draftVersion !== null).length;
    const retired = templates.filter(t => t.retired).length;

    return { total, active, withDraft, retired };
  }, [templates]);

  // Crear nueva plantilla
  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    setCreateError(null);

    if (!newCode.trim() || !newName.trim()) {
      setCreateError('El código y el nombre son obligatorios.');
      return;
    }

    setCreating(true);
    try {
      const defaults = {
        baseAccount: newBaseAccount,
        taxAccount: newTaxAccount,
        counterpartAccount: newCounterpartAccount,
        appliesIgv: newAppliesIgv,
        requiresCostCenter: newRequiresCC,
        defaultCostCenter: newDefaultCC.trim() || null
      };

      const res = await createTemplate(ctx, {
        code: newCode.trim().toUpperCase(),
        name: newName.trim(),
        operationType: newOperation,
        defaults
      });

      if (res.ok) {
        setIsNewModalOpen(false);
        setNewCode('');
        setNewName('');
        await loadTemplates();
        setEditingTemplateId(res.data.templateId);
      } else {
        setCreateError(res.error?.message || 'Error al crear la plantilla');
      }
    } catch (err) {
      setCreateError(err.message || 'Error al crear plantilla');
    } finally {
      setCreating(false);
    }
  };

  // Si se está editando una plantilla, mostrar el TemplateEditor
  if (editingTemplateId) {
    return (
      <div className="content-body" style={{ padding: '2rem' }}>
        <TemplateEditor
          templateId={editingTemplateId}
          onClose={() => setEditingTemplateId(null)}
          onSaved={loadTemplates}
          ctx={ctx}
        />
      </div>
    );
  }

  return (
    <div className="content-body" style={{ padding: '2rem' }}>
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ margin: 0, color: 'var(--text-color)' }}>Banco Global de Plantillas</h2>
            <span className="badge badge--info" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={13} />
              Maestro Central (RF-19)
            </span>
          </div>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>
            Reglas contables con condiciones Y/O/NO, amarres automáticos y casos de prueba compartidos entre empresas.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn btn--secondary"
            onClick={loadTemplates}
            disabled={loading}
            title="Actualizar catálogo"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Actualizar
          </button>

          {isAdmin && (
            <button
              className="btn btn--primary"
              onClick={() => setIsNewModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={15} />
              Nueva Plantilla
            </button>
          )}
        </div>
      </div>

      {/* Métricas */}
      <div className="grid-metrics" style={{ marginBottom: '1.5rem' }}>
        <MetricCard
          title="Total Plantillas"
          value={metrics.total}
          subtext="Definidas en el repositorio global"
          badgeText="GLOBAL"
          badgeType="neutral"
        />
        <MetricCard
          title="Con Versión Activa"
          value={metrics.active}
          subtext="Disponibles para activación en empresas"
          badgeText="ACTIVAS"
          badgeType="success"
        />
        <MetricCard
          title="Borradores en Edición"
          value={metrics.withDraft}
          subtext="En preparación o pruebas por el Admin"
          badgeText="DRAFT"
          badgeType="warning"
        />
        <MetricCard
          title="Retiradas"
          value={metrics.retired}
          subtext="Obsoletas o sin versiones vigentes"
          badgeText="RETIRED"
          badgeType="neutral"
        />
      </div>

      {/* Barra de Filtros */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '220px' }}>
            <Search size={15} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input-text"
              placeholder="Buscar por código o nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', fontSize: '13px', padding: '5px 8px' }}
            />
          </div>

          <select
            className="input-select"
            value={operationFilter}
            onChange={(e) => setOperationFilter(e.target.value)}
            style={{ fontSize: '13px', padding: '5px 8px' }}
          >
            <option value="">-- Todas las operaciones --</option>
            <option value="COMPRA">Compras</option>
            <option value="VENTA">Ventas</option>
          </select>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={includeRetired}
              onChange={(e) => setIncludeRetired(e.target.checked)}
            />
            <span>Incluir plantillas retiradas</span>
          </label>
        </div>

        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Mostrando <strong>{filteredTemplates.length}</strong> de <strong>{templates.length}</strong> plantillas
        </div>
      </div>

      {/* Error Feedback */}
      {error && (
        <div className="callout callout--danger" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={16} />
          <div>{error}</div>
        </div>
      )}

      {/* Tabla del Banco de Plantillas */}
      <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
        {filteredTemplates.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <FileCode2 size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.6 }} />
            <h4 style={{ margin: '0 0 6px', color: 'var(--text-color)' }}>No se encontraron plantillas</h4>
            <p style={{ margin: 0, fontSize: '13px' }}>
              No existen plantillas globales que coincidan con los filtros aplicados.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-subtle, #f8fafc)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>ID / Código</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Nombre</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Operación</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Versión Activa</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Versión Borrador</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Estado</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'right' }}>Usos</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredTemplates.map((row) => (
                  <tr key={row.templateId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {/* Código / ID */}
                    <td style={{ padding: '10px 14px' }}>
                      <span className="mono" style={{ fontWeight: 700 }}>{row.code}</span>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }} className="mono">
                        {row.templateId}
                      </div>
                    </td>

                    {/* Nombre */}
                    <td style={{ padding: '10px 14px', fontWeight: 500 }}>
                      {row.name}
                    </td>

                    {/* Operación */}
                    <td style={{ padding: '10px 14px' }}>
                      <span className={`badge badge--${row.operationType === 'COMPRA' ? 'info' : 'success'}`}>
                        {row.operationType}
                      </span>
                    </td>

                    {/* Versión Activa */}
                    <td style={{ padding: '10px 14px' }}>
                      {row.activeVersion ? (
                        <span className="badge badge--success" style={{ fontWeight: 700 }}>
                          v{row.activeVersion}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>

                    {/* Versión Borrador */}
                    <td style={{ padding: '10px 14px' }}>
                      {row.draftVersion ? (
                        <span className="badge badge--warning">
                          v{row.draftVersion} DRAFT
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>

                    {/* Estado */}
                    <td style={{ padding: '10px 14px' }}>
                      {row.retired ? (
                        <span className="badge badge--neutral">RETIRADA</span>
                      ) : row.activeVersion ? (
                        <span className="badge badge--success">VIGENTE</span>
                      ) : (
                        <span className="badge badge--warning">SOLO BORRADOR</span>
                      )}
                    </td>

                    {/* Usos */}
                    <td style={{ padding: '10px 14px', textAlign: 'right' }} className="mono">
                      {(row.versions || []).reduce((sum, v) => sum + (v.usageCount || 0), 0)}
                    </td>

                    {/* Acciones */}
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <button
                        className="btn btn--secondary btn--sm"
                        onClick={() => setEditingTemplateId(row.templateId)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '3px 8px' }}
                      >
                        {isAdmin && row.draftVersion ? <Edit3 size={13} /> : <Eye size={13} />}
                        {isAdmin && row.draftVersion ? 'Editar Reglas' : 'Ver Detalles'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Crear Nueva Plantilla */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Crear Nueva Plantilla Global"
        maxWidth="580px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setIsNewModalOpen(false)}
              disabled={creating}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleCreateTemplate}
              disabled={creating}
            >
              {creating ? 'Creando...' : 'Crear Plantilla'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleCreateTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {createError && (
            <div className="callout callout--danger" style={{ margin: 0, padding: '8px 12px' }}>
              <AlertCircle size={14} />
              <span>{createError}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Código Identificador (único, mayúsculas):
              </label>
              <input
                type="text"
                className="input-text"
                placeholder="ej. COMPRA_ALQUILERES"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                style={{ width: '100%', fontSize: '13px', padding: '6px 8px' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Tipo de Operación:
              </label>
              <select
                className="input-select"
                value={newOperation}
                onChange={(e) => setNewOperation(e.target.value)}
                style={{ width: '100%', fontSize: '13px', padding: '6px 8px' }}
              >
                <option value="COMPRA">COMPRA</option>
                <option value="VENTA">VENTA</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
              Nombre de la Plantilla:
            </label>
            <input
              type="text"
              className="input-text"
              placeholder="ej. Arrendamiento y Alquiler de Inmuebles"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={{ width: '100%', fontSize: '13px', padding: '6px 8px' }}
              required
            />
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>
              Cuentas por Defecto Iniciales:
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>Cuenta Base (Gasto / Ingreso):</label>
                <select
                  className="input-select"
                  value={newBaseAccount}
                  onChange={(e) => setNewBaseAccount(e.target.value)}
                  style={{ width: '100%', fontSize: '12px', padding: '4px 6px' }}
                >
                  {postableAccounts.map(a => (
                    <option key={a.codigo} value={a.codigo}>{a.codigo} - {a.descripcion}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>Cuenta IGV:</label>
                <select
                  className="input-select"
                  value={newTaxAccount}
                  onChange={(e) => setNewTaxAccount(e.target.value)}
                  style={{ width: '100%', fontSize: '12px', padding: '4px 6px' }}
                >
                  {postableAccounts.map(a => (
                    <option key={a.codigo} value={a.codigo}>{a.codigo} - {a.descripcion}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>Contrapartida (42 / 12):</label>
                <select
                  className="input-select"
                  value={newCounterpartAccount}
                  onChange={(e) => setNewCounterpartAccount(e.target.value)}
                  style={{ width: '100%', fontSize: '12px', padding: '4px 6px' }}
                >
                  {postableAccounts.map(a => (
                    <option key={a.codigo} value={a.codigo}>{a.codigo} - {a.descripcion}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>Centro de Costo por Defecto:</label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="ej. CC-ADMIN (opcional)"
                  value={newDefaultCC}
                  onChange={(e) => setNewDefaultCC(e.target.value)}
                  style={{ width: '100%', fontSize: '12px', padding: '4px 6px' }}
                />
              </div>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PlantillasGlobalesView;

