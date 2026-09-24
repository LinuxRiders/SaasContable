/**
 * Definición de los 16 tipos de documento del Paquete Perú (PE).
 * Conforme a SDD v3.0 §21.2 y data-model.md §3.
 */

export const peDocumentTypes = [
  // 1. INVOICE (Factura, SUNAT 01)
  {
    code: 'INVOICE',
    version: 1,
    name: 'Factura',
    family: 'COMMERCIAL',
    officialCodes: ['01'],
    allowedPerspectives: ['RECEIVED', 'ISSUED'],
    fixedPerspective: null,
    operationTypesByPerspective: {
      RECEIVED: [
        'MERCHANDISE_PURCHASE', 'RAW_MATERIAL_PURCHASE', 'SUPPLIES_PURCHASE',
        'FIXED_ASSET_ACQUISITION', 'SERVICE_EXPENSE', 'UTILITIES_EXPENSE',
        'TRANSPORT_EXPENSE', 'RENT_EXPENSE', 'PURCHASE_MIXED'
      ],
      ISSUED: ['MERCHANDISE_SALE', 'SERVICE_SALE']
    },
    requiredPartyRoles: ['ISSUER', 'RECEIVER'],
    headerFields: [
      { key: 'paymentTerms', label: 'Condiciones de pago', type: 'CODE', required: false },
      { key: 'costCenter', label: 'Centro de costo', type: 'STRING', required: false }
    ],
    lineFields: [
      { key: 'description', label: 'Descripción', type: 'STRING', required: true },
      { key: 'itemCode', label: 'Código de ítem', type: 'STRING', required: false },
      { key: 'quantity', label: 'Cantidad', type: 'QUANTITY', required: false },
      { key: 'unitPriceMinor', label: 'Precio unitario', type: 'MONEY', required: false },
      { key: 'amountMinor', label: 'Importe de línea', type: 'MONEY', required: true },
      { key: 'costCenter', label: 'Centro de costo de línea', type: 'STRING', required: false }
    ],
    linesRequired: true,
    allowedTaxCodes: ['VAT', 'EXCISE', 'BAG_TAX'],
    allowedWithholdingCodes: ['VAT_WITHHOLDING', 'SPOT'],
    reference: { required: false, documentTypeCodes: [] },
    coherenceRules: [
      {
        id: 'INV_NET_SUM',
        description: 'La suma de importes de línea debe coincidir con el valor neto',
        check: { fn: 'eq', args: [{ fn: 'sumLines', args: [{ line: 'amountMinor' }] }, { field: 'totals.netMinor' }] }
      },
      {
        id: 'INV_TOTAL_ADD',
        description: 'El total debe ser la suma de neto e impuestos',
        check: { fn: 'eq', args: [{ fn: 'add', args: [{ field: 'totals.netMinor' }, { field: 'totals.taxMinor' }] }, { field: 'totals.totalMinor' }] }
      },
      {
        id: 'INV_PAYABLE_DIFF',
        description: 'El importe a pagar debe ser el total menos las retenciones',
        check: { fn: 'eq', args: [{ fn: 'sub', args: [{ field: 'totals.totalMinor' }, { field: 'totals.withheldMinor' }] }, { field: 'totals.payableMinor' }] }
      }
    ],
    coherenceToleranceMinor: 1,
    defaultLegalBookCode: 'PE.PURCHASES_REGISTER',
    generatesEntry: true,
    effectiveFrom: '2020-01-01',
    effectiveTo: null
  },

  // 2. CREDIT_NOTE (Nota de crédito, SUNAT 07)
  {
    code: 'CREDIT_NOTE',
    version: 1,
    name: 'Nota de crédito',
    family: 'ADJUSTMENT',
    officialCodes: ['07'],
    allowedPerspectives: ['RECEIVED', 'ISSUED'],
    fixedPerspective: null,
    operationTypesByPerspective: {
      RECEIVED: ['PURCHASE_RETURN', 'PURCHASE_PRICE_ADJUSTMENT'],
      ISSUED: ['SALES_RETURN']
    },
    requiredPartyRoles: ['ISSUER', 'RECEIVER'],
    headerFields: [
      { key: 'creditNoteReason', label: 'Motivo de nota de crédito', type: 'STRING', required: true },
      { key: 'costCenter', label: 'Centro de costo', type: 'STRING', required: false }
    ],
    lineFields: [
      { key: 'description', label: 'Descripción', type: 'STRING', required: true },
      { key: 'itemCode', label: 'Código de ítem', type: 'STRING', required: false },
      { key: 'quantity', label: 'Cantidad', type: 'QUANTITY', required: false },
      { key: 'unitPriceMinor', label: 'Precio unitario', type: 'MONEY', required: false },
      { key: 'amountMinor', label: 'Importe de línea', type: 'MONEY', required: true },
      { key: 'costCenter', label: 'Centro de costo de línea', type: 'STRING', required: false }
    ],
    linesRequired: true,
    allowedTaxCodes: ['VAT'],
    allowedWithholdingCodes: [],
    reference: { required: true, documentTypeCodes: ['INVOICE', 'SALES_RECEIPT'] },
    coherenceRules: [
      {
        id: 'CN_REF_REQ',
        description: 'Debe contener al menos una referencia al comprobante de origen',
        check: { fn: 'hasReference', args: [] }
      },
      {
        id: 'CN_NET_SUM',
        description: 'La suma de importes de línea debe coincidir con el valor neto',
        check: { fn: 'eq', args: [{ fn: 'sumLines', args: [{ line: 'amountMinor' }] }, { field: 'totals.netMinor' }] }
      },
      {
        id: 'CN_TOTAL_ADD',
        description: 'El total debe ser la suma de neto e impuestos',
        check: { fn: 'eq', args: [{ fn: 'add', args: [{ field: 'totals.netMinor' }, { field: 'totals.taxMinor' }] }, { field: 'totals.totalMinor' }] }
      }
    ],
    coherenceToleranceMinor: 1,
    defaultLegalBookCode: 'PE.PURCHASES_REGISTER',
    generatesEntry: true,
    effectiveFrom: '2020-01-01',
    effectiveTo: null
  },

  // 3. PROFESSIONAL_FEE_RECEIPT (Recibo por honorarios, SUNAT 02)
  {
    code: 'PROFESSIONAL_FEE_RECEIPT',
    version: 1,
    name: 'Recibo por honorarios',
    family: 'PROFESSIONAL_FEES',
    officialCodes: ['02'],
    allowedPerspectives: ['RECEIVED', 'ISSUED'],
    fixedPerspective: null,
    operationTypesByPerspective: {
      RECEIVED: ['PROFESSIONAL_FEES'],
      ISSUED: ['SERVICE_SALE']
    },
    requiredPartyRoles: ['ISSUER', 'RECEIVER'],
    headerFields: [
      { key: 'serviceDescription', label: 'Descripción del servicio', type: 'STRING', required: true },
      { key: 'grossAmountMinor', label: 'Importe bruto', type: 'MONEY', required: true },
      { key: 'costCenter', label: 'Centro de costo', type: 'STRING', required: false }
    ],
    lineFields: [],
    linesRequired: false,
    allowedTaxCodes: [],
    allowedWithholdingCodes: ['INCOME_TAX_FEES'],
    reference: { required: false, documentTypeCodes: [] },
    coherenceRules: [
      {
        id: 'RH_PAYABLE_CHECK',
        description: 'El importe neto a pagar debe ser el bruto menos las retenciones de 4ta categoría',
        check: { fn: 'eq', args: [{ fn: 'sub', args: [{ field: 'fields.grossAmountMinor' }, { field: 'totals.withheldMinor' }] }, { field: 'totals.payableMinor' }] }
      }
    ],
    coherenceToleranceMinor: 1,
    defaultLegalBookCode: 'PE.WITHHOLDINGS_BOOK',
    generatesEntry: true,
    effectiveFrom: '2020-01-01',
    effectiveTo: null
  },

  // 4. PAYROLL_SUMMARY (Resumen de planilla)
  {
    code: 'PAYROLL_SUMMARY',
    version: 1,
    name: 'Resumen de planilla',
    family: 'LABOR',
    officialCodes: ['PLN'],
    allowedPerspectives: ['INTERNAL'],
    fixedPerspective: 'INTERNAL',
    operationTypesByPerspective: {
      INTERNAL: ['PAYROLL']
    },
    requiredPartyRoles: ['EMPLOYEE'],
    headerFields: [
      { key: 'payrollPeriod', label: 'Periodo de planilla', type: 'DATE', required: true },
      { key: 'costCenter', label: 'Centro de costo', type: 'STRING', required: true },
      { key: 'grossSalariesMinor', label: 'Sueldos brutos', type: 'MONEY', required: true },
      { key: 'employerHealthMinor', label: 'Aporte salud empleador (EsSalud)', type: 'MONEY', required: true },
      { key: 'publicPensionMinor', label: 'Retención pensión pública (ONP)', type: 'MONEY', required: true },
      { key: 'privatePensionMinor', label: 'Retención pensión privada (AFP)', type: 'MONEY', required: true },
      { key: 'incomeTaxWithheldMinor', label: 'Retención renta 5ta categoría', type: 'MONEY', required: true },
      { key: 'netPayableMinor', label: 'Neto a pagar', type: 'MONEY', required: true }
    ],
    lineFields: [],
    linesRequired: false,
    allowedTaxCodes: [],
    allowedWithholdingCodes: [],
    reference: { required: false, documentTypeCodes: [] },
    coherenceRules: [
      {
        id: 'PAYROLL_NET_CHECK',
        description: 'Sueldo bruto menos aportes y retenciones del trabajador debe igualar el neto a pagar',
        check: {
          fn: 'eq',
          args: [
            {
              fn: 'sub',
              args: [
                {
                  fn: 'sub',
                  args: [
                    {
                      fn: 'sub',
                      args: [
                        { field: 'fields.grossSalariesMinor' },
                        { field: 'fields.publicPensionMinor' }
                      ]
                    },
                    { field: 'fields.privatePensionMinor' }
                  ]
                },
                { field: 'fields.incomeTaxWithheldMinor' }
              ]
            },
            { field: 'fields.netPayableMinor' }
          ]
        }
      }
    ],
    coherenceToleranceMinor: 1,
    defaultLegalBookCode: 'PE.JOURNAL',
    generatesEntry: true,
    effectiveFrom: '2020-01-01',
    effectiveTo: null
  },

  // 5. BANK_STATEMENT (Extracto bancario)
  {
    code: 'BANK_STATEMENT',
    version: 1,
    name: 'Extracto bancario',
    family: 'FINANCIAL',
    officialCodes: ['EXT'],
    allowedPerspectives: ['RECEIVED'],
    fixedPerspective: null,
    operationTypesByPerspective: {
      RECEIVED: ['BANK_CHARGES']
    },
    requiredPartyRoles: ['BANK'],
    headerFields: [
      { key: 'bankAccountCode', label: 'Código de cuenta bancaria', type: 'STRING', required: true },
      { key: 'costCenter', label: 'Centro de costo', type: 'STRING', required: false }
    ],
    lineFields: [
      { key: 'description', label: 'Concepto bancario', type: 'STRING', required: true },
      { key: 'movementType', label: 'Tipo de movimiento (CHARGE/CREDIT)', type: 'CODE', required: true },
      { key: 'amountMinor', label: 'Importe movimiento', type: 'MONEY', required: true }
    ],
    linesRequired: true,
    allowedTaxCodes: [],
    allowedWithholdingCodes: [],
    reference: { required: false, documentTypeCodes: [] },
    coherenceRules: [],
    coherenceToleranceMinor: 0,
    defaultLegalBookCode: 'PE.CASH_BANKS',
    generatesEntry: true,
    effectiveFrom: '2020-01-01',
    effectiveTo: null
  },

  // 6. INTERNAL_DOCUMENT (Documento interno: depreciación, provisión, asiento manual)
  {
    code: 'INTERNAL_DOCUMENT',
    version: 1,
    name: 'Documento interno',
    family: 'INTERNAL',
    officialCodes: ['INT'],
    allowedPerspectives: ['INTERNAL'],
    fixedPerspective: 'INTERNAL',
    operationTypesByPerspective: {
      INTERNAL: ['DEPRECIATION', 'PROVISION', 'FX_DIFFERENCE']
    },
    requiredPartyRoles: [],
    headerFields: [
      { key: 'concept', label: 'Concepto interno', type: 'STRING', required: true },
      { key: 'costCenter', label: 'Centro de costo', type: 'STRING', required: false }
    ],
    lineFields: [
      { key: 'description', label: 'Descripción de línea', type: 'STRING', required: true },
      { key: 'amountMinor', label: 'Importe de línea', type: 'MONEY', required: true },
      { key: 'assetClass', label: 'Clase de activo', type: 'CODE', required: false }
    ],
    linesRequired: true,
    allowedTaxCodes: [],
    allowedWithholdingCodes: [],
    reference: { required: false, documentTypeCodes: [] },
    coherenceRules: [
      {
        id: 'INT_TOTAL_SUM',
        description: 'La suma de líneas debe igualar el total',
        check: { fn: 'eq', args: [{ fn: 'sumLines', args: [{ line: 'amountMinor' }] }, { field: 'totals.totalMinor' }] }
      }
    ],
    coherenceToleranceMinor: 0,
    defaultLegalBookCode: 'PE.JOURNAL',
    generatesEntry: true,
    effectiveFrom: '2020-01-01',
    effectiveTo: null
  },

  // 7. SALES_RECEIPT (Boleta de venta, SUNAT 03)
  {
    code: 'SALES_RECEIPT',
    version: 1,
    name: 'Boleta de venta',
    family: 'COMMERCIAL',
    officialCodes: ['03'],
    allowedPerspectives: ['RECEIVED', 'ISSUED'],
    fixedPerspective: null,
    operationTypesByPerspective: {
      RECEIVED: ['MERCHANDISE_PURCHASE', 'SERVICE_EXPENSE'],
      ISSUED: ['MERCHANDISE_SALE']
    },
    requiredPartyRoles: ['ISSUER'],
    headerFields: [
      { key: 'costCenter', label: 'Centro de costo', type: 'STRING', required: false }
    ],
    lineFields: [
      { key: 'description', label: 'Descripción', type: 'STRING', required: true },
      { key: 'amountMinor', label: 'Importe', type: 'MONEY', required: true }
    ],
    linesRequired: true,
    allowedTaxCodes: ['VAT'],
    allowedWithholdingCodes: [],
    reference: { required: false, documentTypeCodes: [] },
    coherenceRules: [],
    coherenceToleranceMinor: 1,
    defaultLegalBookCode: 'PE.PURCHASES_REGISTER',
    generatesEntry: true,
    effectiveFrom: '2020-01-01',
    effectiveTo: null
  },

  // 8. PURCHASE_SETTLEMENT (Liquidación de compra, SUNAT 04)
  {
    code: 'PURCHASE_SETTLEMENT',
    version: 1,
    name: 'Liquidación de compra',
    family: 'COMMERCIAL',
    officialCodes: ['04'],
    allowedPerspectives: ['RECEIVED'],
    fixedPerspective: null,
    operationTypesByPerspective: {
      RECEIVED: ['RAW_MATERIAL_PURCHASE', 'SUPPLIES_PURCHASE']
    },
    requiredPartyRoles: ['ISSUER', 'RECEIVER'],
    headerFields: [
      { key: 'costCenter', label: 'Centro de costo', type: 'STRING', required: false }
    ],
    lineFields: [
      { key: 'description', label: 'Descripción', type: 'STRING', required: true },
      { key: 'amountMinor', label: 'Importe', type: 'MONEY', required: true }
    ],
    linesRequired: true,
    allowedTaxCodes: ['VAT'],
    allowedWithholdingCodes: [],
    reference: { required: false, documentTypeCodes: [] },
    coherenceRules: [],
    coherenceToleranceMinor: 1,
    defaultLegalBookCode: 'PE.PURCHASES_REGISTER',
    generatesEntry: true,
    effectiveFrom: '2020-01-01',
    effectiveTo: null
  },

  // 9. DEBIT_NOTE (Nota de débito, SUNAT 08)
  {
    code: 'DEBIT_NOTE',
    version: 1,
    name: 'Nota de débito',
    family: 'ADJUSTMENT',
    officialCodes: ['08'],
    allowedPerspectives: ['RECEIVED', 'ISSUED'],
    fixedPerspective: null,
    operationTypesByPerspective: {
      RECEIVED: ['PURCHASE_PRICE_ADJUSTMENT'],
      ISSUED: ['MERCHANDISE_SALE']
    },
    requiredPartyRoles: ['ISSUER', 'RECEIVER'],
    headerFields: [
      { key: 'debitNoteReason', label: 'Motivo de nota de débito', type: 'STRING', required: true },
      { key: 'costCenter', label: 'Centro de costo', type: 'STRING', required: false }
    ],
    lineFields: [
      { key: 'description', label: 'Descripción', type: 'STRING', required: true },
      { key: 'amountMinor', label: 'Importe', type: 'MONEY', required: true }
    ],
    linesRequired: true,
    allowedTaxCodes: ['VAT'],
    allowedWithholdingCodes: [],
    reference: { required: true, documentTypeCodes: ['INVOICE', 'SALES_RECEIPT'] },
    coherenceRules: [
      {
        id: 'DN_REF_REQ',
        description: 'Debe contener al menos una referencia al comprobante de origen',
        check: { fn: 'hasReference', args: [] }
      }
    ],
    coherenceToleranceMinor: 1,
    defaultLegalBookCode: 'PE.PURCHASES_REGISTER',
    generatesEntry: true,
    effectiveFrom: '2020-01-01',
    effectiveTo: null
  },

  // 10. DISPATCH_GUIDE (Guía de remisión, SUNAT 09) - NO GENERA ASIENTO
  {
    code: 'DISPATCH_GUIDE',
    version: 1,
    name: 'Guía de remisión',
    family: 'COMMERCIAL',
    officialCodes: ['09'],
    allowedPerspectives: ['RECEIVED', 'ISSUED'],
    fixedPerspective: null,
    operationTypesByPerspective: {
      RECEIVED: ['MERCHANDISE_PURCHASE'],
      ISSUED: ['MERCHANDISE_SALE']
    },
    requiredPartyRoles: ['ISSUER', 'RECEIVER'],
    headerFields: [
      { key: 'transportReason', label: 'Motivo de traslado', type: 'STRING', required: false }
    ],
    lineFields: [
      { key: 'description', label: 'Descripción del bien transportado', type: 'STRING', required: true },
      { key: 'quantity', label: 'Cantidad', type: 'QUANTITY', required: true }
    ],
    linesRequired: true,
    allowedTaxCodes: [],
    allowedWithholdingCodes: [],
    reference: { required: false, documentTypeCodes: [] },
    coherenceRules: [],
    coherenceToleranceMinor: 0,
    defaultLegalBookCode: null,
    generatesEntry: false,
    effectiveFrom: '2020-01-01',
    effectiveTo: null
  },

  // 11. TICKET (Ticket de máquina registradora, SUNAT 12)
  {
    code: 'TICKET',
    version: 1,
    name: 'Ticket de máquina registradora',
    family: 'COMMERCIAL',
    officialCodes: ['12'],
    allowedPerspectives: ['RECEIVED', 'ISSUED'],
    fixedPerspective: null,
    operationTypesByPerspective: {
      RECEIVED: ['MERCHANDISE_PURCHASE', 'SERVICE_EXPENSE'],
      ISSUED: ['MERCHANDISE_SALE']
    },
    requiredPartyRoles: ['ISSUER'],
    headerFields: [],
    lineFields: [
      { key: 'description', label: 'Descripción', type: 'STRING', required: true },
      { key: 'amountMinor', label: 'Importe', type: 'MONEY', required: true }
    ],
    linesRequired: true,
    allowedTaxCodes: ['VAT'],
    allowedWithholdingCodes: [],
    reference: { required: false, documentTypeCodes: [] },
    coherenceRules: [],
    coherenceToleranceMinor: 1,
    defaultLegalBookCode: 'PE.PURCHASES_REGISTER',
    generatesEntry: true,
    effectiveFrom: '2020-01-01',
    effectiveTo: null
  },

  // 12. UTILITY_RECEIPT (Recibo de servicios públicos, SUNAT 14)
  {
    code: 'UTILITY_RECEIPT',
    version: 1,
    name: 'Recibo de servicios públicos',
    family: 'COMMERCIAL',
    officialCodes: ['14'],
    allowedPerspectives: ['RECEIVED'],
    fixedPerspective: null,
    operationTypesByPerspective: {
      RECEIVED: ['UTILITIES_EXPENSE']
    },
    requiredPartyRoles: ['ISSUER', 'RECEIVER'],
    headerFields: [
      { key: 'costCenter', label: 'Centro de costo', type: 'STRING', required: false }
    ],
    lineFields: [
      { key: 'description', label: 'Concepto de servicio', type: 'STRING', required: true },
      { key: 'amountMinor', label: 'Importe', type: 'MONEY', required: true }
    ],
    linesRequired: true,
    allowedTaxCodes: ['VAT'],
    allowedWithholdingCodes: [],
    reference: { required: false, documentTypeCodes: [] },
    coherenceRules: [],
    coherenceToleranceMinor: 1,
    defaultLegalBookCode: 'PE.PURCHASES_REGISTER',
    generatesEntry: true,
    effectiveFrom: '2020-01-01',
    effectiveTo: null
  },

  // 13. WITHHOLDING_CERTIFICATE (Comprobante de retención, SUNAT 20)
  {
    code: 'WITHHOLDING_CERTIFICATE',
    version: 1,
    name: 'Comprobante de retención',
    family: 'TAX_CERTIFICATE',
    officialCodes: ['20'],
    allowedPerspectives: ['RECEIVED', 'ISSUED'],
    fixedPerspective: null,
    operationTypesByPerspective: {
      RECEIVED: ['WITHHOLDING_SUFFERED'],
      ISSUED: ['WITHHOLDING_SUFFERED']
    },
    requiredPartyRoles: ['ISSUER', 'RECEIVER'],
    headerFields: [],
    lineFields: [
      { key: 'description', label: 'Comprobante retenido', type: 'STRING', required: true },
      { key: 'amountMinor', label: 'Monto retenido', type: 'MONEY', required: true }
    ],
    linesRequired: true,
    allowedTaxCodes: [],
    allowedWithholdingCodes: ['VAT_WITHHOLDING'],
    reference: { required: true, documentTypeCodes: ['INVOICE'] },
    coherenceRules: [],
    coherenceToleranceMinor: 0,
    defaultLegalBookCode: 'PE.JOURNAL',
    generatesEntry: true,
    effectiveFrom: '2020-01-01',
    effectiveTo: null
  },

  // 14. PERCEPTION_CERTIFICATE (Comprobante de percepción, SUNAT 40)
  {
    code: 'PERCEPTION_CERTIFICATE',
    version: 1,
    name: 'Comprobante de percepción',
    family: 'TAX_CERTIFICATE',
    officialCodes: ['40'],
    allowedPerspectives: ['RECEIVED', 'ISSUED'],
    fixedPerspective: null,
    operationTypesByPerspective: {
      RECEIVED: ['PERCEPTION_SUFFERED'],
      ISSUED: ['PERCEPTION_SUFFERED']
    },
    requiredPartyRoles: ['ISSUER', 'RECEIVER'],
    headerFields: [],
    lineFields: [
      { key: 'description', label: 'Comprobante percibido', type: 'STRING', required: true },
      { key: 'amountMinor', label: 'Monto percibido', type: 'MONEY', required: true }
    ],
    linesRequired: true,
    allowedTaxCodes: [],
    allowedWithholdingCodes: ['VAT_PERCEPTION'],
    reference: { required: true, documentTypeCodes: ['INVOICE'] },
    coherenceRules: [],
    coherenceToleranceMinor: 0,
    defaultLegalBookCode: 'PE.JOURNAL',
    generatesEntry: true,
    effectiveFrom: '2020-01-01',
    effectiveTo: null
  },

  // 15. CUSTOMS_DECLARATION (Declaración Aduanera de Mercancías - DUA, SUNAT 50)
  {
    code: 'CUSTOMS_DECLARATION',
    version: 1,
    name: 'Declaración aduanera (DUA)',
    family: 'CUSTOMS',
    officialCodes: ['50'],
    allowedPerspectives: ['RECEIVED'],
    fixedPerspective: null,
    operationTypesByPerspective: {
      RECEIVED: ['IMPORT']
    },
    requiredPartyRoles: ['CUSTOMS', 'RECEIVER'],
    headerFields: [
      { key: 'customsOffice', label: 'Aduana de despacho', type: 'STRING', required: false }
    ],
    lineFields: [
      { key: 'description', label: 'Serie/Item aduanero', type: 'STRING', required: true },
      { key: 'amountMinor', label: 'Valor en aduana / tributos', type: 'MONEY', required: true }
    ],
    linesRequired: true,
    allowedTaxCodes: ['VAT', 'EXCISE'],
    allowedWithholdingCodes: ['VAT_PERCEPTION'],
    reference: { required: false, documentTypeCodes: [] },
    coherenceRules: [],
    coherenceToleranceMinor: 1,
    defaultLegalBookCode: 'PE.PURCHASES_REGISTER',
    generatesEntry: true,
    effectiveFrom: '2020-01-01',
    effectiveTo: null
  },

  // 16. PAYMENT_VOUCHER (Voucher de pago o depósito bancario)
  {
    code: 'PAYMENT_VOUCHER',
    version: 1,
    name: 'Voucher de pago o depósito',
    family: 'FINANCIAL',
    officialCodes: ['VOU'],
    allowedPerspectives: ['INTERNAL'],
    fixedPerspective: 'INTERNAL',
    operationTypesByPerspective: {
      INTERNAL: ['SUPPLIER_PAYMENT', 'CUSTOMER_COLLECTION']
    },
    requiredPartyRoles: [],
    headerFields: [
      { key: 'bankAccountCode', label: 'Cuenta bancaria', type: 'STRING', required: true },
      { key: 'paymentReference', label: 'Número de operación bancaria', type: 'STRING', required: false }
    ],
    lineFields: [
      { key: 'description', label: 'Detalle de pago', type: 'STRING', required: true },
      { key: 'amountMinor', label: 'Importe pagado', type: 'MONEY', required: true }
    ],
    linesRequired: true,
    allowedTaxCodes: [],
    allowedWithholdingCodes: [],
    reference: { required: false, documentTypeCodes: [] },
    coherenceRules: [],
    coherenceToleranceMinor: 0,
    defaultLegalBookCode: 'PE.CASH_BANKS',
    generatesEntry: true,
    effectiveFrom: '2020-01-01',
    effectiveTo: null
  }
];

