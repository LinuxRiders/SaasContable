import * as defaultRepo from '../storage/repository.js';
import { ok, fail, withLatency, authorize } from './serviceKit.js';
import { buildAuditEvent } from '../../domain/ingestion/audit.js';
import { resolveTenantContext } from '../accounting/context.js';
import * as eventBus from '../events/eventBus.js';
import { runIntake } from '../../domain/ingestion/intake/runIntake.js';
import { createReaderRegistry } from '../../domain/ingestion/intake/readerRegistry.js';

const MAX_PAYLOAD_BYTES = 300 * 1024;

const STATUS_TO_AUDIT_ACTION = {
  RECEIVED: 'DOCUMENT_CANONICALIZED',
  RECEIVED_NEEDS_REVIEW: 'DOCUMENT_CANONICALIZED',
  DUPLICATE: 'DUPLICATE_DETECTED',
  NOT_FOR_TENANT: 'REJECTED_NOT_TENANT',
  FAILED: 'PARSE_FAILED'
};

/**
 * Calcula el SHA-256 de bytes crudos (Web Crypto), sin pasar por texto (RD-01, contracts §1).
 * @param {Uint8Array} bytes
 * @returns {Promise<string>}
 */
async function sha256OfBytes(bytes) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * SHA-256 de una cadena de texto (para la clave de deduplicación).
 * @param {string} str
 * @returns {Promise<string>}
 */
async function sha256OfString(str) {
  const bytes = new TextEncoder().encode(str);
  return sha256OfBytes(bytes);
}

/**
 * Construye el registro único de lectores del servicio. Cada historia de usuario
 * agrega su lector aquí (Strategy pattern, contracts/domain-api.md §2).
 * @returns {{ select: (meta: Object) => Object|null, getAll: () => Array<Object> }}
 */
export function buildReaderRegistry() {
  return createReaderRegistry([]);
}

function isTextFormat(sourceFormat) {
  return sourceFormat === 'XML' || sourceFormat === 'JSON' || sourceFormat === 'CSV';
}

/**
 * Ingesta uno o varios archivos (contracts/services.md §1).
 * @param {{ tenantId: string, userId: string, role: string }} ctx
 * @param {{ files: Array<{ name: string, type: string, size: number, arrayBuffer: () => Promise<ArrayBuffer> }> }} params
 * @param {Object} [repo]
 */
export async function ingestFiles(ctx, { files = [] } = {}, repo = defaultRepo) {
  const settings = repo.getGlobal('demoSettings');
  await withLatency(settings);

  const authRes = authorize(ctx, 'INGEST_DOCUMENTS', repo);
  if (!authRes.ok) return authRes;

  const ctxRes = resolveTenantContext(repo, ctx);
  if (!ctxRes.ok) return ctxRes;
  const { empresa, pack } = ctxRes.data;

  const batchId = crypto.randomUUID();
  const results = [];
  const summary = { received: 0, needsReview: 0, duplicates: 0, notForTenant: 0, failed: 0 };

  // Import dinámico de formatDetection es innecesario: runIntake ya lo usa internamente.
  const { detectFormat } = await import('../../domain/ingestion/intake/formatDetection.js');

  for (const file of files) {
    const fileName = file.name || null;
    const mimeType = file.type || null;

    let bytes;
    try {
      const buf = await file.arrayBuffer();
      bytes = new Uint8Array(buf);
    } catch (err) {
      results.push({ fileName, rawPayloadId: null, records: [], dlqEntryIds: [], error: { code: 'EMPTY_FILE', message: 'No se pudo leer el archivo' } });
      summary.failed += 1;
      continue;
    }

    const sizeBytes = bytes.length;

    if (sizeBytes === 0) {
      results.push({ fileName, rawPayloadId: null, records: [], dlqEntryIds: [], error: { code: 'EMPTY_FILE', message: `El archivo '${fileName}' está vacío` } });
      summary.failed += 1;
      continue;
    }

    if (sizeBytes > MAX_PAYLOAD_BYTES) {
      results.push({ fileName, rawPayloadId: null, records: [], dlqEntryIds: [], error: { code: 'PAYLOAD_TOO_LARGE', message: `El archivo '${fileName}' supera el límite de 300 KB` } });
      summary.failed += 1;
      continue;
    }

    const sha256 = await sha256OfBytes(bytes);
    const headBytes = bytes.subarray(0, 8);
    const sourceFormat = detectFormat({ mimeType, fileName, headBytes });
    const text = isTextFormat(sourceFormat) ? new TextDecoder('utf-8').decode(bytes) : undefined;

    const dedupIndex = repo.getCollection(ctx.tenantId, 'dedupIndex') || {};
    const demoExtraction = (repo.getGlobal('demoSettings') || {}).extraction || {};

    let runResult;
    try {
      runResult = await runIntake(
        {
          channel: 'UPLOAD',
          fileName,
          mimeType,
          sizeBytes,
          sha256,
          text,
          headBytes,
          contentRef: { kind: 'BASE64', data: '' }
        },
        {
          tenant: { id: ctx.tenantId, fiscalId: empresa.ruc, fiscalIdType: 'RUC', name: empresa.razonSocial },
          empresa,
          pack,
          profiles: pack.readingProfiles,
          registry: buildReaderRegistry(),
          toggles: demoExtraction,
          domParser: typeof DOMParser !== 'undefined' ? new DOMParser() : null,
          dedupIndex,
          sha256Of: sha256OfString,
          idGenerator: () => crypto.randomUUID(),
          clock: () => new Date().toISOString(),
          actor: { userId: ctx.userId, role: ctx.role }
        }
      );
    } catch (err) {
      results.push({ fileName, rawPayloadId: null, records: [], dlqEntryIds: [], error: { code: 'VALIDATION_ERROR', message: err.message } });
      summary.failed += 1;
      continue;
    }

    persistRunResult(repo, ctx, runResult);

    for (const record of runResult.intakeRecords) {
      const bucket = {
        RECEIVED: 'received',
        RECEIVED_NEEDS_REVIEW: 'needsReview',
        DUPLICATE: 'duplicates',
        NOT_FOR_TENANT: 'notForTenant',
        FAILED: 'failed'
      }[record.status];
      if (bucket) summary[bucket] += 1;
    }

    results.push({
      fileName,
      rawPayloadId: runResult.rawPayload.id,
      records: runResult.intakeRecords,
      dlqEntryIds: runResult.dlqEntries.map((d) => d.id)
    });
  }

  return ok({ batchId, results, summary });
}

