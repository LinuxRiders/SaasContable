import React, { useState, useEffect, useCallback } from 'react';
import { useIngestionContext } from '../hooks/useIngestionContext.js';
import { useAccounting } from '../context/AccountingContext';
import { catalogService, accountMappingService, classificationRuleService } from '../services/accounting/index.js';
import { MetricCard } from '../components/MetricCard.jsx';
import { Modal } from '../components/Modal.jsx';
import { DocumentTypeList } from '../components/accounting/DocumentTypeList.jsx';
import { DocumentTypeSchema } from '../components/accounting/DocumentTypeSchema.jsx';
import { TaxTable } from '../components/accounting/TaxTable.jsx';
import { AccountMappingTable } from '../components/accounting/AccountMappingTable.jsx';
import { ClassificationRuleList } from '../components/accounting/ClassificationRuleList.jsx';
import { ClassificationRuleEditor } from '../components/accounting/ClassificationRuleEditor.jsx';
import { ConfigAuditLog } from '../components/accounting/ConfigAuditLog.jsx';
import { SAMPLE_DOCUMENTS } from '../data/jurisdictions/index.js';
import {
  Globe,
  FileCode,
  Percent,
  BookOpen,
  MapPin,
  ListFilter,
  History,
  Info,
  RefreshCw,
  AlertCircle,
  Plus,
  Play,
  CheckCircle2,
  XCircle,
  Sparkles
} from 'lucide-react';

