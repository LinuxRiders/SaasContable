/**
 * @fileoverview Tipos base para el dominio de ingestión, usando JSDoc para tipado en tiempo de desarrollo.
 */

/**
 * @typedef {Object} RawPayload
 * @property {string} id
 * @property {string} tenantId
 * @property {string} fileName
 * @property {string} contentType
 * @property {number} sizeBytes
 * @property {string} receivedAt - ISO datetime
 * @property {string} traceId
 * @property {string} content
 * @property {string|null} duplicateOfDocumentId - Si es un duplicado, apunta al original
 * @property {"ACCEPTED"|"DUPLICATE"|"DUPLICATE_WITH_DIFF"|"PARSE_FAILED"|"REJECTED_NOT_TENANT"} [outcome]
 */

/**
 * @typedef {Object} CanonicalDocument
 * @property {string} id
 * @property {string} tenantId
 * @property {string} supplierRuc
 * @property {string} supplierName
 * @property {string} customerRuc
 * @property {string} customerName
 * @property {"01"|"03"|"07"|"08"} documentType
 * @property {string} documentSerial
 * @property {string} documentNumber
 * @property {string} issueDate - YYYY-MM-DD
 * @property {"PEN"|"USD"} currency
 * @property {number} totalAmount - en moneda original, centavos
 * @property {number} totalIgv - en moneda original, centavos
 * @property {string} originalPayloadId
 * @property {string} traceId
 */

/**
 * @typedef {Object} FinancialLine
 * @property {"D"|"H"} side
 * @property {string} accountCode
 * @property {number} amount
 * @property {number} baseAmount
 * @property {"BASE"|"TAX"|"COUNTERPART"|"DEST_DEBIT"|"DEST_CREDIT"} role
 */

/**
 * @typedef {Object} JournalEntry
 * @property {string} id
 * @property {string} tenantId
 * @property {string} originalDocumentId
 * @property {"DRAFT"|"PENDING_INPUT"|"PENDING_APPROVAL"|"POSTED"|"POSTED_PENDING_PUBLISH"|"REJECTED"|"CANCELLED"} status
 * @property {PendingReason[]} pendingReasons
 * @property {string|null} stagedAt - ISO datetime
 * @property {EntryLine[]} lines
 * @property {string} templateId
 * @property {number} templateVersion
 * @property {string} accountingPeriod - "YYYY-MM"
 * @property {Object} [fx]
 * @property {number} fx.rateMilli
 * @property {string} fx.rateDate
 * @property {boolean} fx.provisional
 * @property {string} traceId
 * @property {Object} [cancellation]
 * @property {string} cancellation.reason
 * @property {string} cancellation.by
 * @property {string} cancellation.at
 */

/**
 * @typedef {Object} EntryLine
 * @property {number} lineNo
 * @property {"D"|"H"} side
 * @property {string} accountCode
 * @property {string} description
 * @property {string|null} costCenter
 * @property {number|null} originalAmountCents
 * @property {number} functionalAmountCents
 * @property {"BASE"|"TAX"|"COUNTERPART"|"DEST_DEBIT"|"DEST_CREDIT"} role
 */

/**
 * @typedef {"UNBALANCED"|"INCONSISTENT_AMOUNTS"|"PERIOD_CLOSED"|"TEMPLATE_MISMATCH"|"MISSING_COST_CENTER"|"ACCOUNT_NOT_FOUND"|"ACCOUNT_NOT_POSTABLE"|"NO_FX_RATE"} PendingReason
 */

/**
 * @typedef {Object} TemplateVersion
 * @property {string} templateId
 * @property {number} version
 * @property {string} code
 * @property {string} name
 * @property {"COMPRA"|"VENTA"} operationType
 * @property {"COMPRA_MERCADERIA"|"COMPRA_SERVICIOS"|"VENTA"} category
 * @property {string} baseAccount
 * @property {string} taxAccount
 * @property {string} counterpartAccount
 * @property {boolean} appliesIgv
 * @property {boolean} requiresCostCenter
 * @property {string|null} defaultCostCenter
 * @property {boolean} isActive
 * @property {number} usageCount
 */

/**
 * @typedef {Object} IngestionBatch
 * @property {string} id
 * @property {string} tenantId
 * @property {string} createdBy
 * @property {string} createdAt
 * @property {string} templateId
 * @property {number} templateVersion
 * @property {number} itemCount
 * @property {Object} summary
 * @property {number} summary.received
 * @property {number} summary.accepted
 * @property {number} summary.duplicates
 * @property {number} summary.failed
 * @property {number} summary.rejected
 * @property {number} summary.pendingInput
 * @property {number} summary.pendingApproval
 * @property {Object[]} items
 * @property {string} items[].rawPayloadId
 * @property {string} items[].fileName
 * @property {string} items[].outcome
 * @property {string} [items[].journalEntryId]
 */

/**
 * @typedef {Object} AuditEvent
 * @property {string} id
 * @property {string} tenantId
 * @property {string} traceId
 * @property {string} at - ISO datetime
 * @property {string} userId
 * @property {string} role
 * @property {"RAW_RECEIVED"|"DUPLICATE_DETECTED"|"PARSE_FAILED"|"REJECTED_NOT_TENANT"|"DOCUMENT_CANONICALIZED"|"DRAFT_CREATED"|"SENT_TO_STAGING"|"STAGING_UPDATED"|"TEMPLATE_CHANGED"|"REVALIDATED"|"MOVED_TO_PENDING_APPROVAL"|"ENTRY_CANCELLED"|"ACTION_DENIED"|"INVALID_TRANSITION"|"CONFLICT"|"DEMO_RESET"} action
 * @property {string} entityType
 * @property {string} entityId
 * @property {Object} detail
 */

/**
 * @typedef {Object} DemoSettings
 * @property {boolean} fxServiceDown
 * @property {number} latencyMs
 * @property {number} perItemLatencyMs
 */

/**
 * @typedef {Object} NormalizedAccount
 * @property {string} code
 * @property {boolean} isPostable
 * @property {boolean} requiresCostCenter
 * @property {string|null} defaultCostCenter
 * @property {string} [destDebit]
 * @property {string} [destCredit]
 */

/**
 * @typedef {Object} IngestionCtx
 * @property {string} tenantId
 * @property {string} userId
 * @property {string} role
 * @property {Object} activePeriod
 * @property {string} activePeriod.ejercicio
 * @property {string} activePeriod.nombrePeriodo
 * @property {boolean} readOnly
 */

