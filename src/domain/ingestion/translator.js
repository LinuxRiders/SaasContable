/**
 * @fileoverview Traductor de documentos canónicos a asientos contables usando el evaluador de reglas (R-02, R-08, R-20, R-21, RF-07)
 */

import { evaluateTemplate } from '../templates/evaluator.js';
import { convert } from './fx.js';

/**
 * Traduce un documento canónico a un asiento borrador mediante una versión de plantilla
 * @param {Object} document
 * @param {{template: import('../templates/types.js').Template, version: import('../templates/types.js').TemplateVersion, fx?: {rateMilli: number, rateDate: string, provisional: boolean}}} templateInfo
 * @param {Record<string, import('./types.js').NormalizedAccount>} accountIndex
 * @param {Object} [deps]
 * @returns {import('./types.js').JournalEntry}
 */
export function translateToJournalEntry(document, { template, version, fx }, accountIndex = {}, deps = {}) {
  const idGen = deps.idGenerator || (() => crypto.randomUUID());
  const templateId = template.templateId || template.id;
  const versionNum = version.version;
  const operationType = template.operationType || document.operationType || 'COMPRA';
  const currency = document.currency || 'PEN';
  const isUSD = currency !== 'PEN';

  const baseEntry = {
    id: idGen(),
    templateId,
    templateVersion: versionNum,
    operationType,
    issueDate: document.issueDate,
    accountingPeriod: document.issueDate ? document.issueDate.substring(0, 7) : '',
    currency,
    fx: null,
    provisionalFxRate: false,
    lines: [],
    appliedRules: [],
    analyticTags: {},
    pendingReasons: [],
    state: 'DRAFT'
  };

  // Validación de tasa de cambio para moneda extranjera (R-12, RF-07)
  if (isUSD) {
    if (!fx || !fx.rateMilli) {
      baseEntry.pendingReasons.push('NO_FX_RATE');
      return baseEntry;
    }
    baseEntry.fx = fx;
    baseEntry.provisionalFxRate = !!fx.provisional;
  }

  const totals = document.totals || {};
  const totalOrig = totals.totalAmount !== undefined ? totals.totalAmount : (document.totalCents || 0);
  const igvOrig = totals.taxAmount !== undefined ? totals.taxAmount : (document.igvCents || 0);
  const baseOrig = totals.taxableAmount !== undefined
    ? (totals.taxableAmount + (totals.exemptAmount || 0) + (totals.unaffectedAmount || 0))
    : (totalOrig - igvOrig);

  let totalCents = totalOrig;
  let igvCents = igvOrig;
  let baseCents = baseOrig;

  if (isUSD) {
    // Conversión R-02: convertir total e IGV, derivar base PEN = total PEN - IGV PEN
    totalCents = convert(totalOrig, fx.rateMilli);
    igvCents = convert(igvOrig, fx.rateMilli);
    baseCents = totalCents - igvCents;
  }

  const docLines = document.lines || [];
  const lineBaseCents = [];

  if (docLines.length === 1) {
    lineBaseCents.push(baseCents);
  } else if (docLines.length > 1) {
    const rawSum = docLines.reduce((acc, l) => acc + (l.amountCents || l.amount || 0), 0);
    let allocated = 0;
    docLines.forEach((l, idx) => {
      if (idx === docLines.length - 1) {
        lineBaseCents.push(baseCents - allocated);
      } else {
        const lAmt = l.amountCents || l.amount || 0;
        const part = rawSum > 0 ? Math.round((baseCents * lAmt) / rawSum) : 0;
        lineBaseCents.push(part);
        allocated += part;
      }
    });
  }

  // Normalizar las líneas del documento
  const standardDoc = {
    ...document,
    operationType,
    lines: docLines.map((l, i) => ({
      lineNo: l.lineNo || (i + 1),
      description: l.description || l.descripcion || 'Item',
      amountCents: lineBaseCents[i] !== undefined ? lineBaseCents[i] : (l.amountCents || l.amount || 0),
      taxCode: l.taxType || l.taxCode || 'IGV'
    }))
  };

  const evalResult = evaluateTemplate({
    version,
    document: standardDoc,
    functionalAmounts: {
      baseCents,
      igvCents,
      totalCents,
      lineBaseCents
    },
    accountIndex,
    operationType
  });

  // Asignar montos originales (originalAmountCents) según R-02 y data-model §3
  evalResult.lines.forEach((line) => {
    if (!isUSD) {
      line.originalAmountCents = null;
      return;
    }

    if (line.role === 'BASE') {
      const origSum = (line.sourceLineNos || []).reduce((sum, lineNo) => {
        const dl = docLines[lineNo - 1];
        return sum + (dl ? (dl.amountCents || dl.amount || 0) : 0);
      }, 0);
      line.originalAmountCents = origSum || null;
    } else if (line.role === 'TAX') {
      line.originalAmountCents = igvOrig;
    } else if (line.role === 'COUNTERPART') {
      line.originalAmountCents = totalOrig;
    } else {
      line.originalAmountCents = null;
    }
  });

  baseEntry.lines = evalResult.lines;
  baseEntry.appliedRules = evalResult.appliedRules;
  baseEntry.analyticTags = evalResult.analyticTags;

  return baseEntry;
}
