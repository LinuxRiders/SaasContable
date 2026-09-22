/**
 * @fileoverview Servicio de Consulta de Asientos Pendientes de Aprobación (HU-07, RF-13, contracts/services.md)
 */

import * as repository from '../storage/repository.js';
import { serviceKit } from './serviceKit.js';

export function createApprovalQueryService(deps = {}) {
  const repo = (deps && typeof deps.getCollection === 'function') ? deps : (deps.repo || repository);
  const clock = deps.clock || serviceKit.clock;
  const { ok, fail, validateCtx, authorize } = serviceKit;

  /**
   * Consulta los asientos en estado PENDING_APPROVAL de la empresa activa (solo lectura).
   * @param {Object} ctx - Contexto de ejecución { tenantId, userId, role, activePeriod }
   * @param {Object} [options]
   * @param {boolean} [options.provisionalOnly=false] - Filtrar solo aquellos con tasa provisional
   * @param {number} [options.page]
   * @param {number} [options.pageSize]
   * @returns {Promise<{ ok: boolean, data?: { items: Array, total: number }, error?: Object }>}
   */
  async function queryPendingApproval(ctx, { provisionalOnly = false, page, pageSize } = {}) {
    const validCtx = validateCtx(ctx, repo);
    if (!validCtx.ok) return validCtx;

    const auth = authorize(ctx, 'QUERY_PENDING_APPROVAL', repo, clock);
    if (!auth.ok) return auth;

    const tenantId = ctx.tenantId;
    const entries = repo.getCollection(tenantId, 'journalEntries') || [];
    const pendingEntries = entries.filter(e => e.state === 'PENDING_APPROVAL');

    const docs = repo.getCollection(tenantId, 'documents') || [];
    const docsMap = new Map(docs.map(d => [d.id, d]));

    let items = pendingEntries.map(entry => {
      const doc = docsMap.get(entry.canonicalDocRef || entry.documentId);
      const counterpartyName = entry.operationType === 'VENTA'
        ? (doc?.receiver?.name || '')
        : (doc?.issuer?.name || '');
      const documentNumber = doc?.seriesAndNumber || '';
      const issueDate = doc?.issueDate || entry.issueDate || '';

      const debits = (entry.lines || [])
        .filter(l => l.side === 'DEBIT')
        .reduce((sum, l) => sum + (l.functionalAmountCents ?? l.amountCents ?? 0), 0);
      const functionalTotalCents = debits || entry.functionalTotalCents || doc?.totals?.totalAmount || entry.totalCents || 0;
      const totalCents = doc?.totals?.totalAmount ?? entry.originalTotalCents ?? entry.totalCents ?? functionalTotalCents;

      const currency = entry.currency || doc?.currency || 'PEN';
      const provisionalFxRate = Boolean(entry.provisionalFxRate);
      const requiresHumanReview = provisionalFxRate; // CA-13.2

      return {
        id: entry.id,
        traceId: entry.traceId,
        operationType: entry.operationType || 'COMPRA',
        counterpartyName,
        documentNumber,
        issueDate,
        totalCents,
        functionalTotalCents,
        currency,
        templateId: entry.templateId,
        templateVersion: entry.templateVersion,
        provisionalFxRate,
        requiresHumanReview,
        state: entry.state,
        entityVersion: entry.entityVersion || 1
      };
    });

    if (provisionalOnly) {
      items = items.filter(item => item.provisionalFxRate === true);
    }

    const total = items.length;
    let resultItems = items;
    if (page && pageSize) {
      const start = (page - 1) * pageSize;
      resultItems = items.slice(start, start + pageSize);
    } else if (pageSize) {
      resultItems = items.slice(0, pageSize);
    }

    return ok({
      items: resultItems,
      total
    });
  }

  return {
    queryPendingApproval
  };
}

export const defaultApprovalQueryService = createApprovalQueryService();

