/**
 * @fileoverview Servicio de Ingestión de Comprobantes Electrónicos (contracts/services.md, plan §2)
 */

import * as repository from '../storage/repository.js';
import { serviceKit } from './serviceKit.js';
import { initialActivations, offeredTemplates, resolveActiveVersion } from '../../domain/ingestion/templates.js';
import { processItem } from '../../domain/ingestion/pipeline.js';
import { buildAccountIndex } from '../../domain/ingestion/accounts.js';
import { mockComprobantesDemo } from '../../data/mockComprobantesDemo.js';

export function createIngestionService(repo = repository) {
  return {
    /**
     * Lista las plantillas ofrecidas para la empresa activa
     */
    async listTemplates(ctx) {
      const validCtx = await serviceKit.validateCtx(ctx, repo);
      if (!validCtx.ok) return validCtx;

      const auth = serviceKit.authorize(ctx, 'LIST_TEMPLATES', repo);
      if (!auth.ok) return auth;

      const empresa = repo.getGlobal('empresas')?.find(e => e.id === ctx.tenantId);
      if (!empresa) return serviceKit.fail('NOT_FOUND', 'Empresa no encontrada');

      const bank = repo.getGlobal('templates') || [];
      let activations = repo.getCollection(ctx.tenantId, 'templateActivations');

      if (!activations) {
        activations = initialActivations(empresa, serviceKit.clock);
        repo.setCollection(ctx.tenantId, 'templateActivations', activations);
      }

      const activeActivations = activations.filter(a => a.active);
      const companyHasActivations = activeActivations.length > 0;

      if (!companyHasActivations) {
        return serviceKit.ok({ templates: [], companyHasActivations: false });
      }

      const offered = offeredTemplates(bank, activations);
      const mapped = offered.map(t => {
        const activeVer = resolveActiveVersion(t);
        return {
          templateId: t.templateId,
          code: t.code,
          name: t.name,
          operationType: t.operationType,
          version: activeVer ? activeVer.version : null
        };
      });

      return serviceKit.ok({ templates: mapped, companyHasActivations: true });
    },

    /**
     * Devuelve los comprobantes de ejemplo del catálogo demo
     */
    async listSampleCatalog(ctx) {
      const validCtx = await serviceKit.validateCtx(ctx, repo);
      if (!validCtx.ok) return validCtx;

      const auth = serviceKit.authorize(ctx, 'LIST_SAMPLES', repo);
      if (!auth.ok) return auth;

      return serviceKit.ok(mockComprobantesDemo);
    },

    /**
     * Procesa un lote de comprobantes
     */
    async ingestBatch(ctx, { templateId, items = [] } = {}) {
      const validCtx = await serviceKit.validateCtx(ctx, repo);
      if (!validCtx.ok) return validCtx;

      const auth = serviceKit.authorize(ctx, 'INGEST', repo);
      if (!auth.ok) return auth;

      const periodCheck = await serviceKit.assertWritablePeriod(ctx, repo);
      if (!periodCheck.ok) return periodCheck;

      if (!templateId || !items || items.length === 0) {
        return serviceKit.fail('VALIDATION_ERROR', 'Debe seleccionar una plantilla y al menos un archivo');
      }

      if (items.length > 50) {
        return serviceKit.fail('BATCH_TOO_LARGE', 'El lote excede el límite máximo de 50 comprobantes');
      }

      const empresa = repo.getGlobal('empresas')?.find(e => e.id === ctx.tenantId);
      if (!empresa) return serviceKit.fail('NOT_FOUND', 'Empresa no encontrada');

      const bank = repo.getGlobal('templates') || [];
      let activations = repo.getCollection(ctx.tenantId, 'templateActivations');
      if (!activations) {
        activations = initialActivations(empresa, serviceKit.clock);
        repo.setCollection(ctx.tenantId, 'templateActivations', activations);
      }

      const offered = offeredTemplates(bank, activations);
      const template = offered.find(t => t.templateId === templateId);
      if (!template) {
        return serviceKit.fail('TEMPLATE_NOT_ACTIVE', `La plantilla '${templateId}' no está activa para la empresa`);
      }

      const version = resolveActiveVersion(template);
      if (!version) {
        return serviceKit.fail('TEMPLATE_NOT_ACTIVE', `La plantilla '${templateId}' no tiene una versión activa`);
      }

      const rawCatalog = repo.getCollection(ctx.tenantId, 'chartOfAccounts') || [];
      const catalogIndex = buildAccountIndex(rawCatalog);

      const batchId = serviceKit.idGenerator();
      const startedAt = serviceKit.clock();

      const batchItems = [];
      const rawPayloadsToSave = [];
      const documentsToSave = [];
      const entriesToSave = [];
      const eventsToSave = [];

      const dedupIndex = repo.getCollection(ctx.tenantId, 'dedupIndex') || {};
      const existingDocuments = repo.getCollection(ctx.tenantId, 'documents') || [];
      const batchHashes = new Map();
      const newDedupEntries = {};

      const summary = {
        totalReceived: items.length,
        acceptedCount: 0,
        pendingApprovalCount: 0,
        stagedCount: 0,
        failedCount: 0,
        rejectedCount: 0,
        duplicateCount: 0
      };

      const fxRates = repo.getGlobal('fxRates') || [];
      const demoSettings = repo.getGlobal('demoSettings') || {};
      const fxServiceDown = !!demoSettings.fxServiceDown;

      for (const it of items) {
        const result = await processItem({
          item: it,
          ctx,
          empresa,
          catalog: catalogIndex,
          template,
          version,
          dedupIndex,
          batchHashes,
          existingDocuments: [...existingDocuments, ...documentsToSave],
          deps: {
            clock: serviceKit.clock,
            idGenerator: serviceKit.idGenerator,
            sha256: serviceKit.sha256,
            fxRates,
            fxServiceDown
          }
        });

        if (result.rawPayload) rawPayloadsToSave.push(result.rawPayload);
        if (result.document) {
          documentsToSave.push(result.document);
          if (result.document.deduplicationHash) {
            batchHashes.set(result.document.deduplicationHash, result.document);
            newDedupEntries[result.document.deduplicationHash] = result.document.id;
          }
        }
        if (result.entry) entriesToSave.push(result.entry);
        if (result.events) eventsToSave.push(...result.events);

        if (result.summaryDelta) {
          if (result.summaryDelta.accepted) summary.acceptedCount += result.summaryDelta.accepted;
          if (result.summaryDelta.pendingApproval) summary.pendingApprovalCount += result.summaryDelta.pendingApproval;
          if (result.summaryDelta.staged) summary.stagedCount += result.summaryDelta.staged;
          if (result.summaryDelta.failed) summary.failedCount += result.summaryDelta.failed;
          if (result.summaryDelta.rejected) summary.rejectedCount += result.summaryDelta.rejected;
          if (result.summaryDelta.duplicates) summary.duplicateCount += result.summaryDelta.duplicates;
        }

        batchItems.push({
          rawPayloadId: result.rawPayload?.id,
          fileName: it.fileName,
          outcome: result.rawPayload?.outcome,
          outcomeReason: result.rawPayload?.outcomeReason,
          traceId: result.rawPayload?.traceId,
          journalEntryId: result.entry?.id,
          entryState: result.entry?.state,
          pendingReasons: result.entry?.pendingReasons,
          duplicateOfDocumentId: result.rawPayload?.duplicateOfDocumentId
        });
      }

      // Escrituras en orden de R-08: rawPayloads -> documents -> dedupIndex -> journalEntries -> auditLog
      try {
        if (rawPayloadsToSave.length > 0) {
          repo.appendOnly(ctx.tenantId, 'rawPayloads', rawPayloadsToSave);
        }

        if (documentsToSave.length > 0) {
          const currentDocs = repo.getCollection(ctx.tenantId, 'documents') || [];
          repo.setCollection(ctx.tenantId, 'documents', [...currentDocs, ...documentsToSave]);
        }

        if (Object.keys(newDedupEntries).length > 0) {
          const currentDedup = repo.getCollection(ctx.tenantId, 'dedupIndex') || {};
          repo.setCollection(ctx.tenantId, 'dedupIndex', { ...currentDedup, ...newDedupEntries });
        }

        if (entriesToSave.length > 0) {
          const currentEntries = repo.getCollection(ctx.tenantId, 'journalEntries') || [];
          repo.setCollection(ctx.tenantId, 'journalEntries', [...currentEntries, ...entriesToSave]);
        }

        if (eventsToSave.length > 0) {
          repo.appendOnly(ctx.tenantId, 'auditLog', eventsToSave);
        }

        // Incrementar usageCount de la versión usada
        version.usageCount = (version.usageCount || 0) + entriesToSave.length;
        repo.setGlobal('templates', bank);

        const batch = {
          id: batchId,
          tenantId: ctx.tenantId,
          templateId,
          templateVersion: version.version,
          startedAt,
          completedAt: serviceKit.clock(),
          summary,
          items: batchItems
        };

        const currentBatches = repo.getCollection(ctx.tenantId, 'batches') || [];
        repo.setCollection(ctx.tenantId, 'batches', [batch, ...currentBatches]);

        return serviceKit.ok(batch);
      } catch (err) {
        if (err.name === 'QuotaExceededError' || err.code === 'STORAGE_FULL') {
          return serviceKit.fail('STORAGE_FULL', 'El almacenamiento del navegador está lleno');
        }
        throw err;
      }
    },

    /**
     * Obtiene un lote por su id
     */
    async getBatch(ctx, { batchId } = {}) {
      const validCtx = await serviceKit.validateCtx(ctx, repo);
      if (!validCtx.ok) return validCtx;

      const auth = serviceKit.authorize(ctx, 'GET_BATCH', repo);
      if (!auth.ok) return auth;

      const batches = repo.getCollection(ctx.tenantId, 'batches') || [];
      const batch = batches.find(b => b.id === batchId);
      if (!batch) {
        return serviceKit.fail('NOT_FOUND', 'Lote no encontrado');
      }
      return serviceKit.ok(batch);
    },

    /**
     * Lista los lotes procesados
     */
    async listBatches(ctx, { limit = 20 } = {}) {
      const validCtx = await serviceKit.validateCtx(ctx, repo);
      if (!validCtx.ok) return validCtx;

      const auth = serviceKit.authorize(ctx, 'LIST_BATCHES', repo);
      if (!auth.ok) return auth;

      const batches = repo.getCollection(ctx.tenantId, 'batches') || [];
      return serviceKit.ok(batches.slice(0, limit));
    },

    /**
     * Consulta resultados de evidencia recibida
     */
    async queryIntakeResults(ctx, { outcome, from, to, page = 1, pageSize = 20 } = {}) {
      const validCtx = await serviceKit.validateCtx(ctx, repo);
      if (!validCtx.ok) return validCtx;

      const auth = serviceKit.authorize(ctx, 'QUERY_INTAKE_RESULTS', repo);
      if (!auth.ok) return auth;

      let payloads = repo.getCollection(ctx.tenantId, 'rawPayloads') || [];

      if (outcome) {
        if (Array.isArray(outcome)) {
          payloads = payloads.filter(p => outcome.includes(p.outcome));
        } else if (outcome === 'DUPLICATES') {
          payloads = payloads.filter(p => p.outcome === 'DUPLICATE' || p.outcome === 'DUPLICATE_WITH_DIFF');
        } else {
          payloads = payloads.filter(p => p.outcome === outcome);
        }
      }
      if (from) {
        payloads = payloads.filter(p => p.receivedAt >= from);
      }
      if (to) {
        payloads = payloads.filter(p => p.receivedAt <= to);
      }

      const total = payloads.length;
      const start = (page - 1) * pageSize;
      const items = payloads.slice(start, start + pageSize).map(p => ({
        rawPayloadId: p.id,
        traceId: p.traceId,
        receivedAt: p.receivedAt,
        fileName: p.fileName,
        outcome: p.outcome,
        outcomeReason: p.outcomeReason,
        duplicateOfDocumentId: p.duplicateOfDocumentId
      }));

      return serviceKit.ok({ items, total });
    },

    /**
     * Obtiene el payload crudo por id
     */
    async getRawPayload(ctx, { rawPayloadId } = {}) {
      const validCtx = await serviceKit.validateCtx(ctx, repo);
      if (!validCtx.ok) return validCtx;

      const auth = serviceKit.authorize(ctx, 'GET_RAW_PAYLOAD', repo);
      if (!auth.ok) return auth;

      const payloads = repo.getCollection(ctx.tenantId, 'rawPayloads') || [];
      const found = payloads.find(p => p.id === rawPayloadId);
      if (!found) {
        return serviceKit.fail('NOT_FOUND', 'Evidencia no encontrada');
      }

      return serviceKit.ok(found);
    }
  };
}

export const defaultIngestionService = createIngestionService(repository);
