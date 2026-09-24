import { describe, it, expect } from 'vitest';
import { evaluateTemplate } from '../templateEvaluation.js';

describe('evaluateTemplate (SDD §20.8.3)', () => {
  const dummyPack = {
    code: 'TEST',
    version: 1,
    defaultFunctionalCurrency: 'PEN',
    roundingToleranceMinor: 5,
    documentTypes: [
      {
        code: 'INVOICE',
        headerFields: [{ key: 'costCenter', type: 'STRING' }],
        lineFields: [{ key: 'costCenter', type: 'STRING' }]
      }
    ],
    accountRoles: [
      { code: 'EXPENSE', suggestedAccountCode: '601' },
      { code: 'PAYABLE', suggestedAccountCode: '421' },
      { code: 'TAX', suggestedAccountCode: '401' }
    ]
  };

  const dummyChart = [
    { code: '60111', descripcion: 'Compras', activo: true, esCuentaU: true, requiereCC: false },
    { code: '63111', descripcion: 'Transporte con CC', activo: true, esCuentaU: true, requiereCC: true },
    { code: '40111', descripcion: 'Impuesto', activo: true, esCuentaU: true, requiereCC: false },
    { code: '42121', descripcion: 'Proveedores', activo: true, esCuentaU: true, requiereCC: false },
    { code: '70111', descripcion: 'Ventas', activo: true, esCuentaU: true, requiereCC: false }
  ];

  const dummyMapping = {
    entries: {
      EXPENSE: { accountCode: '60111' },
      PAYABLE: { accountCode: '42121' },
      TAX: { accountCode: '40111' }
    }
  };

  it('detecta requiredInputs faltante y devuelve MISSING_INPUT', () => {
    const version = {
      id: 'T1',
      version: 1,
      legalBookCode: 'BOOK1',
      glosa: 'Factura test',
      requiredInputs: ['fields.costCenter'],
      lines: [
        {
          id: 'l1',
          side: 'DEBIT',
          accountRef: { kind: 'ROLE', roleCode: 'EXPENSE' },
          amount: 1000
        },
        {
          id: 'l2',
          side: 'CREDIT',
          accountRef: { kind: 'ROLE', roleCode: 'PAYABLE' },
          amount: 1000,
          balancingLine: true
        }
      ]
    };

    const docWithoutCC = {
      currency: 'PEN',
      fields: {},
      lines: []
    };

    const result = evaluateTemplate(version, docWithoutCC, {
      pack: dummyPack,
      mapping: dummyMapping,
      chart: dummyChart,
      functionalCurrency: 'PEN'
    });

    expect(result.ok).toBe(false);
    expect(result.pending).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'MISSING_INPUT' })
      ])
    );
  });

  it('soporta forEachDocumentLine con BY_OPERATION_TYPE', () => {
    const version = {
      id: 'T_MIXED',
      version: 1,
      legalBookCode: 'BOOK_PURCHASES',
      glosa: { fn: 'concat', args: ['Compra ', { field: 'number' }] },
      requiredInputs: [],
      lines: [
        {
          id: 'line_exp',
          side: 'DEBIT',
          accountRef: {
            kind: 'BY_OPERATION_TYPE',
            byOperationType: {
              OP_A: { roleCode: 'EXPENSE' },
              OP_B: { roleCode: 'TAX' }
            },
            fallback: { roleCode: 'EXPENSE' }
          },
          amount: { line: 'amountMinor' },
          forEachDocumentLine: true
        },
        {
          id: 'payable',
          side: 'CREDIT',
          accountRef: { kind: 'ROLE', roleCode: 'PAYABLE' },
          amount: { field: 'totals.totalMinor' },
          balancingLine: true,
          forEachDocumentLine: false
        }
      ]
    };

    const doc = {
      number: '123',
      currency: 'PEN',
      fields: {},
      lines: [
        { lineNo: 1, amountMinor: 700, operationTypeCode: 'OP_A' },
        { lineNo: 2, amountMinor: 300, operationTypeCode: 'OP_B' }
      ],
      totals: { totalMinor: 1000 }
    };

    const result = evaluateTemplate(version, doc, {
      pack: dummyPack,
      mapping: dummyMapping,
      chart: dummyChart,
      functionalCurrency: 'PEN'
    });

    expect(result.ok).toBe(true);
    expect(result.lines).toHaveLength(3);
    expect(result.lines[0].accountCode).toBe('60111');
    expect(result.lines[0].functionalAmountMinor).toBe(700);
    expect(result.lines[0].sourceLineNos).toEqual([1]);
    expect(result.lines[1].accountCode).toBe('40111');
    expect(result.lines[1].functionalAmountMinor).toBe(300);
    expect(result.lines[1].sourceLineNos).toEqual([2]);
    expect(result.lines[2].accountCode).toBe('42121');
    expect(result.lines[2].functionalAmountMinor).toBe(1000);
    expect(result.lines[2].sourceLineNos).toEqual([]);
    expect(result.glosa).toBe('Compra 123');
    expect(result.legalBookCode).toBe('BOOK_PURCHASES');
  });

  it('omite líneas con importe cero', () => {
    const version = {
      id: 'T_ZERO',
      version: 1,
      legalBookCode: 'BOOK1',
      glosa: 'Test cero',
      requiredInputs: [],
      lines: [
        {
          id: 'l1',
          side: 'DEBIT',
          accountRef: { kind: 'ROLE', roleCode: 'EXPENSE' },
          amount: 500
        },
        {
          id: 'l_zero',
          side: 'DEBIT',
          accountRef: { kind: 'ROLE', roleCode: 'TAX' },
          amount: 0
        },
        {
          id: 'payable',
          side: 'CREDIT',
          accountRef: { kind: 'ROLE', roleCode: 'PAYABLE' },
          amount: 500,
          balancingLine: true
        }
      ]
    };

    const doc = { currency: 'PEN', fields: {}, lines: [] };
    const result = evaluateTemplate(version, doc, {
      pack: dummyPack,
      mapping: dummyMapping,
      chart: dummyChart,
      functionalCurrency: 'PEN'
    });

    expect(result.ok).toBe(true);
    expect(result.lines).toHaveLength(2);
    expect(result.lines.find(l => l.templateLineId === 'l_zero')).toBeUndefined();
  });

  it('falla con INVALID_AMOUNT si un importe evaluado es negativo', () => {
    const version = {
      id: 'T_NEG',
      version: 1,
      legalBookCode: 'BOOK1',
      glosa: 'Test negativo',
      requiredInputs: [],
      lines: [
        {
          id: 'l_neg',
          side: 'DEBIT',
          accountRef: { kind: 'ROLE', roleCode: 'EXPENSE' },
          amount: -50
        }
      ]
    };

    const doc = { currency: 'PEN', fields: {}, lines: [] };
    const result = evaluateTemplate(version, doc, {
      pack: dummyPack,
      mapping: dummyMapping,
      chart: dummyChart,
      functionalCurrency: 'PEN'
    });

    expect(result.ok).toBe(false);
    expect(result.pending).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'INVALID_AMOUNT' })
      ])
    );
  });

  it('devuelve ACCOUNT_UNRESOLVED ante un rol sin mapear', () => {
    const version = {
      id: 'T_UNRESOLVED',
      version: 1,
      legalBookCode: 'BOOK1',
      glosa: 'Test unmapped',
      requiredInputs: [],
      lines: [
        {
          id: 'l1',
          side: 'DEBIT',
          accountRef: { kind: 'ROLE', roleCode: 'UNMAPPED_ROLE' },
          amount: 100
        },
        {
          id: 'l2',
          side: 'CREDIT',
          accountRef: { kind: 'ROLE', roleCode: 'PAYABLE' },
          amount: 100,
          balancingLine: true
        }
      ]
    };

    const doc = { currency: 'PEN', fields: {}, lines: [] };
    const result = evaluateTemplate(version, doc, {
      pack: dummyPack,
      mapping: dummyMapping,
      chart: dummyChart,
      functionalCurrency: 'PEN'
    });

    expect(result.ok).toBe(false);
    expect(result.pending).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'ACCOUNT_UNRESOLVED' })
      ])
    );
  });

  it('devuelve MISSING_DIMENSION si la cuenta requiere CC y no hay costCenter', () => {
    const customMapping = {
      entries: {
        EXPENSE: { accountCode: '63111' }, // 63111 requiereCC: true
        PAYABLE: { accountCode: '42121' }
      }
    };

    const version = {
      id: 'T_CC',
      version: 1,
      legalBookCode: 'BOOK1',
      glosa: 'Test CC',
      requiredInputs: [],
      lines: [
        {
          id: 'l1',
          side: 'DEBIT',
          accountRef: { kind: 'ROLE', roleCode: 'EXPENSE' },
          amount: 200,
          dimensions: {} // sin costCenter
        },
        {
          id: 'l2',
          side: 'CREDIT',
          accountRef: { kind: 'ROLE', roleCode: 'PAYABLE' },
          amount: 200,
          balancingLine: true
        }
      ]
    };

    const doc = { currency: 'PEN', fields: {}, lines: [] };
    const result = evaluateTemplate(version, doc, {
      pack: dummyPack,
      mapping: customMapping,
      chart: dummyChart,
      functionalCurrency: 'PEN'
    });

    expect(result.ok).toBe(false);
    expect(result.pending).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'MISSING_DIMENSION' })
      ])
    );
  });

  it('agrupa líneas con groupBy', () => {
    const version = {
      id: 'T_GROUP',
      version: 1,
      legalBookCode: 'BOOK1',
      glosa: 'Test groupBy',
      requiredInputs: [],
      lines: [
        {
          id: 'l_item',
          side: 'DEBIT',
          accountRef: { kind: 'ROLE', roleCode: 'EXPENSE' },
          amount: { line: 'amountMinor' },
          forEachDocumentLine: true,
          groupBy: true
        },
        {
          id: 'payable',
          side: 'CREDIT',
          accountRef: { kind: 'ROLE', roleCode: 'PAYABLE' },
          amount: { field: 'totals.totalMinor' },
          balancingLine: true
        }
      ]
    };

    const doc = {
      currency: 'PEN',
      fields: {},
      lines: [
        { lineNo: 1, amountMinor: 400 },
        { lineNo: 2, amountMinor: 600 }
      ],
      totals: { totalMinor: 1000 }
    };

    const result = evaluateTemplate(version, doc, {
      pack: dummyPack,
      mapping: dummyMapping,
      chart: dummyChart,
      functionalCurrency: 'PEN'
    });

    expect(result.ok).toBe(true);
    expect(result.lines).toHaveLength(2);
    // Las 2 líneas se agruparon en 1 sola con 1000
    expect(result.lines[0].functionalAmountMinor).toBe(1000);
    expect(result.lines[0].sourceLineNos).toEqual([1, 2]);
  });

  it('convierte FX con fxRateMilli y balancingLine absorbe 1 unidad mínima', () => {
    // USD document with net 10.00 USD, total 10.00 USD
    // lines: Debit 1: 5.00 USD, Debit 2: 5.00 USD (balancingLine), Credit: 10.00 USD
    // with rate 3745 (3.745):
    // 500 * 3745 / 1000 = 1873
    // 500 * 3745 / 1000 = 1873 -> sum debits = 3746
    // 1000 * 3745 / 1000 = 3745 -> credit = 3745
    // diff = 3746 - 3745 = +1 debit. balancingLine in Debit 2 should absorb -1 -> 1872
    const version = {
      id: 'T_FX',
      version: 1,
      legalBookCode: 'BOOK1',
      glosa: 'FX Test',
      requiredInputs: [],
      lines: [
        {
          id: 'd1',
          side: 'DEBIT',
          accountRef: { kind: 'ROLE', roleCode: 'EXPENSE' },
          amount: 500
        },
        {
          id: 'd2_bal',
          side: 'DEBIT',
          accountRef: { kind: 'ROLE', roleCode: 'EXPENSE' },
          amount: 500,
          balancingLine: true
        },
        {
          id: 'c1',
          side: 'CREDIT',
          accountRef: { kind: 'ROLE', roleCode: 'PAYABLE' },
          amount: 1000
        }
      ]
    };

    const doc = {
      currency: 'USD',
      fields: {},
      lines: []
    };

    const result = evaluateTemplate(version, doc, {
      pack: dummyPack,
      mapping: dummyMapping,
      chart: dummyChart,
      fxRateMilli: 3745,
      functionalCurrency: 'PEN'
    });

    expect(result.ok).toBe(true);
    expect(result.lines).toHaveLength(3);
    expect(result.lines[0].functionalAmountMinor).toBe(1873);
    expect(result.lines[1].functionalAmountMinor).toBe(1872); // absorbió 1 céntimo
    expect(result.lines[2].functionalAmountMinor).toBe(3745);
    // Comprobar que débitos y créditos son iguales
    expect(result.lines[0].functionalAmountMinor + result.lines[1].functionalAmountMinor).toBe(3745);
  });

  it('devuelve UNBALANCED si la diferencia excede la tolerancia', () => {
    const version = {
      id: 'T_UNBALANCED',
      version: 1,
      legalBookCode: 'BOOK1',
      glosa: 'Unbalanced',
      requiredInputs: [],
      lines: [
        {
          id: 'd1',
          side: 'DEBIT',
          accountRef: { kind: 'ROLE', roleCode: 'EXPENSE' },
          amount: 1000
        },
        {
          id: 'c1',
          side: 'CREDIT',
          accountRef: { kind: 'ROLE', roleCode: 'PAYABLE' },
          amount: 900,
          balancingLine: true
        }
      ]
    };

    const doc = { currency: 'PEN', fields: {}, lines: [] };
    const result = evaluateTemplate(version, doc, {
      pack: dummyPack,
      mapping: dummyMapping,
      chart: dummyChart,
      functionalCurrency: 'PEN'
    });

    expect(result.ok).toBe(false);
    expect(result.pending).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'UNBALANCED' })
      ])
    );
  });
});

