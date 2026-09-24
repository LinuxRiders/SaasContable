/**
 * @fileoverview Pure orchestration of the multiformat intake pipeline (contracts/domain-api.md §5).
 */

import { detectFormat } from './formatDetection.js';
import { buildCanonical, annotateFiscalIds } from './canonicalBuilder.js';
import { buildDedupKey } from './dedup.js';
import { decideIntake } from './intakeDecision.js';

/**
 * Runs intake pipeline for an incoming payload without direct I/O or persistence.
 *
 * @param {Object} input
 * @param {'UPLOAD'|'SAMPLE'|'MANUAL_FORM'|'ATTACHMENT'} [input.channel='UPLOAD']
 * @param {string|null} [input.fileName]
 * @param {string|null} [input.mimeType]
 * @param {number} [input.sizeBytes=0]
 * @param {string} input.sha256
 * @param {Object} [input.contentRef]
 * @param {string} [input.text]
 * @param {Uint8Array} [input.headBytes]
 * @param {Object} [input.formValues]
 * @param {string|null} [input.sampleId]
 * @param {string} [input.sourceFormat]
 *
 * @param {Object} deps
 * @param {string|{ id: string, fiscalId?: string, fiscalIdType?: string, name?: string }} deps.tenant
 * @param {Object} [deps.empresa]
 * @param {Object} [deps.pack]
 * @param {Object} [deps.profiles]
 * @param {{ select: (meta: Object) => Object|null }} [deps.registry]
 * @param {Object} [deps.fixtures]
 * @param {Object} [deps.toggles]
 * @param {Object} [deps.domParser]
 * @param {Record<string, string>} [deps.dedupIndex={}]
 * @param {(data: string) => Promise<string>} deps.sha256Of
 * @param {() => string} [deps.idGenerator]
 * @param {(() => string)|{ now: () => string, today?: () => string }} [deps.clock]
 * @param {{ userId: string, role: string }} [deps.actor]
 *
 * @returns {Promise<{
 *   rawPayload: import('./types.js').RawPayload,
 *   intakeRecords: import('./types.js').IntakeRecord[],
 *   canonicalDocuments: any[],
 *   dlqEntries: import('./types.js').DlqEntry[],
 *   dedupIndexAdditions: Record<string, string>,
 *   events: import('./types.js').DomainEvent[]
 * }>}
 */
