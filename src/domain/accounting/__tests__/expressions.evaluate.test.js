import { describe, it, expect } from 'vitest';
import { evaluateExpression } from '../expressions/evaluate.js';

describe('expressions/evaluate', () => {
  const sampleDocument = {
    id: 'doc-001',
    series: 'F001',
    number: '00000123',
    issueDate: '2026-09-15',
    dueDate: '2026-10-15',
    currency: 'PEN',
    perspective: 'RECEIVED',
    operationTypeCode: 'MERCHANDISE_PURCHASE',
    documentTypeCode: 'INVOICE',
    parties: [
      { role: 'ISSUER', fiscalIdType: 'RUC', fiscalId: '20100000001', name: 'PROVEEDOR SAC', countryCode: 'PE' },
      { role: 'RECEIVER', fiscalIdType: 'RUC', fiscalId: '20200000002', name: 'MI EMPRESA SAC', countryCode: 'PE' }
    ],
    fields: {
      costCenter: 'CC-ADMIN',
      paymentTerms: 'CREDIT_30'
    },
    lines: [
      {
        lineNo: 1,
        description: 'Mercadería Tipo A',
        itemCode: 'MER-001',
        quantity: 10,
        unitPriceMinor: 1000,
        amountMinor: 10000,
        operationTypeCode: 'MERCHANDISE_PURCHASE',
        taxes: [{ taxCode: 'VAT', baseMinor: 10000, rateBp: 1800, amountMinor: 1800 }],
        fields: { costCenter: 'CC-ADMIN' }
      },
      {
        lineNo: 2,
        description: 'Servicio de Flete',
        itemCode: 'SRV-002',
        quantity: 1,
        unitPriceMinor: 3333,
        amountMinor: 3333,
        operationTypeCode: 'TRANSPORT_EXPENSE',
        taxes: [{ taxCode: 'VAT', baseMinor: 3333, rateBp: 1800, amountMinor: 600 }],
        fields: { costCenter: 'CC-LOGISTICA' }
      }
    ],
    taxes: [
      { taxCode: 'VAT', baseMinor: 13333, rateBp: 1800, amountMinor: 2400 }
    ],
    withholdings: [
      { withholdingCode: 'INCOME_TAX_FEES', baseMinor: 5000, rateBp: 800, amountMinor: 400 }
    ],
    references: [
      { documentTypeCode: 'INVOICE', series: 'E001', number: '999', issueDate: '2026-09-01', relation: 'MODIFIES' }
    ],
    totals: {
      netMinor: 13333,
      taxMinor: 2400,
      withheldMinor: 400,
      totalMinor: 15733,
      payableMinor: 15333
    }
  };

  it('evaluates primitive literals and const node', () => {
    expect(evaluateExpression('VAT')).toBe('VAT');
    expect(evaluateExpression(1800)).toBe(1800);
    expect(evaluateExpression(true)).toBe(true);
    expect(evaluateExpression(null)).toBe(null);
    expect(evaluateExpression({ const: 'CC-ADMIN' })).toBe('CC-ADMIN');
    expect(evaluateExpression({ const: 42 })).toBe(42);
  });

  it('evaluates field nodes with path resolution', () => {
    const ctx = { document: sampleDocument };
    expect(evaluateExpression({ field: 'series' }, ctx)).toBe('F001');
    expect(evaluateExpression({ field: 'number' }, ctx)).toBe('00000123');
    expect(evaluateExpression({ field: 'totals.netMinor' }, ctx)).toBe(13333);
    expect(evaluateExpression({ field: 'fields.costCenter' }, ctx)).toBe('CC-ADMIN');
    expect(evaluateExpression({ field: 'non.existent.path' }, ctx)).toBe(null);
  });

  it('evaluates line node inside line context, throws outside', () => {
    const ctxWithLine = { document: sampleDocument, line: sampleDocument.lines[0] };
    expect(evaluateExpression({ line: 'amountMinor' }, ctxWithLine)).toBe(10000);
    expect(evaluateExpression({ line: 'itemCode' }, ctxWithLine)).toBe('MER-001');
    expect(evaluateExpression({ line: 'fields.costCenter' }, ctxWithLine)).toBe('CC-ADMIN');

    const ctxWithoutLine = { document: sampleDocument };
    expect(() => evaluateExpression({ line: 'amountMinor' }, ctxWithoutLine)).toThrowError(/line/);
  });

  describe('tax and withholding functions', () => {
    const ctx = { document: sampleDocument };

    it('taxAmount, taxBase, taxRate, hasTax', () => {
      expect(evaluateExpression({ fn: 'taxAmount', args: ['VAT'] }, ctx)).toBe(2400);
      expect(evaluateExpression({ fn: 'taxAmount', args: ['OTHER'] }, ctx)).toBe(0);

      expect(evaluateExpression({ fn: 'taxBase', args: ['VAT'] }, ctx)).toBe(13333);
      expect(evaluateExpression({ fn: 'taxBase', args: ['OTHER'] }, ctx)).toBe(0);

      expect(evaluateExpression({ fn: 'taxRate', args: ['VAT'] }, ctx)).toBe(1800);
      expect(evaluateExpression({ fn: 'taxRate', args: ['OTHER'] }, ctx)).toBe(null);

      expect(evaluateExpression({ fn: 'hasTax', args: ['VAT'] }, ctx)).toBe(true);
      expect(evaluateExpression({ fn: 'hasTax', args: ['OTHER'] }, ctx)).toBe(false);
    });

    it('lineTaxAmount inside line context and outside', () => {
      const lineCtx = { document: sampleDocument, line: sampleDocument.lines[0] };
      expect(evaluateExpression({ fn: 'lineTaxAmount', args: ['VAT'] }, lineCtx)).toBe(1800);
      expect(evaluateExpression({ fn: 'lineTaxAmount', args: ['OTHER'] }, lineCtx)).toBe(0);

      expect(() => evaluateExpression({ fn: 'lineTaxAmount', args: ['VAT'] }, ctx)).toThrowError(/line/);
    });

    it('withholdingAmount, withholdingBase, hasWithholding', () => {
      expect(evaluateExpression({ fn: 'withholdingAmount', args: ['INCOME_TAX_FEES'] }, ctx)).toBe(400);
      expect(evaluateExpression({ fn: 'withholdingAmount', args: ['OTHER'] }, ctx)).toBe(0);

      expect(evaluateExpression({ fn: 'withholdingBase', args: ['INCOME_TAX_FEES'] }, ctx)).toBe(5000);
      expect(evaluateExpression({ fn: 'withholdingBase', args: ['OTHER'] }, ctx)).toBe(0);

      expect(evaluateExpression({ fn: 'hasWithholding', args: ['INCOME_TAX_FEES'] }, ctx)).toBe(true);
      expect(evaluateExpression({ fn: 'hasWithholding', args: ['OTHER'] }, ctx)).toBe(false);
    });
  });

  describe('parties and references', () => {
    const ctx = { document: sampleDocument };

    it('party with prop', () => {
      expect(evaluateExpression({ fn: 'party', args: ['ISSUER'], prop: 'fiscalId' }, ctx)).toBe('20100000001');
      expect(evaluateExpression({ fn: 'party', args: ['ISSUER'], prop: 'name' }, ctx)).toBe('PROVEEDOR SAC');
      expect(evaluateExpression({ fn: 'party', args: ['UNKNOWN'], prop: 'fiscalId' }, ctx)).toBe(null);
    });

    it('reference and hasReference', () => {
      expect(evaluateExpression({ fn: 'hasReference', args: [] }, ctx)).toBe(true);
      expect(evaluateExpression({ fn: 'reference', args: [0], prop: 'number' }, ctx)).toBe('999');
      expect(evaluateExpression({ fn: 'reference', args: [1], prop: 'number' }, ctx)).toBe(null);
    });
  });

  describe('aggregates: sumLines and countLines', () => {
    const ctx = { document: sampleDocument };

    it('sumLines evaluates lazily per line', () => {
      // Sum all lines
      const sumAll = { fn: 'sumLines', args: [{ line: 'amountMinor' }] };
      expect(evaluateExpression(sumAll, ctx)).toBe(13333);

      // Sum with where condition
      const sumWhere = {
        fn: 'sumLines',
        args: [
          { line: 'amountMinor' },
          { fn: 'eq', args: [{ line: 'operationTypeCode' }, 'MERCHANDISE_PURCHASE'] }
        ]
      };
      expect(evaluateExpression(sumWhere, ctx)).toBe(10000);
    });

    it('countLines with and without where condition', () => {
      expect(evaluateExpression({ fn: 'countLines', args: [] }, ctx)).toBe(2);

      const countWhere = {
        fn: 'countLines',
        args: [{ fn: 'eq', args: [{ line: 'operationTypeCode' }, 'TRANSPORT_EXPENSE'] }]
      };
      expect(evaluateExpression(countWhere, ctx)).toBe(1);
    });
  });

  describe('arithmetic and rounding invariants', () => {
    it('mulRate(10000, 1800) = 1800', () => {
      expect(evaluateExpression({ fn: 'mulRate', args: [10000, 1800] })).toBe(1800);
    });

    it('mulRate(3333, 1800) = 600 (single half-up rounding)', () => {
      // 3333 * 1800 = 5999400 / 10000 = 599.94 -> 600
      expect(evaluateExpression({ fn: 'mulRate', args: [3333, 1800] })).toBe(600);
    });

    it('add and sub', () => {
      expect(evaluateExpression({ fn: 'add', args: [100, 200, 300] })).toBe(600);
      expect(evaluateExpression({ fn: 'sub', args: [500, 150] })).toBe(350);
    });

    it('min, max, coalesce', () => {
      expect(evaluateExpression({ fn: 'min', args: [100, 50] })).toBe(50);
      expect(evaluateExpression({ fn: 'max', args: [100, 50] })).toBe(100);
      expect(evaluateExpression({ fn: 'coalesce', args: [null, null, 'third', 'fourth'] })).toBe('third');
    });

    it('throws NULL_IN_ARITHMETIC when null is used in arithmetic', () => {
      const addNull = { fn: 'add', args: [100, null] };
      expect(() => evaluateExpression(addNull)).toThrowError();
      try {
        evaluateExpression(addNull);
      } catch (err) {
        expect(err.code).toBe('NULL_IN_ARITHMETIC');
      }

      const subNull = { fn: 'sub', args: [null, 100] };
      try {
        evaluateExpression(subNull);
      } catch (err) {
        expect(err.code).toBe('NULL_IN_ARITHMETIC');
      }

      const mulNull = { fn: 'mulRate', args: [null, 1800] };
      try {
        evaluateExpression(mulNull);
      } catch (err) {
        expect(err.code).toBe('NULL_IN_ARITHMETIC');
      }
    });
  });

  describe('comparison and logic', () => {
    it('eq, ne, gt, gte, lt, lte, in', () => {
      expect(evaluateExpression({ fn: 'eq', args: [5, 5] })).toBe(true);
      expect(evaluateExpression({ fn: 'eq', args: [5, 6] })).toBe(false);
      expect(evaluateExpression({ fn: 'ne', args: ['a', 'b'] })).toBe(true);
      expect(evaluateExpression({ fn: 'gt', args: [10, 5] })).toBe(true);
      expect(evaluateExpression({ fn: 'gte', args: [10, 10] })).toBe(true);
      expect(evaluateExpression({ fn: 'lt', args: [4, 5] })).toBe(true);
      expect(evaluateExpression({ fn: 'lte', args: [5, 5] })).toBe(true);
      expect(evaluateExpression({ fn: 'in', args: ['B', ['A', 'B', 'C']] })).toBe(true);
      expect(evaluateExpression({ fn: 'in', args: ['D', ['A', 'B', 'C']] })).toBe(false);
    });

    it('and, or with short circuit, not, isEmpty', () => {
      expect(evaluateExpression({ fn: 'and', args: [true, true, true] })).toBe(true);
      expect(evaluateExpression({ fn: 'and', args: [true, false, true] })).toBe(false);
      expect(evaluateExpression({ fn: 'or', args: [false, true, false] })).toBe(true);
      expect(evaluateExpression({ fn: 'or', args: [false, false] })).toBe(false);
      expect(evaluateExpression({ fn: 'not', args: [true] })).toBe(false);
      expect(evaluateExpression({ fn: 'not', args: [false] })).toBe(true);

      expect(evaluateExpression({ fn: 'isEmpty', args: [null] })).toBe(true);
      expect(evaluateExpression({ fn: 'isEmpty', args: [''] })).toBe(true);
      expect(evaluateExpression({ fn: 'isEmpty', args: [[]] })).toBe(true);
      expect(evaluateExpression({ fn: 'isEmpty', args: ['hello'] })).toBe(false);
      expect(evaluateExpression({ fn: 'isEmpty', args: [[1]] })).toBe(false);
    });
  });

  describe('string and date functions', () => {
    const ctx = { document: sampleDocument };

    it('contains, startsWith, lower, concat, formatMoney', () => {
      expect(evaluateExpression({ fn: 'contains', args: ['Mercadería Flete', 'Flete'] })).toBe(true);
      expect(evaluateExpression({ fn: 'contains', args: ['Mercadería Flete', 'flete'] })).toBe(false); // case sensitive
      expect(evaluateExpression({ fn: 'startsWith', args: ['MER-001', 'MER-'] })).toBe(true);
      expect(evaluateExpression({ fn: 'lower', args: ['HOLA MUNDO'] })).toBe('hola mundo');
      expect(evaluateExpression({ fn: 'concat', args: ['S/ ', 100, ' Factura'] })).toBe('S/ 100 Factura');
      expect(evaluateExpression({ fn: 'formatMoney', args: [123456] }, ctx)).toBe('S/ 1,234.56');
    });

    it('year, month, period, daysBetween', () => {
      expect(evaluateExpression({ fn: 'year', args: ['2026-09-15'] })).toBe(2026);
      expect(evaluateExpression({ fn: 'month', args: ['2026-09-15'] })).toBe(9);
      expect(evaluateExpression({ fn: 'period', args: ['2026-09-15'] })).toBe('2026-09');
      expect(evaluateExpression({ fn: 'daysBetween', args: ['2026-09-01', '2026-09-15'] })).toBe(14);
    });
  });

  it('guarantees determinism: same input produces exact same output', () => {
    const expr = {
      fn: 'concat',
      args: [
        { field: 'series' },
        '-',
        { field: 'number' },
        ' total: ',
        { fn: 'formatMoney', args: [{ field: 'totals.totalMinor' }] }
      ]
    };
    const ctx = { document: sampleDocument };
    const res1 = evaluateExpression(expr, ctx);
    const res2 = evaluateExpression(expr, ctx);
    expect(res1).toBe(res2);
    expect(res1).toBe('F001-00000123 total: S/ 157.33');
  });
});

