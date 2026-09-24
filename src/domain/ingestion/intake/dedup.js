/**
 * @fileoverview Agnostic deduplication key builder (RD-04, R-08).
 */

/**
 * Builds the canonical deduplication key for a document within a tenant.
 * Format: `${tenantId}|${issuer.fiscalIdType}:${issuer.fiscalId}|${documentTypeCode}|${SERIE-NUMERO}|${issueDate}`
 *
 * Rules:
 * - SERIE is trimmed and uppercased (omitted if empty)
 * - NUMERO has leading zeros stripped
 * - ISSUER is resolved from parties with role 'ISSUER'
 *
 * @param {string} tenantId
 * @param {import('./types.js').CanonicalDraft | any} canonical
 * @returns {string}
 */
export function buildDedupKey(tenantId, canonical) {
  if (!tenantId || !canonical) {
    return '';
  }

  const issuer = (canonical.parties || []).find((p) => p.role === 'ISSUER') || null;
  const issuerPart = issuer ? `${issuer.fiscalIdType || ''}:${issuer.fiscalId || ''}` : '';

  const docType = canonical.documentTypeCode || '';

  const series = (canonical.series || '').trim().toUpperCase();
  const rawNum = String(canonical.number || '').trim();
  const cleanNum = rawNum.replace(/^0+/, '') || (rawNum ? '0' : '');

  const serieNumero = series ? `${series}-${cleanNum}` : cleanNum;
  const issueDate = canonical.issueDate || '';

  return `${tenantId}|${issuerPart}|${docType}|${serieNumero}|${issueDate}`;
}
