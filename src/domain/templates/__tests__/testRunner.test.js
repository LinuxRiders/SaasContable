import { describe, it, expect } from 'vitest';
import { runTestCases } from '../testRunner.js';
import { buildTemplateBankSeed } from '../../../data/mockPlantillasReglas.js';
import { mockPlantillas } from '../../../data/mockPlantillas.js';
import { mockPlanContable } from '../../../data/mockPlanContable.js';
import { buildAccountIndex } from '../../ingestion/accounts.js';

describe('Template Test Runner (T035, R-22)', () => {
  const pcgeIndex = buildAccountIndex(mockPlanContable);

  const validVersion = {
    defaults: {
      baseAccount: '6011101',
      taxAccount: '4011101',
      counterpartAccount: '4212101',
      appliesIgv: true,
      requiresCostCenter: false,
      defaultCostCenter: null
    },
    documentRules: [],
    lineRules: [],
    testCases: [
      {
        caseId: 'TC-1',
        name: 'Caso Base',
        document: {
          operationType: 'COMPRA',
          lines: [{ lineNo: 1, description: 'Item', amountCents: 10000, taxCode: 'IGV' }],
          taxableBaseCents: 10000,
          exemptBaseCents: 0,
          igvCents: 1800,
          totalCents: 11800
        },
        expectedLines: [
          { side: 'D', accountCode: '6011101', costCenter: null, functionalAmountCents: 10000 },
          { side: 'D', accountCode: '4011101', costCenter: null, functionalAmountCents: 1800 },
          { side: 'H', accountCode: '4212101', costCenter: null, functionalAmountCents: 11800 },
          { side: 'D', accountCode: '2011101', costCenter: null, functionalAmountCents: 10000 },
          { side: 'H', accountCode: '6111101', costCenter: null, functionalAmountCents: 10000 }
        ]
      }
    ]
  };

  it('runs successfully when test case matches expected lines', () => {
    const res = runTestCases(validVersion, pcgeIndex);
    expect(res.allPassed).toBe(true);
    expect(res.results[0].passed).toBe(true);
    expect(res.results[0].balanced).toBe(true);
  });

  it('fails when expected amounts differ', () => {
    const v = JSON.parse(JSON.stringify(validVersion));
    v.testCases[0].expectedLines[0].functionalAmountCents = 9999;
    const res = runTestCases(v, pcgeIndex);
    expect(res.allPassed).toBe(false);
    expect(res.results[0].passed).toBe(false);
  });

  it('passes when lines are in different order', () => {
    const v = JSON.parse(JSON.stringify(validVersion));
    v.testCases[0].expectedLines.reverse();
    const res = runTestCases(v, pcgeIndex);
    expect(res.allPassed).toBe(true);
    expect(res.results[0].passed).toBe(true);
  });

  it('detects unbalanced entry if expected is unbalanced or calculation fails', () => {
    const v = JSON.parse(JSON.stringify(validVersion));
    // simulate missing counterpart in evaluateTemplate by overriding counterpartAccount to null in defaults
    v.defaults.counterpartAccount = '4212101';
    // totalCents doesn't match base + igv
    v.testCases[0].document.totalCents = 20000;
    const res = runTestCases(v, pcgeIndex);
    expect(res.results[0].balanced).toBe(false);
    expect(res.allPassed).toBe(false);
  });

  it('detects non-existent account in PCGE index', () => {
    const v = JSON.parse(JSON.stringify(validVersion));
    v.defaults.baseAccount = '9999999';
    const res = runTestCases(v, pcgeIndex);
    expect(res.allPassed).toBe(false);
    expect(res.results[0].accountErrors.some(e => e.accountCode === '9999999')).toBe(true);
  });

  it('reports uncoveredRuleIds when a rule does not apply to any case', () => {
    const v = JSON.parse(JSON.stringify(validVersion));
    v.lineRules.push({
      ruleId: 'LR-UNCOVERED',
      name: 'Regla no cubierta',
      priority: 1,
      when: { op: 'contains', field: 'line.description', value: 'INEXISTENTE' },
      then: { baseAccount: '6311101' }
    });

    const res = runTestCases(v, pcgeIndex);
    expect(res.allPassed).toBe(false);
    expect(res.uncoveredRuleIds).toContain('LR-UNCOVERED');
  });

  it('VERIFIES ALL SEED TEMPLATES (PL-01 to PL-07): all test cases pass and cover all rules with mockPlanContable (Const. V)', () => {
    const seedTemplates = buildTemplateBankSeed(mockPlantillas);

    for (const tpl of seedTemplates) {
      for (const version of tpl.versions) {
        const res = runTestCases(version, pcgeIndex);
        expect(
          res.allPassed,
          `Plantilla ${tpl.templateId} falló: ${JSON.stringify(res.uncoveredRuleIds)} ${JSON.stringify(res.results.map(r => ({ caseId: r.caseId, passed: r.passed, balanced: r.balanced, errors: r.accountErrors })))}`
        ).toBe(true);
        expect(res.uncoveredRuleIds).toHaveLength(0);
      }
    }
  });
});
