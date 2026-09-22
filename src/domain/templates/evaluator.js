/**
 * @fileoverview Evaluador puro y determinista de plantillas contables (research R-21, data-model §4.3)
 */

import { evaluateCondition } from './conditions.js';

/**
 * @typedef {Object} EvaluatorParams
 * @property {import('./types.js').TemplateVersion} version
 * @property {Object} document
 * @property {{baseCents: number, igvCents: number, totalCents: number, lineBaseCents: number[]}} functionalAmounts
 * @property {Record<string, import('../ingestion/types.js').NormalizedAccount>} accountIndex
 * @property {"COMPRA"|"VENTA"} [operationType]
 */

/**
 * Ordena reglas por prioridad ascendente y luego por ruleId
 * @param {import('./types.js').Rule[]} rules
 * @returns {import('./types.js').Rule[]}
 */
function sortRules(rules = []) {
  return [...rules].sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return String(a.ruleId).localeCompare(String(b.ruleId));
  });
}

/**
 * Evalúa una plantilla contra un documento y sus montos calculados
 * @param {EvaluatorParams} params
 * @returns {{lines: import('../ingestion/types.js').EntryLine[], appliedRules: string[], analyticTags: Record<string, string>}}
 */
export function evaluateTemplate({
  version,
  document,
  functionalAmounts,
  accountIndex = {},
  operationType = 'COMPRA'
}) {
  const appliedRulesSet = new Set();
  const analyticTags = {};

  const effectiveDefaults = { ...version.defaults };

  // 1. Reglas de comprobante (documentRules)
  const sortedDocRules = sortRules(version.documentRules);
  for (const rule of sortedDocRules) {
    if (evaluateCondition(rule.when, document)) {
      appliedRulesSet.add(rule.ruleId);
      if (rule.then.taxAccount) effectiveDefaults.taxAccount = rule.then.taxAccount;
      if (rule.then.counterpartAccount) effectiveDefaults.counterpartAccount = rule.then.counterpartAccount;
      if (rule.then.defaultCostCenter !== undefined) effectiveDefaults.defaultCostCenter = rule.then.defaultCostCenter;
      if (rule.then.tags) {
        Object.assign(analyticTags, rule.then.tags);
      }
      break; // Gana la primera
    }
  }

  const isPurchase = (document.operationType || operationType) === 'COMPRA';
  const baseSide = isPurchase ? 'D' : 'H';
  const taxSide = isPurchase ? 'D' : 'H';
  const counterpartSide = isPurchase ? 'H' : 'D';
  const destDebitSide = 'D';
  const destCreditSide = 'H';

  // 2. Reglas de línea (lineRules)
  const sortedLineRules = sortRules(version.lineRules);
  const rawLines = document.lines || [];
  const lineBaseCents = functionalAmounts.lineBaseCents || [];

  /**
   * @type {Array<{side: "D"|"H", accountCode: string, costCenter: string|null, functionalAmountCents: number, ruleId: string|null, sourceLineNos: number[]}>}
   */
  const unmergedBaseLines = [];

  rawLines.forEach((docLine, idx) => {
    const lineAmount = lineBaseCents[idx] !== undefined ? lineBaseCents[idx] : (docLine.amountCents || 0);
    if (lineAmount <= 0) return;

    let matchedRule = null;
    for (const rule of sortedLineRules) {
      if (evaluateCondition(rule.when, document, docLine)) {
        matchedRule = rule;
        appliedRulesSet.add(rule.ruleId);
        break; // Gana la primera
      }
    }

    if (matchedRule?.then?.tags) {
      Object.assign(analyticTags, matchedRule.then.tags);
    }

    const originalLineNo = docLine.lineNo !== undefined ? docLine.lineNo : idx + 1;

    if (matchedRule?.then?.split) {
      const parts = matchedRule.then.split;
      let allocated = 0;
      parts.forEach((part, partIdx) => {
        let partAmount = 0;
        if (partIdx === parts.length - 1) {
          partAmount = lineAmount - allocated;
        } else {
          partAmount = Math.floor((lineAmount * part.basisPoints) / 10000);
          allocated += partAmount;
        }

        if (partAmount > 0) {
          const accInfo = accountIndex[part.account];
          const partCc = part.costCenter !== undefined
            ? part.costCenter
            : (effectiveDefaults.defaultCostCenter || accInfo?.defaultCostCenter || null);

          unmergedBaseLines.push({
            side: baseSide,
            accountCode: part.account,
            costCenter: partCc,
            functionalAmountCents: partAmount,
            ruleId: matchedRule.ruleId,
            sourceLineNos: [originalLineNo],
            description: docLine.description || docLine.descripcion || ''
          });
        }
      });
    } else {
      const baseAccount = matchedRule?.then?.baseAccount || effectiveDefaults.baseAccount;
      const accInfo = accountIndex[baseAccount];
      let costCenter = null;
      if (matchedRule?.then?.costCenter !== undefined) {
        costCenter = matchedRule.then.costCenter;
      } else if (effectiveDefaults.defaultCostCenter !== undefined && effectiveDefaults.defaultCostCenter !== null) {
        costCenter = effectiveDefaults.defaultCostCenter;
      } else if (accInfo?.defaultCostCenter) {
        costCenter = accInfo.defaultCostCenter;
      }

      unmergedBaseLines.push({
        side: baseSide,
        accountCode: baseAccount,
        costCenter,
        functionalAmountCents: lineAmount,
        ruleId: matchedRule ? matchedRule.ruleId : null,
        sourceLineNos: [originalLineNo],
        description: docLine.description || docLine.descripcion || ''
      });
    }
  });

  // 3. Agrupación de partes con igual (side, accountCode, costCenter)
  /**
   * @type {Map<string, {side: "D"|"H", accountCode: string, costCenter: string|null, functionalAmountCents: number, ruleId: string|null, sourceLineNos: Set<number>, description: string}>}
   */
  const groupedMap = new Map();

  for (const item of unmergedBaseLines) {
    const key = `${item.side}|${item.accountCode}|${item.costCenter || ''}`;
    if (!groupedMap.has(key)) {
      groupedMap.set(key, {
        side: item.side,
        accountCode: item.accountCode,
        costCenter: item.costCenter,
        functionalAmountCents: item.functionalAmountCents,
        ruleId: item.ruleId,
        sourceLineNos: new Set(item.sourceLineNos),
        description: item.description
      });
    } else {
      const existing = groupedMap.get(key);
      existing.functionalAmountCents += item.functionalAmountCents;
      item.sourceLineNos.forEach(n => existing.sourceLineNos.add(n));
      if (existing.ruleId !== item.ruleId) {
        existing.ruleId = null; // varios orígenes
      }
      if (!existing.description && item.description) {
        existing.description = item.description;
      }
    }
  }

  const finalLines = [];
  let currentLineNo = 1;

  // En VENTA, la contrapartida (12) suele presentarse primero
  if (!isPurchase) {
    const receiverName = document.receiver?.name || document.receiver?.razonSocial || '';
    finalLines.push({
      lineNo: currentLineNo++,
      side: counterpartSide,
      accountCode: effectiveDefaults.counterpartAccount,
      description: receiverName ? `Clientes - ${receiverName}` : 'Clientes',
      costCenter: null,
      functionalAmountCents: functionalAmounts.totalCents,
      originalAmountCents: null,
      role: 'COUNTERPART',
      ruleId: null,
      sourceLineNos: []
    });
  }

  // Base lines agrupadas
  const baseLinesGrouped = Array.from(groupedMap.values()).map(item => ({
    lineNo: currentLineNo++,
    side: item.side,
    accountCode: item.accountCode,
    description: item.description || accountIndex[item.accountCode]?.descripcion || `Base ${item.accountCode}`,
    costCenter: item.costCenter,
    functionalAmountCents: item.functionalAmountCents,
    originalAmountCents: null,
    role: 'BASE',
    ruleId: item.ruleId,
    sourceLineNos: Array.from(item.sourceLineNos).sort((a, b) => a - b)
  }));

  finalLines.push(...baseLinesGrouped);

  // IGV
  if (functionalAmounts.igvCents > 0) {
    finalLines.push({
      lineNo: currentLineNo++,
      side: taxSide,
      accountCode: effectiveDefaults.taxAccount,
      description: isPurchase ? 'IGV - Crédito fiscal 18%' : 'IGV - Débito fiscal 18%',
      costCenter: null,
      functionalAmountCents: functionalAmounts.igvCents,
      originalAmountCents: null,
      role: 'TAX',
      ruleId: null,
      sourceLineNos: []
    });
  }

  // En COMPRA, la contrapartida (42) se presenta al Haber
  if (isPurchase) {
    const issuerName = document.issuer?.name || document.issuer?.razonSocial || '';
    finalLines.push({
      lineNo: currentLineNo++,
      side: counterpartSide,
      accountCode: effectiveDefaults.counterpartAccount,
      description: issuerName ? `Proveedores - ${issuerName}` : 'Proveedores',
      costCenter: null,
      functionalAmountCents: functionalAmounts.totalCents,
      originalAmountCents: null,
      role: 'COUNTERPART',
      ruleId: null,
      sourceLineNos: []
    });
  }

  // 4. Destinos (amarre1 y amarre2) por cada línea base
  for (const baseLine of baseLinesGrouped) {
    const acc = accountIndex[baseLine.accountCode];
    if (acc && acc.destDebit && acc.destCredit) {
      finalLines.push({
        lineNo: currentLineNo++,
        side: destDebitSide,
        accountCode: acc.destDebit,
        description: 'Destino del gasto',
        costCenter: baseLine.costCenter,
        functionalAmountCents: baseLine.functionalAmountCents,
        originalAmountCents: null,
        role: 'DEST_DEBIT',
        ruleId: baseLine.ruleId,
        sourceLineNos: baseLine.sourceLineNos
      });

      finalLines.push({
        lineNo: currentLineNo++,
        side: destCreditSide,
        accountCode: acc.destCredit,
        description: 'Cargas imputables a costos y gastos',
        costCenter: null,
        functionalAmountCents: baseLine.functionalAmountCents,
        originalAmountCents: null,
        role: 'DEST_CREDIT',
        ruleId: baseLine.ruleId,
        sourceLineNos: baseLine.sourceLineNos
      });
    }
  }

  return {
    lines: finalLines,
    appliedRules: Array.from(appliedRulesSet),
    analyticTags
  };
}
