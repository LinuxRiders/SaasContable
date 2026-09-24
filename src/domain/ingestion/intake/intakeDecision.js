/**
 * @fileoverview Pure domain decision logic for received documents (RD-04, FR-013, FR-014, FR-016, R-09).
 */

/**
 * Checks if a specific field path is required according to the document type schema.
 * @param {string} fieldPath
 * @param {Object} [documentType]
 * @returns {boolean}
 */
export function isFieldRequired(fieldPath, documentType) {
  if (!fieldPath) return false;

  // Canonical base required fields
  if (['documentTypeCode', 'issueDate', 'currency', 'totals.totalMinor'].includes(fieldPath)) {
    return true;
  }

  // Check requiredPartyRoles
  const partyMatch = fieldPath.match(/^parties\[([A-Z_]+)\]/);
  if (partyMatch) {
    const role = partyMatch[1];
    const requiredRoles = documentType?.requiredPartyRoles || ['ISSUER', 'RECEIVER'];
    if (requiredRoles.includes(role)) {
      // In a required party, fiscalId and name are required
      return true;
    }
  }

  // Check header fields
  if (documentType?.headerFields) {
    for (const hf of documentType.headerFields) {
      if (hf.required && (fieldPath === hf.key || fieldPath === `fields.${hf.key}`)) {
        return true;
      }
    }
  }

  // Check line fields if linesRequired
  if (documentType?.linesRequired) {
    const lineMatch = fieldPath.match(/^lines\[\d+\]\.([a-zA-Z0-9_]+)/);
    if (lineMatch) {
      const lineProp = lineMatch[1];
      const lineField = (documentType.lineFields || []).find((lf) => lf.key === lineProp);
      if (lineField?.required) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Determines the intake status and diagnostics for a canonical document.
 *
 * Evaluation order (Research R-09):
 * 1) NOT_FOR_TENANT if tenant does not participate in the document
 * 2) DUPLICATE if dedupHash is found in dedupIndex
 * 3) RECEIVED_NEEDS_REVIEW if any required field has confidence below threshold
 * 4) RECEIVED otherwise
 *
 * Warnings (do not change status):
 * - FUTURE_ISSUE_DATE
 * - INVALID_FISCAL_ID
 * - FIELD_NOT_FOUND
 *
 * @param {import('./types.js').CanonicalDraft | any} canonical
 * @param {Object} options
 * @param {Object} [options.documentType]
 * @param {string} [options.tenantFiscalId]
 * @param {Record<string, string>} [options.dedupIndex={}]
 * @param {string|null} [options.dedupHash=null]
 * @param {number} [options.threshold=0.85]
 * @param {string} [options.today]
 * @param {Array<{ code: string, detail: Object }>} [options.warnings=[]]
 * @returns {{
 *   status: 'RECEIVED'|'RECEIVED_NEEDS_REVIEW'|'DUPLICATE'|'NOT_FOR_TENANT',
 *   duplicateOfIntakeRecordId: string|null,
 *   lowConfidenceFields: string[],
 *   warnings: Array<{ code: string, detail: Object }>
 * }}
 */
export function decideIntake(canonical, {
  documentType = null,
  tenantFiscalId = '',
  dedupIndex = {},
  dedupHash = null,
  threshold = 0.85,
  today = '',
  warnings: initialWarnings = []
} = {}) {
  const warnings = [...initialWarnings];

  // 1. Check tenant participation
  const parties = canonical?.parties || [];
  let isForTenant = false;

  if (documentType?.fixedPerspective === 'INTERNAL') {
    isForTenant = parties.some((p) => p.role === 'ISSUER' && p.fiscalId === tenantFiscalId);
  } else {
    isForTenant = parties.some((p) => p.fiscalId === tenantFiscalId);
  }

  if (!isForTenant) {
    return {
      status: 'NOT_FOR_TENANT',
      duplicateOfIntakeRecordId: null,
      lowConfidenceFields: [],
      warnings
    };
  }

  // 2. Check duplicate
  if (dedupHash && dedupIndex && dedupIndex[dedupHash]) {
    return {
      status: 'DUPLICATE',
      duplicateOfIntakeRecordId: dedupIndex[dedupHash],
      lowConfidenceFields: [],
      warnings
    };
  }

  // 3. Compute warnings
  if (today && canonical?.issueDate && canonical.issueDate > today) {
    warnings.push({
      code: 'FUTURE_ISSUE_DATE',
      detail: {
        issueDate: canonical.issueDate,
        today
      }
    });
  }

  const notFoundList = canonical?.extraction?.notFound || [];
  for (const nf of notFoundList) {
    warnings.push({
      code: 'FIELD_NOT_FOUND',
      detail: { path: nf }
    });
  }

  // 4. Low confidence and required fields check
  const fieldProvenance = canonical?.extraction?.fieldProvenance || [];
  const lowConfidenceFields = [];
  let hasLowConfidenceRequiredField = false;

  for (const fp of fieldProvenance) {
    const path = fp.fieldPath || fp.path;
    const confidence = fp.confidence ?? 1.0;
    const isHumanVerified = !!fp.verifiedByHuman;

    if (!isHumanVerified && confidence < threshold) {
      if (path && !lowConfidenceFields.includes(path)) {
        lowConfidenceFields.push(path);
      }
      if (isFieldRequired(path, documentType)) {
        hasLowConfidenceRequiredField = true;
      }
    }
  }

  // Check if any missing (notFound) field was required
  for (const nf of notFoundList) {
    if (isFieldRequired(nf, documentType)) {
      hasLowConfidenceRequiredField = true;
    }
  }

  const status = hasLowConfidenceRequiredField ? 'RECEIVED_NEEDS_REVIEW' : 'RECEIVED';

  return {
    status,
    duplicateOfIntakeRecordId: null,
    lowConfidenceFields,
    warnings
  };
}
