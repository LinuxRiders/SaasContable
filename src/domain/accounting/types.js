/**
 * Tipos de dominio contable agnósticos de jurisdicción (JSDoc).
 * Conforme a SDD v3.0 §13, §20–§21 y data-model.md §2–§7, §12.
 */

/**
 * @typedef {Object} FiscalIdType
 * @property {string} code
 * @property {string} name
 * @property {string} pattern
 */

/**
 * @typedef {Object} TaxRateDefinition
 * @property {number} rateBp
 * @property {string} effectiveFrom
 * @property {string|null} effectiveTo
 */

/**
 * @typedef {Object} TaxDefinition
 * @property {string} code
 * @property {string} name
 * @property {'VALUE_ADDED'|'EXCISE'|'WITHHOLDING'|'PERCEPTION'|'DEFERRED_PAYMENT'|'OTHER'} kind
 * @property {TaxRateDefinition[]} rates
 * @property {string} [recoverableAccountRole]
 * @property {string} [payableAccountRole]
 * @property {'ADD_TO_COST'|'EXPENSE'} [nonRecoverableTreatment]
 */

/**
 * @typedef {Object} OperationType
 * @property {string} code
 * @property {string} name
 * @property {string} description
 * @property {Array<'RECEIVED'|'ISSUED'|'INTERNAL'>} allowedPerspectives
 */

/**
 * @typedef {Object} AccountRoleQualifier
 * @property {'costCenter'|'bankAccount'} name
 * @property {Record<string, string>} suggestions
 */

/**
 * @typedef {Object} AccountRole
 * @property {string} code
 * @property {string} name
 * @property {string} description
 * @property {string} suggestedAccountCode
 * @property {AccountRoleQualifier} [qualifier]
 */

/**
 * @typedef {Object} LegalBook
 * @property {string} code
 * @property {string} name
 * @property {string} officialCode
 */

/**
 * @typedef {Object} FieldDefinition
 * @property {string} key
 * @property {string} label
 * @property {'STRING'|'DATE'|'MONEY'|'QUANTITY'|'PERCENT'|'CODE'|'BOOLEAN'} type
 * @property {boolean} required
 * @property {string} [description]
 */

/**
 * @typedef {Object} CoherenceRule
 * @property {string} id
 * @property {string} description
 * @property {Expression} check
 */

/**
 * @typedef {Object} DocumentTypeDefinition
 * @property {string} code
 * @property {number} version
 * @property {string} name
 * @property {'COMMERCIAL'|'ADJUSTMENT'|'PROFESSIONAL_FEES'|'CUSTOMS'|'LABOR'|'FINANCIAL'|'TAX_CERTIFICATE'|'INTERNAL'} family
 * @property {string[]} officialCodes
 * @property {Array<'RECEIVED'|'ISSUED'|'INTERNAL'>} allowedPerspectives
 * @property {'RECEIVED'|'ISSUED'|'INTERNAL'|null} fixedPerspective
 * @property {Record<string, string[]>} operationTypesByPerspective
 * @property {Array<'ISSUER'|'RECEIVER'|'EMPLOYEE'|'CUSTOMS'|'BANK'|'OTHER'>} requiredPartyRoles
 * @property {FieldDefinition[]} headerFields
 * @property {FieldDefinition[]} lineFields
 * @property {boolean} linesRequired
 * @property {string[]} allowedTaxCodes
 * @property {string[]} allowedWithholdingCodes
 * @property {{ required: boolean, documentTypeCodes: string[] }} reference
 * @property {CoherenceRule[]} coherenceRules
 * @property {number} coherenceToleranceMinor
 * @property {string|null} defaultLegalBookCode
 * @property {boolean} generatesEntry
 * @property {string} effectiveFrom
 * @property {string|null} effectiveTo
 */

/**
 * @typedef {Object} JurisdictionPack
 * @property {string} code
 * @property {number} version
 * @property {string} name
 * @property {string} effectiveFrom
 * @property {string} defaultFunctionalCurrency
 * @property {string} referenceChartOfAccounts
 * @property {number} roundingToleranceMinor
 * @property {number} extractionConfidenceThreshold
 * @property {FiscalIdType[]} fiscalIdTypes
 * @property {DocumentTypeDefinition[]} documentTypes
 * @property {TaxDefinition[]} taxes
 * @property {OperationType[]} operationTypes
 * @property {Record<'RECEIVED'|'ISSUED'|'INTERNAL', string|null>} mixedOperationTypes
 * @property {AccountRole[]} accountRoles
 * @property {LegalBook[]} legalBooks
 * @property {ASTTemplate[]} baseTemplates
 */

/**
 * @typedef {Object} Party
 * @property {'ISSUER'|'RECEIVER'|'EMPLOYEE'|'CUSTOMS'|'BANK'|'OTHER'} role
 * @property {string} fiscalIdType
 * @property {string} fiscalId
 * @property {string} name
 * @property {string} countryCode
 */

