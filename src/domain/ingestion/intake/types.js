/**
 * Modelos de datos del subsistema de ingestión (intake).
 * Conforme a specs/002-ingestion-pipeline/data-model.md §1–§6.
 */

/**
 * @typedef {Object} RawPayload
 * Payload append-only original recibido por el sistema (RD-01).
 * @property {string} id
 * @property {string} tenantId
 * @property {string} traceId
 * @property {'UPLOAD'|'SAMPLE'|'MANUAL_FORM'|'ATTACHMENT'} channel
 * @property {string|null} fileName
 * @property {string|null} mimeType
 * @property {number} sizeBytes
 * @property {string} sha256 - Huella SHA-256 del contenido
 * @property {{ kind: 'FIXTURE', url: string } | { kind: 'TEXT', text: string } | { kind: 'BASE64', data: string } | { kind: 'FORM', values: Object }} contentRef
 * @property {string} receivedAt - Timestamp ISO 8601
 * @property {string} receivedBy - Usuario que realizó la ingestión
 * @property {string|null} sampleId - Identificador de documento de muestra (DOC-01..16)
 */

/**
 * @typedef {Object} IntakeRecord
 * Resultado de recepción y trazabilidad de un documento dentro del lote.
 * @property {string} id
 * @property {string} tenantId
 * @property {string} traceId
 * @property {string} rawPayloadId
 * @property {number|null} rowNumber - Fila en archivos batch/CSV (1-indexed)
 * @property {string|null} canonicalDocumentId
 * @property {'RECEIVED'|'RECEIVED_NEEDS_REVIEW'|'DUPLICATE'|'NOT_FOR_TENANT'|'FAILED'} status
 * @property {'XML'|'JSON'|'CSV'|'PDF_TEXT'|'PDF_SCANNED'|'IMAGE'|'FORM'} sourceFormat
 * @property {string|null} documentTypeCode
 * @property {string|null} deduplicationHash
 * @property {string|null} duplicateOfIntakeRecordId
 * @property {string[]} lowConfidenceFields - Rutas de fieldProvenance por debajo del umbral de confianza
 * @property {Array<{ code: 'FUTURE_ISSUE_DATE'|'INVALID_FISCAL_ID'|'FIELD_NOT_FOUND', detail: Object }>} warnings
 * @property {string|null} dlqEntryId
 * @property {'AWAITING_INTERPRETATION'|'NOT_APPLICABLE'} processingStatus
 * @property {string} createdAt
 * @property {string} createdBy
 */

/**
 * @typedef {Object} DlqEntry
 * Registro de error de lectura o extracción enviado a la Dead Letter Queue.
 * @property {string} id
 * @property {string} tenantId
 * @property {string} traceId
 * @property {string} rawPayloadId
 * @property {number|null} rowNumber
 * @property {'UNSUPPORTED_FORMAT'|'UNREADABLE'|'MALFORMED'|'UNKNOWN_DOCUMENT_TYPE'|'UNKNOWN_CURRENCY'|'CSV_PROFILE_MISMATCH'|'INVALID_ROW'|'NO_JURISDICTION_PACK'} errorType
 * @property {string} errorMessage - Mensaje legible en español
 * @property {Object} errorDetail - Contexto técnico (ej. columnas faltantes)
 * @property {string} readerId
 * @property {number} attempts - Número de intentos de procesamiento
 * @property {'OPEN'|'REPROCESSED'|'DISCARDED'} status
 * @property {string} createdAt
 */

/**
 * @typedef {Object} DomainEvent
 * Evento de dominio emitido por el subsistema.
 * @property {string} id
 * @property {string} tenantId
 * @property {string} type - Tipo de evento (ej. 'RawPayloadStored', 'DocumentReceived')
 * @property {string} at - Timestamp ISO 8601
 * @property {string} traceId
 * @property {{ userId: string, role: string }} actor
 * @property {Object} payload - Carga útil del evento
 */

/**
 * @typedef {Object} RowError
 * Error en una fila individual al procesar archivos tabulares (CSV).
 * @property {number} rowNumber - Número de fila
 * @property {string} [column] - Columna afectada
 * @property {string} code - Código de error
 * @property {string} message - Descripción
 * @property {Object} [detail]
 */

/**
 * @typedef {Object} CanonicalDraft
 * Borrador canónico generado por un lector antes de ser sellado y persistido.
 * @property {string} documentTypeCode
 * @property {number} [documentTypeVersion]
 * @property {string|null} [perspective]
 * @property {string|null} [operationTypeCode]
 * @property {string} series
 * @property {string} number
 * @property {string} issueDate
 * @property {string|null} [dueDate]
 * @property {string} currency
 * @property {Array<{ role: string, fiscalIdType: string, fiscalId: string, name: string }>} parties
 * @property {Record<string, any>} fields
 * @property {Array<any>} lines
 * @property {Array<any>} taxes
 * @property {Array<any>} withholdings
 * @property {Array<any>} references
 * @property {Object} totals
 * @property {{ sourceFormat: string, extractorId: string, documentTypeConfidence: number, fieldProvenance: Array<any>, notFound?: string[], attachments?: string[] }} extraction
 */

export {};
