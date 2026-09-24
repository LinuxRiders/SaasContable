/**
 * Plantillas contables base del paquete Perú (PE).
 * Conforme a SDD §21.4 y data-model.md §6.
 * Alcance 'PACK', inmutables, publicadas.
 *
 * Al inicio se siembran solo las 3 plantillas más comunes que maneja un contador
 * profesional (factura de compra, factura de venta y planilla). El Admin puede crear
 * y activar más plantillas propias de la empresa (scope TENANT) desde el editor.
 */

import { SAMPLE_DOCUMENTS } from './sampleDocuments.js';

export const peBaseTemplates = [
  // 1. Factura recibida - Compra de mercadería
  {
    id: 'PE.RECEIVED.INVOICE.MERCHANDISE_PURCHASE',
    code: 'PE.RECEIVED.INVOICE.MERCHANDISE_PURCHASE',
    name: 'Factura Recibida - Compra de Mercadería',
    scope: 'PACK',
    version: 1,
    status: 'PUBLISHED',
    documentTypeCode: 'INVOICE',
    perspective: 'RECEIVED',
    operationTypeCode: 'MERCHANDISE_PURCHASE',
    priority: 0,
    applicability: null,
    legalBookCode: 'PE.PURCHASES_REGISTER',
    glosa: 'Compra de mercaderías',
    requiredInputs: [],
    testCases: [
      {
        id: 'tc-merchandise-purchase-01',
        name: 'Compra de mercaderías estándar',
        mappingSource: 'TENANT',
        input: SAMPLE_DOCUMENTS[0].document,
        expectedLines: SAMPLE_DOCUMENTS[0].expected.lines
      }
    ],
    lines: [
      {
        id: 'base',
        side: 'DEBIT',
        accountRef: { kind: 'ROLE', roleCode: 'PURCHASES_MERCHANDISE' },
        amount: { field: 'totals.netMinor' },
        balancingLine: false,
        forEachDocumentLine: false
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
        id: 'inv',
        side: 'DEBIT',
        accountRef: { kind: 'ROLE', roleCode: 'INVENTORY_MERCHANDISE' },
        amount: { field: 'totals.netMinor' },
        balancingLine: false,
        forEachDocumentLine: false
      },
      {
        id: 'inv_var',
        side: 'CREDIT',
        accountRef: { kind: 'ROLE', roleCode: 'INVENTORY_VARIATION_MERCHANDISE' },
        amount: { field: 'totals.netMinor' },
        balancingLine: false,
        forEachDocumentLine: false
      }
    ]
  },

  // 2. Resumen de planilla mensual
  {
    id: 'PE.INTERNAL.PAYROLL_SUMMARY.PAYROLL',
    code: 'PE.INTERNAL.PAYROLL_SUMMARY.PAYROLL',
    name: 'Resumen de Planilla Mensual',
    scope: 'PACK',
    version: 1,
    status: 'PUBLISHED',
    documentTypeCode: 'PAYROLL_SUMMARY',
    perspective: 'INTERNAL',
    operationTypeCode: 'PAYROLL',
    priority: 0,
    applicability: null,
    legalBookCode: 'PE.JOURNAL',
    glosa: 'Planilla de remuneraciones del periodo',
    requiredInputs: ['fields.costCenter'],
    testCases: [
      {
        id: 'tc-payroll-01',
        name: 'Planilla mensual con cargas y aportes',
        mappingSource: 'TENANT',
        input: SAMPLE_DOCUMENTS[5].document,
        expectedLines: SAMPLE_DOCUMENTS[5].expected.lines
      },
      {
        id: 'tc-payroll-no-cc',
        name: 'Planilla sin centro de costo',
        mappingSource: 'TENANT',
        input: SAMPLE_DOCUMENTS[9].document,
        expectedPending: ['MISSING_INPUT']
      }
    ],
    lines: [
      {
        id: 'salaries_expense',
        side: 'DEBIT',
        accountRef: { kind: 'ROLE', roleCode: 'SALARIES_EXPENSE' },
        amount: { field: 'fields.grossSalariesMinor' },
        balancingLine: false,
        forEachDocumentLine: false
      },
      {
        id: 'health_expense',
        side: 'DEBIT',
        accountRef: { kind: 'ROLE', roleCode: 'SOCIAL_SECURITY_EXPENSE' },
        amount: { field: 'fields.employerHealthMinor' },
        balancingLine: false,
        forEachDocumentLine: false
      },
      {
        id: 'health_payable',
        side: 'CREDIT',
        accountRef: { kind: 'ROLE', roleCode: 'SOCIAL_SECURITY_PAYABLE' },
        amount: { field: 'fields.employerHealthMinor' },
        balancingLine: false,
        forEachDocumentLine: false
      },
      {
        id: 'onp_payable',
        side: 'CREDIT',
        accountRef: { kind: 'ROLE', roleCode: 'PENSION_PAYABLE_PUBLIC' },
        amount: { field: 'fields.publicPensionMinor' },
        balancingLine: false,
        forEachDocumentLine: false
      },
      {
        id: 'afp_payable',
        side: 'CREDIT',
        accountRef: { kind: 'ROLE', roleCode: 'PENSION_PAYABLE_PRIVATE' },
        amount: { field: 'fields.privatePensionMinor' },
        balancingLine: false,
        forEachDocumentLine: false
      },
      {
        id: 'renta_payable',
        side: 'CREDIT',
        accountRef: { kind: 'ROLE', roleCode: 'INCOME_TAX_WITHHELD_PAYABLE_5TH' },
        amount: { field: 'fields.incomeTaxWithheldMinor' },
        balancingLine: false,
        forEachDocumentLine: false
      },
      {
        id: 'net_payable',
        side: 'CREDIT',
        accountRef: { kind: 'ROLE', roleCode: 'SALARIES_PAYABLE' },
        amount: { field: 'fields.netPayableMinor' },
        balancingLine: true,
        forEachDocumentLine: false
      },
      {
        id: 'cost_dest',
        side: 'DEBIT',
        accountRef: { kind: 'ROLE', roleCode: 'COST_DESTINATION', qualifierFrom: { field: 'fields.costCenter' } },
        amount: { fn: 'add', args: [{ field: 'fields.grossSalariesMinor' }, { field: 'fields.employerHealthMinor' }] },
        balancingLine: false,
        forEachDocumentLine: false
      },
      {
        id: 'cost_contra',
        side: 'CREDIT',
        accountRef: { kind: 'ROLE', roleCode: 'COST_ALLOCATION_CONTRA' },
        amount: { fn: 'add', args: [{ field: 'fields.grossSalariesMinor' }, { field: 'fields.employerHealthMinor' }] },
        balancingLine: false,
        forEachDocumentLine: false
      }
    ]
  },

  // 3. Factura emitida - Venta de mercadería
  {
    id: 'PE.ISSUED.INVOICE.MERCHANDISE_SALE',
    code: 'PE.ISSUED.INVOICE.MERCHANDISE_SALE',
    name: 'Factura Emitida - Venta de Mercadería',
    scope: 'PACK',
    version: 1,
    status: 'PUBLISHED',
    documentTypeCode: 'INVOICE',
    perspective: 'ISSUED',
    operationTypeCode: 'MERCHANDISE_SALE',
    priority: 0,
    applicability: null,
    legalBookCode: 'PE.SALES_REGISTER',
    glosa: 'Venta de mercaderías s/ factura',
    requiredInputs: [],
    testCases: [
      {
        id: 'tc-merchandise-sale-01',
        name: 'Venta de mercaderías emitida',
        mappingSource: 'TENANT',
        input: SAMPLE_DOCUMENTS[6].document,
        expectedLines: SAMPLE_DOCUMENTS[6].expected.lines
      }
    ],
    lines: [
      {
        id: 'receivable',
        side: 'DEBIT',
        accountRef: { kind: 'ROLE', roleCode: 'CUSTOMERS_RECEIVABLE' },
        amount: { field: 'totals.totalMinor' },
        balancingLine: true,
        forEachDocumentLine: false
      },
      {
        id: 'vat',
        side: 'CREDIT',
        accountRef: { kind: 'ROLE', roleCode: 'VAT_PAYABLE' },
        amount: { fn: 'taxAmount', args: ['VAT'] },
        emitWhen: { fn: 'hasTax', args: ['VAT'] },
        balancingLine: false,
        forEachDocumentLine: false
      },
      {
        id: 'sales',
        side: 'CREDIT',
        accountRef: { kind: 'ROLE', roleCode: 'SALES_MERCHANDISE' },
        amount: { field: 'totals.netMinor' },
        balancingLine: false,
        forEachDocumentLine: false
      }
    ]
  }
];
