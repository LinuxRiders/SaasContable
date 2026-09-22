/**
 * @fileoverview Servicio de Bandeja de Excepciones (contracts/services.md, RF-10, RF-11, RF-12)
 */

import * as repository from '../storage/repository.js';
import { serviceKit } from './serviceKit.js';
import { 
  allowedActions, 
  applyStagingUpdate, 
  ageHours, 
  isOverdue 
} from '../../domain/ingestion/staging.js';
import { recomputeEntry } from '../../domain/ingestion/pipeline.js';
import { offeredTemplates, resolveActiveVersion } from '../../domain/ingestion/templates.js';
import { buildAccountIndex } from '../../domain/ingestion/accounts.js';
import { buildAuditEvent } from '../../domain/ingestion/audit.js';
import { assertTransition } from '../../domain/ingestion/stateMachine.js';

export function createStagingService(repo = repository) {
  return {
    /**
     * Consulta asientos en la bandeja de excepciones
     */
    async queryStaging(ctx, { reason, operationType, from, to, currency, overdueOnly, page = 1, pageSize = 20 } = {}) {
      const validCtx = await serviceKit.validateCtx(ctx, repo);
      if (!validCtx.ok) return validCtx;

      const auth = serviceKit.authorize(ctx, 'QUERY_STAGING', repo);
      if (!auth.ok) return auth;

      const entries = repo.getCollection(ctx.tenantId, 'journalEntries') || [];
      const stagingEntries = entries.filter(e => e.state === 'PENDING_INPUT');

      const docs = repo.getCollection(ctx.tenantId, 'documents') || [];
      const docsMap = new Map(docs.map(d => [d.id, d]));

      const now = serviceKit.clock();

      let items = stagingEntries.map(entry => {
        const doc = docsMap.get(entry.canonicalDocRef || entry.documentId);
        const counterpartyName = entry.operationType === 'VENTA'
          ? (doc?.receiver?.name || '')
          : (doc?.issuer?.name || '');
        const documentNumber = doc?.seriesAndNumber || '';
        const issueDate = doc?.issueDate || entry.issueDate || '';
        const totalCents = doc?.totals?.totalAmount ?? doc?.totalCents ?? entry.totalCents ?? 0;
        const curr = entry.currency || doc?.currency || 'PEN';
        const age = ageHours(entry.stagedAt, now);
        const overdue = isOverdue(entry.stagedAt, now);
        const actions = allowedActions(entry.pendingReasons);

        return {
          id: entry.id,
          traceId: entry.traceId,
          operationType: entry.operationType,
          counterpartyName,
          documentNumber,
          issueDate,
          totalCents,
          currency: curr,
          pendingReasons: entry.pendingReasons || [],
          stagedAt: entry.stagedAt,
          ageHours: age,
          overdue,
          allowedActions: actions,
          entityVersion: entry.entityVersion || 1
        };
      });

      if (reason) {
        items = items.filter(i => i.pendingReasons.includes(reason));
      }
      if (operationType) {
        items = items.filter(i => i.operationType === operationType);
      }
      if (from) {
        items = items.filter(i => i.issueDate >= from);
      }
      if (to) {
        items = items.filter(i => i.issueDate <= to);
      }
      if (currency) {
        items = items.filter(i => i.currency === currency);
      }
      if (overdueOnly) {
        items = items.filter(i => i.overdue === true);
      }

      const total = items.length;
      const start = (page - 1) * pageSize;
      const pagedItems = items.slice(start, start + pageSize);

      return serviceKit.ok({ items: pagedItems, total });
    },

    /**
     * Obtiene el detalle de un asiento y su documento asociado
     */
    async getJournalEntry(ctx, { id } = {}) {
      const validCtx = await serviceKit.validateCtx(ctx, repo);
      if (!validCtx.ok) return validCtx;

      const auth = serviceKit.authorize(ctx, 'GET_JOURNAL_ENTRY', repo);
      if (!auth.ok) return auth;

      const entries = repo.getCollection(ctx.tenantId, 'journalEntries') || [];
      const entry = entries.find(e => e.id === id);
      if (!entry) {
        return serviceKit.fail('NOT_FOUND', 'Asiento no encontrado');
      }

      const docs = repo.getCollection(ctx.tenantId, 'documents') || [];
      const document = docs.find(d => d.id === (entry.canonicalDocRef || entry.documentId));
      const rawPayloadId = entry.rawPayloadId || document?.rawPayloadRef;

      return serviceKit.ok({ entry, document, rawPayloadId });
    },

    /**
     * Actualiza asientos en bandeja con CC, etiquetas o plantilla (CA-11.1 a CA-11.6)
     */
    async updateStagingEntries(ctx, { updates = [] } = {}) {
      const validCtx = await serviceKit.validateCtx(ctx, repo);
      if (!validCtx.ok) return validCtx;

      const auth = serviceKit.authorize(ctx, 'UPDATE_STAGING', repo);
      if (!auth.ok) return auth;

      const periodCheck = await serviceKit.assertWritablePeriod(ctx, repo);
      if (!periodCheck.ok) return periodCheck;

      if (!Array.isArray(updates) || updates.length === 0) {
        return serviceKit.fail('VALIDATION_ERROR', 'Lista de actualizaciones vacía');
      }

      const empresas = repo.getGlobal('empresas') || [];
      const empresa = empresas.find(e => e.id === ctx.tenantId);
      const rawCatalog = repo.getCollection(ctx.tenantId, 'chartOfAccounts') || [];
      const catalogIndex = buildAccountIndex(rawCatalog);
      const bank = repo.getGlobal('templates') || [];
      const activations = repo.getCollection(ctx.tenantId, 'templateActivations') || [];
      const fxRates = repo.getGlobal('fxRates') || [];
      const demoSettings = repo.getGlobal('demoSettings') || {};
      const fxServiceDown = !!demoSettings.fxServiceDown;

      const entries = repo.getCollection(ctx.tenantId, 'journalEntries') || [];
      const docs = repo.getCollection(ctx.tenantId, 'documents') || [];
      const docsMap = new Map(docs.map(d => [d.id, d]));

      const results = [];
      const auditEvents = [];

      for (const update of updates) {
        const entry = entries.find(e => e.id === update.id);
        if (!entry) {
          results.push({
            id: update.id,
            status: 'ERROR',
            error: { code: 'NOT_FOUND', message: 'Asiento no encontrado' }
          });
          continue;
        }

        if (entry.state !== 'PENDING_INPUT') {
          results.push({
            id: update.id,
            status: 'ERROR',
            error: { code: 'INVALID_TRANSITION', message: 'El asiento no está en bandeja' }
          });
          continue;
        }

        if (entry.entityVersion !== update.expectedVersion) {
          results.push({
            id: update.id,
            status: 'CONFLICT',
            entryState: entry.state,
            pendingReasons: entry.pendingReasons,
            error: { code: 'CONFLICT', message: 'Versión desactualizada' }
          });
          continue;
        }

        const actions = allowedActions(entry.pendingReasons);

        // Validar si la acción solicitada está permitida por sus motivos
        if ((update.costCenter || update.analyticTags) && !actions.includes('COMPLETE')) {
          results.push({
            id: update.id,
            status: 'ERROR',
            entryState: entry.state,
            pendingReasons: entry.pendingReasons,
            error: { code: 'ACTION_NOT_ALLOWED_FOR_REASON', message: 'No se permite completar para este motivo' }
          });
          continue;
        }

        if (update.templateId && !actions.includes('CHANGE_TEMPLATE')) {
          results.push({
            id: update.id,
            status: 'ERROR',
            entryState: entry.state,
            pendingReasons: entry.pendingReasons,
            error: { code: 'ACTION_NOT_ALLOWED_FOR_REASON', message: 'No se permite cambiar plantilla para este motivo' }
          });
          continue;
        }

        // Aplicar actualización
        let updatedEntry;
        try {
          updatedEntry = applyStagingUpdate(entry, update);
        } catch (err) {
          results.push({
            id: update.id,
            status: 'ERROR',
            error: { code: err.code || 'VALIDATION_ERROR', message: err.message }
          });
          continue;
        }

        const document = docsMap.get(updatedEntry.canonicalDocRef || updatedEntry.documentId);
        const targetTemplateId = update.templateId || updatedEntry.templateId;
        const offered = offeredTemplates(bank, activations).some(t => t.templateId === targetTemplateId);
        const template = bank.find(t => t.templateId === targetTemplateId);
        const version = template ? resolveActiveVersion(template) : null;

        const { entry: recomputed, events } = recomputeEntry({
          entry: updatedEntry,
          document,
          template,
          version,
          offered,
          catalog: catalogIndex,
          empresa,
          deps: {
            clock: serviceKit.clock,
            idGenerator: serviceKit.idGenerator,
            fxRates,
            fxServiceDown
          }
        });

        // Registrar evento de actualización de bandeja
        auditEvents.push(
          buildAuditEvent({
            id: serviceKit.idGenerator(),
            at: serviceKit.clock(),
            tenantId: ctx.tenantId,
            traceId: recomputed.traceId,
            userId: ctx.userId,
            role: ctx.role,
            action: update.templateId ? 'TEMPLATE_CHANGED' : 'STAGING_UPDATED',
            entityType: 'JournalEntry',
            entityId: recomputed.id,
            detail: { update, newState: recomputed.state, reasons: recomputed.pendingReasons }
          })
        );
        if (events?.length) auditEvents.push(...events);

        // Incrementar entityVersion
        recomputed.entityVersion = (entry.entityVersion || 1) + 1;

        // Guardar con concurrencia optimista
        try {
          repo.upsertVersioned(ctx.tenantId, 'journalEntries', recomputed, update.expectedVersion);
        } catch (err) {
          if (err.code === 'CONFLICT') {
            results.push({
              id: update.id,
              status: 'CONFLICT',
              entryState: entry.state,
              pendingReasons: entry.pendingReasons
            });
            continue;
          }
          throw err;
        }

        const status = recomputed.state === 'PENDING_APPROVAL' ? 'ADVANCED' : 'STILL_PENDING';
        results.push({
          id: update.id,
          status,
          entryState: recomputed.state,
          pendingReasons: recomputed.pendingReasons
        });
      }

      if (auditEvents.length > 0) {
        repo.appendOnly(ctx.tenantId, 'auditLog', auditEvents);
      }

      return serviceKit.ok({ results });
    },

    /**
     * Revalida asientos en bandeja contra catálogos, periodos y plantillas vigentes (CA-11.7)
     */
    async revalidateEntries(ctx, { items = [] } = {}) {
      const validCtx = await serviceKit.validateCtx(ctx, repo);
      if (!validCtx.ok) return validCtx;

      const auth = serviceKit.authorize(ctx, 'REVALIDATE', repo);
      if (!auth.ok) return auth;

      const periodCheck = await serviceKit.assertWritablePeriod(ctx, repo);
      if (!periodCheck.ok) return periodCheck;

      if (!Array.isArray(items) || items.length === 0) {
        return serviceKit.fail('VALIDATION_ERROR', 'Lista de asientos a revalidar vacía');
      }

      const empresas = repo.getGlobal('empresas') || [];
      const empresa = empresas.find(e => e.id === ctx.tenantId);
      const rawCatalog = repo.getCollection(ctx.tenantId, 'chartOfAccounts') || [];
      const catalogIndex = buildAccountIndex(rawCatalog);
      const bank = repo.getGlobal('templates') || [];
      const activations = repo.getCollection(ctx.tenantId, 'templateActivations') || [];
      const fxRates = repo.getGlobal('fxRates') || [];
      const demoSettings = repo.getGlobal('demoSettings') || {};
      const fxServiceDown = !!demoSettings.fxServiceDown;

      const entries = repo.getCollection(ctx.tenantId, 'journalEntries') || [];
      const docs = repo.getCollection(ctx.tenantId, 'documents') || [];
      const docsMap = new Map(docs.map(d => [d.id, d]));

      const results = [];
      const auditEvents = [];

      for (const it of items) {
        const entry = entries.find(e => e.id === it.id);
        if (!entry) {
          results.push({
            id: it.id,
            status: 'ERROR',
            error: { code: 'NOT_FOUND', message: 'Asiento no encontrado' }
          });
          continue;
        }

        if (entry.state !== 'PENDING_INPUT') {
          results.push({
            id: it.id,
            status: 'ERROR',
            error: { code: 'INVALID_TRANSITION', message: 'El asiento no está en bandeja' }
          });
          continue;
        }

        if (entry.entityVersion !== it.expectedVersion) {
          results.push({
            id: it.id,
            status: 'CONFLICT',
            entryState: entry.state,
            pendingReasons: entry.pendingReasons,
            error: { code: 'CONFLICT', message: 'Versión desactualizada' }
          });
          continue;
        }

        const document = docsMap.get(entry.canonicalDocRef || entry.documentId);
        const templateId = entry.templateId;
        const offered = offeredTemplates(bank, activations).some(t => t.templateId === templateId);
        const template = bank.find(t => t.templateId === templateId);
        const version = template ? resolveActiveVersion(template) : null;

        const { entry: recomputed, events } = recomputeEntry({
          entry: { ...entry },
          document,
          template,
          version,
          offered,
          catalog: catalogIndex,
          empresa,
          deps: {
            clock: serviceKit.clock,
            idGenerator: serviceKit.idGenerator,
            fxRates,
            fxServiceDown
          }
        });

        auditEvents.push(
          buildAuditEvent({
            id: serviceKit.idGenerator(),
            at: serviceKit.clock(),
            tenantId: ctx.tenantId,
            traceId: recomputed.traceId,
            userId: ctx.userId,
            role: ctx.role,
            action: 'REVALIDATED',
            entityType: 'JournalEntry',
            entityId: recomputed.id,
            detail: { newState: recomputed.state, reasons: recomputed.pendingReasons }
          })
        );
        if (events?.length) auditEvents.push(...events);

        // Incrementar entityVersion
        recomputed.entityVersion = (entry.entityVersion || 1) + 1;

        try {
          repo.upsertVersioned(ctx.tenantId, 'journalEntries', recomputed, it.expectedVersion);
        } catch (err) {
          if (err.code === 'CONFLICT') {
            results.push({
              id: it.id,
              status: 'CONFLICT',
              entryState: entry.state,
              pendingReasons: entry.pendingReasons
            });
            continue;
          }
          throw err;
        }

        const status = recomputed.state === 'PENDING_APPROVAL' ? 'ADVANCED' : 'STILL_PENDING';
        results.push({
          id: it.id,
          status,
          entryState: recomputed.state,
          pendingReasons: recomputed.pendingReasons
        });
      }

      if (auditEvents.length > 0) {
        repo.appendOnly(ctx.tenantId, 'auditLog', auditEvents);
      }

      return serviceKit.ok({ results });
    },

    /**
     * Cancela un asiento de la bandeja (contracts/services.md, RF-12)
     */
    async cancelEntry(ctx, { id, expectedVersion, reason } = {}) {
      const validCtx = await serviceKit.validateCtx(ctx, repo);
      if (!validCtx.ok) return validCtx;

      const auth = serviceKit.authorize(ctx, 'CANCEL', repo);
      if (!auth.ok) return auth;

      const periodCheck = await serviceKit.assertWritablePeriod(ctx, repo);
      if (!periodCheck.ok) return periodCheck;

      if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
        return serviceKit.fail('VALIDATION_ERROR', 'La justificación debe tener al menos 10 caracteres');
      }

      const entries = repo.getCollection(ctx.tenantId, 'journalEntries') || [];
      const entry = entries.find(e => e.id === id);
      if (!entry) {
        return serviceKit.fail('NOT_FOUND', 'Asiento no encontrado');
      }

      try {
        assertTransition(entry.state, 'CANCELLED');
      } catch (err) {
        return serviceKit.fail('INVALID_TRANSITION', err.message);
      }

      if (entry.entityVersion !== expectedVersion) {
        return serviceKit.fail('CONFLICT', 'Versión desactualizada');
      }

      const now = serviceKit.clock();
      const cancelledEntry = {
        ...entry,
        state: 'CANCELLED',
        pendingReasons: [],
        cancellation: {
          reason: reason.trim(),
          by: ctx.userId,
          at: now
        },
        entityVersion: (entry.entityVersion || 1) + 1,
        updatedAt: now
      };

      try {
        repo.upsertVersioned(ctx.tenantId, 'journalEntries', cancelledEntry, expectedVersion);
      } catch (err) {
        if (err.code === 'CONFLICT') {
          return serviceKit.fail('CONFLICT', 'Versión desactualizada');
        }
        throw err;
      }

      const auditEvent = buildAuditEvent({
        id: serviceKit.idGenerator(),
        at: now,
        tenantId: ctx.tenantId,
        traceId: cancelledEntry.traceId,
        userId: ctx.userId,
        role: ctx.role,
        action: 'ENTRY_CANCELLED',
        entityType: 'JournalEntry',
        entityId: cancelledEntry.id,
        detail: { reason: reason.trim(), previousState: entry.state }
      });

      repo.appendOnly(ctx.tenantId, 'auditLog', [auditEvent]);

      return serviceKit.ok(cancelledEntry);
    }
  };
}

export const defaultStagingService = createStagingService(repository);
