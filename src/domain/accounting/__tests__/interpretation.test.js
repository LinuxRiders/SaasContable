import { describe, it, expect } from 'vitest';
import { interpretDocument } from '../interpretation.js';
import { pePack, SAMPLE_DOCUMENTS } from '../../../data/jurisdictions/index.js';
import { mockReglasClasificacion } from '../../../data/mockReglasClasificacion.js';
import { preloadMapping } from '../accountMapping.js';
import { mockPlanContable } from '../../../data/mockPlanContable.js';

describe('interpretation: interpretDocument (contracts/domain-api.md §7, T085, SC-007)', () => {
  const tenantFiscalId = '20450656934'; // Empresa 01
  const chart = mockPlanContable;
  const functionalCurrency = 'PEN';

  // Mapa de la empresa 01 completo
  const { entries } = preloadMapping(pePack, chart, [
    { roleCode: 'FIXED_ASSET_IT_EQUIPMENT', accountCode: '3351101' },
    { roleCode: 'BANK_ACCOUNT', qualifier: 'BCP-MN', accountCode: '104101' },
    { roleCode: 'BANK_ACCOUNT', qualifier: 'IBK-MN', accountCode: '104102' }
  ]);
  const mapping = { entries };

  // Plantilla PURCHASE_MIXED: no forma parte de las 3 plantillas base sembradas por defecto,
  // pero este test ejercita el motor de interpretación end-to-end con un caso de líneas
  // heterogéneas (SC-007), así que se define aquí como plantilla candidata adicional.
  const purchaseMixedTemplate = {
    id: 'PE.RECEIVED.INVOICE.PURCHASE_MIXED',
    code: 'PE.RECEIVED.INVOICE.PURCHASE_MIXED',
    documentTypeCode: 'INVOICE',
    perspective: 'RECEIVED',
    operationTypeCode: 'PURCHASE_MIXED',
    priority: 0,
    legalBookCode: 'PE.PURCHASES_REGISTER',
    glosa: 'Compras mixtas con líneas de mercadería y flete',
    requiredInputs: [],
    lines: [
      {
        id: 'line_expense',
        side: 'DEBIT',
        accountRef: {
          kind: 'BY_OPERATION_TYPE',
          byOperationType: {
            MERCHANDISE_PURCHASE: { roleCode: 'PURCHASES_MERCHANDISE' },
            TRANSPORT_EXPENSE: { roleCode: 'TRANSPORT_EXPENSE' }
          },
          fallback: { roleCode: 'PURCHASES_MERCHANDISE' }
        },
        amount: { line: 'amountMinor' },
        balancingLine: false,
        forEachDocumentLine: true
      },
      {
        id: 'vat',
        side: 'DEBIT',
        accountRef: { kind: 'ROLE', roleCode: 'VAT_CREDIT' },
        amount: { fn: 'taxAmount', args: ['VAT'] },
        emitWhen: { fn: 'hasTax', args: ['VAT'] },
        balancingLine: false,
        forEachDocumentLine: false
      },
      {
        id: 'payable',
        side: 'CREDIT',
        accountRef: { kind: 'ROLE', roleCode: 'SUPPLIERS_PAYABLE' },
        amount: { field: 'totals.totalMinor' },
        balancingLine: true,
        forEachDocumentLine: false
      },
      {
        id: 'line_inventory',
        side: 'DEBIT',
        accountRef: { kind: 'ROLE', roleCode: 'INVENTORY_MERCHANDISE' },
        amount: { line: 'amountMinor' },
        emitWhen: { fn: 'eq', args: [{ line: 'operationTypeCode' }, 'MERCHANDISE_PURCHASE'] },
        balancingLine: false,
        forEachDocumentLine: true
      },
      {
        id: 'line_inventory_var',
        side: 'CREDIT',
        accountRef: { kind: 'ROLE', roleCode: 'INVENTORY_VARIATION_MERCHANDISE' },
        amount: { line: 'amountMinor' },
        emitWhen: { fn: 'eq', args: [{ line: 'operationTypeCode' }, 'MERCHANDISE_PURCHASE'] },
        balancingLine: false,
        forEachDocumentLine: true
      },
      {
        id: 'line_cost_dest',
        side: 'DEBIT',
        accountRef: { kind: 'ROLE', roleCode: 'COST_DESTINATION', qualifierFrom: { line: 'fields.costCenter' } },
        amount: { line: 'amountMinor' },
        emitWhen: { fn: 'eq', args: [{ line: 'operationTypeCode' }, 'TRANSPORT_EXPENSE'] },
        balancingLine: false,
        forEachDocumentLine: true
      },
      {
        id: 'line_cost_contra',
        side: 'CREDIT',
        accountRef: { kind: 'ROLE', roleCode: 'COST_ALLOCATION_CONTRA' },
        amount: { line: 'amountMinor' },
        emitWhen: { fn: 'eq', args: [{ line: 'operationTypeCode' }, 'TRANSPORT_EXPENSE'] },
        balancingLine: false,
        forEachDocumentLine: true
      }
    ]
  };

  // Helper candidatesFor para plantillas base de PE + la plantilla mixta de este test
  const candidatesFor = (terna) => {
    const list = [];
    for (const tpl of [...pePack.baseTemplates, purchaseMixedTemplate]) {
      if (
        tpl.documentTypeCode === terna.documentTypeCode &&
        tpl.perspective === terna.perspective &&
        tpl.operationTypeCode === terna.operationTypeCode
      ) {
        list.push({
          template: { id: tpl.id || tpl.code, code: tpl.code, scope: 'PACK' },
          version: tpl
        });
      }
    }
    return list;
  };

  it('factura de mercadería + flete sin clasificar llega a PURCHASE_MIXED con 8 líneas cuadradas (Debe = Haber = 130 800)', () => {
    const unclassifiedMixedDoc = SAMPLE_DOCUMENTS.find(s => s.id === 'PE-11-UNCLASSIFIED-MIXED-PURCHASE')?.document;
    expect(unclassifiedMixedDoc).toBeDefined();

    const res = interpretDocument(unclassifiedMixedDoc, {
      pack: pePack,
      tenantFiscalId,
      rules: mockReglasClasificacion,
      candidatesFor,
      mapping,
      chart,
      functionalCurrency
    });

    expect(res.ok).toBe(true);
    expect(res.entry.operationTypeCode).toBe('PURCHASE_MIXED');
    expect(res.entry.templateId).toBe('PE.RECEIVED.INVOICE.PURCHASE_MIXED');
    expect(res.entry.lines).toHaveLength(8);

    // Sumar importes
    let totalDebit = 0;
    let totalCredit = 0;
    for (const l of res.entry.lines) {
      if (l.side === 'DEBIT') totalDebit += l.functionalAmountMinor;
      if (l.side === 'CREDIT') totalCredit += l.functionalAmountMinor;
    }

    expect(totalDebit).toBe(130800);
    expect(totalCredit).toBe(130800);
  });

  it('detiene el proceso en SCHEMA si el documento es inválido', () => {
    const invalidDoc = {
      documentTypeCode: 'INVOICE',
      issueDate: '2026-09-15',
      // Faltan partes y series/number
      parties: []
    };

    const res = interpretDocument(invalidDoc, {
      pack: pePack,
      tenantFiscalId,
      rules: mockReglasClasificacion,
      candidatesFor,
      mapping,
      chart,
      functionalCurrency
    });

    expect(res.ok).toBe(false);
    expect(res.stoppedAt).toBe('SCHEMA');
    expect(res.trace.steps.some(s => s.step === 'SCHEMA' && !s.ok)).toBe(true);
  });

  it('detiene el proceso en PERSPECTIVE si el tenant no figura en las partes', () => {
    const docOtherTenant = {
      documentTypeCode: 'INVOICE',
      series: 'F001',
      number: '00000001',
      issueDate: '2026-09-15',
      currency: 'PEN',
      parties: [
        { role: 'ISSUER', fiscalId: '20100000009', legalName: 'Proveedor Externo' },
        { role: 'RECEIVER', fiscalId: '20999999999', legalName: 'Cliente Externo' }
      ],
      lines: [{ lineNo: 1, description: 'Item', amountMinor: 1000, taxes: [] }],
      taxes: [],
      totals: {
        netMinor: 1000,
        taxMinor: 0,
        withheldMinor: 0,
        totalMinor: 1000,
        payableMinor: 1000
      }
    };

    const res = interpretDocument(docOtherTenant, {
      pack: pePack,
      tenantFiscalId,
      rules: mockReglasClasificacion,
      candidatesFor,
      mapping,
      chart,
      functionalCurrency
    });

    expect(res.ok).toBe(false);
    expect(res.stoppedAt).toBe('PERSPECTIVE');
  });

  it('detiene el proceso en CLASSIFICATION si no se puede clasificar', () => {
    const computerDoc = SAMPLE_DOCUMENTS.find(s => s.id === 'PE-12-UNCLASSIFIED-COMPUTER-EQUIPMENT')?.document;
    expect(computerDoc).toBeDefined();

    // mockReglasClasificacion tiene cr-08 en PROPOSED, por lo que no clasifica
    const res = interpretDocument(computerDoc, {
      pack: pePack,
      tenantFiscalId,
      rules: mockReglasClasificacion,
      candidatesFor,
      mapping,
      chart,
      functionalCurrency
    });

    expect(res.ok).toBe(false);
    expect(res.stoppedAt).toBe('CLASSIFICATION');
    expect(res.pending[0].reasonCode).toBe('CLASSIFICATION_REQUIRED');
  });

  it('detiene el proceso en SELECTION si no hay plantilla candidata', () => {
    const doc = SAMPLE_DOCUMENTS.find(s => s.id === 'PE-01-MERCHANDISE-PURCHASE')?.document;
    expect(doc).toBeDefined();

    // candidatesFor vacío
    const res = interpretDocument(doc, {
      pack: pePack,
      tenantFiscalId,
      rules: mockReglasClasificacion,
      candidatesFor: () => [],
      mapping,
      chart,
      functionalCurrency
    });

    expect(res.ok).toBe(false);
    expect(res.stoppedAt).toBe('SELECTION');
    expect(res.pending[0].reasonCode).toBe('NO_TEMPLATE');
  });

  it('detiene el proceso en EVALUATION si hay rol sin resolver en el mapa', () => {
    const doc = SAMPLE_DOCUMENTS.find(s => s.id === 'PE-01-MERCHANDISE-PURCHASE')?.document;
    expect(doc).toBeDefined();

    // Mapa vacío sin resolver ningún rol
    const res = interpretDocument(doc, {
      pack: pePack,
      tenantFiscalId,
      rules: mockReglasClasificacion,
      candidatesFor,
      mapping: { entries: [] },
      chart,
      functionalCurrency
    });

    expect(res.ok).toBe(false);
    expect(res.stoppedAt).toBe('EVALUATION');
    expect(res.pending[0].reasonCode).toBe('ACCOUNT_UNRESOLVED');
  });

  it('determinismo (SC-007): la misma entrada da exactamente el mismo resultado dos veces', () => {
    const unclassifiedMixedDoc = SAMPLE_DOCUMENTS.find(s => s.id === 'PE-11-UNCLASSIFIED-MIXED-PURCHASE')?.document;

    const opts = {
      pack: pePack,
      tenantFiscalId,
      rules: mockReglasClasificacion,
      candidatesFor,
      mapping,
      chart,
      functionalCurrency
    };

    const run1 = interpretDocument(unclassifiedMixedDoc, opts);
    const run2 = interpretDocument(unclassifiedMixedDoc, opts);

    expect(JSON.stringify(run1)).toBe(JSON.stringify(run2));
  });
});