export default function ConfiguracionContableView() {
  const rawCtx = useIngestionContext();
  const { empresas } = useAccounting();
  const isGlobalAccess = rawCtx.tenantId === 'global';

  // El catálogo del paquete de jurisdicción (documentos, impuestos, operaciones, libros)
  // no depende de una empresa: es el mismo para todas las que comparten jurisdicción PE.
  // Fuera de una empresa (menú "CONFIGURACIÓN MAESTRA") solo mostramos ese catálogo de
  // solo lectura; el mapa de cuentas, las reglas y la bitácora son por empresa y solo
  // aparecen dentro de una empresa (menú "CONFIGURACIÓN EMPRESA"). No se elige empresa aquí.
  const ctx = isGlobalAccess ? { ...rawCtx, tenantId: empresas[0]?.id || '' } : rawCtx;

  const [activeTab, setActiveTab] = useState('documentos'); // 'documentos' | 'impuestos' | 'operaciones' | 'mapa' | 'reglas' | 'bitacora'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Datos del catálogo
  const [packSummary, setPackSummary] = useState(null);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [operationTypes, setOperationTypes] = useState([]);
  const [legalBooks, setLegalBooks] = useState([]);

  // Datos de mapa de cuentas
  const [mapping, setMapping] = useState(null);
  const [mappingImpact, setMappingImpact] = useState([]);
  const [chartAccounts, setChartAccounts] = useState([]);
  const [savingMapping, setSavingMapping] = useState(false);

  // Control de fecha para impuestos
  const [taxDate, setTaxDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Modal para detalle de esquema
  const [selectedDocCode, setSelectedDocCode] = useState(null);
  const [selectedSchema, setSelectedSchema] = useState(null);
  const [loadingSchema, setLoadingSchema] = useState(false);

  // Reglas de clasificación
  const [rules, setRules] = useState([]);
  const [editingRule, setEditingRule] = useState(null);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [savingRule, setSavingRule] = useState(false);

  // Prueba de clasificación
  const [selectedSampleId, setSelectedSampleId] = useState(() => SAMPLE_DOCUMENTS[0]?.id || '');
  const [testingClassification, setTestingClassification] = useState(false);
  const [classificationTestResult, setClassificationTestResult] = useState(null);

  // Auditoría de configuración (US8)
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditFromDate, setAuditFromDate] = useState('');
  const [auditToDate, setAuditToDate] = useState('');

  const loadData = useCallback(async () => {
    if (!ctx.tenantId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // Fuera de una empresa solo se pide el catálogo del paquete (solo lectura);
      // mapa de cuentas, reglas y bitácora son por empresa.
      const catalogCalls = [
        catalogService.getJurisdictionPack(ctx),
        catalogService.listDocumentTypes(ctx),
        catalogService.listTaxes(ctx, { date: taxDate }),
        catalogService.listOperationTypes(ctx),
        catalogService.listLegalBooks(ctx)
      ];
      const tenantCalls = isGlobalAccess
        ? [Promise.resolve({ ok: false }), Promise.resolve({ ok: false }), Promise.resolve({ ok: false })]
        : [
            accountMappingService.getAccountMapping(ctx),
            accountMappingService.getMappingImpact(ctx),
            classificationRuleService.listClassificationRules(ctx)
          ];

      const [pRes, dtRes, txRes, opRes, lbRes, mapRes, impRes, rulesRes] = await Promise.all([...catalogCalls, ...tenantCalls]);

      if (!pRes.ok) {
        setError(pRes.error?.message || 'Error al cargar paquete de jurisdicción');
        setLoading(false);
        return;
      }

      setPackSummary(pRes.data);
      if (dtRes.ok) setDocumentTypes(dtRes.data);
      if (txRes.ok) setTaxes(txRes.data);
      if (opRes.ok) setOperationTypes(opRes.data);
      if (lbRes.ok) setLegalBooks(lbRes.data);
      if (mapRes.ok) {
        setMapping(mapRes.data);
        if (mapRes.data.chart) setChartAccounts(mapRes.data.chart);
      }
      if (impRes.ok) setMappingImpact(impRes.data);
      if (rulesRes.ok) setRules(rulesRes.data);
    } catch (err) {
      setError(err.message || 'Error inesperado al cargar la configuración contable');
    } finally {
      setLoading(false);
    }
  }, [ctx, taxDate, isGlobalAccess]);

  const fetchAuditLogs = useCallback(async () => {
    if (!ctx.tenantId || isGlobalAccess) return;
    setLoadingAudit(true);
    try {
      const res = await catalogService.listConfigAudit(ctx, {
        actionPrefix: auditActionFilter || undefined,
        from: auditFromDate || undefined,
        to: auditToDate || undefined
      });
      if (res.ok) {
        setAuditLogs(res.data || []);
      }
    } finally {
      setLoadingAudit(false);
    }
  }, [ctx, auditActionFilter, auditFromDate, auditToDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (activeTab === 'bitacora') {
      fetchAuditLogs();
    }
  }, [activeTab, fetchAuditLogs]);

  const handleNewRule = () => {
    setEditingRule({
      name: '',
      scope: 'DOCUMENT',
      priority: 10,
      operationTypeCode: operationTypes[0]?.code || 'MERCHANDISE_PURCHASE',
      status: 'ACTIVE',
      condition: { const: true }
    });
    setIsRuleModalOpen(true);
  };

  const handleEditRule = (rule) => {
    setEditingRule(rule);
    setIsRuleModalOpen(true);
  };

  const handleSaveRule = async (ruleData) => {
    setSavingRule(true);
    try {
      const res = await classificationRuleService.saveClassificationRule(ctx, { rule: ruleData });
      if (res.ok) {
        setIsRuleModalOpen(false);
        const rulesRes = await classificationRuleService.listClassificationRules(ctx);
        if (rulesRes.ok) setRules(rulesRes.data);
      } else {
        alert(`Error al guardar regla: ${res.error?.message || 'Error de validación'}`);
      }
    } finally {
      setSavingRule(false);
    }
  };

  const handleActivateRule = async (ruleId) => {
    const res = await classificationRuleService.setClassificationRuleStatus(ctx, { ruleId, status: 'ACTIVE' });
    if (res.ok) {
      const rulesRes = await classificationRuleService.listClassificationRules(ctx);
      if (rulesRes.ok) setRules(rulesRes.data);
    } else {
      alert(`Error al activar: ${res.error?.message}`);
    }
  };

  const handleRetireRule = async (ruleId) => {
    const res = await classificationRuleService.setClassificationRuleStatus(ctx, { ruleId, status: 'RETIRED' });
    if (res.ok) {
      const rulesRes = await classificationRuleService.listClassificationRules(ctx);
      if (rulesRes.ok) setRules(rulesRes.data);
    } else {
      alert(`Error al retirar: ${res.error?.message}`);
    }
  };

  const handleTestClassification = async () => {
    const sample = SAMPLE_DOCUMENTS.find(s => s.id === selectedSampleId);
    if (!sample || !sample.document) return;

    setTestingClassification(true);
    try {
      const res = await classificationRuleService.testClassification(ctx, { document: sample.document });
      if (res.ok) {
        setClassificationTestResult(res.data);
      } else {
        alert(`Error al clasificar: ${res.error?.message}`);
      }
    } finally {
      setTestingClassification(false);
    }
  };

  const handleTaxDateChange = async (newDate) => {
    setTaxDate(newDate);
    const txRes = await catalogService.listTaxes(ctx, { date: newDate });
    if (txRes.ok) {
      setTaxes(txRes.data);
    }
  };

  const handleSelectDocType = async (doc) => {
    setSelectedDocCode(doc.code);
    setLoadingSchema(true);
    try {
      const res = await catalogService.getDocumentTypeSchema(ctx, { code: doc.code });
      if (res.ok) {
        setSelectedSchema(res.data);
      }
    } finally {
      setLoadingSchema(false);
    }
  };

  const handleSaveMapping = async (entries) => {
    if (!mapping) return;
    setSavingMapping(true);
    try {
      const res = await accountMappingService.saveAccountMapping(ctx, {
        expectedVersion: mapping.version,
        entries
      });
      if (res.ok) {
        setMapping(res.data);
        await loadData();
      } else {
        throw res.error;
      }
    } finally {
      setSavingMapping(false);
    }
  };

  const handlePreloadSuggestions = async () => {
    const res = await accountMappingService.suggestMapping(ctx);
    if (res.ok) {
      return res.data;
    }
    return null;
  };

  return (
    <div className="view-container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* Encabezado y Métricas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookOpen size={24} color="var(--color-primary)" />
            <span>{isGlobalAccess ? 'Catálogo Contable del Paquete de Jurisdicción' : 'Configuración Contable de la Empresa'}</span>
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: '13px' }}>
            {isGlobalAccess
              ? 'Catálogo normativo compartido: tipos de documento, impuestos, operaciones y libros oficiales.'
              : 'Mapa de cuentas, reglas de clasificación y bitácora de esta empresa, además del catálogo normativo.'}
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
            Catálogo normativo del paquete de jurisdicción (solo lectura), compartido por todas las empresas.
            El mapa de cuentas, las reglas de clasificación y la bitácora son por empresa: entra a una empresa
            desde <strong>Cartera de Empresas</strong> para configurarlos.
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
          title="Paquete de Jurisdicción"
          value={packSummary ? `${packSummary.name} (${packSummary.code})` : '—'}
          subtext={packSummary ? `Versión ${packSummary.version} · ${packSummary.referenceChartOfAccounts}` : 'Cargando...'}
          badgeText={packSummary?.code || 'PE'}
          badgeType="primary"
          icon={Globe}
        />
        <MetricCard
          title="Tipos de Documento"
          value={packSummary?.documentTypesCount ?? documentTypes.length}
          subtext="Esquemas canónicos activos"
          badgeText="Sustento"
          badgeType="neutral"
          icon={FileCode}
        />
        <MetricCard
          title="Impuestos y Retenciones"
          value={packSummary?.taxesCount ?? taxes.length}
          subtext={`Vigencia al ${taxDate}`}
          badgeText="Tributos"
          badgeType="success"
          icon={Percent}
        />
        <MetricCard
          title="Libros y Operaciones"
          value={`${operationTypes.length} / ${legalBooks.length}`}
          subtext="Operaciones / Libros oficiales"
          badgeText="PCGE"
          badgeType="neutral"
          icon={BookOpen}
        />
      </div>

      {/* Navegación por pestañas */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', gap: '8px', overflowX: 'auto' }}>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'documentos' ? 'active' : ''}`}
          onClick={() => setActiveTab('documentos')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: activeTab === 'documentos' ? '2px solid var(--color-primary)' : '2px solid transparent', fontWeight: activeTab === 'documentos' ? 600 : 400 }}
        >
          <FileCode size={15} />
          <span>Documentos ({documentTypes.length})</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'impuestos' ? 'active' : ''}`}
          onClick={() => setActiveTab('impuestos')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: activeTab === 'impuestos' ? '2px solid var(--color-primary)' : '2px solid transparent', fontWeight: activeTab === 'impuestos' ? 600 : 400 }}
        >
          <Percent size={15} />
          <span>Impuestos ({taxes.length})</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'operaciones' ? 'active' : ''}`}
          onClick={() => setActiveTab('operaciones')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: activeTab === 'operaciones' ? '2px solid var(--color-primary)' : '2px solid transparent', fontWeight: activeTab === 'operaciones' ? 600 : 400 }}
        >
          <BookOpen size={15} />
          <span>Operaciones y Libros</span>
        </button>
        {!isGlobalAccess && (
          <>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'mapa' ? 'active' : ''}`}
              onClick={() => setActiveTab('mapa')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: activeTab === 'mapa' ? '2px solid var(--color-primary)' : '2px solid transparent', fontWeight: activeTab === 'mapa' ? 600 : 400 }}
            >
              <MapPin size={15} />
              <span>Mapa de Cuentas</span>
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'reglas' ? 'active' : ''}`}
              onClick={() => setActiveTab('reglas')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: activeTab === 'reglas' ? '2px solid var(--color-primary)' : '2px solid transparent', fontWeight: activeTab === 'reglas' ? 600 : 400 }}
            >
              <ListFilter size={15} />
              <span>Reglas de Clasificación</span>
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'bitacora' ? 'active' : ''}`}
              onClick={() => setActiveTab('bitacora')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: activeTab === 'bitacora' ? '2px solid var(--color-primary)' : '2px solid transparent', fontWeight: activeTab === 'bitacora' ? 600 : 400 }}
            >
              <History size={15} />
              <span>Bitácora de Configuración</span>
            </button>
          </>
        )}
      </div>

      {/* Contenido de la pestaña activa */}
      {loading ? (
        <div style={{ padding: '50px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Cargando configuración contable...
        </div>
      ) : (
        <>
          {activeTab === 'documentos' && (
            <DocumentTypeList
              documentTypes={documentTypes}
              onSelect={handleSelectDocType}
            />
          )}

          {activeTab === 'impuestos' && (
            <TaxTable
              taxes={taxes}
              targetDate={taxDate}
              onDateChange={handleTaxDateChange}
            />
          )}

          {activeTab === 'operaciones' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--spacing-lg)' }}>
              {/* Tipos de Operación */}
              <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', padding: '16px' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '15px' }}>Tipos de Operación Normativos ({operationTypes.length})</h3>
                <div className="table-responsive">
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: 'var(--color-surface-subtle)', textAlign: 'left' }}>
                        <th style={{ padding: '8px 12px' }}>Código</th>
                        <th style={{ padding: '8px 12px' }}>Nombre</th>
                        <th style={{ padding: '8px 12px' }}>Descripción</th>
                        <th style={{ padding: '8px 12px' }}>Perspectivas Admitidas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {operationTypes.map(op => (
                        <tr key={op.code} style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                          <td className="mono" style={{ padding: '8px 12px', fontWeight: 600 }}>{op.code}</td>
                          <td style={{ padding: '8px 12px' }}>{op.name}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--color-text-muted)' }}>{op.description}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {(op.allowedPerspectives || []).map(p => (
                                <span key={p} className="badge badge--neutral" style={{ fontSize: '10px' }}>{p}</span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Libros Contables */}
              <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', padding: '16px' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '15px' }}>Libros Contables Oficiales ({legalBooks.length})</h3>
                <div className="table-responsive">
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: 'var(--color-surface-subtle)', textAlign: 'left' }}>
                        <th style={{ padding: '8px 12px' }}>Código</th>
                        <th style={{ padding: '8px 12px' }}>Nombre</th>
                        <th style={{ padding: '8px 12px' }}>Código Oficial</th>
                      </tr>
                    </thead>
                    <tbody>
                      {legalBooks.map(b => (
                        <tr key={b.code} style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                          <td className="mono" style={{ padding: '8px 12px', fontWeight: 600 }}>{b.code}</td>
                          <td style={{ padding: '8px 12px' }}>{b.name}</td>
                          <td className="mono" style={{ padding: '8px 12px' }}>{b.officialCode || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {!isGlobalAccess && activeTab === 'mapa' && (
            <AccountMappingTable
              pack={packSummary}
              chart={chartAccounts}
              mapping={mapping}
              impact={mappingImpact}
              onSave={handleSaveMapping}
              onPreloadSuggestions={handlePreloadSuggestions}
              canEdit={ctx.role === 'ADMIN'}
              saving={savingMapping}
            />
          )}

          {!isGlobalAccess && activeTab === 'reglas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px' }}>Reglas de Clasificación de la Operación</h3>
                  <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                    Determinan el tipo de operación para comprobantes y líneas según jerarquía de prioridad (RD-16, SDD §20.4).
                  </p>
                </div>

                {ctx.role === 'ADMIN' && (
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={handleNewRule}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Plus size={14} />
                    <span>Nueva Regla</span>
                  </button>
                )}
              </div>

              <ClassificationRuleList
                rules={rules}
                pack={packSummary}
                onEditRule={handleEditRule}
                onActivate={handleActivateRule}
                onRetire={handleRetireRule}
                canEdit={ctx.role === 'ADMIN'}
              />

              {/* Panel de prueba de clasificación */}
              <div style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>
                      Probar Clasificación en Documento de Ejemplo
                    </h4>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      Evalúa las reglas activas contra un documento canónico sin persistir cambios.
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <select
                      className="input"
                      value={selectedSampleId}
                      onChange={(e) => setSelectedSampleId(e.target.value)}
                      style={{ fontSize: '12px', maxWidth: '340px' }}
                    >
                      {SAMPLE_DOCUMENTS.map(sd => (
                        <option key={sd.id} value={sd.id}>
                          {sd.title}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={handleTestClassification}
                      disabled={testingClassification || !selectedSampleId || ctx.role !== 'ADMIN'}
                      title={ctx.role !== 'ADMIN' ? 'Solo el rol ADMIN puede ejecutar pruebas de clasificación' : ''}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Play size={13} fill="currentColor" />
                      <span>{testingClassification ? 'Evaluando...' : 'Probar clasificación'}</span>
                    </button>
                  </div>
                </div>

                {classificationTestResult && (
                  <div style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-surface-subtle)',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {classificationTestResult.ok ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: 700,
                            fontSize: '13px',
                            color: 'var(--color-success-dark, #065F46)',
                            background: 'var(--color-success-bg, #ECFDF5)',
                            padding: '3px 10px',
                            borderRadius: 'var(--radius-sm)'
                          }}>
                            <CheckCircle2 size={16} />
                            Clasificación Exitosa: <strong>{classificationTestResult.operationTypeCode}</strong>
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: 700,
                            fontSize: '13px',
                            color: 'var(--color-danger-dark, #991B1B)',
                            background: 'var(--color-danger-bg, #FEF2F2)',
                            padding: '3px 10px',
                            borderRadius: 'var(--radius-sm)'
                          }}>
                            <XCircle size={16} />
                            Clasificación Fallida ({classificationTestResult.status}): {classificationTestResult.reason}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                        Reglas evaluadas: {classificationTestResult.trace?.length || 0}
                      </div>
                    </div>

                    {/* Traza paso a paso */}
                    {classificationTestResult.trace && classificationTestResult.trace.length > 0 && (
                      <div style={{ marginTop: '4px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                          Traza de Evaluación de Reglas:
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {classificationTestResult.trace.map((t, i) => (
                            <div
                              key={i}
                              style={{
                                padding: '6px 10px',
                                background: t.matched ? 'var(--color-surface)' : 'transparent',
                                border: t.matched ? '1px solid var(--color-border)' : '1px dashed transparent',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '12px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}
                            >
                              <span style={{ fontFamily: 'var(--font-mono)' }}>
                                [{t.scope || 'DOC'}] {t.ruleId} {t.lineNo ? `(Línea ${t.lineNo})` : ''}
                              </span>
                              <span>
                                {t.matched ? (
                                  t.skippedReason ? (
                                    <span style={{ color: 'var(--color-warning-dark)' }}>
                                      Coincidió pero omitida ({t.skippedReason})
                                    </span>
                                  ) : (
                                    <span style={{ color: 'var(--color-success-dark)', fontWeight: 600 }}>
                                      ✔ Coincidió y aplicada
                                    </span>
                                  )
                                ) : (
                                  <span style={{ color: 'var(--color-text-muted)' }}>
                                    No coincidió
                                  </span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {!isGlobalAccess && activeTab === 'bitacora' && (
            <ConfigAuditLog
              logs={auditLogs}
              loading={loadingAudit}
              onRefresh={fetchAuditLogs}
              actionFilter={auditActionFilter}
              onActionFilterChange={setAuditActionFilter}
              fromDate={auditFromDate}
              onFromDateChange={setAuditFromDate}
              toDate={auditToDate}
              onToDateChange={setAuditToDate}
            />
          )}
        </>
      )}

      {/* Modal de Esquema de Documento */}
      <Modal
        isOpen={!!selectedDocCode}
        onClose={() => { setSelectedDocCode(null); setSelectedSchema(null); }}
        title={`Esquema Canónico: ${selectedSchema ? selectedSchema.name : selectedDocCode}`}
        maxWidth="820px"
      >
        {loadingSchema ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Cargando especificación del esquema...
          </div>
        ) : (
          <DocumentTypeSchema schema={selectedSchema} />
        )}
      </Modal>

      {/* Modal Editor de Reglas de Clasificación */}
      <Modal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        title={editingRule?.id ? `Editar Regla: ${editingRule.name}` : 'Nueva Regla de Clasificación'}
        maxWidth="680px"
      >
        <ClassificationRuleEditor
          rule={editingRule}
          pack={packSummary}
          onSave={handleSaveRule}
          onCancel={() => setIsRuleModalOpen(false)}
          saving={savingRule}
        />
      </Modal>
    </div>
  );
}
