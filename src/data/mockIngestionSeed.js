/**
 * @fileoverview Semilla de datos para la bandeja de ingestión (CA-10.4, T080)
 * Incluye un asiento en PENDING_INPUT con stagedAt de −72 h para demostrar antigüedad y atraso.
 */

import { buildAuditEvent } from '../domain/ingestion/audit.js';

export function buildIngestionSeed(clock = () => new Date().toISOString()) {
  const seededAt = clock();
  const stagedAtTime = new Date(new Date(seededAt).getTime() - 72 * 60 * 60 * 1000).toISOString();

  const traceId = 'trace-seed-overdue-01';
  const rawPayloadId = 'payload-seed-overdue-01';
  const documentId = 'doc-seed-overdue-01';
  const entryId = 'entry-seed-overdue-01';
  const dedupHash = 'hash-seed-overdue-01';

  const rawPayload = {
    id: rawPayloadId,
    tenantId: '01',
    traceId,
    batchId: 'batch-seed-initial',
    receivedAt: stagedAtTime,
    source: 'UPLOAD',
    fileName: 'compra_atrasada_pl06.json',
    contentType: 'json',
    sizeBytes: 420,
    content: JSON.stringify({
      tipoDocumento: '01',
      serieNumero: 'F001-00009999',
      fechaEmision: '2026-09-10',
      moneda: 'PEN',
      emisor: { ruc: '20555555551', razonSocial: 'PROVEEDOR LOGISTICA SAC' },
      receptor: { ruc: '20450656934', razonSocial: 'PACHATUSANTREK SAC' },
      lineas: [{ descripcion: 'Otros gastos de gestión diversos', valor: '500.00', tributo: 'IGV' }],
      totales: { baseGravada: '500.00', igv: '90.00', total: '590.00' }
    }, null, 2),
    contentSha256: 'seed-content-sha256-overdue',
    outcome: 'ACCEPTED',
    outcomeReason: null,
    duplicateOfDocumentId: null
  };

  const document = {
    id: documentId,
    tenantId: '01',
    traceId,
    rawPayloadRef: rawPayloadId,
    deduplicationHash: dedupHash,
    type: '01',
    seriesAndNumber: 'F001-00009999',
    issueDate: '2026-09-10',
    currency: 'PEN',
    issuer: { ruc: '20555555551', name: 'PROVEEDOR LOGISTICA SAC' },
    receiver: { ruc: '20450656934', name: 'PACHATUSANTREK SAC' },
    operationType: 'COMPRA',
    lines: [
      { lineNo: 1, description: 'Otros gastos de gestión diversos', amountCents: 50000, taxCode: 'IGV' }
    ],
    taxableBaseCents: 50000,
    exemptBaseCents: 0,
    igvCents: 9000,
    totalCents: 59000,
    totals: { totalAmount: 59000, taxAmount: 9000, taxableAmount: 50000, exemptAmount: 0, unaffectedAmount: 0 },
    receivedAt: stagedAtTime
  };

  const journalEntry = {
    id: entryId,
    tenantId: '01',
    traceId,
    canonicalDocRef: documentId,
    documentId,
    rawPayloadId,
    batchId: 'batch-seed-initial',
    state: 'PENDING_INPUT',
    operationType: 'COMPRA',
    templateId: 'PL-06',
    templateVersion: 1,
    appliedRules: [],
    issueDate: '2026-09-10',
    accountingPeriod: '2026-09',
    currency: 'PEN',
    fx: null,
    provisionalFxRate: false,
    lines: [
      {
        lineNo: 1,
        side: 'D',
        accountCode: '6591101',
        description: 'OTROS GASTOS DE GESTIÓN - DIVERSOS',
        costCenter: null,
        originalAmountCents: null,
        functionalAmountCents: 50000,
        role: 'BASE',
        ruleId: null,
        sourceLineNos: [1]
      },
      {
        lineNo: 2,
        side: 'D',
        accountCode: '4011101',
        description: 'IGV - CUENTA PROPIA (CRÉDITO Y DÉBITO FISCAL)',
        costCenter: null,
        originalAmountCents: null,
        functionalAmountCents: 9000,
        role: 'TAX',
        ruleId: null,
        sourceLineNos: []
      },
      {
        lineNo: 3,
        side: 'H',
        accountCode: '4212101',
        description: 'FACTURAS, BOLETAS Y OTROS POR PAGAR - EMITIDAS',
        costCenter: null,
        originalAmountCents: null,
        functionalAmountCents: 59000,
        role: 'COUNTERPART',
        ruleId: null,
        sourceLineNos: []
      },
      {
        lineNo: 4,
        side: 'D',
        accountCode: '9411101',
        description: 'GASTOS ADMINISTRATIVOS GENERALES',
        costCenter: null,
        originalAmountCents: null,
        functionalAmountCents: 50000,
        role: 'DEST_DEBIT',
        ruleId: null,
        sourceLineNos: [1]
      },
      {
        lineNo: 5,
        side: 'H',
        accountCode: '7911101',
        description: 'CARGAS IMPUTABLES A CUENTAS DE COSTOS Y GASTOS',
        costCenter: null,
        originalAmountCents: null,
        functionalAmountCents: 50000,
        role: 'DEST_CREDIT',
        ruleId: null,
        sourceLineNos: [1]
      }
    ],
    pendingReasons: ['MISSING_COST_CENTER'],
    analyticTags: {},
    stagedAt: stagedAtTime,
    cancellation: null,
    entityVersion: 1,
    createdBy: 'contador_maria',
    createdAt: stagedAtTime,
    updatedAt: stagedAtTime
  };

  const auditEvents = [
    buildAuditEvent({
      id: 'audit-seed-overdue-1',
      at: stagedAtTime,
      tenantId: '01',
      traceId,
      userId: 'contador_maria',
      role: 'MAKER',
      action: 'RAW_RECEIVED',
      entityType: 'File',
      entityId: rawPayload.fileName,
      detail: { sizeBytes: rawPayload.sizeBytes }
    }),
    buildAuditEvent({
      id: 'audit-seed-overdue-2',
      at: stagedAtTime,
      tenantId: '01',
      traceId,
      userId: 'contador_maria',
      role: 'MAKER',
      action: 'DOCUMENT_CANONICALIZED',
      entityType: 'CanonicalDocument',
      entityId: documentId,
      detail: { seriesAndNumber: document.seriesAndNumber }
    }),
    buildAuditEvent({
      id: 'audit-seed-overdue-3',
      at: stagedAtTime,
      tenantId: '01',
      traceId,
      userId: 'contador_maria',
      role: 'MAKER',
      action: 'DRAFT_CREATED',
      entityType: 'JournalEntry',
      entityId: entryId,
      detail: { templateId: 'PL-06', templateVersion: 1 }
    }),
    buildAuditEvent({
      id: 'audit-seed-overdue-4',
      at: stagedAtTime,
      tenantId: '01',
      traceId,
      userId: 'contador_maria',
      role: 'MAKER',
      action: 'SENT_TO_STAGING',
      entityType: 'JournalEntry',
      entityId: entryId,
      detail: { reasons: ['MISSING_COST_CENTER'] }
    })
  ];

  return {
    rawPayloads: [rawPayload],
    documents: [document],
    journalEntries: [journalEntry],
    dedupIndex: { [dedupHash]: documentId },
    auditEvents
  };
}