/**
 * @typedef {Object} TaxAmount
 * @property {string} taxCode
 * @property {number} baseMinor
 * @property {number} rateBp
 * @property {number} amountMinor
 */

/**
 * @typedef {Object} Withholding
 * @property {string} withholdingCode
 * @property {number} baseMinor
 * @property {number} rateBp
 * @property {number} amountMinor
 */

/**
 * @typedef {Object} DocumentLine
 * @property {number} lineNo
 * @property {string} description
 * @property {string} [itemCode]
 * @property {number} [quantity]
 * @property {number} [unitPriceMinor]
 * @property {number} amountMinor
 * @property {string|null} [operationTypeCode]
 * @property {TaxAmount[]} taxes
 * @property {Record<string, any>} fields
 */

/**
 * @typedef {Object} DocumentReference
 * @property {string} documentTypeCode
 * @property {string|null} series
 * @property {string} number
 * @property {string} issueDate
 * @property {'MODIFIES'|'SUPPORTS'|'CANCELS'} relation
 */

/**
 * @typedef {Object} ExtractionInfo
 * @property {'XML'|'JSON'|'CSV'|'SPREADSHEET'|'PDF_TEXT'|'PDF_SCANNED'|'IMAGE'|'FORM'} sourceFormat
 * @property {string} extractorId
 * @property {number} documentTypeConfidence
 * @property {Array<{ fieldPath: string, confidence: number, location?: string, verifiedByHuman: boolean }>} fieldProvenance
 */

/**
 * @typedef {Object} CanonicalDocument
 * @property {string} id
 * @property {string} tenantId
 * @property {string} rawPayloadRef
 * @property {number} revision
 * @property {string} jurisdictionCode
 * @property {string} documentTypeCode
 * @property {number} documentTypeVersion
 * @property {'RECEIVED'|'ISSUED'|'INTERNAL'|null} perspective
 * @property {string|null} series
 * @property {string} number
 * @property {string} issueDate
 * @property {string|null} dueDate
 * @property {string} currency
 * @property {Party[]} parties
 * @property {Record<string, string|number|boolean|null>} fields
 * @property {DocumentLine[]} lines
 * @property {TaxAmount[]} taxes
 * @property {Withholding[]} withholdings
 * @property {DocumentReference[]} references
 * @property {{ netMinor: number, taxMinor: number, withheldMinor: number, totalMinor: number, payableMinor: number }} totals
 * @property {string|null} operationTypeCode
 * @property {ExtractionInfo} extraction
 * @property {string|null} deduplicationHash
 * @property {string} receivedAt
 * @property {string} traceId
 */

/**
 * @typedef {Object} AccountMappingEntry
 * @property {string} roleCode
 * @property {string|null} qualifier
 * @property {string} accountCode
 */

/**
 * @typedef {Object} AccountMapping
 * @property {string} tenantId
 * @property {number} version
 * @property {AccountMappingEntry[]} entries
 * @property {string[]} changedRoles
 * @property {string} updatedBy
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} ClassificationRuleVersion
 * @property {number} version
 * @property {Expression} when
 * @property {string} operationTypeCode
 * @property {number} priority
 * @property {string} status
 * @property {string} changedBy
 * @property {string} changedAt
 */

/**
 * @typedef {Object} ClassificationRule
 * @property {string} id
 * @property {string} tenantId
 * @property {string} name
 * @property {'DOCUMENT'|'LINE'} scope
 * @property {number} priority
 * @property {Expression} when
 * @property {string} operationTypeCode
 * @property {'PROPOSED'|'ACTIVE'|'RETIRED'} status
 * @property {number} version
 * @property {string} createdBy
 * @property {string} createdAt
 * @property {ClassificationRuleVersion[]} versions
 */

/**
 * @typedef {{ kind: 'LITERAL', value: string }
 *          | { kind: 'ROLE', value: string, qualifierFrom?: Expression }
 *          | { kind: 'BY_OPERATION_TYPE', byOperationType: Record<string, { kind: 'LITERAL'|'ROLE', value: string, qualifierFrom?: Expression }>, fallback: { kind: 'LITERAL'|'ROLE', value: string }|null }} AccountRef
 */

/**
 * @typedef {Object} TemplateLine
 * @property {string} id
 * @property {'DEBIT'|'CREDIT'} side
 * @property {AccountRef} account
 * @property {Expression} amount
 * @property {Expression|null} emitWhen
 * @property {boolean} forEachDocumentLine
 * @property {string[]|null} groupBy
 * @property {Record<string, Expression>} dimensions
 * @property {Expression|null} description
 * @property {boolean} balancingLine
 */

