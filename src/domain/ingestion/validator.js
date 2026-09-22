/**
 * @fileoverview Validador de asientos contables borradores (research R-03, data-model §3)
 */

import { checkLineAccounts, buildAccountIndex } from './accounts.js';

/**
 * Valida un asiento contra el documento, catálogo, plantilla y estado del periodo
 * @param {import('./types.js').JournalEntry} entry
 * @param {import('./types.js').CanonicalDocument} canonicalDoc
 * @param {Array<Object>|Record<string, import('./types.js').NormalizedAccount>} chartOfAccounts
 * @param {Object} template
 * @param {boolean} isPeriodClosed
 * @returns {string[]} Lista de motivos de error
 */
export function validateJournalEntry(entry, canonicalDoc, chartOfAccounts, template, isPeriodClosed) {
  const reasons = new Set();

  // 1. PERIOD_CLOSED
  if (isPeriodClosed) {
    reasons.add('PERIOD_CLOSED');
  }

  // 2. TEMPLATE_MISMATCH
  const templateOp = template?.operationType || template?.tipoOperacion;
  const docOp = canonicalDoc?.operationType || entry.operationType;
  if (templateOp && docOp && docOp !== templateOp) {
    reasons.add('TEMPLATE_MISMATCH');
  }

  // 3. INCONSISTENT_AMOUNTS
  // |base gravada + base exonerada/inafecta + IGV - total| <= 1 céntimo (R-03)
  const totals = canonicalDoc.totals || {};
  const taxAmount = totals.taxAmount !== undefined ? totals.taxAmount : (canonicalDoc.igvCents || 0);
  const totalAmount = totals.totalAmount !== undefined ? totals.totalAmount : (canonicalDoc.totalCents || 0);
  const taxable = totals.taxableAmount !== undefined ? totals.taxableAmount : (canonicalDoc.taxableBaseCents || 0);
  const exempt = totals.exemptAmount !== undefined ? totals.exemptAmount : (canonicalDoc.exemptBaseCents || 0);
  const unaffected = totals.unaffectedAmount !== undefined ? totals.unaffectedAmount : (canonicalDoc.unaffectedBaseCents || 0);

  const base = taxable + exempt + unaffected;
  const computedTotal = base + taxAmount;
  const diffTotal = Math.abs(computedTotal - totalAmount);

  // |IGV - round(base gravada * 18%)| <= 1
  const expectedTax = Math.round(taxable * 0.18);
  const diffTax = Math.abs(taxAmount - expectedTax);

  if (diffTotal > 1 || diffTax > 1) {
    reasons.add('INCONSISTENT_AMOUNTS');
  }

  // 4. NO_FX_RATE y TEMPLATE_INACTIVE preexistentes
  if (entry.pendingReasons && entry.pendingReasons.includes('NO_FX_RATE')) {
    reasons.add('NO_FX_RATE');
  }
  if (entry.pendingReasons && entry.pendingReasons.includes('TEMPLATE_INACTIVE')) {
    reasons.add('TEMPLATE_INACTIVE');
  }

  // 5. UNBALANCED (Σ Debe === Σ Haber)
  if (!reasons.has('NO_FX_RATE') && !reasons.has('TEMPLATE_INACTIVE')) {
    let debits = 0;
    let credits = 0;
    for (const line of entry.lines || []) {
      if (line.side === 'D') debits += line.functionalAmountCents;
      else if (line.side === 'H') credits += line.functionalAmountCents;
    }
    if (debits !== credits || (entry.lines || []).length === 0) {
      reasons.add('UNBALANCED');
    }
  }

  // 5. Cuentas y centros de costo (checkLineAccounts)
  let accIndex = chartOfAccounts;
  if (Array.isArray(chartOfAccounts)) {
    accIndex = buildAccountIndex(chartOfAccounts);
  }

  const accountReasons = checkLineAccounts(entry.lines || [], accIndex, template);
  accountReasons.forEach(r => reasons.add(r));

  return Array.from(reasons);
}

/**
 * Valida y asigna el estado final al asiento
 * @param {import('./types.js').JournalEntry} entry
 * @param {import('./types.js').CanonicalDocument} canonicalDoc
 * @param {Array<Object>|Record<string, import('./types.js').NormalizedAccount>} chartOfAccounts
 * @param {Object} template
 * @param {boolean} isPeriodClosed
 * @param {Function} [clock]
 * @returns {import('./types.js').JournalEntry}
 */
export function validateAndSetState(
  entry,
  canonicalDoc,
  chartOfAccounts,
  template,
  isPeriodClosed,
  clock = () => new Date().toISOString()
) {
  const reasons = validateJournalEntry(entry, canonicalDoc, chartOfAccounts, template, isPeriodClosed);
  entry.pendingReasons = reasons;

  if (reasons.length > 0) {
    entry.state = 'PENDING_INPUT';
    entry.stagedAt = clock();
  } else {
    entry.state = 'PENDING_APPROVAL';
    entry.stagedAt = null;
  }

  return entry;
}
