/**
 * @fileoverview Ejecutor de casos de prueba para versiones de plantillas (research R-22, data-model §4.4)
 */

import { evaluateTemplate } from './evaluator.js';
import { validateAccounts } from './templateAccounts.js';

/**
 * Compara dos listas de líneas contables sin importar el orden
 * @param {Array<Object>} actual
 * @param {Array<Object>} expected
 * @returns {boolean}
 */
function matchLinesIgnoreOrder(actual = [], expected = []) {
  if (actual.length !== expected.length) return false;

  const remainingExpected = [...expected];

  for (const act of actual) {
    const actCc = act.costCenter || null;
    const matchIdx = remainingExpected.findIndex(exp => {
      const expCc = exp.costCenter || null;
      return (
        exp.side === act.side &&
        exp.accountCode === act.accountCode &&
        expCc === actCc &&
        exp.functionalAmountCents === act.functionalAmountCents
      );
    });

    if (matchIdx === -1) {
      return false;
    }
    remainingExpected.splice(matchIdx, 1);
  }

  return remainingExpected.length === 0;
}

/**
 * Ejecuta los casos de prueba de una versión de plantilla
 * @param {import('./types.js').TemplateVersion} version
 * @param {Record<string, import('../ingestion/types.js').NormalizedAccount>} pcgeIndex
 * @param {Object} [options]
 * @returns {import('./types.js').TestRunResult}
 */
export function runTestCases(version, pcgeIndex = {}, options = {}) {
  const accountErrors = validateAccounts(version, pcgeIndex);

  const allRules = [
    ...(version.documentRules || []),
    ...(version.lineRules || [])
  ];
  const allRuleIds = allRules.map(r => r.ruleId);
  const coveredRuleIds = new Set();

  const testCases = version.testCases || [];
  const results = [];

  for (const tc of testCases) {
    const doc = tc.document || {};
    const lines = doc.lines || [];
    const lineBaseCents = lines.map(l => l.amountCents || 0);

    const baseCents = (doc.taxableBaseCents !== undefined && doc.exemptBaseCents !== undefined)
      ? (doc.taxableBaseCents + doc.exemptBaseCents)
      : lineBaseCents.reduce((acc, c) => acc + c, 0);

    const igvCents = doc.igvCents !== undefined ? doc.igvCents : 0;
    const totalCents = doc.totalCents !== undefined ? doc.totalCents : (baseCents + igvCents);

    const evalResult = evaluateTemplate({
      version,
      document: doc,
      functionalAmounts: {
        baseCents,
        igvCents,
        totalCents,
        lineBaseCents
      },
      accountIndex: pcgeIndex,
      operationType: doc.operationType || 'COMPRA'
    });

    // Cuadre
    let debits = 0;
    let credits = 0;
    evalResult.lines.forEach(l => {
      if (l.side === 'D') debits += l.functionalAmountCents;
      if (l.side === 'H') credits += l.functionalAmountCents;
    });
    const balanced = debits === credits;

    // Comparación sin orden
    const linesMatch = matchLinesIgnoreOrder(evalResult.lines, tc.expectedLines || []);

    (evalResult.appliedRules || []).forEach(rId => coveredRuleIds.add(rId));

    const passed = linesMatch && balanced && accountErrors.length === 0;

    results.push({
      caseId: tc.caseId,
      passed,
      balanced,
      accountErrors,
      appliedRuleIds: evalResult.appliedRules || [],
      actualLines: evalResult.lines.map(l => ({
        side: l.side,
        accountCode: l.accountCode,
        costCenter: l.costCenter,
        functionalAmountCents: l.functionalAmountCents
      }))
    });
  }

  const uncoveredRuleIds = allRuleIds.filter(id => !coveredRuleIds.has(id));
  const allPassed =
    testCases.length > 0 &&
    results.every(r => r.passed) &&
    uncoveredRuleIds.length === 0 &&
    accountErrors.length === 0;

  return {
    at: options.clock ? options.clock() : new Date().toISOString(),
    by: options.by || 'SYSTEM',
    allPassed,
    uncoveredRuleIds,
    results
  };
}
