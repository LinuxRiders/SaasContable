import { describe, it, expect } from 'vitest';
import { evaluateTemplate } from '../evaluator.js';

describe('Template Evaluator (T033, R-21)', () => {
  const baseDefaults = {
    baseAccount: '6011101',
    taxAccount: '4011101',
    counterpartAccount: '4212101',
    appliesIgv: true,
    requiresCostCenter: false,
    defaultCostCenter: 'CC-DEFAULT'
  };

  const accountIndex = {
    '6011101': { code: '6011101', isPostable: true, requiresCostCenter: false, destDebit: '2011101', destCredit: '6111101', defaultCostCenter: null },
    '4011101': { code: '4011101', isPostable: true, requiresCostCenter: false },
    '4212101': { code: '4212101', isPostable: true, requiresCostCenter: false },
    '2011101': { code: '2011101', isPostable: true, requiresCostCenter: false },
    '6111101': { code: '6111101', isPostable: true, requiresCostCenter: false },
    '6311101': { code: '6311101', isPostable: true, requiresCostCenter: true, defaultCostCenter: 'CC-AMARRE3', destDebit: '9411101', destCredit: '7911101' },
    '6312101': { code: '6312101', isPostable: true, requiresCostCenter: true, defaultCostCenter: null, destDebit: '9511101', destCredit: '7911101' },
    '9411101': { code: '9411101', isPostable: true, requiresCostCenter: true },
    '9511101': { code: '9511101', isPostable: true, requiresCostCenter: true },
    '7911101': { code: '7911101', isPostable: true, requiresCostCenter: false }
  };

  const basicDoc = {
    operationType: 'COMPRA',
    currency: 'PEN',
    issuer: { fiscalId: '20555555551', name: 'PROV' },
    receiver: { fiscalId: '20100047218', name: 'EMP' },
    issueDate: '2026-09-15',
    lines: [
      { lineNo: 1, description: 'Mercaderia A', amountCents: 10000, taxCode: 'IGV' }
    ]
  };

  it('uses defaults when no rules match', () => {
    const version = {
      defaults: baseDefaults,
      documentRules: [],
      lineRules: []
    };
    const res = evaluateTemplate({
      version,
      document: basicDoc,
      functionalAmounts: {
        baseCents: 10000,
        igvCents: 1800,
        totalCents: 11800,
        lineBaseCents: [10000]
      },
      accountIndex,
      operationType: 'COMPRA'
    });

    expect(res.lines).toBeDefined();
    // Base 6011101 (D), Tax 4011101 (D), Counterpart 4212101 (H), DestD 2011101 (D), DestC 6111101 (H)
    const base = res.lines.find(l => l.role === 'BASE');
    expect(base.accountCode).toBe('6011101');
    expect(base.ruleId).toBeNull();
    expect(res.appliedRules).toHaveLength(0);
  });

  it('first matching rule wins by priority (document and line rules)', () => {
    const version = {
      defaults: baseDefaults,
      documentRules: [
        {
          ruleId: 'DR-1',
          name: 'Doc Prioridad 1',
          priority: 1,
          when: { op: 'equals', field: 'currency', value: 'PEN' },
          then: { taxAccount: '4011109' }
        },
        {
          ruleId: 'DR-2',
          name: 'Doc Prioridad 2',
          priority: 2,
          when: { op: 'equals', field: 'currency', value: 'PEN' },
          then: { taxAccount: '4011108' }
        }
      ],
      lineRules: [
        {
          ruleId: 'LR-1',
          name: 'Linea Prioridad 1',
          priority: 1,
          when: { op: 'contains', field: 'line.description', value: 'Mercaderia' },
          then: { baseAccount: '6311101' }
        },
        {
          ruleId: 'LR-2',
          name: 'Linea Prioridad 2',
          priority: 2,
          when: { op: 'contains', field: 'line.description', value: 'Mercaderia' },
          then: { baseAccount: '6312101' }
        }
      ]
    };

    const res = evaluateTemplate({
      version,
      document: basicDoc,
      functionalAmounts: {
        baseCents: 10000,
        igvCents: 1800,
        totalCents: 11800,
        lineBaseCents: [10000]
      },
      accountIndex,
      operationType: 'COMPRA'
    });

    const tax = res.lines.find(l => l.role === 'TAX');
    expect(tax.accountCode).toBe('4011109');

    const base = res.lines.find(l => l.role === 'BASE');
    expect(base.accountCode).toBe('6311101');
    expect(base.ruleId).toBe('LR-1');
    expect(res.appliedRules).toEqual(['DR-1', 'LR-1']);
  });

  it('cost center precedence: regla > plantilla > amarre3', () => {
    // 1. Regla tiene CC
    const v1 = {
      defaults: { ...baseDefaults, defaultCostCenter: 'CC-PLANTILLA' },
      documentRules: [],
      lineRules: [
        {
          ruleId: 'LR-CC',
          name: 'Regla CC',
          priority: 1,
          when: { op: 'equals', field: 'currency', value: 'PEN' },
          then: { baseAccount: '6311101', costCenter: 'CC-REGLA' }
        }
      ]
    };
    const res1 = evaluateTemplate({
      version: v1,
      document: basicDoc,
      functionalAmounts: { baseCents: 10000, igvCents: 1800, totalCents: 11800, lineBaseCents: [10000] },
      accountIndex,
      operationType: 'COMPRA'
    });
    expect(res1.lines.find(l => l.role === 'BASE').costCenter).toBe('CC-REGLA');

    // 2. Regla no tiene CC, usa plantilla
    const v2 = {
      defaults: { ...baseDefaults, defaultCostCenter: 'CC-PLANTILLA' },
      documentRules: [],
      lineRules: [
        {
          ruleId: 'LR-NO-CC',
          name: 'Regla No CC',
          priority: 1,
          when: { op: 'equals', field: 'currency', value: 'PEN' },
          then: { baseAccount: '6311101' }
        }
      ]
    };
    const res2 = evaluateTemplate({
      version: v2,
      document: basicDoc,
      functionalAmounts: { baseCents: 10000, igvCents: 1800, totalCents: 11800, lineBaseCents: [10000] },
      accountIndex,
      operationType: 'COMPRA'
    });
    expect(res2.lines.find(l => l.role === 'BASE').costCenter).toBe('CC-PLANTILLA');

    // 3. Ni regla ni plantilla tienen CC, usa amarre3 de la cuenta
    const v3 = {
      defaults: { ...baseDefaults, defaultCostCenter: null },
      documentRules: [],
      lineRules: [
        {
          ruleId: 'LR-NO-CC',
          name: 'Regla No CC',
          priority: 1,
          when: { op: 'equals', field: 'currency', value: 'PEN' },
          then: { baseAccount: '6311101' } // cuenta 6311101 tiene defaultCostCenter: 'CC-AMARRE3'
        }
      ]
    };
    const res3 = evaluateTemplate({
      version: v3,
      document: basicDoc,
      functionalAmounts: { baseCents: 10000, igvCents: 1800, totalCents: 11800, lineBaseCents: [10000] },
      accountIndex,
      operationType: 'COMPRA'
    });
    expect(res3.lines.find(l => l.role === 'BASE').costCenter).toBe('CC-AMARRE3');
  });

  it('combines analytic tags from document and line rules', () => {
    const version = {
      defaults: baseDefaults,
      documentRules: [
        {
          ruleId: 'DR-1',
          name: 'Doc Tags',
          priority: 1,
          when: { op: 'equals', field: 'currency', value: 'PEN' },
          then: { tags: { origen: 'NACIONAL', proyecto: 'P1' } }
        }
      ],
      lineRules: [
        {
          ruleId: 'LR-1',
          name: 'Line Tags',
          priority: 1,
          when: { op: 'equals', field: 'currency', value: 'PEN' },
          then: { tags: { categoria: 'LOGISTICA', proyecto: 'P2' } }
        }
      ]
    };

    const res = evaluateTemplate({
      version,
      document: basicDoc,
      functionalAmounts: { baseCents: 10000, igvCents: 1800, totalCents: 11800, lineBaseCents: [10000] },
      accountIndex,
      operationType: 'COMPRA'
    });

    expect(res.analyticTags).toEqual({
      origen: 'NACIONAL',
      proyecto: 'P2', // linea sobrescribe comprobante
      categoria: 'LOGISTICA'
    });
  });

  it('split rules with basisPoints: prorateo 6000/4000 de 10001 -> 6000 y 4001', () => {
    const version = {
      defaults: baseDefaults,
      documentRules: [],
      lineRules: [
        {
          ruleId: 'LR-SPLIT',
          name: 'Split 60/40',
          priority: 1,
          when: { op: 'equals', field: 'currency', value: 'PEN' },
          then: {
            split: [
              { account: '6311101', basisPoints: 6000 },
              { account: '6312101', basisPoints: 4000 }
            ]
          }
        }
      ]
    };

    const res = evaluateTemplate({
      version,
      document: basicDoc,
      functionalAmounts: { baseCents: 10001, igvCents: 1800, totalCents: 11801, lineBaseCents: [10001] },
      accountIndex,
      operationType: 'COMPRA'
    });

    const baseLines = res.lines.filter(l => l.role === 'BASE');
    expect(baseLines).toHaveLength(2);
    expect(baseLines[0].accountCode).toBe('6311101');
    expect(baseLines[0].functionalAmountCents).toBe(6000);
    expect(baseLines[1].accountCode).toBe('6312101');
    expect(baseLines[1].functionalAmountCents).toBe(4001);
  });

  it('split rules: omits 0 cent parts for 1 cent split in 3 parts', () => {
    const version = {
      defaults: baseDefaults,
      documentRules: [],
      lineRules: [
        {
          ruleId: 'LR-SPLIT-3',
          name: 'Split 3',
          priority: 1,
          when: { op: 'equals', field: 'currency', value: 'PEN' },
          then: {
            split: [
              { account: '6311101', basisPoints: 3333 },
              { account: '6312101', basisPoints: 3333 },
              { account: '6011101', basisPoints: 3334 }
            ]
          }
        }
      ]
    };

    const res = evaluateTemplate({
      version,
      document: basicDoc,
      functionalAmounts: { baseCents: 1, igvCents: 0, totalCents: 1, lineBaseCents: [1] },
      accountIndex,
      operationType: 'COMPRA'
    });

    const baseLines = res.lines.filter(l => l.role === 'BASE');
    // floor(1 * 3333 / 10000) = 0 (omitted)
    // floor(1 * 3333 / 10000) = 0 (omitted)
    // last part gets remainder: 1 - 0 - 0 = 1
    expect(baseLines).toHaveLength(1);
    expect(baseLines[0].accountCode).toBe('6011101');
    expect(baseLines[0].functionalAmountCents).toBe(1);
  });

  it('groups lines with same (side, account, costCenter)', () => {
    const doc2Lines = {
      ...basicDoc,
      lines: [
        { lineNo: 1, description: 'A', amountCents: 5000, taxCode: 'IGV' },
        { lineNo: 2, description: 'B', amountCents: 5000, taxCode: 'IGV' }
      ]
    };
    const version = {
      defaults: baseDefaults,
      documentRules: [],
      lineRules: []
    };

    const res = evaluateTemplate({
      version,
      document: doc2Lines,
      functionalAmounts: { baseCents: 10000, igvCents: 1800, totalCents: 11800, lineBaseCents: [5000, 5000] },
      accountIndex,
      operationType: 'COMPRA'
    });

    const baseLines = res.lines.filter(l => l.role === 'BASE');
    expect(baseLines).toHaveLength(1);
    expect(baseLines[0].functionalAmountCents).toBe(10000);
    expect(baseLines[0].sourceLineNos).toEqual([1, 2]);
  });

  it('generates destinations for base accounts with amarres', () => {
    const version = {
      defaults: baseDefaults, // 6011101 tiene amarre1 2011101 y amarre2 6111101
      documentRules: [],
      lineRules: []
    };
    const res = evaluateTemplate({
      version,
      document: basicDoc,
      functionalAmounts: { baseCents: 10000, igvCents: 1800, totalCents: 11800, lineBaseCents: [10000] },
      accountIndex,
      operationType: 'COMPRA'
    });

    const destD = res.lines.find(l => l.role === 'DEST_DEBIT');
    const destC = res.lines.find(l => l.role === 'DEST_CREDIT');
    expect(destD.accountCode).toBe('2011101');
    expect(destD.side).toBe('D');
    expect(destD.functionalAmountCents).toBe(10000);
    expect(destC.accountCode).toBe('6111101');
    expect(destC.side).toBe('H');
    expect(destC.functionalAmountCents).toBe(10000);
  });

  it('is deterministic and maintains Debe = Haber on 1,000 pseudo-random iterations', () => {
    const version = {
      defaults: baseDefaults,
      documentRules: [],
      lineRules: [
        {
          ruleId: 'LR-PRORATE',
          name: 'Split',
          priority: 1,
          when: { op: 'equals', field: 'currency', value: 'PEN' },
          then: {
            split: [
              { account: '6311101', basisPoints: 4500 },
              { account: '6011101', basisPoints: 5500 }
            ]
          }
        }
      ]
    };

    // Simple pseudo-random LCG with fixed seed
    let seed = 123456789;
    function rand() {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    }

    for (let i = 0; i < 1000; i++) {
      const base = Math.floor(rand() * 100000) + 1; // 1 to 100,000 cents
      const igv = Math.round(base * 0.18);
      const total = base + igv;

      const res = evaluateTemplate({
        version,
        document: basicDoc,
        functionalAmounts: {
          baseCents: base,
          igvCents: igv,
          totalCents: total,
          lineBaseCents: [base]
        },
        accountIndex,
        operationType: 'COMPRA'
      });

      let debits = 0;
      let credits = 0;
      res.lines.forEach(l => {
        if (l.side === 'D') debits += l.functionalAmountCents;
        if (l.side === 'H') credits += l.functionalAmountCents;
      });

      expect(debits).toBe(credits);
    }
  });
});
