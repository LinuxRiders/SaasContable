import * as defaultRepo from '../storage/repository.js';
import { ok, fail, withLatency, authorize } from '../ingestion/serviceKit.js';
import { buildAuditEvent } from '../../domain/ingestion/audit.js';
import { resolveTenantContext } from './context.js';
import { SAMPLE_DOCUMENTS } from '../../data/jurisdictions/index.js';
import { interpretDocument } from '../../domain/accounting/interpretation.js';

/**
 * Obtiene el contexto contable para interpretación pura según SDD §5.4 y contracts/services.md §6.
 * @param {Object} ctx - Contexto { tenantId, userId, role }
 * @param {Object} [repo] - Repositorio inyectado
 */
export async function getInterpretationContext(ctx, repo = defaultRepo) {
  const ctxRes = resolveTenantContext(repo, ctx);
  if (!ctxRes.ok) return ctxRes;
  const { pack, chart, functionalCurrency, tenantFiscalId } = ctxRes.data;

  // Mapa de cuentas activo
  const mappings = repo.getCollection(ctx.tenantId, 'accountMappings') || [];
  const activeMapping = mappings[mappings.length - 1] || { entries: [] };

  // Reglas de clasificación activas
  const rules = repo.getCollection(ctx.tenantId, 'classificationRules') || [];
  const activeRules = rules.filter(r => r.status === 'ACTIVE');

  // Plantillas activadas para el tenant
  const activations = repo.getCollection(ctx.tenantId, 'templateActivations') || [];
  const activeActivations = activations.filter(a => a.status === 'ACTIVE');

  const tenantTemplates = repo.getCollection(ctx.tenantId, 'templates') || [];
  const baseTemplates = pack.baseTemplates || [];

  const candidatesFor = (terna) => {
    const list = [];
    for (const act of activeActivations) {
      // Buscar primero en tenantTemplates
      const tenantTmpl = tenantTemplates.find(t => t.id === act.templateId);
      if (tenantTmpl && !tenantTmpl.retiredAt) {
        const ver = (tenantTmpl.versions || []).find(v => v.version === act.version);
        if (
          ver &&
          ver.documentTypeCode === terna.documentTypeCode &&
          ver.perspective === terna.perspective &&
          ver.operationTypeCode === terna.operationTypeCode
        ) {
          list.push({
            template: { id: tenantTmpl.id, code: tenantTmpl.code, scope: 'TENANT', priority: ver.priority ?? 0 },
            version: ver
          });
          continue;
        }
      }

      // Buscar en baseTemplates de pack
      const baseTmpl = baseTemplates.find(t => (t.id || t.code) === act.templateId && (t.version || 1) === act.version);
      if (baseTmpl) {
        if (
          baseTmpl.documentTypeCode === terna.documentTypeCode &&
          baseTmpl.perspective === terna.perspective &&
          baseTmpl.operationTypeCode === terna.operationTypeCode
        ) {
          list.push({
            template: { id: baseTmpl.id || baseTmpl.code, code: baseTmpl.code, scope: 'PACK', priority: baseTmpl.priority ?? 0 },
            version: baseTmpl
          });
        }
      }
    }
    return list;
  };

  return ok({
    pack,
    chart,
    mapping: activeMapping,
    rules: activeRules,
    tenantFiscalId,
    functionalCurrency,
    candidatesFor
  });
}

/**
 * Interpreta un documento canónico usando el contexto del tenant.
 * @param {Object} ctx - Contexto { tenantId, userId, role }
 * @param {{ document: Object, fxRateMilli?: number|null }} params
 * @param {Object} [repo] - Repositorio inyectado
 */
export async function interpret(ctx, { document, fxRateMilli }, repo = defaultRepo) {
  const ctxRes = await getInterpretationContext(ctx, repo);
  if (!ctxRes.ok) return ctxRes;
  const context = ctxRes.data;

  const result = interpretDocument(document, {
    pack: context.pack,
    tenantFiscalId: context.tenantFiscalId,
    rules: context.rules,
    candidatesFor: context.candidatesFor,
    mapping: context.mapping,
    chart: context.chart,
    fxRateMilli: fxRateMilli ?? null,
    functionalCurrency: context.functionalCurrency
  });

  return ok(result);
}

/**
 * Obtiene la definición de una versión específica de plantilla (PACK o TENANT).
 * @param {Object} ctx - Contexto { tenantId, userId, role }
 * @param {{ templateId: string, version: number }} params
 * @param {Object} [repo] - Repositorio inyectado
 */
export async function getTemplateVersion(ctx, { templateId, version }, repo = defaultRepo) {
  const ctxRes = resolveTenantContext(repo, ctx);
  if (!ctxRes.ok) return ctxRes;
  const { pack } = ctxRes.data;

  // Buscar en baseTemplates de paquete
  const baseTmpl = (pack.baseTemplates || []).find(t => (t.id || t.code) === templateId && (t.version || 1) === version);
  if (baseTmpl) {
    return ok(baseTmpl);
  }

  // Buscar en plantillas del tenant
  const tenantTemplates = repo.getCollection(ctx.tenantId, 'templates') || [];
  const tenantTmpl = tenantTemplates.find(t => t.id === templateId);
  if (tenantTmpl) {
    const ver = (tenantTmpl.versions || []).find(v => v.version === version);
    if (ver) return ok(ver);
  }

  return fail('NOT_FOUND', `Plantilla '${templateId}' versión ${version} no encontrada`);
}