export async function runIntake(input, deps) {
  const tenantId = typeof deps.tenant === 'string'
    ? deps.tenant
    : (deps.tenant?.id || deps.empresa?.id || '');

  const tenantFiscalId = deps.empresa?.ruc || deps.empresa?.fiscalId || deps.tenant?.fiscalId || '';
  const tenantFiscalIdType = deps.empresa?.fiscalIdType || deps.tenant?.fiscalIdType || 'RUC';
  const tenantName = deps.empresa?.razonSocial || deps.empresa?.name || deps.tenant?.name || '';

  const now = typeof deps.clock === 'function'
    ? deps.clock()
    : deps.clock?.now
      ? deps.clock.now()
      : new Date().toISOString();

  const today = typeof deps.clock === 'object' && deps.clock?.today
    ? deps.clock.today()
    : now.slice(0, 10);

  const idGen = deps.idGenerator || (() => crypto.randomUUID());
  const sha256Of = deps.sha256Of;
  const actor = deps.actor || { userId: 'system', role: 'MAKER' };

  const rawPayload = {
    id: idGen(),
    tenantId,
    traceId: idGen(),
    channel: input.channel || 'UPLOAD',
    fileName: input.fileName || null,
    mimeType: input.mimeType || null,
    sizeBytes: input.sizeBytes || 0,
    sha256: input.sha256 || '',
    contentRef: input.contentRef || { kind: 'TEXT', text: input.text || '' },
    receivedAt: now,
    receivedBy: actor.userId,
    sampleId: input.sampleId || null
  };

  const intakeRecords = [];
  const canonicalDocuments = [];
  const dlqEntries = [];
  const dedupIndexAdditions = {};
  const events = [];
  const localDedupIndex = { ...(deps.dedupIndex || {}) };

  const sourceFormat = input.sourceFormat || detectFormat({
    mimeType: input.mimeType,
    fileName: input.fileName,
    headBytes: input.headBytes,
    text: input.text
  });

  events.push({
    id: idGen(),
    tenantId,
    type: 'RawPayloadStored',
    at: now,
    traceId: rawPayload.traceId,
    actor: { userId: actor.userId, role: actor.role },
    payload: {
      rawPayloadId: rawPayload.id,
      channel: rawPayload.channel,
      sourceFormat,
      sha256: rawPayload.sha256
    }
  });

  const reader = deps.registry
    ? deps.registry.select({
        format: sourceFormat,
        sourceFormat,
        fileName: input.fileName,
        mimeType: input.mimeType,
        text: input.text
      })
    : null;

  if (!reader) {
    const dlqEntry = {
      id: idGen(),
      tenantId,
      traceId: rawPayload.traceId,
      rawPayloadId: rawPayload.id,
      rowNumber: null,
      errorType: 'UNSUPPORTED_FORMAT',
      errorMessage: 'Formato no soportado o archivo no procesable',
      errorDetail: { sourceFormat, fileName: input.fileName, mimeType: input.mimeType },
      readerId: 'none',
      attempts: 1,
      status: 'OPEN',
      createdAt: now
    };
    dlqEntries.push(dlqEntry);

    const intakeRecord = {
      id: idGen(),
      tenantId,
      traceId: rawPayload.traceId,
      rawPayloadId: rawPayload.id,
      rowNumber: null,
      canonicalDocumentId: null,
      status: 'FAILED',
      sourceFormat,
      documentTypeCode: null,
      deduplicationHash: null,
      duplicateOfIntakeRecordId: null,
      lowConfidenceFields: [],
      warnings: [],
      dlqEntryId: dlqEntry.id,
      processingStatus: 'NOT_APPLICABLE',
      createdAt: now,
      createdBy: actor.userId
    };
    intakeRecords.push(intakeRecord);

    events.push({
      id: idGen(),
      tenantId,
      type: 'DocumentParsingFailed',
      at: now,
      traceId: rawPayload.traceId,
      actor: { userId: actor.userId, role: actor.role },
      payload: {
        dlqEntryId: dlqEntry.id,
        rawPayloadId: rawPayload.id,
        errorType: 'UNSUPPORTED_FORMAT'
      }
    });

    return {
      rawPayload,
      intakeRecords,
      canonicalDocuments,
      dlqEntries,
      dedupIndexAdditions,
      events
    };
  }

  const readerContext = {
    pack: deps.pack,
    profiles: deps.profiles,
    tenant: {
      fiscalIdType: tenantFiscalIdType,
      fiscalId: tenantFiscalId,
      name: tenantName
    },
    domParser: deps.domParser,
    fixtures: deps.fixtures,
    toggles: deps.toggles,
    csvProfileIds: deps.empresa?.csvProfiles || []
  };

  const readResult = reader.read(input, readerContext);

  if (!readResult.ok) {
    const dlqEntry = {
      id: idGen(),
      tenantId,
      traceId: rawPayload.traceId,
      rawPayloadId: rawPayload.id,
      rowNumber: null,
      errorType: readResult.errorType || 'MALFORMED',
      errorMessage: readResult.errorMessage || 'Error al procesar documento',
      errorDetail: readResult.errorDetail || {},
      readerId: reader.id,
      attempts: 1,
      status: 'OPEN',
      createdAt: now
    };
    dlqEntries.push(dlqEntry);

    const intakeRecord = {
      id: idGen(),
      tenantId,
      traceId: rawPayload.traceId,
      rawPayloadId: rawPayload.id,
      rowNumber: null,
      canonicalDocumentId: null,
      status: 'FAILED',
      sourceFormat,
      documentTypeCode: null,
      deduplicationHash: null,
      duplicateOfIntakeRecordId: null,
      lowConfidenceFields: [],
      warnings: [],
      dlqEntryId: dlqEntry.id,
      processingStatus: 'NOT_APPLICABLE',
      createdAt: now,
      createdBy: actor.userId
    };
    intakeRecords.push(intakeRecord);

    events.push({
      id: idGen(),
      tenantId,
      type: 'DocumentParsingFailed',
      at: now,
      traceId: rawPayload.traceId,
      actor: { userId: actor.userId, role: actor.role },
      payload: {
        dlqEntryId: dlqEntry.id,
        rawPayloadId: rawPayload.id,
        errorType: dlqEntry.errorType
      }
    });

    return {
      rawPayload,
      intakeRecords,
      canonicalDocuments,
      dlqEntries,
      dedupIndexAdditions,
      events
    };
  }

  // Handle row errors (e.g. invalid rows in CSV)
  if (Array.isArray(readResult.rowErrors)) {
    for (const rowErr of readResult.rowErrors) {
      const dlqEntry = {
        id: idGen(),
        tenantId,
        traceId: rawPayload.traceId,
        rawPayloadId: rawPayload.id,
        rowNumber: rowErr.rowNumber,
        errorType: 'INVALID_ROW',
        errorMessage: rowErr.message || 'Fila inválida',
        errorDetail: rowErr.detail || {},
        readerId: reader.id,
        attempts: 1,
        status: 'OPEN',
        createdAt: now
      };
      dlqEntries.push(dlqEntry);

      const intakeRecord = {
        id: idGen(),
        tenantId,
        traceId: rawPayload.traceId,
        rawPayloadId: rawPayload.id,
        rowNumber: rowErr.rowNumber,
        canonicalDocumentId: null,
        status: 'FAILED',
        sourceFormat,
        documentTypeCode: null,
        deduplicationHash: null,
        duplicateOfIntakeRecordId: null,
        lowConfidenceFields: [],
        warnings: [],
        dlqEntryId: dlqEntry.id,
        processingStatus: 'NOT_APPLICABLE',
        createdAt: now,
        createdBy: actor.userId
      };
      intakeRecords.push(intakeRecord);

      events.push({
        id: idGen(),
        tenantId,
        type: 'DocumentParsingFailed',
        at: now,
        traceId: rawPayload.traceId,
        actor: { userId: actor.userId, role: actor.role },
        payload: {
          dlqEntryId: dlqEntry.id,
          rawPayloadId: rawPayload.id,
          errorType: 'INVALID_ROW'
        }
      });
    }
  }

  // Process valid drafts
  const drafts = readResult.drafts || [];
  for (let idx = 0; idx < drafts.length; idx++) {
    const draft = drafts[idx];
    const rowNumber = draft.rowNumber !== undefined
      ? draft.rowNumber
      : (drafts.length > 1 ? idx + 1 : null);

    const canonical = buildCanonical(draft, {
      rawPayload,
      rowNumber,
      tenantId,
      jurisdictionCode: deps.pack?.code || 'PE',
      documentTypeVersion: draft.documentTypeVersion || 1,
      idGenerator: idGen
    });

    const { canonical: annotatedDoc, warnings: fiscalWarnings } = annotateFiscalIds(canonical, {
      pack: deps.pack
    });

    const dedupKey = buildDedupKey(tenantId, annotatedDoc);
    const dedupHash = dedupKey && typeof sha256Of === 'function'
      ? await sha256Of(dedupKey)
      : null;
    annotatedDoc.deduplicationHash = dedupHash;

    const documentType = (deps.pack?.documentTypes || []).find(
      (dt) => dt.code === annotatedDoc.documentTypeCode
    );

    const decision = decideIntake(annotatedDoc, {
      documentType,
      tenantFiscalId,
      dedupIndex: localDedupIndex,
      dedupHash,
      threshold: deps.empresa?.extractionConfidenceThreshold || deps.pack?.extractionConfidenceThreshold || 0.85,
      today,
      warnings: fiscalWarnings
    });

    const intakeRecordId = idGen();
    const isReceived = decision.status === 'RECEIVED' || decision.status === 'RECEIVED_NEEDS_REVIEW';

    const intakeRecord = {
      id: intakeRecordId,
      tenantId,
      traceId: rawPayload.traceId,
      rawPayloadId: rawPayload.id,
      rowNumber,
      canonicalDocumentId: isReceived ? annotatedDoc.id : null,
      status: decision.status,
      sourceFormat,
      documentTypeCode: annotatedDoc.documentTypeCode || null,
      deduplicationHash: dedupHash,
      duplicateOfIntakeRecordId: decision.duplicateOfIntakeRecordId || null,
      lowConfidenceFields: decision.lowConfidenceFields || [],
      warnings: decision.warnings || [],
      dlqEntryId: null,
      processingStatus: isReceived ? 'AWAITING_INTERPRETATION' : 'NOT_APPLICABLE',
      createdAt: now,
      createdBy: actor.userId
    };
    intakeRecords.push(intakeRecord);

    if (isReceived) {
      canonicalDocuments.push(annotatedDoc);
      if (dedupHash) {
        localDedupIndex[dedupHash] = intakeRecord.id;
        dedupIndexAdditions[dedupHash] = intakeRecord.id;
      }

      events.push({
        id: idGen(),
        tenantId,
        type: 'DocumentReceived',
        at: now,
        traceId: rawPayload.traceId,
        actor: { userId: actor.userId, role: actor.role },
        payload: {
          intakeRecordId: intakeRecord.id,
          canonicalDocumentId: annotatedDoc.id,
          documentTypeCode: annotatedDoc.documentTypeCode,
          sourceFormat,
          needsReview: decision.status === 'RECEIVED_NEEDS_REVIEW',
          lowConfidenceFields: decision.lowConfidenceFields || []
        }
      });
    } else if (decision.status === 'DUPLICATE') {
      events.push({
        id: idGen(),
        tenantId,
        type: 'DocumentDuplicated',
        at: now,
        traceId: rawPayload.traceId,
        actor: { userId: actor.userId, role: actor.role },
        payload: {
          intakeRecordId: intakeRecord.id,
          duplicateOfIntakeRecordId: decision.duplicateOfIntakeRecordId,
          deduplicationHash: dedupHash
        }
      });
    }
  }

  return {
    rawPayload,
    intakeRecords,
    canonicalDocuments,
    dlqEntries,
    dedupIndexAdditions,
    events
  };
}
