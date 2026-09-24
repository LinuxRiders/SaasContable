import * as defaultRepo from '../storage/repository.js';
import { ok, fail, withLatency, authorize } from '../ingestion/serviceKit.js';
import { resolveTenantContext } from './context.js';
import { getDocumentType, getTaxRate } from '../../domain/accounting/catalog.js';

/**
 * Obtiene el resumen del paquete de jurisdicción de la empresa.
 * @param {Object} ctx - Contexto { tenantId, userId, role }
 * @param {Object} [repo] - Repositorio inyectado
 */
export async function getJurisdictionPack(ctx, repo = defaultRepo) {
  const settings = repo.getGlobal('demoSettings');
  await withLatency(settings);

  const authRes = authorize(ctx, 'VIEW_ACCOUNTING_CONFIG', repo);
  if (!authRes.ok) return authRes;

  const ctxRes = resolveTenantContext(repo, ctx);
  if (!ctxRes.ok) return ctxRes;
  const { pack } = ctxRes.data;

  return ok({
    code: pack.code,
    version: pack.version,
    name: pack.name,
    effectiveFrom: pack.effectiveFrom,
    effectiveTo: pack.effectiveTo ?? null,
    defaultFunctionalCurrency: pack.defaultFunctionalCurrency,
    referenceChartOfAccounts: pack.referenceChartOfAccounts,
    roundingToleranceMinor: pack.roundingToleranceMinor,
    extractionConfidenceThreshold: pack.extractionConfidenceThreshold,
    documentTypesCount: (pack.documentTypes || []).length,
    taxesCount: (pack.taxes || []).length,
    operationTypesCount: (pack.operationTypes || []).length,
    accountRolesCount: (pack.accountRoles || []).length,
    legalBooksCount: (pack.legalBooks || []).length,
    baseTemplatesCount: (pack.baseTemplates || []).length
  });
}

/**
 * Lista los tipos de documento vigentes.
 * @param {Object} ctx - Contexto { tenantId, userId, role }
 * @param {{ date?: string }} [params] - Fecha YYYY-MM-DD
 * @param {Object} [repo] - Repositorio inyectado
 */
export async function listDocumentTypes(ctx, { date } = {}, repo = defaultRepo) {
  const settings = repo.getGlobal('demoSettings');
  await withLatency(settings);

  const authRes = authorize(ctx, 'VIEW_ACCOUNTING_CONFIG', repo);
  if (!authRes.ok) return authRes;

  const ctxRes = resolveTenantContext(repo, ctx);
  if (!ctxRes.ok) return ctxRes;
  const { pack } = ctxRes.data;

  const targetDate = date || new Date().toISOString().slice(0, 10);
  const types = (pack.documentTypes || [])
    .filter(doc => {
      if (doc.effectiveFrom && doc.effectiveFrom > targetDate) return false;
      if (doc.effectiveTo && doc.effectiveTo < targetDate) return false;
      return true;
    })
    .map(doc => ({
      code: doc.code,
      name: doc.name,
      family: doc.family,
      officialCodes: doc.officialCodes || [],
      allowedPerspectives: doc.allowedPerspectives || [],
      generatesEntry: doc.generatesEntry !== false,
      legalBookCode: doc.legalBookCode || null,
      effectiveFrom: doc.effectiveFrom,
      effectiveTo: doc.effectiveTo ?? null
    }));

  return ok(types);
}

/**
 * Obtiene el esquema completo de un tipo de documento.
 * @param {Object} ctx - Contexto { tenantId, userId, role }
 * @param {{ code: string, date?: string }} params - Código y fecha
 * @param {Object} [repo] - Repositorio inyectado
 */
export async function getDocumentTypeSchema(ctx, { code, date } = {}, repo = defaultRepo) {
  const settings = repo.getGlobal('demoSettings');
  await withLatency(settings);

  const authRes = authorize(ctx, 'VIEW_ACCOUNTING_CONFIG', repo);
  if (!authRes.ok) return authRes;

  const ctxRes = resolveTenantContext(repo, ctx);
  if (!ctxRes.ok) return ctxRes;
  const { pack } = ctxRes.data;

  const targetDate = date || new Date().toISOString().slice(0, 10);
  const docType = getDocumentType(pack, code, targetDate);
  if (!docType) {
    return fail('NOT_FOUND', `Tipo de documento '${code}' no encontrado o no vigente a la fecha ${targetDate}`);
  }

  return ok(docType);
}

/**
 * Lista impuestos y retenciones con la tasa vigente a la fecha.
 * @param {Object} ctx - Contexto { tenantId, userId, role }
 * @param {{ date?: string }} [params] - Fecha YYYY-MM-DD
 * @param {Object} [repo] - Repositorio inyectado
 */