/**
 * Persiste el resultado de `runIntake` en el orden del contrato y registra auditoría.
 * @param {Object} repo
 * @param {Object} ctx
 * @param {Awaited<ReturnType<typeof runIntake>>} runResult
 */
function persistRunResult(repo, ctx, runResult) {
  const { rawPayload, canonicalDocuments, intakeRecords, dlqEntries, dedupIndexAdditions, events } = runResult;

  repo.appendOnly(ctx.tenantId, 'rawPayloads', [rawPayload]);

  const auditEvents = [
    buildAuditEvent({
      id: crypto.randomUUID(),
      at: rawPayload.receivedAt,
      tenantId: ctx.tenantId,
      traceId: rawPayload.traceId,
      userId: ctx.userId,
      role: ctx.role,
      action: 'RAW_RECEIVED',
      entityType: 'RawPayload',
      entityId: rawPayload.id,
      detail: { fileName: rawPayload.fileName, sizeBytes: rawPayload.sizeBytes, channel: rawPayload.channel }
    })
  ];

  if (canonicalDocuments.length > 0) {
    repo.appendOnly(ctx.tenantId, 'canonicalDocuments', canonicalDocuments);
  }
  if (intakeRecords.length > 0) {
    repo.appendOnly(ctx.tenantId, 'intakeRecords', intakeRecords);
  }
  if (dlqEntries.length > 0) {
    repo.appendOnly(ctx.tenantId, 'dlq', dlqEntries);
  }
  if (Object.keys(dedupIndexAdditions).length > 0) {
    const dedupIndex = repo.getCollection(ctx.tenantId, 'dedupIndex') || {};
    repo.setCollection(ctx.tenantId, 'dedupIndex', { ...dedupIndex, ...dedupIndexAdditions });
  }
  if (events.length > 0) {
    repo.appendOnly(ctx.tenantId, 'events', events);
    for (const event of events) {
      eventBus.notify(event);
    }
  }

  for (const record of intakeRecords) {
    const action = STATUS_TO_AUDIT_ACTION[record.status];
    if (!action) continue;
    auditEvents.push(buildAuditEvent({
      id: crypto.randomUUID(),
      at: record.createdAt,
      tenantId: ctx.tenantId,
      traceId: record.traceId,
      userId: ctx.userId,
      role: ctx.role,
      action,
      entityType: 'IntakeRecord',
      entityId: record.id,
      detail: {
        status: record.status,
        documentTypeCode: record.documentTypeCode,
        sourceFormat: record.sourceFormat,
        duplicateOfIntakeRecordId: record.duplicateOfIntakeRecordId
      }
    }));
  }

  repo.appendOnly(ctx.tenantId, 'auditLog', auditEvents);
}

export const intakeService = {
  buildReaderRegistry,
  ingestFiles
};

export default intakeService;
