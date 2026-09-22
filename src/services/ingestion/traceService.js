import * as repository from '../storage/repository.js';
import { serviceKit } from './serviceKit.js';
import { buildAuditEvent } from '../../domain/ingestion/audit.js';

/**
 * Servicio de trazabilidad y auditoría de comprobantes y asientos (HU-06, RF-17, T096).
 */
export function createTraceService(deps = {}) {
  const repo = (deps && typeof deps.getCollection === 'function') ? deps : (deps.repo || repository);
  const clock = deps.clock || serviceKit.clock;
  const idGenerator = deps.idGenerator || serviceKit.idGenerator;
  const { ok, fail, validateCtx, authorize } = serviceKit;

  /**
   * Obtiene la trazabilidad completa de un comprobante por traceId (CA-17.2).
   * Devuelve: { rawPayload, document, entry, template, events }
   */
  async function getTraceability(ctx, { traceId } = {}) {
    const ctxRes = validateCtx(ctx, repo);
    if (!ctxRes.ok) return ctxRes;

    const authRes = authorize(ctx, 'GET_TRACEABILITY', repo, clock);
    if (!authRes.ok) return authRes;

    if (!traceId) {
      return fail('VALIDATION_ERROR', 'traceId es obligatorio');
    }

    const tenantId = ctx.tenantId;

    // 1. Buscar en rawPayloads de la empresa
    const rawPayloads = repo.readAppendOnly(tenantId, 'rawPayloads') || [];
    const rawPayload = rawPayloads.find(p => p.traceId === traceId) || null;

    // 2. Buscar en documents de la empresa
    const docs = repo.getCollection(tenantId, 'documents') || [];
    const document = docs.find(d => d.traceId === traceId || (rawPayload && d.rawPayloadRef === rawPayload.id)) || null;

    // 3. Buscar en journalEntries de la empresa
    const entries = repo.getCollection(tenantId, 'journalEntries') || [];
    const entry = entries.find(e => e.traceId === traceId || (document && (e.documentId === document.id || e.canonicalDocRef === document.id))) || null;

    // 4. Buscar eventos de auditoría relacionados
    const allAuditEvents = repo.readAppendOnly(tenantId, 'auditLog') || [];
    const traceEvents = allAuditEvents.filter(ev => ev.traceId === traceId);

    // Si no se encontró nada con este traceId en este tenant, retornar NOT_FOUND (aislamiento por empresa RF-16)
    if (!rawPayload && !document && !entry && traceEvents.length === 0) {
      return fail('NOT_FOUND', `No se encontró información de trazabilidad para traceId: ${traceId}`);
    }

    // 5. Restricción de rol para CHECKER:
    // "El Checker solo puede consultar la trazabilidad de asientos en PENDING_APPROVAL" (contracts/services.md §47-61)
    if (ctx.role === 'CHECKER') {
      if (!entry || entry.state !== 'PENDING_APPROVAL') {
        const deniedEvent = buildAuditEvent({
          id: idGenerator(),
          at: clock(),
          tenantId,
          traceId,
          userId: ctx.userId,
          role: ctx.role,
          action: 'ACTION_DENIED',
          entityType: 'JournalEntry',
          entityId: entry?.id || traceId,
          detail: { reason: 'Checker solo puede consultar la trazabilidad de asientos en PENDING_APPROVAL' }
        });
        repo.appendOnly(tenantId, 'auditLog', [deniedEvent]);
        return fail('FORBIDDEN', 'El rol Checker solo puede consultar la trazabilidad de asientos en estado PENDING_APPROVAL');
      }
    }

    // 6. Cargar información de la plantilla y versión exacta leída del banco global
    let templateInfo = null;
    if (entry?.templateId) {
      const templates = repo.getGlobal('templates') || [];
      const foundTemplate = templates.find(t => t.id === entry.templateId || t.templateId === entry.templateId || t.code === entry.templateId);
      if (foundTemplate) {
        const foundVersion = (foundTemplate.versions || []).find(v => v.version === entry.templateVersion) ||
          (foundTemplate.version === entry.templateVersion ? foundTemplate : null);
        
        if (foundVersion) {
          templateInfo = {
            ...foundVersion,
            templateId: foundTemplate.id || foundTemplate.templateId || entry.templateId,
            code: foundTemplate.code,
            name: foundTemplate.name
          };
        } else {
          templateInfo = {
            templateId: foundTemplate.id || foundTemplate.templateId || entry.templateId,
            code: foundTemplate.code,
            name: foundTemplate.name,
            version: entry.templateVersion
          };
        }
      } else {
        templateInfo = {
          templateId: entry.templateId,
          version: entry.templateVersion
        };
      }
    }

    // 7. Ordenar eventos cronológicamente ascendente (CA-17.2)
    // Volver a leer auditLog por si se agregó algún evento
    const finalAuditEvents = repo.readAppendOnly(tenantId, 'auditLog') || [];
    const events = finalAuditEvents
      .filter(ev => ev.traceId === traceId)
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

    return ok({
      rawPayload,
      document,
      entry,
      template: templateInfo,
      events
    });
  }

  return {
    getTraceability
  };
}

export const defaultTraceService = createTraceService();
