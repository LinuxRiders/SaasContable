import { describe, it, expect } from 'vitest';
import { validateTemplateVersion } from '../templateValidation.js';

describe('templateValidation domain logic', () => {
  const mockPack = {
    code: 'PE',
    legalBooks: [
      { code: 'PE.PURCHASES_REGISTER', name: 'Registro de Compras' },
      { code: 'PE.SALES_REGISTER', name: 'Registro de Ventas' },
      { code: 'PE.GENERAL_JOURNAL', name: 'Libro Diario' }
    ],
    accountRoles: [
      { code: 'PROFESSIONAL_FEES_EXPENSE', name: 'Gasto por honorarios' },
      { code: 'INCOME_TAX_WITHHELD_PAYABLE_4TH', name: 'Retención de 4ta categoría' },
      { code: 'PROFESSIONAL_FEES_PAYABLE', name: 'Honorarios por pagar' },
      { code: 'COST_DESTINATION', name: 'Destino del gasto', qualifier: { name: 'costCenter', suggestions: {} } },
      { code: 'COST_ALLOCATION_CONTRA', name: 'Cargas imputables a cuentas de costos' }
    ],
    documentTypes: [
      {
        code: 'PROFESSIONAL_FEE_RECEIPT',
        name: 'Recibo por Honorarios',
        family: 'PROFESSIONAL_FEES',
        allowedPerspectives: ['RECEIVED'],
        generatesEntry: true,
        headerFields: [
          { key: 'costCenter', label: 'Centro de costo', type: 'STRING', required: false }
        ],
        lineFields: [
          { key: 'amountMinor', label: 'Importe de línea', type: 'MONEY', required: true }
        ],
        allowedTaxCodes: [],
        allowedWithholdingCodes: ['INCOME_TAX_FEES']
      },
      {
        code: 'DISPATCH_GUIDE',
        name: 'Guía de Remisión',
        family: 'COMMERCIAL',
        allowedPerspectives: ['RECEIVED', 'ISSUED'],
        generatesEntry: false, // NO genera asiento
        headerFields: [],
        lineFields: []
      }
    ],
    operationTypes: [
      { code: 'PROFESSIONAL_SERVICES', allowedPerspectives: ['RECEIVED'] }
    ]
  };

  const validFeeTemplateVersion = {
    documentTypeCode: 'PROFESSIONAL_FEE_RECEIPT',
    perspective: 'RECEIVED',
    operationTypeCode: 'PROFESSIONAL_SERVICES',
    legalBookCode: 'PE.PURCHASES_REGISTER',
    lines: [
      {
        id: 'l_expense',
        side: 'DEBIT',
        accountRef: { kind: 'ROLE', roleCode: 'PROFESSIONAL_FEES_EXPENSE' },
        amount: { field: 'totals.netMinor' },
        balancingLine: false,
        forEachDocumentLine: false
      },
      {
        id: 'l_withholding',
        side: 'CREDIT',
        accountRef: { kind: 'ROLE', roleCode: 'INCOME_TAX_WITHHELD_PAYABLE_4TH' },
        amount: { fn: 'withholdingAmount', args: ['INCOME_TAX_FEES'] },
        emitWhen: { fn: 'hasWithholding', args: ['INCOME_TAX_FEES'] },
        balancingLine: false,
        forEachDocumentLine: false
      },
      {
        id: 'l_payable',
        side: 'CREDIT',
        accountRef: { kind: 'ROLE', roleCode: 'PROFESSIONAL_FEES_PAYABLE' },
        amount: { field: 'totals.payableMinor' },
        balancingLine: true,
        forEachDocumentLine: false
      }
    ]
  };

  it('validates a correct professional fee receipt template version', () => {
    const res = validateTemplateVersion(validFeeTemplateVersion, { pack: mockPack, scope: 'PACK' });
    expect(res.ok).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it('rejects template without any CREDIT lines', () => {
    const invalid = {
      ...validFeeTemplateVersion,
      lines: validFeeTemplateVersion.lines.map(l => ({ ...l, side: 'DEBIT' }))
    };
    const res = validateTemplateVersion(invalid, { pack: mockPack, scope: 'PACK' });
    expect(res.ok).toBe(false);
    expect(res.errors.some(e => e.code === 'NO_CREDIT_LINES')).toBe(true);
  });

  it('rejects template with more than one balancingLine', () => {
    const invalid = {
      ...validFeeTemplateVersion,
      lines: validFeeTemplateVersion.lines.map(l => ({ ...l, balancingLine: true }))
    };
    const res = validateTemplateVersion(invalid, { pack: mockPack, scope: 'PACK' });
    expect(res.ok).toBe(false);
    expect(res.errors.some(e => e.code === 'MULTIPLE_BALANCING_LINES')).toBe(true);
  });

  it('rejects LITERAL account kind in PACK scope', () => {
    const invalid = {
      ...validFeeTemplateVersion,
      lines: [
        {
          ...validFeeTemplateVersion.lines[0],
          accountRef: { kind: 'LITERAL', accountCode: '6321101' }
        },
        ...validFeeTemplateVersion.lines.slice(1)
      ]
    };
    const res = validateTemplateVersion(invalid, { pack: mockPack, scope: 'PACK' });
    expect(res.ok).toBe(false);
    expect(res.errors.some(e => e.code === 'LITERAL_NOT_ALLOWED_IN_PACK')).toBe(true);
  });

  it('rejects non-existent legal book', () => {
    const invalid = {
      ...validFeeTemplateVersion,
      legalBookCode: 'PE.NON_EXISTENT_BOOK'
    };
    const res = validateTemplateVersion(invalid, { pack: mockPack, scope: 'PACK' });
    expect(res.ok).toBe(false);
    expect(res.errors.some(e => e.code === 'LEGAL_BOOK_NOT_FOUND')).toBe(true);
  });

  it('rejects document type that does not generate accounting entry', () => {
    const invalid = {
      ...validFeeTemplateVersion,
      documentTypeCode: 'DISPATCH_GUIDE'
    };
    const res = validateTemplateVersion(invalid, { pack: mockPack, scope: 'PACK' });
    expect(res.ok).toBe(false);
    expect(res.errors.some(e => e.code === 'DOCUMENT_TYPE_NOT_ACCOUNTABLE')).toBe(true);
  });

  it('rejects operation type not allowed for perspective', () => {
    const invalid = {
      ...validFeeTemplateVersion,
      perspective: 'ISSUED' // PROFESSIONAL_SERVICES only allowed in RECEIVED
    };
    const res = validateTemplateVersion(invalid, { pack: mockPack, scope: 'PACK' });
    expect(res.ok).toBe(false);
    expect(res.errors.some(e => e.code === 'PERSPECTIVE_NOT_ALLOWED')).toBe(true);
  });

  it('rejects non-existent field path with exact path', () => {
    const invalid = {
      ...validFeeTemplateVersion,
      lines: [
        {
          ...validFeeTemplateVersion.lines[0],
          amount: { field: 'fields.nonExistentField' }
        },
        ...validFeeTemplateVersion.lines.slice(1)
      ]
    };
    const res = validateTemplateVersion(invalid, { pack: mockPack, scope: 'PACK' });
    expect(res.ok).toBe(false);
    expect(res.errors.some(e => e.path === 'lines[0].amount')).toBe(true);
  });

  it('rejects line context expression when forEachDocumentLine is false', () => {
    const invalid = {
      ...validFeeTemplateVersion,
      lines: [
        {
          ...validFeeTemplateVersion.lines[0],
          forEachDocumentLine: false,
          amount: { line: 'amountMinor' } // requires line context
        },
        ...validFeeTemplateVersion.lines.slice(1)
      ]
    };
    const res = validateTemplateVersion(invalid, { pack: mockPack, scope: 'PACK' });
    expect(res.ok).toBe(false);
    expect(res.errors.some(e => e.path === 'lines[0].amount')).toBe(true);
  });

  it('emits warning when BY_OPERATION_TYPE has no fallback', () => {
    const versionWithWarning = {
      ...validFeeTemplateVersion,
      lines: [
        {
          ...validFeeTemplateVersion.lines[0],
          accountRef: {
            kind: 'BY_OPERATION_TYPE',
            byOperationType: {
              PROFESSIONAL_SERVICES: { roleCode: 'PROFESSIONAL_FEES_EXPENSE' }
            },
            fallback: null // sin fallback
          }
        },
        ...validFeeTemplateVersion.lines.slice(1)
      ]
    };
    const res = validateTemplateVersion(versionWithWarning, { pack: mockPack, scope: 'PACK' });
    expect(res.ok).toBe(true); // Advertencia no bloquea
    expect(res.warnings.some(w => w.code === 'BY_OPERATION_TYPE_NO_FALLBACK')).toBe(true);
  });
});