/**
 * Registra el uso de una versión de plantilla en el tenant y en el índice global (RD-10, contracts/services.md §6).
 * @param {Object} ctx - Contexto { tenantId, userId, role }
 * @param {{ templateId: string, version: number }} params
 * @param {Object} [repo] - Repositorio inyectado
 */
export async function recordTemplateUsage(ctx, { templateId, version }, repo = defaultRepo) {
  const key = `${templateId}@${version}`;

  const tenantUsage = repo.getCollection(ctx.tenantId, 'templateUsage') || {};
  tenantUsage[key] = (tenantUsage[key] || 0) + 1;
  repo.setCollection(ctx.tenantId, 'templateUsage', tenantUsage);

  const globalUsage = repo.getGlobal('templateUsageIndex') || {};
  globalUsage[key] = (globalUsage[key] || 0) + 1;
  repo.setGlobal('templateUsageIndex', globalUsage);

  // Registrar auditoría
  const auditEvent = buildAuditEvent({
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    tenantId: ctx.tenantId,
    traceId: crypto.randomUUID(),
    userId: ctx.userId,
    role: ctx.role,
    action: 'TEMPLATE_USAGE_RECORDED',
    entityType: 'TEMPLATE_VERSION',
    entityId: key,
    detail: { templateId, version, tenantUsage: tenantUsage[key], totalUsage: globalUsage[key] }
  });
  repo.appendOnly(ctx.tenantId, 'auditLog', [auditEvent]);

  return ok({
    templateId,
    version,
    tenantUsage: tenantUsage[key],
    totalUsage: globalUsage[key]
  });
}

/**
 * Objeto accountingEngine para uso compartido entre specs (001, 002, 003).
 */
export const accountingEngine = {
  getInterpretationContext,
  interpret,
  getTemplateVersion,
  recordTemplateUsage
};

/**
 * Lista los documentos de ejemplo del paquete normativo de la empresa.
 * @param {Object} ctx - Contexto { tenantId, userId, role }
 * @param {Object} [repo] - Repositorio inyectado
 */
export async function listSampleDocuments(ctx, repo = defaultRepo) {
  const settings = repo.getGlobal('demoSettings');
  await withLatency(settings);

  const authRes = authorize(ctx, 'SIMULATE', repo);
  if (!authRes.ok) return authRes;

  const ctxRes = resolveTenantContext(repo, ctx);
  if (!ctxRes.ok) return ctxRes;

  const samples = (SAMPLE_DOCUMENTS || []).map(s => ({
    id: s.id,
    title: s.title,
    documentTypeCode: s.document?.documentTypeCode,
    format: s.document?.extraction?.sourceFormat || 'XML',
    suggestedFxRateMilli: s.suggestedFxRateMilli ?? null,
    expected: s.expected,
    document: s.document
  }));

  return ok(samples);
}

/**
 * Simula la contabilización de un documento sin persistir ningún dato (FR-024).
 * @param {Object} ctx - Contexto { tenantId, userId, role }
 * @param {{ document?: Object, sampleId?: string, fxRateMilli?: number|null }} params
 * @param {Object} [repo] - Repositorio inyectado
 */
export async function simulateDocument(ctx, { document, sampleId, fxRateMilli } = {}, repo = defaultRepo) {
  const settings = repo.getGlobal('demoSettings');
  await withLatency(settings);

  const authRes = authorize(ctx, 'SIMULATE', repo);
  if (!authRes.ok) return authRes;

  let targetDoc = document;
  let effectiveFxRate = fxRateMilli ?? null;

  if (!targetDoc && sampleId) {
    const sample = (SAMPLE_DOCUMENTS || []).find(s => s.id === sampleId);
    if (!sample) {
      return fail('NOT_FOUND', `Documento de ejemplo '${sampleId}' no encontrado`);
    }
    targetDoc = sample.document;
    if (effectiveFxRate === null && sample.suggestedFxRateMilli) {
      effectiveFxRate = sample.suggestedFxRateMilli;
    }
  }

  if (!targetDoc) {
    return fail('VALIDATION_ERROR', 'Se debe proporcionar un documento o sampleId para simular');
  }

  const engineCtxRes = await getInterpretationContext(ctx, repo);
  if (!engineCtxRes.ok) return engineCtxRes;
  const interpCtx = engineCtxRes.data;

  const simulationResult = interpretDocument(targetDoc, {
    pack: interpCtx.pack,
    tenantFiscalId: interpCtx.tenantFiscalId,
    rules: interpCtx.rules,
    candidatesFor: interpCtx.candidatesFor,
    mapping: interpCtx.mapping,
    chart: interpCtx.chart,
    fxRateMilli: effectiveFxRate,
    functionalCurrency: interpCtx.functionalCurrency
  });

  // FR-024: Función pura sin efectos secundarios; no persiste nada
  return ok(simulationResult);
}
