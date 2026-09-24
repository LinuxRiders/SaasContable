import { ok, fail, validateCtx } from '../ingestion/serviceKit.js';
import { getPackByCode } from '../../data/jurisdictions/index.js';

/**
 * Resuelve el contexto contable completo de un tenant:
 * empresa, paquete de jurisdicción, plan de cuentas, moneda funcional y tenantFiscalId.
 * Conforme a contracts/services.md y plan.md.
 *
 * @param {Object} repo - Repositorio de almacenamiento (repository)
 * @param {Object} ctx - Contexto { tenantId, userId, role }
 * @returns {{ ok: boolean, data?: { empresa: Object, pack: import('../../domain/accounting/types.js').JurisdictionPack, chart: Array<Object>, functionalCurrency: string, tenantFiscalId: string }, error?: Object }}
 */
export function resolveTenantContext(repo, ctx) {
  const empRes = validateCtx(ctx, repo);
  if (!empRes.ok) return empRes;
  const empresa = empRes.data;

  if (!empresa || !empresa.jurisdictionCode) {
    return fail('NO_JURISDICTION_PACK', `La empresa '${ctx?.tenantId}' no tiene paquete de jurisdicción asignado`);
  }

  const pack = getPackByCode(empresa.jurisdictionCode);
  if (!pack) {
    return fail('NO_JURISDICTION_PACK', `Paquete de jurisdicción desconocido: '${empresa.jurisdictionCode}'`);
  }

  const chart = repo.getCollection(ctx.tenantId, 'chartOfAccounts') || [];
  const functionalCurrency = pack.defaultFunctionalCurrency || 'PEN';
  // tenantFiscalId se extrae del RUC de la empresa en la capa de servicios (el dominio nunca lee empresa.ruc)
  const tenantFiscalId = empresa.ruc || '';

  return ok({
    empresa,
    pack,
    chart,
    functionalCurrency,
    tenantFiscalId
  });
}

