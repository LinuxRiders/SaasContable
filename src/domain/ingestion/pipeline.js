/**
 * @fileoverview Pipeline de procesamiento de comprobantes electrónicos (plan §2, RF-01..RF-09, RF-20)
 */

import { parseInvoice } from './parsers/registry.js';
import { validateCanonical } from './canonical.js';
import { classifyOperation } from './classify.js';
import { translateToJournalEntry } from './translator.js';
import { validateAndSetState } from './validator.js';
import { buildAccountIndex } from './accounts.js';
import { isPeriodOpen } from './periods.js';
import { buildAuditEvent } from './audit.js';
import { buildDedupKey, dedupHash } from './dedup.js';
import { formatMoney, formatPEN } from './money.js';
import { assertTransition } from './stateMachine.js';
import { resolveRate } from './fx.js';

/**
 * Procesa un item individual dentro del pipeline de ingestión
 * @param {Object} params
 * @param {Object} params.item - { fileName, content, sizeBytes, source }
 * @param {import('./types.js').IngestionCtx} params.ctx
 * @param {Object} params.empresa
 * @param {Array<Object>|Record<string, Object>} params.catalog
 * @param {import('../templates/types.js').Template} params.template
 * @param {import('../templates/types.js').TemplateVersion} params.version
 * @param {Object} [params.deps]
 * @returns {Promise<{rawPayload: Object, document?: Object, entry?: Object, events: Array<Object>, summaryDelta: Object}>}
 */
