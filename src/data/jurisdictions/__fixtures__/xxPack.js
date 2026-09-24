/**
 * Paquete normativo ficticio agnóstico para pruebas de agnosticismo (RD-14, SC-002, SC-003).
 * No contiene referencias a ningún país, impuesto o catálogo real.
 */

export const xxPackHeader = {
  code: 'XX',
  version: 1,
  name: 'Paquete Ficticio XX',
  effectiveFrom: '2020-01-01',
  effectiveTo: null,
  defaultFunctionalCurrency: 'XXD',
  referenceChartOfAccounts: 'COA_XX',
  roundingToleranceMinor: 1,
  extractionConfidenceThreshold: 0.80
};

export const xxFiscalIdTypes = [
  { code: 'TAX_ID', name: 'Tax Identification Number', pattern: '^[A-Z0-9]{6,12}$' }
];

export const xxTaxes = [
  {
    code: 'SALES_TAX',
    name: 'Sales Tax 10%',
    kind: 'VALUE_ADDED',
    rates: [
      { rateBp: 1000, effectiveFrom: '2020-01-01', effectiveTo: null }
    ],
    recoverableAccountRole: 'TAX_RECOVERABLE',
    payableAccountRole: 'TAX_PAYABLE'
  }
];

export const xxOperationTypes = [
  { code: 'SERVICE_EXPENSE', name: 'Gasto de Servicios Generales', appliesTo: ['SERVICE_BILL'] }
];

export const xxMixedOperationTypes = {};

export const xxAccountRoles = [
  {
    code: 'EXPENSE_SERVICE',
    name: 'Service Expenses',
    allowedSides: ['DEBIT'],
    category: 'EXPENSE',
    suggestedAccountPrefix: 'EX'
  },
  {
    code: 'SUPPLIERS_LIABILITY',
    name: 'Suppliers Liability',
    allowedSides: ['CREDIT'],
    category: 'LIABILITY',
    suggestedAccountPrefix: 'LI'
  }
];

export const xxLegalBooks = [
  { code: 'XX.EXPENSES_BOOK', name: 'General Expenses Book', officialCode: 'EXP01' }
];

export const xxDocumentTypes = [
  {
    code: 'SERVICE_BILL',
    version: 1,
    name: 'Service Bill',
    family: 'COMMERCIAL',
    officialCodes: ['SB'],
    allowedPerspectives: ['RECEIVED'],
    fixedPerspective: null,
    operationTypesByPerspective: {
      RECEIVED: ['SERVICE_EXPENSE']
    },
    requiredPartyRoles: ['ISSUER', 'RECEIVER'],
    headerFields: [],
    lineFields: [
      { key: 'description', label: 'Descripción', type: 'STRING', required: true },
      { key: 'amountMinor', label: 'Importe', type: 'MONEY', required: true }
    ],
    linesRequired: true,
    allowedTaxCodes: ['SALES_TAX'],
    allowedWithholdingCodes: [],
    reference: { required: false, documentTypeCodes: [] },
    coherenceRules: [
      {
        id: 'SB_SUM',
        description: 'La suma de líneas debe igualar el total',
        check: { fn: 'eq', args: [{ fn: 'sumLines', args: [{ line: 'amountMinor' }] }, { field: 'totals.totalMinor' }] }
      }
    ],
    coherenceToleranceMinor: 1,
    defaultLegalBookCode: 'XX.EXPENSES_BOOK',
    generatesEntry: true,
    effectiveFrom: '2020-01-01',
    effectiveTo: null
  }
];

export const xxBaseTemplates = [
  {
    id: 'XX.RECEIVED.SERVICE_BILL.SERVICE_EXPENSE',
    code: 'XX_SERVICE_EXPENSE',
    name: 'Asiento de factura de servicio en XX',
    scope: 'PACK',
    version: 1,
    documentTypeCode: 'SERVICE_BILL',
    perspective: 'RECEIVED',
    operationTypeCode: 'SERVICE_EXPENSE',
    priority: 0,
    applicability: null,
    legalBookCode: 'XX.EXPENSES_BOOK',
    glosa: { const: 'Gasto por servicio de terceros XX' },
    requiredInputs: [],
    lines: [
      {
        id: 'line_debit',
        side: 'DEBIT',
        account: { kind: 'ROLE', roleCode: 'EXPENSE_SERVICE' },
        amount: { field: 'totals.totalMinor' },
        emitWhen: null,
        forEachDocumentLine: false,
        dimensions: {},
        description: { const: 'Gasto de servicio' },
        balancingLine: false
      },
      {
        id: 'line_credit',
        side: 'CREDIT',
        account: { kind: 'ROLE', roleCode: 'SUPPLIERS_LIABILITY' },
        amount: { field: 'totals.totalMinor' },
        emitWhen: null,
        forEachDocumentLine: false,
        dimensions: {},
        description: { const: 'Pasivo por servicio' },
        balancingLine: false
      }
    ],
    testCases: []
  }
];

export const xxPack = {
  ...xxPackHeader,
  fiscalIdTypes: xxFiscalIdTypes,
  taxes: xxTaxes,
  operationTypes: xxOperationTypes,
  mixedOperationTypes: xxMixedOperationTypes,
  accountRoles: xxAccountRoles,
  legalBooks: xxLegalBooks,
  documentTypes: xxDocumentTypes,
  baseTemplates: xxBaseTemplates
};