/**
 * @typedef {Object} TemplateTestCase
 * @property {string} id
 * @property {string} name
 * @property {CanonicalDocument} input
 * @property {'TENANT'|'INLINE'} mappingSource
 * @property {AccountMappingEntry[]|null} accountMapping
 * @property {number|null} fxRateMilli
 * @property {Array<{ side: 'DEBIT'|'CREDIT', accountCode: string, functionalAmountMinor: number, dimensions?: Record<string,string> }>|null} expectedLines
 * @property {string[]|null} expectedPending
 */

/**
 * @typedef {Object} TestRunResult
 * @property {string} testCaseId
 * @property {'PASS'|'FAIL'} status
 * @property {string[]} differences
 */

/**
 * @typedef {Object} TestRun
 * @property {string} at
 * @property {string|null} tenantId
 * @property {string} contentHash
 * @property {TestRunResult[]} results
 */

/**
 * @typedef {Object} TemplateVersion
 * @property {number} version
 * @property {'DRAFT'|'PUBLISHED'} status
 * @property {string} documentTypeCode
 * @property {'RECEIVED'|'ISSUED'|'INTERNAL'} perspective
 * @property {string} operationTypeCode
 * @property {Expression|null} applicability
 * @property {number} priority
 * @property {string} legalBookCode
 * @property {Expression} glosa
 * @property {string[]} requiredInputs
 * @property {TemplateLine[]} lines
 * @property {TemplateTestCase[]} testCases
 * @property {TestRun|null} lastTestRun
 * @property {string[]|null} diffFromPrevious
 * @property {string} createdBy
 * @property {string} createdAt
 */

/**
 * @typedef {Object} ASTTemplate
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {'PACK'|'TENANT'} scope
 * @property {string} jurisdictionCode
 * @property {string|null} tenantId
 * @property {string|null} duplicatedFrom
 * @property {string|null} retiredAt
 * @property {TemplateVersion[]} versions
 */

/**
 * @typedef {Object} TemplateActivation
 * @property {string} templateId
 * @property {number} version
 * @property {'ACTIVE'|'SUPERSEDED'|'INACTIVE'} status
 * @property {string} activatedBy
 * @property {string} activatedAt
 * @property {string|null} deactivatedAt
 * @property {string} testRunAt
 */

/**
 * @typedef {Object} EntryLine
 * @property {number} lineNo
 * @property {'DEBIT'|'CREDIT'} side
 * @property {string} accountCode
 * @property {string|null} accountRole
 * @property {number} amountMinor
 * @property {string} currency
 * @property {number|null} fxRateMilli
 * @property {number} functionalAmountMinor
 * @property {Record<string,string>} dimensions
 * @property {string|null} description
 * @property {string} templateLineId
 * @property {number[]} sourceLineNos
 */

/**
 * @typedef {Object} PendingReason
 * @property {string} code
 * @property {string} message
 * @property {Record<string, any>} details
 */

/**
 * @typedef {Object} TraceStep
 * @property {string} step
 * @property {string} description
 * @property {Record<string, any>} [details]
 */

/**
 * @typedef {Object} EvaluationResult
 * @property {boolean} ok
 * @property {EntryLine[]} lines
 * @property {string} glosa
 * @property {string} legalBookCode
 * @property {{ templateId: string, version: number, steps: TraceStep[] }} trace
 * @property {PendingReason[]} pending
 */

/**
 * Representación de expresiones del AST.
 * @typedef { string | number | boolean | null
 *          | { const: any }
 *          | { field: string }
 *          | { line: string }
 *          | { fn: string, args?: Expression[], prop?: string }
 * } Expression
 */

/**
 * Códigos de pendientes producidos por el subsistema de plantillas y configuración contable.
 */
export const PENDING_CODES = Object.freeze({
  SCHEMA_INVALID: 'SCHEMA_INVALID',
  DOCUMENT_NOT_FOR_TENANT: 'DOCUMENT_NOT_FOR_TENANT',
  CLASSIFICATION_REQUIRED: 'CLASSIFICATION_REQUIRED',
  NO_TEMPLATE: 'NO_TEMPLATE',
  AMBIGUOUS_TEMPLATE: 'AMBIGUOUS_TEMPLATE',
  CATALOG_NOT_EFFECTIVE: 'CATALOG_NOT_EFFECTIVE',
  MISSING_INPUT: 'MISSING_INPUT',
  ACCOUNT_UNRESOLVED: 'ACCOUNT_UNRESOLVED',
  MISSING_DIMENSION: 'MISSING_DIMENSION',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  UNBALANCED: 'UNBALANCED',
  DOCUMENT_TYPE_NOT_ACCOUNTABLE: 'DOCUMENT_TYPE_NOT_ACCOUNTABLE',
  // Códigos complementarios de ingesta / periodo
  LOW_CONFIDENCE_EXTRACTION: 'LOW_CONFIDENCE_EXTRACTION',
  PERIOD_CLOSED: 'PERIOD_CLOSED'
});