export async function processItem({
  item,
  ctx,
  empresa,
  catalog,
  template,
  version,
  dedupIndex = {},
  batchHashes = new Map(),
  existingDocuments = [],
  deps = {}
}) {
  const clock = deps.clock || (() => new Date().toISOString());
  const idGenerator = deps.idGenerator || (() => crypto.randomUUID());
  const sha256 = deps.sha256 || (str => 'mock-sha-' + str.length);

  const tenantId = ctx.tenantId;
  const userId = ctx.userId;
  const role = ctx.role;

  const traceId = idGenerator();
  const rawPayloadId = idGenerator();
  const receivedAt = clock();

  const events = [];
  const addEvent = (action, entityType, entityId, detail = {}) => {
    events.push(
      buildAuditEvent({
        id: idGenerator(),
        at: clock(),
        tenantId,
        traceId,
        userId,
        role,
        action,
        entityType,
        entityId,
        detail
      })
    );
  };

  const accountIndex = Array.isArray(catalog) ? buildAccountIndex(catalog) : catalog;

  // Paso 1: Recepción (RF-02)
  const sizeBytes = item.sizeBytes !== undefined ? item.sizeBytes : (item.content ? item.content.length : 0);

  if (sizeBytes > 1024 * 1024) {
    addEvent('RAW_RECEIVED', 'File', item.fileName, { sizeBytes, error: 'FILE_TOO_LARGE' });
    addEvent('PARSE_FAILED', 'File', item.fileName, { reason: 'archivo excede 1 MB' });

    const rawPayload = {
      id: rawPayloadId,
      tenantId,
      traceId,
      receivedAt,
      source: item.source || 'UPLOAD',
      fileName: item.fileName,
      contentType: item.fileName.endsWith('.xml') ? 'xml' : 'json',
      sizeBytes,
      content: null, // No se guarda por superar 1 MB
      contentSha256: null,
      outcome: 'FAILED',
      outcomeReason: 'archivo excede 1 MB',
      duplicateOfDocumentId: null
    };

    return {
      rawPayload,
      events,
      summaryDelta: { received: 1, failed: 1 }
    };
  }

  const contentSha256 = sha256(item.content || '');
  addEvent('RAW_RECEIVED', 'File', item.fileName, { sizeBytes, contentSha256 });

  // Paso 2: Interpretación y Canónico (RF-04, RF-05)
  let canonicalDoc;
  try {
    canonicalDoc = parseInvoice(item.content, item.fileName);
    validateCanonical(canonicalDoc);
  } catch (err) {
    addEvent('PARSE_FAILED', 'File', item.fileName, { reason: err.message, details: err.details });
    const rawPayload = {
      id: rawPayloadId,
      tenantId,
      traceId,
      receivedAt,
      source: item.source || 'UPLOAD',
      fileName: item.fileName,
      contentType: item.fileName.endsWith('.xml') ? 'xml' : 'json',
      sizeBytes,
      content: item.content,
      contentSha256,
      outcome: 'FAILED',
      outcomeReason: err.message || 'Error de parseo',
      duplicateOfDocumentId: null
    };

    return {
      rawPayload,
      events,
      summaryDelta: { received: 1, failed: 1 }
    };
  }

  canonicalDoc.id = canonicalDoc.id || idGenerator();
  addEvent('DOCUMENT_CANONICALIZED', 'CanonicalDocument', canonicalDoc.id, {
    seriesAndNumber: canonicalDoc.seriesAndNumber,
    type: canonicalDoc.type
  });

  // Paso 3: Pertenencia (RF-06)
  let classifiedOp;
  try {
    classifiedOp = classifyOperation(canonicalDoc, empresa.ruc);
    canonicalDoc.operationType = classifiedOp;
  } catch (err) {
    addEvent('REJECTED_NOT_TENANT', 'CanonicalDocument', canonicalDoc.id, { reason: err.message });
    const rawPayload = {
      id: rawPayloadId,
      tenantId,
      traceId,
      receivedAt,
      source: item.source || 'UPLOAD',
      fileName: item.fileName,
      contentType: item.fileName.endsWith('.xml') ? 'xml' : 'json',
      sizeBytes,
      content: item.content,
      contentSha256,
      outcome: 'REJECTED',
      outcomeReason: 'El comprobante no pertenece a la empresa',
      duplicateOfDocumentId: null
    };

    return {
      rawPayload,
      document: canonicalDoc,
      events,
      summaryDelta: { received: 1, rejected: 1 }
    };
  }

  // Paso 4: Detección de duplicados (RF-03, RD-04, R-04)
  const dedupKey = buildDedupKey(tenantId, canonicalDoc);
  const docHash = await dedupHash(dedupKey, sha256);
  canonicalDoc.deduplicationHash = docHash;

  let duplicateOriginalDoc = null;
  if (batchHashes && batchHashes.has(docHash)) {
    duplicateOriginalDoc = batchHashes.get(docHash);
  } else if (dedupIndex && (docHash in dedupIndex || (dedupIndex instanceof Map && dedupIndex.has(docHash)))) {
    const originalDocId = dedupIndex instanceof Map ? dedupIndex.get(docHash) : dedupIndex[docHash];
    if (Array.isArray(existingDocuments)) {
      duplicateOriginalDoc = existingDocuments.find(d => d.id === originalDocId);
    } else if (existingDocuments && typeof existingDocuments.get === 'function') {
      duplicateOriginalDoc = existingDocuments.get(originalDocId);
    }
    if (!duplicateOriginalDoc) {
      duplicateOriginalDoc = { id: originalDocId };
    }
  }

  if (duplicateOriginalDoc) {
    const originalDocId = duplicateOriginalDoc.id;
    const currentTotal = canonicalDoc.totals?.totalAmount ?? canonicalDoc.totalCents;
    const origTotal = duplicateOriginalDoc.totals?.totalAmount ?? duplicateOriginalDoc.totalCents;
    const currentCurr = canonicalDoc.currency || 'PEN';
    const origCurr = duplicateOriginalDoc.currency || currentCurr;

    const hasDiff = origTotal !== undefined && (currentTotal !== origTotal || currentCurr !== origCurr);
    const outcome = hasDiff ? 'DUPLICATE_WITH_DIFF' : 'DUPLICATE';

    const formatDocTotal = (cents, curr) => {
      if (cents === undefined || cents === null) return '0.00';
      if (curr === 'USD') {
        return `USD ${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      if (curr === 'PEN') {
        return formatPEN(cents);
      }
      return `${curr} ${(cents / 100).toFixed(2)}`;
    };

    const outcomeReason = hasDiff
      ? `Total ${formatDocTotal(currentTotal, currentCurr)} difiere del original ${formatDocTotal(origTotal, origCurr)}`
      : null;

    addEvent('DUPLICATE_DETECTED', 'CanonicalDocument', originalDocId, {
      deduplicationHash: docHash,
      duplicateOfDocumentId: originalDocId,
      outcome,
      reason: outcomeReason
    });

    const rawPayload = {
      id: rawPayloadId,
      tenantId,
      traceId,
      receivedAt,
      source: item.source || 'UPLOAD',
      fileName: item.fileName,
      contentType: item.fileName.endsWith('.xml') ? 'xml' : 'json',
      sizeBytes,
      content: item.content,
      contentSha256,
      outcome,
      outcomeReason,
      duplicateOfDocumentId: originalDocId
    };

    return {
      rawPayload,
      events,
      summaryDelta: { received: 1, duplicates: 1 }
    };
  }

  canonicalDoc.totalCents = canonicalDoc.totals?.totalAmount;
  canonicalDoc.tenantId = tenantId;
  canonicalDoc.traceId = traceId;
  canonicalDoc.rawPayloadRef = rawPayloadId;

  // Paso 5: Tipo de cambio (RF-07, R-12)
  let fx = null;
  if (canonicalDoc.currency && canonicalDoc.currency !== 'PEN') {
    const fxRates = deps.fxRates || [];
    const fxServiceDown = !!deps.fxServiceDown;
    fx = resolveRate(fxRates, canonicalDoc.issueDate, fxServiceDown);
  }

  // Paso 6: Traducción con reglas (RF-08, RF-20)
  const journalEntry = translateToJournalEntry(
    canonicalDoc,
    { template, version, fx },
    accountIndex,
    { idGenerator, clock }
  );

  journalEntry.tenantId = tenantId;
  journalEntry.traceId = traceId;
  journalEntry.rawPayloadId = rawPayloadId;
  journalEntry.documentId = canonicalDoc.id;
  journalEntry.createdBy = userId;
  journalEntry.createdAt = clock();
  journalEntry.entityVersion = 1;

  addEvent('DRAFT_CREATED', 'JournalEntry', journalEntry.id, {
    templateId: template.templateId || template.id,
    templateVersion: version.version
  });

  // Paso 7: Validación contable y decisión de estado (RF-09)
  const periodOpen = isPeriodOpen(empresa, canonicalDoc.issueDate);
  validateAndSetState(journalEntry, canonicalDoc, accountIndex, template, !periodOpen, clock);

  const rawPayload = {
    id: rawPayloadId,
    tenantId,
    traceId,
    receivedAt,
    source: item.source || 'UPLOAD',
    fileName: item.fileName,
    contentType: item.fileName.endsWith('.xml') ? 'xml' : 'json',
    sizeBytes,
    content: item.content,
    contentSha256,
    outcome: 'ACCEPTED',
    outcomeReason: null,
    duplicateOfDocumentId: null
  };

  if (journalEntry.state === 'PENDING_INPUT') {
    addEvent('SENT_TO_STAGING', 'JournalEntry', journalEntry.id, {
      reasons: journalEntry.pendingReasons
    });
    return {
      rawPayload,
      document: canonicalDoc,
      entry: journalEntry,
      events,
      summaryDelta: { received: 1, accepted: 1, staged: 1 }
    };
  }

  addEvent('MOVED_TO_PENDING_APPROVAL', 'JournalEntry', journalEntry.id, {});

  return {
    rawPayload,
    document: canonicalDoc,
    entry: journalEntry,
    events,
    summaryDelta: { received: 1, accepted: 1, pendingApproval: 1 }
  };
}

/**
 * Recalcula un asiento a partir de su documento canónico y las condiciones vigentes
 * (T078, RF-11, CA-11.3, R-24)
 * @param {Object} params
 * @param {Object} params.entry - JournalEntry
 * @param {Object} params.document - CanonicalDocument
 * @param {Object} params.template - Template
 * @param {Object} params.version - TemplateVersion
 * @param {boolean} [params.offered=true] - Si la plantilla está ofrecida para la empresa
 * @param {Array<Object>|Record<string, Object>} params.catalog - Catálogo de cuentas
 * @param {Object} params.empresa - Empresa con periodos
 * @param {Object} [params.deps]
 * @returns {{ entry: Object, events: Array<Object> }}
 */
export function recomputeEntry({
  entry,
  document,
  template,
  version,
  offered = true,
  catalog,
  empresa,
  deps = {}
}) {
  const clock = deps.clock || (() => new Date().toISOString());
  const idGenerator = deps.idGenerator || (() => crypto.randomUUID());
  const events = [];

  const tenantId = entry.tenantId || empresa?.id;
  const traceId = entry.traceId || idGenerator();
  const userId = entry.createdBy || 'SYSTEM';
  const role = 'MAKER';

  const addEvent = (action, entityType, entityId, detail = {}) => {
    events.push(
      buildAuditEvent({
        id: idGenerator(),
        at: clock(),
        tenantId,
        traceId,
        userId,
        role,
        action,
        entityType,
        entityId,
        detail
      })
    );
  };

  // Si la plantilla no está ofrecida para la empresa o no tiene versión activa (R-24)
  if (!offered || !template || !version) {
    entry.state = 'PENDING_INPUT';
    entry.pendingReasons = ['TEMPLATE_INACTIVE'];
    entry.stagedAt = clock();
    return { entry, events };
  }

  // Cambio de versión
  if (entry.templateVersion && version.version && entry.templateVersion !== version.version) {
    addEvent('TEMPLATE_VERSION_CHANGED', 'JournalEntry', entry.id, {
      templateId: template.templateId || template.id,
      previousVersion: entry.templateVersion,
      newVersion: version.version
    });
    entry.templateVersion = version.version;
  }

  // Transición PENDING_INPUT -> DRAFT
  if (entry.state === 'PENDING_INPUT') {
    assertTransition(entry.state, 'DRAFT');
    entry.state = 'DRAFT';
  }

  const accountIndex = Array.isArray(catalog) ? buildAccountIndex(catalog) : catalog;

  // Paso 5: Tipo de cambio (RF-07, R-12)
  let fx = null;
  if (document.currency && document.currency !== 'PEN') {
    const fxRates = deps.fxRates || [];
    const fxServiceDown = !!deps.fxServiceDown;
    fx = resolveRate(fxRates, document.issueDate, fxServiceDown);
  }

  // Paso 6: Traducción con la versión activa vigente
  const newEntry = translateToJournalEntry(
    document,
    { template, version, fx },
    accountIndex,
    { idGenerator, clock }
  );

  entry.lines = newEntry.lines;
  entry.appliedRules = newEntry.appliedRules;
  entry.templateId = template.templateId || template.id;
  entry.templateVersion = version.version;
  entry.operationType = document.operationType || newEntry.operationType;
  entry.currency = newEntry.currency;
  entry.fx = newEntry.fx;
  entry.provisionalFxRate = newEntry.provisionalFxRate;
  entry.pendingReasons = newEntry.pendingReasons || [];

  // Si el asiento tenía centros de costo asignados, conservarlos si aplica
  if (entry.costCenter) {
    entry.lines.forEach(l => {
      if (l.role === 'BASE' || l.role === 'DEST_DEBIT' || l.role === 'DEST_CREDIT') {
        l.costCenter = entry.costCenter;
      }
    });
  }

  // Paso 7: Validación contable y decisión de estado
  const periodOpen = isPeriodOpen(empresa, document.issueDate);
  validateAndSetState(entry, document, accountIndex, template, !periodOpen, clock);

  assertTransition('DRAFT', entry.state);

  if (entry.state === 'PENDING_INPUT') {
    entry.stagedAt = clock();
    addEvent('SENT_TO_STAGING', 'JournalEntry', entry.id, {
      reasons: entry.pendingReasons
    });
  } else if (entry.state === 'PENDING_APPROVAL') {
    entry.stagedAt = null;
    entry.pendingReasons = [];
    addEvent('MOVED_TO_PENDING_APPROVAL', 'JournalEntry', entry.id, {});
  }

  return { entry, events };
}
