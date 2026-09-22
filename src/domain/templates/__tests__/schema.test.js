import { describe, it, expect } from 'vitest';
import { validateTemplateVersion, validateTemplateHeader } from '../schema.js';

describe('Template Schema Validator (T031)', () => {
  const validVersion = {
    version: 1,
    status: 'DRAFT',
    defaults: {
      baseAccount: '6011101',
      taxAccount: '4011101',
      counterpartAccount: '4212101',
      appliesIgv: true,
      requiresCostCenter: false,
      defaultCostCenter: null
    },
    documentRules: [
      {
        ruleId: 'DR-1',
        name: 'Regla Doc 1',
        priority: 1,
        when: {
          op: 'equals',
          field: 'currency',
          value: 'USD'
        },
        then: {
          taxAccount: '4011102'
        }
      }
    ],
    lineRules: [
      {
        ruleId: 'LR-1',
        name: 'Regla Linea 1',
        priority: 1,
        when: {
          op: 'contains',
          field: 'line.description',
          value: 'FLETE'
        },
        then: {
          baseAccount: '6311101',
          costCenter: 'CC-LOGISTICA'
        }
      }
    ],
    testCases: [
      {
        caseId: 'TC-1',
        name: 'Caso 1',
        document: {
          totalCents: 11800,
          lines: [{ description: 'FLETE', amountCents: 10000, taxCode: 'IGV' }]
        },
        expectedLines: [
          { side: 'D', accountCode: '6311101', functionalAmountCents: 10000 }
        ]
      }
    ]
  };

  it('validates a correct template version without errors', () => {
    const res = validateTemplateVersion(validVersion, { operationType: 'COMPRA' });
    expect(res.ok).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it('validates header code format', () => {
    const resBad = validateTemplateHeader({
      code: 'codigo invalido!',
      name: 'Test',
      operationType: 'COMPRA',
      defaults: validVersion.defaults
    });
    expect(resBad.ok).toBe(false);
    expect(resBad.errors.some(e => e.path === 'code')).toBe(true);

    const resGood = validateTemplateHeader({
      code: 'COMPRA_MERCADERIA_01',
      name: 'Test',
      operationType: 'COMPRA',
      defaults: validVersion.defaults
    });
    expect(resGood.ok).toBe(true);
  });

  it('reports error path for unknown field or operator', () => {
    const v = JSON.parse(JSON.stringify(validVersion));
    v.lineRules[0].when.field = 'desconocido.field';
    const res = validateTemplateVersion(v, { operationType: 'COMPRA' });
    expect(res.ok).toBe(false);
    expect(res.errors.some(e => e.path === 'lineRules[0].when.field')).toBe(true);

    const v2 = JSON.parse(JSON.stringify(validVersion));
    v2.lineRules[0].when.op = 'opInvalido';
    const res2 = validateTemplateVersion(v2, { operationType: 'COMPRA' });
    expect(res2.ok).toBe(false);
    expect(res2.errors.some(e => e.path === 'lineRules[0].when.op')).toBe(true);
  });

  it('reports error path for empty value', () => {
    const v = JSON.parse(JSON.stringify(validVersion));
    v.lineRules[0].when.value = '';
    const res = validateTemplateVersion(v, { operationType: 'COMPRA' });
    expect(res.ok).toBe(false);
    expect(res.errors.some(e => e.path === 'lineRules[0].when.value')).toBe(true);
  });

  it('reports error for between with min > max', () => {
    const v = JSON.parse(JSON.stringify(validVersion));
    v.lineRules[0].when = {
      op: 'between',
      field: 'line.amountCents',
      value: [5000, 1000]
    };
    const res = validateTemplateVersion(v, { operationType: 'COMPRA' });
    expect(res.ok).toBe(false);
    expect(res.errors.some(e => e.path === 'lineRules[0].when.value')).toBe(true);
  });

  it('rejects line.* field in documentRules', () => {
    const v = JSON.parse(JSON.stringify(validVersion));
    v.documentRules[0].when = {
      op: 'equals',
      field: 'line.description',
      value: 'TEST'
    };
    const res = validateTemplateVersion(v, { operationType: 'COMPRA' });
    expect(res.ok).toBe(false);
    expect(res.errors.some(e => e.path === 'documentRules[0].when.field')).toBe(true);
  });

  it('rejects group and/or condition with less than 2 args', () => {
    const v = JSON.parse(JSON.stringify(validVersion));
    v.lineRules[0].when = {
      op: 'and',
      args: [{ op: 'equals', field: 'currency', value: 'USD' }]
    };
    const res = validateTemplateVersion(v, { operationType: 'COMPRA' });
    expect(res.ok).toBe(false);
    expect(res.errors.some(e => e.path === 'lineRules[0].when.args')).toBe(true);
  });

  it('rejects duplicate priority in rule group', () => {
    const v = JSON.parse(JSON.stringify(validVersion));
    v.lineRules.push({
      ruleId: 'LR-2',
      name: 'Regla 2',
      priority: 1, // duplicate priority 1
      when: { op: 'equals', field: 'currency', value: 'PEN' },
      then: { baseAccount: '6011101' }
    });
    const res = validateTemplateVersion(v, { operationType: 'COMPRA' });
    expect(res.ok).toBe(false);
    expect(res.errors.some(e => e.path === 'lineRules[1].priority')).toBe(true);
  });

  it('rejects empty action', () => {
    const v = JSON.parse(JSON.stringify(validVersion));
    v.lineRules[0].then = {};
    const res = validateTemplateVersion(v, { operationType: 'COMPRA' });
    expect(res.ok).toBe(false);
    expect(res.errors.some(e => e.path === 'lineRules[0].then')).toBe(true);
  });

  it('validates split rules (single part, sum not 10000, combined with baseAccount)', () => {
    const v1 = JSON.parse(JSON.stringify(validVersion));
    v1.lineRules[0].then = {
      split: [{ account: '6011101', basisPoints: 10000 }]
    };
    const res1 = validateTemplateVersion(v1, { operationType: 'COMPRA' });
    expect(res1.ok).toBe(false);
    expect(res1.errors.some(e => e.path === 'lineRules[0].then.split')).toBe(true);

    const v2 = JSON.parse(JSON.stringify(validVersion));
    v2.lineRules[0].then = {
      split: [
        { account: '6011101', basisPoints: 6000 },
        { account: '6011102', basisPoints: 3999 }
      ]
    };
    const res2 = validateTemplateVersion(v2, { operationType: 'COMPRA' });
    expect(res2.ok).toBe(false);
    expect(res2.errors.some(e => e.path === 'lineRules[0].then.split')).toBe(true);

    const v3 = JSON.parse(JSON.stringify(validVersion));
    v3.lineRules[0].then = {
      baseAccount: '6011101',
      split: [
        { account: '6011101', basisPoints: 5000 },
        { account: '6011102', basisPoints: 5000 }
      ]
    };
    const res3 = validateTemplateVersion(v3, { operationType: 'COMPRA' });
    expect(res3.ok).toBe(false);
    expect(res3.errors.some(e => e.path === 'lineRules[0].then')).toBe(true);
  });

  it('rejects empty accounts and invalid test case', () => {
    const v = JSON.parse(JSON.stringify(validVersion));
    v.defaults.baseAccount = '';
    const res = validateTemplateVersion(v, { operationType: 'COMPRA' });
    expect(res.ok).toBe(false);
    expect(res.errors.some(e => e.path === 'defaults.baseAccount')).toBe(true);

    const vCase = JSON.parse(JSON.stringify(validVersion));
    vCase.testCases[0].expectedLines = [];
    const resCase = validateTemplateVersion(vCase, { operationType: 'COMPRA' });
    expect(resCase.ok).toBe(false);
    expect(resCase.errors.some(e => e.path === 'testCases[0].expectedLines')).toBe(true);
  });
});
