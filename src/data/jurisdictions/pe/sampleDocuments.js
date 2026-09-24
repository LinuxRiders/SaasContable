/**
 * Documentos canónicos de ejemplo para el paquete Perú (PE).
 * Conforme a SDD §20.9, §21.4, data-model.md §9–§10 y T056.
 * Incluye los 9 casos positivos y el caso negativo de planilla sin costCenter.
 */

export const TENANT_01 = {
  fiscalIdType: 'RUC',
  fiscalId: '20450656934',
  name: 'PACHATUSANTREK SOCIEDAD ANÓNIMA CERRADA',
  countryCode: 'PE'
};

export const SAMPLE_PARTIES = {
  distribuidora: {
    fiscalIdType: 'RUC',
    fiscalId: '20100000009',
    name: 'DISTRIBUIDORA ANDINA DEMO S.A.C.',
    countryCode: 'PE'
  },
  logistica: {
    fiscalIdType: 'RUC',
    fiscalId: '20100000025',
    name: 'LOGÍSTICA Y COMERCIO DEMO S.A.C.',
    countryCode: 'PE'
  },
  tecno: {
    fiscalIdType: 'RUC',
    fiscalId: '20100000033',
    name: 'TECNO EQUIPOS DEMO S.A.C.',
    countryCode: 'PE'
  },
  hoteles: {
    fiscalIdType: 'RUC',
    fiscalId: '20600000005',
    name: 'HOTELES DEL SUR DEMO S.A.C.',
    countryCode: 'PE'
  },
  asesor: {
    fiscalIdType: 'RUC',
    fiscalId: '10400000005',
    name: 'PÉREZ QUISPE JUAN (DEMO)',
    countryCode: 'PE'
  },
  banco: {
    fiscalIdType: 'RUC',
    fiscalId: '20100000009',
    name: 'BANCO DE CRÉDITO DEL PERÚ (DEMO)',
    countryCode: 'PE'
  }
};

/**
 * Catálogo de documentos canónicos de ejemplo para pruebas y simulaciones.
 * @type {Array<{ id: string, title: string, expected: Object, document: import('../../../domain/accounting/types.js').CanonicalDocument }>}
 */