export async function listTaxes(ctx, { date } = {}, repo = defaultRepo) {
  const settings = repo.getGlobal('demoSettings');
  await withLatency(settings);

  const authRes = authorize(ctx, 'VIEW_ACCOUNTING_CONFIG', repo);
  if (!authRes.ok) return authRes;

  const ctxRes = resolveTenantContext(repo, ctx);
  if (!ctxRes.ok) return ctxRes;
  const { pack } = ctxRes.data;

  const targetDate = date || new Date().toISOString().slice(0, 10);
  const taxes = (pack.taxes || []).map(tax => {
    const rateInfo = getTaxRate(pack, tax.code, targetDate);
    return {
      code: tax.code,
      name: tax.name,
      type: tax.type,
      recoverableAccountRole: tax.recoverableAccountRole || null,
      payableAccountRole: tax.payableAccountRole || null,
      rateBp: rateInfo ? rateInfo.rateBp : null,
      effectiveFrom: rateInfo ? rateInfo.effectiveFrom : null,
      effectiveTo: rateInfo ? rateInfo.effectiveTo : null
    };
  });

  return ok(taxes);
}

/**
 * Lista los tipos de operación del paquete.
 * @param {Object} ctx - Contexto { tenantId, userId, role }
 * @param {Object} [repo] - Repositorio inyectado
 */
export async function listOperationTypes(ctx, repo = defaultRepo) {
  const settings = repo.getGlobal('demoSettings');
  await withLatency(settings);

  const authRes = authorize(ctx, 'VIEW_ACCOUNTING_CONFIG', repo);
  if (!authRes.ok) return authRes;

  const ctxRes = resolveTenantContext(repo, ctx);
  if (!ctxRes.ok) return ctxRes;
  const { pack } = ctxRes.data;

  return ok(pack.operationTypes || []);
}

/**
 * Lista los roles de cuenta del paquete.
 * @param {Object} ctx - Contexto { tenantId, userId, role }
 * @param {Object} [repo] - Repositorio inyectado
 */
export async function listAccountRoles(ctx, repo = defaultRepo) {
  const settings = repo.getGlobal('demoSettings');
  await withLatency(settings);

  const authRes = authorize(ctx, 'VIEW_ACCOUNTING_CONFIG', repo);
  if (!authRes.ok) return authRes;

  const ctxRes = resolveTenantContext(repo, ctx);
  if (!ctxRes.ok) return ctxRes;
  const { pack } = ctxRes.data;

  return ok(pack.accountRoles || []);
}

/**
 * Lista los libros contables legales del paquete.
 * @param {Object} ctx - Contexto { tenantId, userId, role }
 * @param {Object} [repo] - Repositorio inyectado
 */
export async function listLegalBooks(ctx, repo = defaultRepo) {
  const settings = repo.getGlobal('demoSettings');
  await withLatency(settings);

  const authRes = authorize(ctx, 'VIEW_ACCOUNTING_CONFIG', repo);
  if (!authRes.ok) return authRes;

  const ctxRes = resolveTenantContext(repo, ctx);
  if (!ctxRes.ok) return ctxRes;
  const { pack } = ctxRes.data;

  return ok(pack.legalBooks || []);
}

/**
 * Lista los eventos de auditoría de configuración para la empresa (R-15).
 * @param {Object} ctx - Contexto { tenantId, userId, role }
 * @param {{ actionPrefix?: string, from?: string, to?: string }} [params]
 * @param {Object} [repo] - Repositorio inyectado
 */
export async function listConfigAudit(ctx, { actionPrefix, from, to } = {}, repo = defaultRepo) {
  const settings = repo.getGlobal('demoSettings');
  await withLatency(settings);

  const authRes = authorize(ctx, 'VIEW_CONFIG_AUDIT', repo);
  if (!authRes.ok) return authRes;

  const logs = repo.getCollection(ctx.tenantId, 'auditLog') || [];

  const configActions = new Set([
    'ACCOUNT_MAPPING_SAVED',
    'CLASSIFICATION_RULE_SAVED',
    'CLASSIFICATION_RULE_STATUS_CHANGED',
    'TEMPLATE_CREATED',
    'TEMPLATE_DUPLICATED',
    'TEMPLATE_DRAFT_SAVED',
    'TEMPLATE_VERSION_CREATED',
    'TEMPLATE_TESTS_RUN',
    'TEMPLATE_ACTIVATED',
    'TEMPLATE_DEACTIVATED',
    'TEMPLATE_RETIRED',
    'TEMPLATE_USAGE_RECORDED',
    'ACTION_DENIED'
  ]);

  let filtered = logs.filter(evt => {
    if (!configActions.has(evt.action)) return false;
    if (actionPrefix && !evt.action.startsWith(actionPrefix)) return false;
    if (from && evt.at < from) return false;
    if (to) {
      const toIso = to.length === 10 ? `${to}T23:59:59.999Z` : to;
      if (evt.at > toIso) return false;
    }
    return true;
  });

  filtered.sort((a, b) => (b.at || '').localeCompare(a.at || ''));

  return ok(filtered);
}
