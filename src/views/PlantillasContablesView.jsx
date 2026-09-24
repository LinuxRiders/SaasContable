import React, { useState, useEffect, useCallback } from 'react';
import { useIngestionContext } from '../hooks/useIngestionContext.js';
import { useAccounting } from '../context/AccountingContext';
import { templateService, catalogService, accountMappingService } from '../services/accounting/index.js';
import { MetricCard } from '../components/MetricCard.jsx';
import { Modal } from '../components/Modal.jsx';
import { TemplateList } from '../components/accounting/TemplateList.jsx';
import { TemplateEditor } from '../components/accounting/TemplateEditor.jsx';
import { FileCog, FileSpreadsheet, CheckCircle2, ShieldCheck, RefreshCw, AlertCircle, Info } from 'lucide-react';

export default function PlantillasContablesView() {
  const rawCtx = useIngestionContext();
  const { empresas } = useAccounting();
  const isGlobalAccess = rawCtx.tenantId === 'global';

  // Fuera de una empresa (menú "CONFIGURACIÓN MAESTRA") se navega el catálogo normativo
  // de plantillas PACK, igual para todas las empresas: no hay activación ni edición aquí
  // (eso es por empresa). Se resuelve el paquete con una empresa de referencia sin
  // exponer ningún selector: no se está "editando la empresa X".
  const ctx = isGlobalAccess ? { ...rawCtx, tenantId: empresas[0]?.id || '' } : rawCtx;
  const canManage = !isGlobalAccess && ctx.role === 'ADMIN';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [templates, setTemplates] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [pack, setPack] = useState(null);
  const [chartAccounts, setChartAccounts] = useState([]);

  // Estado del Modal de Edición
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [tenantMapping, setTenantMapping] = useState({ entries: [] });

  const loadData = useCallback(async () => {
    if (!ctx.tenantId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // Fuera de una empresa no se pide el mapa de cuentas (es por empresa); el catálogo
      // de plantillas se filtra a solo las PACK para no filtrar datos propios de la
      // empresa de referencia usada internamente para resolver el paquete.
      const [tplRes, dtRes, packRes, mapRes] = await Promise.all([
        templateService.listTemplates(ctx),
        catalogService.listDocumentTypes(ctx),
        catalogService.getJurisdictionPack(ctx),
        isGlobalAccess ? Promise.resolve({ ok: false }) : accountMappingService.getAccountMapping(ctx)
      ]);

      if (tplRes.ok) setTemplates(isGlobalAccess ? tplRes.data.filter(t => t.scope === 'PACK') : tplRes.data);
      if (dtRes.ok) setDocumentTypes(dtRes.data);
      if (packRes.ok) setPack(packRes.data);
      if (mapRes.ok) {
        setTenantMapping(mapRes.data);
        if (mapRes.data.chart) setChartAccounts(mapRes.data.chart);
      }
    } catch (err) {
      setError(err.message || 'Error al cargar plantillas contables');
    } finally {
      setLoading(false);
    }
  }, [ctx, isGlobalAccess]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectTemplate = async (summary) => {
    const res = await templateService.getTemplate(ctx, { templateId: summary.id });
    if (res.ok) {
      setEditingTemplate(res.data);
      setIsModalOpen(true);
    }
  };

  const handleRunTests = async (templateId, version) => {
    const res = await templateService.runTemplateTests(ctx, { templateId, version });
    if (res.ok) {
      // Recargar datos de plantilla para actualizar resultados
      const refreshed = await templateService.getTemplate(ctx, { templateId });
      if (refreshed.ok) setEditingTemplate(refreshed.data);
      return res.data;
    }
    return null;
  };

  const handleActivate = async (templateId, version) => {
    const res = await templateService.activateTemplate(ctx, { templateId, version });
    if (res.ok) {
      await loadData();
      const refreshed = await templateService.getTemplate(ctx, { templateId });
      if (refreshed.ok) setEditingTemplate(refreshed.data);
    }
    return res;
  };

  const handleDeactivate = async (templateId) => {
    const res = await templateService.deactivateTemplate(ctx, { templateId });
    if (res.ok) {
      await loadData();
      const refreshed = await templateService.getTemplate(ctx, { templateId });
      if (refreshed.ok) setEditingTemplate(refreshed.data);
    }
    return res;
  };

  const handleNewTemplate = () => {
    const blank = {
      code: `TPL_${Date.now().toString().slice(-4)}`,
      name: 'Nueva Plantilla Personalizada',
      scope: 'TENANT',
      versions: [
        {
          version: 1,
          status: 'DRAFT',
          documentTypeCode: documentTypes[0]?.code || 'INVOICE',
          perspective: 'RECEIVED',
          operationTypeCode: 'MERCHANDISE_PURCHASE',
          priority: 0,
          legalBookCode: 'PE.PURCHASES_REGISTER',
          glosa: 'Asiento contable personalizado',
          lines: [
            {
              id: 'l1',
              side: 'DEBIT',
              accountRef: { kind: 'ROLE', roleCode: 'PURCHASES_MERCHANDISE' },
              amount: { field: 'totals.netMinor' },
              balancingLine: false,
              forEachDocumentLine: false
            },
            {
              id: 'l2',
              side: 'CREDIT',
              accountRef: { kind: 'ROLE', roleCode: 'SUPPLIERS_PAYABLE' },
              amount: { field: 'totals.totalMinor' },
              balancingLine: true,
              forEachDocumentLine: false
            }
          ],
          testCases: []
        }
      ]
    };
    setEditingTemplate(blank);
    setIsModalOpen(true);
  };

  const handleSaveDraft = async (definition) => {
    setSaving(true);
    try {
      if (editingTemplate.id) {
        // Guardar borrador de plantilla existente
        const res = await templateService.saveTemplateDraft(ctx, {
          templateId: editingTemplate.id,
          version: editingTemplate.versions?.[0]?.version || 1,
          definition
        });
        if (res.ok) {
          setIsModalOpen(false);
          await loadData();
        } else {
          alert(`Error al guardar: ${res.error?.message || 'Error de validación'}`);
        }
      } else {
        // Crear nueva plantilla
        const res = await templateService.createTemplate(ctx, { definition });
        if (res.ok) {
          setIsModalOpen(false);
          await loadData();
        } else {
          alert(`Error al crear: ${res.error?.message || 'Error de validación'}`);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (templateId, version) => {
    const res = await templateService.duplicateTemplate(ctx, { templateId, version });
    if (res.ok) {
      setIsModalOpen(false);
      await loadData();
      // Abrir la copia duplicada
      setEditingTemplate(res.data);
      setIsModalOpen(true);
    } else {
      alert(`Error al duplicar: ${res.error?.message}`);
    }
  };

  const handleCreateVersion = async (fromVersion) => {
    if (!editingTemplate?.id) return;
    const res = await templateService.createTemplateVersion(ctx, {
      templateId: editingTemplate.id,
      fromVersion
    });
    if (res.ok) {
      await loadData();
      setEditingTemplate(res.data);
    } else {
      alert(`Error al crear versión: ${res.error?.message}`);
    }
  };

  const handleMarkUsedForDemo = async (version) => {
    if (!editingTemplate?.id) return;
    const res = await templateService.markTemplateUsedForDemo(ctx, {
      templateId: editingTemplate.id,
      version
    });
    if (res.ok) {
      await loadData();
      const updated = await templateService.getTemplate(ctx, { templateId: editingTemplate.id });
      if (updated.ok) setEditingTemplate(updated.data);
    } else {
      alert(`Error al registrar uso demo: ${res.error?.message}`);
    }
  };

  // Métricas
  const totalCount = templates.length;
  const activeCount = templates.filter(t => t.activationStatus === 'ACTIVE').length;
  const packCount = templates.filter(t => t.scope === 'PACK').length;
  const tenantCount = templates.filter(t => t.scope === 'TENANT').length;

  const currentActivation = editingTemplate?.activations?.find(a => a.status === 'ACTIVE') ||
    editingTemplate?.activations?.[editingTemplate.activations.length - 1] || null;

  return (
    <div className="view-container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileCog size={24} color="var(--color-primary)" />
            <span>{isGlobalAccess ? 'Catálogo Global de Plantillas Contables' : 'Plantillas y Activación de la Empresa'}</span>
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: '13px' }}>
            {isGlobalAccess
              ? 'Plantillas del paquete normativo, disponibles para activar en cualquier empresa. Alcance, reglas y casos de prueba en modo consulta.'
              : 'Activa o desactiva las plantillas del catálogo global para esta empresa, o crea y edita tus propias plantillas (TENANT).'}
          </p>
        </div>

        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={loadData}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Actualizar</span>
        </button>
      </div>

      {isGlobalAccess && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
          background: 'var(--color-surface-subtle, #F1F5F9)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--color-text-muted)'
        }}>
          <Info size={15} />
          <span>
            Catálogo de solo lectura. Para activar una plantilla, crear una propia o editarla,
            entra a una empresa desde <strong>Cartera de Empresas</strong>.
          </span>
        </div>
      )}

      {error && (
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-danger-bg, #FEE2E2)',
          border: '1px solid var(--color-danger-border, #FCA5A5)',
          color: 'var(--color-danger-text, #991B1B)'
        }}>
          <AlertCircle size={20} />
          <div>{error}</div>
        </div>
      )}

      {/* Tarjetas de Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
        <MetricCard
          title="Plantillas Base (PACK)"
          value={packCount}
          subtext="Catálogo normativo compartido"
          badgeText="Inmutables"
          badgeType="primary"
          icon={ShieldCheck}
        />
        {!isGlobalAccess && (
          <>
            <MetricCard
              title="Activas en la Empresa"
              value={activeCount}
              subtext="Listas para traducción"
              badgeText="Vigentes"
              badgeType="success"
              icon={CheckCircle2}
            />
            <MetricCard
              title="Plantillas Empresa (TENANT)"
              value={tenantCount}
              subtext="Reglas propias o copiadas"
              badgeText="Personalizadas"
              badgeType="neutral"
              icon={FileCog}
            />
            <MetricCard
              title="Plantillas Totales"
              value={totalCount}
              subtext="Catálogo accesible en esta empresa"
              badgeText="Total"
              badgeType="neutral"
              icon={FileSpreadsheet}
            />
          </>
        )}
      </div>

      {/* Lista de Plantillas */}
      {loading ? (
        <div style={{ padding: '50px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Cargando catálogo de plantillas...
        </div>
      ) : (
        <TemplateList
          templates={templates}
          documentTypes={documentTypes}
          onSelect={handleSelectTemplate}
          onNew={handleNewTemplate}
          canCreate={canManage}
          showTenantColumns={!isGlobalAccess}
        />
      )}

      {/* Modal Editor */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Editor de Plantilla: ${editingTemplate ? editingTemplate.name : ''}`}
        maxWidth="960px"
      >
        {editingTemplate && (
          <TemplateEditor
            template={editingTemplate}
            versionNumber={editingTemplate.versions?.[0]?.version || 1}
            pack={pack}
            chart={chartAccounts}
            tenantMapping={tenantMapping}
            activation={currentActivation}
            activations={editingTemplate.activations || []}
            usageMap={editingTemplate.usageMap || {}}
            onSaveDraft={handleSaveDraft}
            onDuplicate={handleDuplicate}
            onRunTests={handleRunTests}
            onActivate={handleActivate}
            onDeactivate={handleDeactivate}
            onCreateVersion={handleCreateVersion}
            onMarkUsedForDemo={handleMarkUsedForDemo}
            saving={saving}
            canEdit={canManage}
          />
        )}
      </Modal>
    </div>
  );
}