export const SAMPLE_DOCUMENTS = [
  // 1. Factura recibida - Compra de mercadería
  {
    id: 'PE-01-MERCHANDISE-PURCHASE',
    title: 'Factura recibida - Compra de mercaderías (S/ 1,180.00)',
    expected: {
      templateId: 'PE.RECEIVED.INVOICE.MERCHANDISE_PURCHASE',
      lines: [
        { side: 'DEBIT', accountCode: '6011101', functionalAmountMinor: 100000, dimensions: {} },
        { side: 'DEBIT', accountCode: '4011101', functionalAmountMinor: 18000, dimensions: {} },
        { side: 'CREDIT', accountCode: '4212101', functionalAmountMinor: 118000, dimensions: {} },
        { side: 'DEBIT', accountCode: '2011101', functionalAmountMinor: 100000, dimensions: {} },
        { side: 'CREDIT', accountCode: '6111101', functionalAmountMinor: 100000, dimensions: {} }
      ]
    },
    document: {
      id: 'doc-pe-01',
      tenantId: '01',
      rawPayloadRef: 'raw/pe-01.xml',
      revision: 1,
      jurisdictionCode: 'PE',
      documentTypeCode: 'INVOICE',
      documentTypeVersion: 1,
      perspective: 'RECEIVED',
      series: 'F001',
      number: '00000123',
      issueDate: '2026-09-10',
      dueDate: '2026-10-10',
      currency: 'PEN',
      parties: [
        { role: 'ISSUER', ...SAMPLE_PARTIES.distribuidora },
        { role: 'RECEIVER', ...TENANT_01 }
      ],
      fields: {},
      lines: [
        {
          lineNo: 1,
          itemCode: 'MER-001',
          description: 'Mochila de trekking 40 L',
          quantity: 20,
          unitPriceMinor: 5000,
          amountMinor: 100000,
          operationTypeCode: 'MERCHANDISE_PURCHASE',
          taxes: [{ taxCode: 'VAT', baseMinor: 100000, rateBp: 1800, amountMinor: 18000 }],
          fields: {}
        }
      ],
      taxes: [{ taxCode: 'VAT', baseMinor: 100000, rateBp: 1800, amountMinor: 18000 }],
      withholdings: [],
      references: [],
      totals: {
        netMinor: 100000,
        taxMinor: 18000,
        withheldMinor: 0,
        totalMinor: 118000,
        payableMinor: 118000
      },
      operationTypeCode: 'MERCHANDISE_PURCHASE',
      extraction: {
        sourceFormat: 'XML',
        extractorId: 'ubl-parser',
        documentTypeConfidence: 1.0,
        fieldProvenance: []
      }
    }
  },

  // 2. Factura recibida - Activo fijo TI
  {
    id: 'PE-02-FIXED-ASSET',
    title: 'Factura recibida - Activo fijo TI / Computadoras (S/ 3,540.00)',
    expected: {
      templateId: 'PE.RECEIVED.INVOICE.FIXED_ASSET_ACQUISITION',
      lines: [
        { side: 'DEBIT', accountCode: '3351101', functionalAmountMinor: 300000, dimensions: {} },
        { side: 'DEBIT', accountCode: '4011101', functionalAmountMinor: 54000, dimensions: {} },
        { side: 'CREDIT', accountCode: '4654101', functionalAmountMinor: 354000, dimensions: {} }
      ]
    },
    document: {
      id: 'doc-pe-02',
      tenantId: '01',
      rawPayloadRef: 'raw/pe-02.pdf',
      revision: 1,
      jurisdictionCode: 'PE',
      documentTypeCode: 'INVOICE',
      documentTypeVersion: 1,
      perspective: 'RECEIVED',
      series: 'F003',
      number: '00000077',
      issueDate: '2026-09-19',
      dueDate: '2026-10-19',
      currency: 'PEN',
      parties: [
        { role: 'ISSUER', ...SAMPLE_PARTIES.tecno },
        { role: 'RECEIVER', ...TENANT_01 }
      ],
      fields: {},
      lines: [
        {
          lineNo: 1,
          itemCode: 'EQ-LAP-14',
          description: 'Laptop 14" para oficina (equipo de cómputo)',
          quantity: 1,
          unitPriceMinor: 300000,
          amountMinor: 300000,
          operationTypeCode: 'FIXED_ASSET_ACQUISITION',
          taxes: [{ taxCode: 'VAT', baseMinor: 300000, rateBp: 1800, amountMinor: 54000 }],
          fields: {}
        }
      ],
      taxes: [{ taxCode: 'VAT', baseMinor: 300000, rateBp: 1800, amountMinor: 54000 }],
      withholdings: [],
      references: [],
      totals: {
        netMinor: 300000,
        taxMinor: 54000,
        withheldMinor: 0,
        totalMinor: 354000,
        payableMinor: 354000
      },
      operationTypeCode: 'FIXED_ASSET_ACQUISITION',
      extraction: {
        sourceFormat: 'PDF_TEXT',
        extractorId: 'pdf-extractor',
        documentTypeConfidence: 1.0,
        fieldProvenance: []
      }
    }
  },

  // 3. Factura recibida - Compras mixtas
  {
    id: 'PE-03-PURCHASE-MIXED',
    title: 'Factura recibida - Compra mixta mercadería y flete (S/ 708.00)',
    expected: {
      templateId: 'PE.RECEIVED.INVOICE.PURCHASE_MIXED',
      lines: [
        { side: 'DEBIT', accountCode: '6011101', functionalAmountMinor: 50000, dimensions: {} },
        { side: 'DEBIT', accountCode: '6311101', functionalAmountMinor: 10000, dimensions: {} },
        { side: 'DEBIT', accountCode: '4011101', functionalAmountMinor: 10800, dimensions: {} },
        { side: 'CREDIT', accountCode: '4212101', functionalAmountMinor: 70800, dimensions: {} },
        { side: 'DEBIT', accountCode: '2011101', functionalAmountMinor: 50000, dimensions: {} },
        { side: 'CREDIT', accountCode: '6111101', functionalAmountMinor: 50000, dimensions: {} },
        { side: 'DEBIT', accountCode: '9511101', functionalAmountMinor: 10000, dimensions: {} },
        { side: 'CREDIT', accountCode: '7911101', functionalAmountMinor: 10000, dimensions: {} }
      ]
    },
    document: {
      id: 'doc-pe-03',
      tenantId: '01',
      rawPayloadRef: 'raw/pe-03.xml',
      revision: 1,
      jurisdictionCode: 'PE',
      documentTypeCode: 'INVOICE',
      documentTypeVersion: 1,
      perspective: 'RECEIVED',
      series: 'F002',
      number: '00000456',
      issueDate: '2026-09-14',
      dueDate: '2026-10-14',
      currency: 'PEN',
      parties: [
        { role: 'ISSUER', ...SAMPLE_PARTIES.logistica },
        { role: 'RECEIVER', ...TENANT_01 }
      ],
      fields: {},
      lines: [
        {
          lineNo: 1,
          itemCode: 'MER-002',
          description: 'Carpa para 2 personas',
          quantity: 10,
          unitPriceMinor: 5000,
          amountMinor: 50000,
          operationTypeCode: 'MERCHANDISE_PURCHASE',
          taxes: [{ taxCode: 'VAT', baseMinor: 50000, rateBp: 1800, amountMinor: 9000 }],
          fields: {}
        },
        {
          lineNo: 2,
          itemCode: 'SRV-FLT',
          description: 'Flete Lima - Cusco',
          quantity: 1,
          unitPriceMinor: 10000,
          amountMinor: 10000,
          operationTypeCode: 'TRANSPORT_EXPENSE',
          taxes: [{ taxCode: 'VAT', baseMinor: 10000, rateBp: 1800, amountMinor: 1800 }],
          fields: { costCenter: 'CC-LOGISTICA' }
        }
      ],
      taxes: [{ taxCode: 'VAT', baseMinor: 60000, rateBp: 1800, amountMinor: 10800 }],
      withholdings: [],
      references: [],
      totals: {
        netMinor: 60000,
        taxMinor: 10800,
        withheldMinor: 0,
        totalMinor: 70800,
        payableMinor: 70800
      },
      operationTypeCode: 'PURCHASE_MIXED',
      extraction: {
        sourceFormat: 'XML',
        extractorId: 'ubl-parser',
        documentTypeConfidence: 1.0,
        fieldProvenance: []
      }
    }
  },

  // 4. Nota de crédito recibida - Devolución
  {
    id: 'PE-04-PURCHASE-RETURN',
    title: 'Nota de crédito recibida - Devolución compra (S/ 236.00)',
    expected: {
      templateId: 'PE.RECEIVED.CREDIT_NOTE.PURCHASE_RETURN',
      lines: [
        { side: 'DEBIT', accountCode: '4212101', functionalAmountMinor: 23600, dimensions: {} },
        { side: 'CREDIT', accountCode: '6011101', functionalAmountMinor: 20000, dimensions: {} },
        { side: 'CREDIT', accountCode: '4011101', functionalAmountMinor: 3600, dimensions: {} },
        { side: 'DEBIT', accountCode: '6111101', functionalAmountMinor: 20000, dimensions: {} },
        { side: 'CREDIT', accountCode: '2011101', functionalAmountMinor: 20000, dimensions: {} }
      ]
    },
    document: {
      id: 'doc-pe-04',
      tenantId: '01',
      rawPayloadRef: 'raw/pe-04.xml',
      revision: 1,
      jurisdictionCode: 'PE',
      documentTypeCode: 'CREDIT_NOTE',
      documentTypeVersion: 1,
      perspective: 'RECEIVED',
      series: 'FC01',
      number: '00000011',
      issueDate: '2026-09-15',
      dueDate: null,
      currency: 'PEN',
      parties: [
        { role: 'ISSUER', ...SAMPLE_PARTIES.distribuidora },
        { role: 'RECEIVER', ...TENANT_01 }
      ],
      fields: { creditNoteReason: '07' },
      lines: [
        {
          lineNo: 1,
          itemCode: 'MER-001',
          description: 'Devolución: mochila de trekking 40 L',
          quantity: 4,
          unitPriceMinor: 5000,
          amountMinor: 20000,
          operationTypeCode: 'PURCHASE_RETURN',
          taxes: [{ taxCode: 'VAT', baseMinor: 20000, rateBp: 1800, amountMinor: 3600 }],
          fields: {}
        }
      ],
      taxes: [{ taxCode: 'VAT', baseMinor: 20000, rateBp: 1800, amountMinor: 3600 }],
      withholdings: [],
      references: [
        {
          documentTypeCode: 'INVOICE',
          series: 'F001',
          number: '00000123',
          issueDate: '2026-09-10',
          relation: 'MODIFIES'
        }
      ],
      totals: {
        netMinor: 20000,
        taxMinor: 3600,
        withheldMinor: 0,
        totalMinor: 23600,
        payableMinor: 23600
      },
      operationTypeCode: 'PURCHASE_RETURN',
      extraction: {
        sourceFormat: 'XML',
        extractorId: 'ubl-parser',
        documentTypeConfidence: 1.0,
        fieldProvenance: []
      }
    }
  },

  // 5. Recibo por honorarios - Servicios profesionales
  {
    id: 'PE-05-PROFESSIONAL-FEES',
    title: 'Recibo por honorarios - Asesoría contable (S/ 1,500.00)',
    expected: {
      templateId: 'PE.RECEIVED.PROFESSIONAL_FEE_RECEIPT.PROFESSIONAL_FEES',
      lines: [
        { side: 'DEBIT', accountCode: '6321101', functionalAmountMinor: 150000, dimensions: {} },
        { side: 'CREDIT', accountCode: '4017201', functionalAmountMinor: 12000, dimensions: {} },
        { side: 'CREDIT', accountCode: '4241101', functionalAmountMinor: 138000, dimensions: {} },
        { side: 'DEBIT', accountCode: '9411101', functionalAmountMinor: 150000, dimensions: {} },
        { side: 'CREDIT', accountCode: '7911101', functionalAmountMinor: 150000, dimensions: {} }
      ]
    },
    document: {
      id: 'doc-pe-05',
      tenantId: '01',
      rawPayloadRef: 'raw/pe-05.json',
      revision: 1,
      jurisdictionCode: 'PE',
      documentTypeCode: 'PROFESSIONAL_FEE_RECEIPT',
      documentTypeVersion: 1,
      perspective: 'RECEIVED',
      series: 'E001',
      number: '45',
      issueDate: '2026-09-20',
      dueDate: null,
      currency: 'PEN',
      parties: [
        { role: 'ISSUER', ...SAMPLE_PARTIES.asesor },
        { role: 'RECEIVER', ...TENANT_01 }
      ],
      fields: {
        serviceDescription: 'Asesoría contable del mes de setiembre',
        costCenter: 'CC-ADMIN'
      },
      lines: [],
      taxes: [],
      withholdings: [
        { withholdingCode: 'INCOME_TAX_FEES', baseMinor: 150000, rateBp: 800, amountMinor: 12000 }
      ],
      references: [],
      totals: {
        netMinor: 150000,
        taxMinor: 0,
        withheldMinor: 12000,
        totalMinor: 150000,
        payableMinor: 138000
      },
      operationTypeCode: 'PROFESSIONAL_FEES',
      extraction: {
        sourceFormat: 'JSON',
        extractorId: 'json-api',
        documentTypeConfidence: 1.0,
        fieldProvenance: []
      }
    }
  },

  // 6. Resumen de planilla mensual
  {
    id: 'PE-06-PAYROLL',
    title: 'Resumen de planilla - Sueldos y cargas (S/ 10,000.00)',
    expected: {
      templateId: 'PE.INTERNAL.PAYROLL_SUMMARY.PAYROLL',
      lines: [
        { side: 'DEBIT', accountCode: '6211101', functionalAmountMinor: 1000000, dimensions: {} },
        { side: 'DEBIT', accountCode: '6271101', functionalAmountMinor: 90000, dimensions: {} },
        { side: 'CREDIT', accountCode: '4031101', functionalAmountMinor: 90000, dimensions: {} },
        { side: 'CREDIT', accountCode: '4032101', functionalAmountMinor: 52000, dimensions: {} },
        { side: 'CREDIT', accountCode: '4171101', functionalAmountMinor: 78000, dimensions: {} },
        { side: 'CREDIT', accountCode: '4017301', functionalAmountMinor: 15000, dimensions: {} },
        { side: 'CREDIT', accountCode: '4111101', functionalAmountMinor: 855000, dimensions: {} },
        { side: 'DEBIT', accountCode: '9411101', functionalAmountMinor: 1090000, dimensions: {} },
        { side: 'CREDIT', accountCode: '7911101', functionalAmountMinor: 1090000, dimensions: {} }
      ]
    },
    document: {
      id: 'doc-pe-06',
      tenantId: '01',
      rawPayloadRef: 'raw/pe-06.json',
      revision: 1,
      jurisdictionCode: 'PE',
      documentTypeCode: 'PAYROLL_SUMMARY',
      documentTypeVersion: 1,
      perspective: 'INTERNAL',
      series: 'PLA',
      number: '2026-09',
      issueDate: '2026-09-30',
      dueDate: null,
      currency: 'PEN',
      parties: [
        { role: 'ISSUER', ...TENANT_01 }
      ],
      fields: {
        payrollPeriod: '2026-09',
        costCenter: 'CC-ADMIN',
        grossSalariesMinor: 1000000,
        employerHealthMinor: 90000,
        publicPensionMinor: 52000,
        privatePensionMinor: 78000,
        incomeTaxWithheldMinor: 15000,
        netPayableMinor: 855000
      },
      lines: [],
      taxes: [],
      withholdings: [],
      references: [],
      totals: {
        netMinor: 1000000,
        taxMinor: 0,
        withheldMinor: 145000,
        totalMinor: 1000000,
        payableMinor: 855000
      },
      operationTypeCode: 'PAYROLL',
      extraction: {
        sourceFormat: 'JSON',
        extractorId: 'json-api',
        documentTypeConfidence: 1.0,
        fieldProvenance: []
      }
    }
  },

  // 7. Factura emitida - Venta de mercadería
  {
    id: 'PE-07-MERCHANDISE-SALE',
    title: 'Factura emitida - Venta de mercaderías (S/ 2,360.00)',
    expected: {
      templateId: 'PE.ISSUED.INVOICE.MERCHANDISE_SALE',
      lines: [
        { side: 'DEBIT', accountCode: '1212101', functionalAmountMinor: 236000, dimensions: {} },
        { side: 'CREDIT', accountCode: '4011101', functionalAmountMinor: 36000, dimensions: {} },
        { side: 'CREDIT', accountCode: '7012101', functionalAmountMinor: 200000, dimensions: {} }
      ]
    },
    document: {
      id: 'doc-pe-07',
      tenantId: '01',
      rawPayloadRef: 'raw/pe-07.xml',
      revision: 1,
      jurisdictionCode: 'PE',
      documentTypeCode: 'INVOICE',
      documentTypeVersion: 1,
      perspective: 'ISSUED',
      series: 'F001',
      number: '00000789',
      issueDate: '2026-09-12',
      dueDate: '2026-09-27',
      currency: 'PEN',
      parties: [
        { role: 'ISSUER', ...TENANT_01 },
        { role: 'RECEIVER', ...SAMPLE_PARTIES.hoteles }
      ],
      fields: {},
      lines: [
        {
          lineNo: 1,
          itemCode: 'MER-100',
          description: 'Mochilas de trekking 40 L (venta)',
          quantity: 20,
          unitPriceMinor: 10000,
          amountMinor: 200000,
          operationTypeCode: 'MERCHANDISE_SALE',
          taxes: [{ taxCode: 'VAT', baseMinor: 200000, rateBp: 1800, amountMinor: 36000 }],
          fields: {}
        }
      ],
      taxes: [{ taxCode: 'VAT', baseMinor: 200000, rateBp: 1800, amountMinor: 36000 }],
      withholdings: [],
      references: [],
      totals: {
        netMinor: 200000,
        taxMinor: 36000,
        withheldMinor: 0,
        totalMinor: 236000,
        payableMinor: 236000
      },
      operationTypeCode: 'MERCHANDISE_SALE',
      extraction: {
        sourceFormat: 'XML',
        extractorId: 'ubl-parser',
        documentTypeConfidence: 1.0,
        fieldProvenance: []
      }
    }
  },

  // 8. Extracto bancario - Comisiones bancarias
  {
    id: 'PE-08-BANK-CHARGES',
    title: 'Extracto bancario - Gastos y comisiones (S/ 15.00)',
    expected: {
      templateId: 'PE.RECEIVED.BANK_STATEMENT.BANK_CHARGES',
      lines: [
        { side: 'DEBIT', accountCode: '6391101', functionalAmountMinor: 1500, dimensions: {} },
        { side: 'CREDIT', accountCode: '104101', functionalAmountMinor: 1500, dimensions: {} },
        { side: 'DEBIT', accountCode: '9411101', functionalAmountMinor: 1500, dimensions: {} },
        { side: 'CREDIT', accountCode: '7911101', functionalAmountMinor: 1500, dimensions: {} }
      ]
    },
    document: {
      id: 'doc-pe-08',
      tenantId: '01',
      rawPayloadRef: 'raw/pe-08.csv',
      revision: 1,
      jurisdictionCode: 'PE',
      documentTypeCode: 'BANK_STATEMENT',
      documentTypeVersion: 1,
      perspective: 'RECEIVED',
      series: 'EXT',
      number: '2026-09-30',
      issueDate: '2026-09-30',
      dueDate: null,
      currency: 'PEN',
      parties: [
        { role: 'BANK', ...SAMPLE_PARTIES.banco },
        { role: 'RECEIVER', ...TENANT_01 }
      ],
      fields: {
        bankAccountCode: 'BCP-MN',
        costCenter: 'CC-ADMIN'
      },
      lines: [
        {
          lineNo: 1,
          description: 'Mantenimiento de cuenta corriente',
          amountMinor: 1500,
          operationTypeCode: 'BANK_CHARGES',
          taxes: [],
          fields: { movementType: 'CHARGE' }
        }
      ],
      taxes: [],
      withholdings: [],
      references: [],
      totals: {
        netMinor: 1500,
        taxMinor: 0,
        withheldMinor: 0,
        totalMinor: 1500,
        payableMinor: 1500
      },
      operationTypeCode: 'BANK_CHARGES',
      extraction: {
        sourceFormat: 'CSV',
        extractorId: 'bank-csv-parser',
        documentTypeConfidence: 1.0,
        fieldProvenance: []
      }
    }
  },

  // 9. Documento interno - Depreciación de activos fijos
  {
    id: 'PE-09-DEPRECIATION',
    title: 'Documento interno - Depreciación de activos fijos (S/ 350.00)',
    expected: {
      templateId: 'PE.INTERNAL.INTERNAL_DOCUMENT.DEPRECIATION',
      lines: [
        { side: 'DEBIT', accountCode: '6814101', functionalAmountMinor: 35000, dimensions: {} },
        { side: 'CREDIT', accountCode: '3913101', functionalAmountMinor: 35000, dimensions: {} },
        { side: 'DEBIT', accountCode: '9411101', functionalAmountMinor: 35000, dimensions: {} },
        { side: 'CREDIT', accountCode: '7911101', functionalAmountMinor: 35000, dimensions: {} }
      ]
    },
    document: {
      id: 'doc-pe-09',
      tenantId: '01',
      rawPayloadRef: 'raw/pe-09.form',
      revision: 1,
      jurisdictionCode: 'PE',
      documentTypeCode: 'INTERNAL_DOCUMENT',
      documentTypeVersion: 1,
      perspective: 'INTERNAL',
      series: 'DEP',
      number: '2026-09',
      issueDate: '2026-09-30',
      dueDate: null,
      currency: 'PEN',
      parties: [
        { role: 'ISSUER', ...TENANT_01 }
      ],
      fields: {
        concept: 'Depreciación de activo fijo – setiembre 2026',
        costCenter: 'CC-ADMIN'
      },
      lines: [
        { lineNo: 1, description: 'Equipos de cómputo', amountMinor: 25000, taxes: [], fields: { assetClass: 'IT_EQUIPMENT' } },
        { lineNo: 2, description: 'Muebles y enseres', amountMinor: 10000, taxes: [], fields: { assetClass: 'FURNITURE' } }
      ],
      taxes: [],
      withholdings: [],
      references: [],
      totals: {
        netMinor: 35000,
        taxMinor: 0,
        withheldMinor: 0,
        totalMinor: 35000,
        payableMinor: 0
      },
      operationTypeCode: 'DEPRECIATION',
      extraction: {
        sourceFormat: 'FORM',
        extractorId: 'manual-entry',
        documentTypeConfidence: 1.0,
        fieldProvenance: []
      }
    }
  },

  // 10. Caso negativo: Resumen de planilla sin costCenter
  {
    id: 'PE-10-PAYROLL-NO-CC',
    title: 'Resumen de planilla - Sin centro de costo (Negativo: MISSING_INPUT)',
    expected: {
      templateId: 'PE.INTERNAL.PAYROLL_SUMMARY.PAYROLL',
      pending: ['MISSING_INPUT']
    },
    document: {
      id: 'doc-pe-10',
      tenantId: '01',
      rawPayloadRef: 'raw/pe-10.json',
      revision: 1,
      jurisdictionCode: 'PE',
      documentTypeCode: 'PAYROLL_SUMMARY',
      documentTypeVersion: 1,
      perspective: 'INTERNAL',
      series: 'PLA',
      number: '2026-09-NEG',
      issueDate: '2026-09-30',
      dueDate: null,
      currency: 'PEN',
      parties: [
        { role: 'ISSUER', ...TENANT_01 }
      ],
      fields: {
        payrollPeriod: '2026-09',
        // costCenter omitido intencionalmente
        grossSalariesMinor: 1000000,
        employerHealthMinor: 90000,
        publicPensionMinor: 52000,
        privatePensionMinor: 78000,
        incomeTaxWithheldMinor: 15000,
        netPayableMinor: 855000
      },
      lines: [],
      taxes: [],
      withholdings: [],
      references: [],
      totals: {
        netMinor: 1000000,
        taxMinor: 0,
        withheldMinor: 145000,
        totalMinor: 1000000,
        payableMinor: 855000
      },
      operationTypeCode: 'PAYROLL',
      extraction: {
        sourceFormat: 'JSON',
        extractorId: 'json-api',
        documentTypeConfidence: 1.0,
        fieldProvenance: []
      }
    }
  },

  // 11. Factura recibida sin clasificar - Mercadería + Flete (T075 / SDD §21.4)
  {
    id: 'PE-11-UNCLASSIFIED-MIXED-PURCHASE',
    title: 'Factura recibida sin clasificar - Mercadería + Flete (S/ 708.00)',
    expected: {
      templateId: 'PE.RECEIVED.INVOICE.PURCHASE_MIXED',
      operationTypeCode: 'PURCHASE_MIXED'
    },
    document: {
      id: 'doc-pe-11',
      tenantId: '01',
      rawPayloadRef: 'raw/pe-11.xml',
      revision: 1,
      jurisdictionCode: 'PE',
      documentTypeCode: 'INVOICE',
      documentTypeVersion: 1,
      perspective: 'RECEIVED',
      series: 'F001',
      number: '00000088',
      issueDate: '2026-09-15',
      dueDate: '2026-10-15',
      currency: 'PEN',
      parties: [
        { role: 'ISSUER', ...SAMPLE_PARTIES.distribuidora },
        { role: 'RECEIVER', ...TENANT_01 }
      ],
      lines: [
        {
          lineNo: 1,
          itemCode: 'MER-001',
          description: 'Mercaderías manufacturadas diversas',
          quantity: 50,
          unitPriceMinor: 1000,
          amountMinor: 50000,
          netMinor: 50000,
          taxMinor: 9000,
          totalMinor: 59000,
          operationTypeCode: null,
          taxes: [
            { taxCode: 'VAT', baseMinor: 50000, rateBp: 1800, amountMinor: 9000 }
          ]
        },
        {
          lineNo: 2,
          itemCode: 'SER-002',
          description: 'Servicio de flete terrestre',
          quantity: 1,
          unitPriceMinor: 10000,
          amountMinor: 10000,
          netMinor: 10000,
          taxMinor: 1800,
          totalMinor: 11800,
          operationTypeCode: null,
          fields: {
            costCenter: 'CC-LOGISTICA'
          },
          taxes: [
            { taxCode: 'VAT', baseMinor: 10000, rateBp: 1800, amountMinor: 1800 }
          ]
        }
      ],
      taxes: [
        { taxCode: 'VAT', baseMinor: 60000, rateBp: 1800, amountMinor: 10800 }
      ],
      withholdings: [],
      references: [],
      totals: {
        netMinor: 60000,
        taxMinor: 10800,
        withheldMinor: 0,
        totalMinor: 70800,
        payableMinor: 70800
      },
      operationTypeCode: null,
      extraction: {
        sourceFormat: 'XML',
        extractorId: 'ubl-parser',
        documentTypeConfidence: 1.0,
        fieldProvenance: []
      }
    }
  },

  // 12. Factura de cómputo sin clasificar (regla propuesta pendiente)
  {
    id: 'PE-12-UNCLASSIFIED-COMPUTER-EQUIPMENT',
    title: 'Factura recibida sin clasificar - Equipos de cómputo (S/ 2,950.00)',
    expected: {
      pending: ['CLASSIFICATION_REQUIRED']
    },
    document: {
      id: 'doc-pe-12',
      tenantId: '01',
      rawPayloadRef: 'raw/pe-12.xml',
      revision: 1,
      jurisdictionCode: 'PE',
      documentTypeCode: 'INVOICE',
      documentTypeVersion: 1,
      perspective: 'RECEIVED',
      series: 'F001',
      number: '00000099',
      issueDate: '2026-09-18',
      dueDate: '2026-10-18',
      currency: 'PEN',
      parties: [
        { role: 'ISSUER', ...SAMPLE_PARTIES.tecno },
        { role: 'RECEIVER', ...TENANT_01 }
      ],
      lines: [
        {
          lineNo: 1,
          itemCode: 'ACT-001',
          description: 'Equipos de cómputo portátiles para oficina',
          quantity: 1,
          unitPriceMinor: 250000,
          amountMinor: 250000,
          netMinor: 250000,
          taxMinor: 45000,
          totalMinor: 295000,
          operationTypeCode: null,
          taxes: [
            { taxCode: 'VAT', baseMinor: 250000, rateBp: 1800, amountMinor: 45000 }
          ]
        }
      ],
      taxes: [
        { taxCode: 'VAT', baseMinor: 250000, rateBp: 1800, amountMinor: 45000 }
      ],
      withholdings: [],
      references: [],
      totals: {
        netMinor: 250000,
        taxMinor: 45000,
        withheldMinor: 0,
        totalMinor: 295000,
        payableMinor: 295000
      },
      operationTypeCode: null,
      extraction: {
        sourceFormat: 'XML',
        extractorId: 'ubl-parser',
        documentTypeConfidence: 1.0,
        fieldProvenance: []
      }
    }
  },

  // 13. Extracto bancario con una comisión sin clasificar
  {
    id: 'PE-13-UNCLASSIFIED-BANK-STATEMENT',
    title: 'Extracto bancario sin clasificar - Comisión por mantenimiento (S/ 15.00)',
    expected: {
      templateId: 'PE.RECEIVED.BANK_STATEMENT.BANK_CHARGES',
      operationTypeCode: 'BANK_CHARGES'
    },
    document: {
      id: 'doc-pe-13',
      tenantId: '01',
      rawPayloadRef: 'raw/pe-13.csv',
      revision: 1,
      jurisdictionCode: 'PE',
      documentTypeCode: 'BANK_STATEMENT',
      documentTypeVersion: 1,
      perspective: 'RECEIVED',
      series: 'EXT',
      number: '2026-09-15',
      issueDate: '2026-09-15',
      dueDate: null,
      currency: 'PEN',
      parties: [
        { role: 'BANK', ...SAMPLE_PARTIES.banco },
        { role: 'RECEIVER', ...TENANT_01 }
      ],
      fields: {
        bankAccountCode: 'BCP-MN',
        costCenter: 'CC-ADMIN'
      },
      lines: [
        {
          lineNo: 1,
          description: 'Mantenimiento mensual de cuenta corriente',
          amountMinor: 1500,
          operationTypeCode: null,
          fields: {
            movementType: 'CHARGE'
          },
          taxes: []
        }
      ],
      taxes: [],
      withholdings: [],
      references: [],
      totals: {
        netMinor: 1500,
        taxMinor: 0,
        withheldMinor: 0,
        totalMinor: 1500,
        payableMinor: 1500
      },
      operationTypeCode: null,
      extraction: {
        sourceFormat: 'CSV',
        extractorId: 'bank-csv-parser',
        documentTypeConfidence: 1.0,
        fieldProvenance: []
      }
    }
  },

  // 14. Caso negativo: Nota de crédito sin comprobante de referencia
  {
    id: 'PE-14-CREDIT-NOTE-NO-REFERENCE',
    title: 'Nota de crédito recibida sin referencia (Error de esquema: SCHEMA_INVALID)',
    expected: {
      pending: ['SCHEMA_INVALID']
    },
    document: {
      id: 'doc-pe-14',
      tenantId: '01',
      rawPayloadRef: 'raw/pe-14.xml',
      revision: 1,
      jurisdictionCode: 'PE',
      documentTypeCode: 'CREDIT_NOTE',
      documentTypeVersion: 1,
      perspective: 'RECEIVED',
      series: 'FC01',
      number: '00000999',
      issueDate: '2026-09-15',
      dueDate: null,
      currency: 'PEN',
      parties: [
        { role: 'ISSUER', ...SAMPLE_PARTIES.distribuidora },
        { role: 'RECEIVER', ...TENANT_01 }
      ],
      fields: { creditNoteReason: '07' },
      lines: [
        {
          lineNo: 1,
          itemCode: 'MER-001',
          description: 'Devolución de mercadería sin comprobante que modifica',
          quantity: 1,
          unitPriceMinor: 5000,
          amountMinor: 5000,
          operationTypeCode: 'PURCHASE_RETURN',
          taxes: [{ taxCode: 'VAT', baseMinor: 5000, rateBp: 1800, amountMinor: 900 }],
          fields: {}
        }
      ],
      taxes: [{ taxCode: 'VAT', baseMinor: 5000, rateBp: 1800, amountMinor: 900 }],
      withholdings: [],
      references: [], // Intencionalmente sin referencia para disparar SCHEMA_INVALID
      totals: {
        netMinor: 5000,
        taxMinor: 900,
        withheldMinor: 0,
        totalMinor: 5900,
        payableMinor: 5900
      },
      operationTypeCode: 'PURCHASE_RETURN',
      extraction: {
        sourceFormat: 'XML',
        extractorId: 'ubl-parser',
        documentTypeConfidence: 1.0,
        fieldProvenance: []
      }
    }
  },

  // 15. Factura en moneda extranjera (USD) con tipo de cambio sugerido
  {
    id: 'PE-15-INVOICE-USD',
    title: 'Factura recibida en USD ($1,180.00) - Conversión FX a S/ 3.745',
    suggestedFxRateMilli: 3745,
    expected: {
      templateId: 'PE.RECEIVED.INVOICE.MERCHANDISE_PURCHASE',
      operationTypeCode: 'MERCHANDISE_PURCHASE',
      fxRateMilli: 3745,
      lines: [
        { side: 'DEBIT', accountCode: '6011101', functionalAmountMinor: 374500 },
        { side: 'DEBIT', accountCode: '4011101', functionalAmountMinor: 67410 },
        { side: 'CREDIT', accountCode: '4212101', functionalAmountMinor: 441910 },
        { side: 'DEBIT', accountCode: '2011101', functionalAmountMinor: 374500 },
        { side: 'CREDIT', accountCode: '6111101', functionalAmountMinor: 374500 }
      ]
    },
    document: {
      id: 'doc-pe-15',
      tenantId: '01',
      rawPayloadRef: 'raw/pe-15.xml',
      revision: 1,
      jurisdictionCode: 'PE',
      documentTypeCode: 'INVOICE',
      documentTypeVersion: 1,
      perspective: 'RECEIVED',
      series: 'F001',
      number: '00004567',
      issueDate: '2026-09-15',
      dueDate: '2026-10-15',
      currency: 'USD',
      parties: [
        { role: 'ISSUER', ...SAMPLE_PARTIES.distribuidora },
        { role: 'RECEIVER', ...TENANT_01 }
      ],
      lines: [
        {
          lineNo: 1,
          itemCode: 'MER-001',
          description: 'Mochila técnica de alta montaña (importación)',
          quantity: 10,
          unitPriceMinor: 10000,
          amountMinor: 100000,
          operationTypeCode: 'MERCHANDISE_PURCHASE',
          taxes: [
            { taxCode: 'VAT', baseMinor: 100000, rateBp: 1800, amountMinor: 18000 }
          ]
        }
      ],
      taxes: [
        { taxCode: 'VAT', baseMinor: 100000, rateBp: 1800, amountMinor: 18000 }
      ],
      withholdings: [],
      references: [],
      totals: {
        netMinor: 100000,
        taxMinor: 18000,
        withheldMinor: 0,
        totalMinor: 118000,
        payableMinor: 118000
      },
      operationTypeCode: 'MERCHANDISE_PURCHASE',
      extraction: {
        sourceFormat: 'XML',
        extractorId: 'ubl-parser',
        documentTypeConfidence: 1.0,
        fieldProvenance: []
      }
    }
  },

  // 16. Caso negativo: Guía de remisión electrónica (tipo no contable)
  {
    id: 'PE-16-DISPATCH-GUIDE',
    title: 'Guía de remisión electrónica (No genera asiento: DOCUMENT_TYPE_NOT_ACCOUNTABLE)',
    expected: {
      pending: ['DOCUMENT_TYPE_NOT_ACCOUNTABLE']
    },
    document: {
      id: 'doc-pe-16',
      tenantId: '01',
      rawPayloadRef: 'raw/pe-16.xml',
      revision: 1,
      jurisdictionCode: 'PE',
      documentTypeCode: 'DISPATCH_GUIDE',
      documentTypeVersion: 1,
      perspective: 'RECEIVED',
      series: 'T001',
      number: '00000010',
      issueDate: '2026-09-15',
      dueDate: null,
      currency: 'PEN',
      parties: [
        { role: 'ISSUER', ...SAMPLE_PARTIES.distribuidora },
        { role: 'RECEIVER', ...TENANT_01 }
      ],
      fields: {
        transportReason: 'VENTA'
      },
      lines: [
        {
          lineNo: 1,
          description: 'Mochila de trekking 40 L para traslado a almacén',
          quantity: 20
        }
      ],
      taxes: [],
      withholdings: [],
      references: [],
      totals: null,
      operationTypeCode: null,
      extraction: {
        sourceFormat: 'XML',
        extractorId: 'ubl-parser',
        documentTypeConfidence: 1.0,
        fieldProvenance: []
      }
    }
  }
];
