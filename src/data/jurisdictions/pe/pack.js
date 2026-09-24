/**
 * Paquete de Jurisdicción para Perú (PE).
 * Conforme a SDD v3.0 §21 y data-model.md §2, §9.
 */

export const pePackHeader = {
  code: 'PE',
  version: 1,
  name: 'Perú',
  effectiveFrom: '2020-01-01',
  defaultFunctionalCurrency: 'PEN',
  referenceChartOfAccounts: 'PCGE',
  roundingToleranceMinor: 1,
  extractionConfidenceThreshold: 0.85
};

export const peFiscalIdTypes = [
  {
    code: 'RUC',
    name: 'Registro Único de Contribuyentes',
    pattern: '^(10|15|17|20)\\d{9}$',
    checkDigit: {
      algorithm: 'MOD11',
      weights: [5, 4, 3, 2, 7, 6, 5, 4, 3, 2],
      map: { 10: 0, 11: 1 }
    }
  },
  { code: 'DNI', name: 'Documento Nacional de Identidad', pattern: '^\\d{8}$' },
  { code: 'CE', name: 'Carné de Extranjería', pattern: '^[A-Z0-9]{9,12}$' }
];

export const peTaxes = [
  {
    code: 'VAT',
    name: 'Impuesto General a las Ventas (IGV)',
    kind: 'VALUE_ADDED',
    rates: [
      { rateBp: 1800, effectiveFrom: '2011-03-01', effectiveTo: null }
    ],
    recoverableAccountRole: 'VAT_CREDIT',
    payableAccountRole: 'VAT_PAYABLE'
  },
  {
    code: 'INCOME_TAX_FEES',
    name: 'Retención de Renta de 4ta Categoría',
    kind: 'WITHHOLDING',
    rates: [
      { rateBp: 800, effectiveFrom: '2011-01-01', effectiveTo: null }
    ],
    payableAccountRole: 'INCOME_TAX_WITHHELD_PAYABLE_4TH'
  },
  {
    code: 'VAT_WITHHOLDING',
    name: 'Retención de IGV',
    kind: 'WITHHOLDING',
    rates: [
      { rateBp: 300, effectiveFrom: '2014-03-01', effectiveTo: null }
    ]
  },
  {
    code: 'VAT_PERCEPTION',
    name: 'Percepción de IGV',
    kind: 'PERCEPTION',
    rates: [
      { rateBp: 200, effectiveFrom: '2014-01-01', effectiveTo: null }
    ],
    recoverableAccountRole: 'VAT_CREDIT'
  },
  {
    code: 'EXCISE',
    name: 'Impuesto Selectivo al Consumo (ISC)',
    kind: 'EXCISE',
    rates: [
      { rateBp: 1000, effectiveFrom: '2020-01-01', effectiveTo: null }
    ],
    nonRecoverableTreatment: 'ADD_TO_COST'
  },
  {
    code: 'BAG_TAX',
    name: 'Impuesto a las Bolsas Plásticas (ICBPER)',
    kind: 'OTHER',
    rates: [
      { rateBp: 50, effectiveFrom: '2020-01-01', effectiveTo: null }
    ],
    nonRecoverableTreatment: 'EXPENSE'
  },
  {
    code: 'SPOT',
    name: 'Detracción (SPOT)',
    kind: 'DEFERRED_PAYMENT',
    rates: [
      { rateBp: 1000, effectiveFrom: '2020-01-01', effectiveTo: null }
    ]
  }
];

export const peOperationTypes = [
  { code: 'MERCHANDISE_PURCHASE', name: 'Compra de mercadería', description: 'Adquisición de existencias comerciales para reventa', allowedPerspectives: ['RECEIVED'] },
  { code: 'RAW_MATERIAL_PURCHASE', name: 'Compra de materia prima', description: 'Insumos para producción', allowedPerspectives: ['RECEIVED'] },
  { code: 'SUPPLIES_PURCHASE', name: 'Compra de suministros', description: 'Materiales auxiliares y repuestos', allowedPerspectives: ['RECEIVED'] },
  { code: 'FIXED_ASSET_ACQUISITION', name: 'Adquisición de activo fijo', description: 'Bienes de capital e inversión', allowedPerspectives: ['RECEIVED'] },
  { code: 'SERVICE_EXPENSE', name: 'Gasto por servicios prestados por terceros', description: 'Servicios de gestión, mantenimiento u operación', allowedPerspectives: ['RECEIVED'] },
  { code: 'UTILITIES_EXPENSE', name: 'Servicios básicos', description: 'Luz, agua, telefonía, internet', allowedPerspectives: ['RECEIVED'] },
  { code: 'TRANSPORT_EXPENSE', name: 'Transporte y flete', description: 'Fletes, envíos y movilidad', allowedPerspectives: ['RECEIVED'] },
  { code: 'RENT_EXPENSE', name: 'Arrendamiento', description: 'Alquiler de locales o equipos', allowedPerspectives: ['RECEIVED'] },
  { code: 'PROFESSIONAL_FEES', name: 'Honorarios profesionales', description: 'Servicios de personas naturales con recibo de honorarios', allowedPerspectives: ['RECEIVED'] },
  { code: 'IMPORT', name: 'Importación definitiva', description: 'Nacionalización aduanera de bienes', allowedPerspectives: ['RECEIVED'] },
  { code: 'PURCHASE_MIXED', name: 'Compras mixtas', description: 'Operación con líneas de distinta naturaleza contable', allowedPerspectives: ['RECEIVED'] },
  { code: 'PURCHASE_RETURN', name: 'Devolución de compras', description: 'Devolución de mercaderías compradas', allowedPerspectives: ['RECEIVED'] },
  { code: 'PURCHASE_PRICE_ADJUSTMENT', name: 'Ajuste de precio en compras', description: 'Descuentos, rebajas o correcciones posteriores', allowedPerspectives: ['RECEIVED'] },
  { code: 'MERCHANDISE_SALE', name: 'Venta de mercadería', description: 'Comercialización de bienes del giro', allowedPerspectives: ['ISSUED'] },
  { code: 'SERVICE_SALE', name: 'Venta de servicios', description: 'Prestación de servicios a clientes', allowedPerspectives: ['ISSUED'] },
  { code: 'SALES_RETURN', name: 'Devolución sobre ventas', description: 'Aceptación de devoluciones de clientes', allowedPerspectives: ['ISSUED'] },
  { code: 'PAYROLL', name: 'Planilla de remuneraciones', description: 'Sueldos, cargas sociales y retenciones laborales', allowedPerspectives: ['INTERNAL'] },
  { code: 'DEPRECIATION', name: 'Depreciación y amortización', description: 'Desgaste sistemático de activos', allowedPerspectives: ['INTERNAL'] },
  { code: 'PROVISION', name: 'Provisiones del ejercicio', description: 'Estimaciones de gastos y contingencias', allowedPerspectives: ['INTERNAL'] },
  { code: 'FX_DIFFERENCE', name: 'Diferencia de cambio', description: 'Ganancia o pérdida por fluctuación cambiaria', allowedPerspectives: ['INTERNAL'] },
  { code: 'BANK_CHARGES', name: 'Gastos bancarios', description: 'Comisiones, portes y mantenimiento financiero', allowedPerspectives: ['RECEIVED', 'INTERNAL'] },
  { code: 'SUPPLIER_PAYMENT', name: 'Pago a proveedores', description: 'Cancelación de pasivos comerciales', allowedPerspectives: ['INTERNAL'] },
  { code: 'CUSTOMER_COLLECTION', name: 'Cobranza a clientes', description: 'Liquidación de cuentas por cobrar comerciales', allowedPerspectives: ['INTERNAL'] },
  { code: 'WITHHOLDING_SUFFERED', name: 'Retención sufrida', description: 'Retención tributaria efectuada por cliente o agente', allowedPerspectives: ['ISSUED', 'INTERNAL'] },
  { code: 'PERCEPTION_SUFFERED', name: 'Percepción sufrida', description: 'Percepción de IGV cobrada por proveedor', allowedPerspectives: ['RECEIVED', 'INTERNAL'] }
];

export const peMixedOperationTypes = {
  RECEIVED: 'PURCHASE_MIXED',
  ISSUED: null,
  INTERNAL: null
};

export const peAccountRoles = [
  { code: 'SUPPLIERS_PAYABLE', name: 'Proveedores por pagar', description: 'Comprobantes por pagar a terceros', suggestedAccountCode: '4212' },
  { code: 'CUSTOMERS_RECEIVABLE', name: 'Clientes por cobrar', description: 'Facturas y boletas por cobrar', suggestedAccountCode: '1212' },
  { code: 'VAT_CREDIT', name: 'IGV crédito fiscal', description: 'Crédito tributario de IGV por compras', suggestedAccountCode: '40111' },
  { code: 'VAT_PAYABLE', name: 'IGV por pagar', description: 'Débito fiscal por ventas gravadas', suggestedAccountCode: '40111' },
  { code: 'PURCHASES_MERCHANDISE', name: 'Compras de mercaderías', description: 'Cuenta de costo o gasto por adquisición comercial', suggestedAccountCode: '6011' },
  { code: 'INVENTORY_MERCHANDISE', name: 'Existencias mercaderías', description: 'Almacén de mercaderías', suggestedAccountCode: '2011' },
  { code: 'INVENTORY_VARIATION_MERCHANDISE', name: 'Variación de existencias', description: 'Contrapartida de ingreso al almacén', suggestedAccountCode: '6111' },
  { code: 'FIXED_ASSET_IT_EQUIPMENT', name: 'Equipos de cómputo', description: 'Activo fijo: procesamiento de datos', suggestedAccountCode: '3361' },
  { code: 'FIXED_ASSET_PAYABLE', name: 'Cuentas por pagar por activo fijo', description: 'Pasivos por adquisición de activo inmovilizado', suggestedAccountCode: '465' },
  { code: 'TRANSPORT_EXPENSE', name: 'Gasto de transporte', description: 'Transporte y fletes', suggestedAccountCode: '6311' },
  { code: 'UTILITIES_EXPENSE', name: 'Gasto de servicios básicos', description: 'Servicios públicos', suggestedAccountCode: '636' },
  { code: 'PROFESSIONAL_FEES_EXPENSE', name: 'Gasto de asesoría profesional', description: 'Honorarios profesionales', suggestedAccountCode: '632' },
  { code: 'PROFESSIONAL_FEES_PAYABLE', name: 'Honorarios por pagar', description: 'Recibos por honorarios pendientes', suggestedAccountCode: '4241' },
  { code: 'INCOME_TAX_WITHHELD_PAYABLE_4TH', name: 'Renta 4ta por pagar', description: 'Retenciones de 4ta categoría', suggestedAccountCode: '40172' },
  { code: 'INCOME_TAX_WITHHELD_PAYABLE_5TH', name: 'Renta 5ta por pagar', description: 'Retenciones de 5ta categoría planilla', suggestedAccountCode: '40173' },
  { code: 'SALARIES_EXPENSE', name: 'Gasto de sueldos y salarios', description: 'Remuneraciones al personal', suggestedAccountCode: '6211' },
  { code: 'SALARIES_PAYABLE', name: 'Sueldos y salarios por pagar', description: 'Remuneraciones netas por pagar', suggestedAccountCode: '4111' },
  { code: 'SOCIAL_SECURITY_EXPENSE', name: 'Gasto EsSalud', description: 'Aportes de seguridad social empleador', suggestedAccountCode: '6271' },
  { code: 'SOCIAL_SECURITY_PAYABLE', name: 'EsSalud por pagar', description: 'Aportes a la seguridad social por pagar', suggestedAccountCode: '4031' },
  { code: 'PENSION_PAYABLE_PUBLIC', name: 'ONP por pagar', description: 'Sistema Nacional de Pensiones', suggestedAccountCode: '4032' },
  { code: 'PENSION_PAYABLE_PRIVATE', name: 'AFP por pagar', description: 'Sistema Privado de Pensiones', suggestedAccountCode: '4171' },
  { code: 'SALES_MERCHANDISE', name: 'Ventas de mercadería', description: 'Ingresos por venta comercial', suggestedAccountCode: '701' },
  { code: 'SALES_SERVICES', name: 'Ventas de servicios', description: 'Ingresos por prestación de servicios', suggestedAccountCode: '7041' },
  {
    code: 'BANK_ACCOUNT',
    name: 'Cuenta bancaria',
    description: 'Fondos disponibles en instituciones bancarias',
    suggestedAccountCode: '1041',
    qualifier: {
      name: 'bankAccount',
      suggestions: {
        'BCP-MN': '104101',
        'IBK-MN': '104102'
      }
    }
  },
  { code: 'BANK_CHARGES_EXPENSE', name: 'Gastos bancarios', description: 'Comisiones y gastos de cuenta', suggestedAccountCode: '6391' },
  {
    code: 'COST_DESTINATION',
    name: 'Destino del gasto',
    description: 'Asignación a centros de costo (clase 9)',
    suggestedAccountCode: '94',
    qualifier: {
      name: 'costCenter',
      suggestions: {
        'CC-ADMIN': '94',
        'CC-VENTAS': '95',
        'CC-LOGISTICA': '95'
      }
    }
  },
  { code: 'DEPRECIATION_EXPENSE', name: 'Gasto de depreciación', description: 'Depreciación de inmuebles, maquinaria y equipo', suggestedAccountCode: '6814' },
  { code: 'ACCUMULATED_DEPRECIATION', name: 'Depreciación acumulada', description: 'Depreciación acumulada de inmuebles, maquinaria y equipo', suggestedAccountCode: '3913' },
  { code: 'COST_ALLOCATION_CONTRA', name: 'Cargas imputables a cuentas de costos', description: 'Contrapartida de destino (cuenta 79)', suggestedAccountCode: '791' }
];

export const peLegalBooks = [
  { code: 'PE.PURCHASES_REGISTER', name: 'Registro de Compras', officialCode: '8.1' },
  { code: 'PE.SALES_REGISTER', name: 'Registro de Ventas e Ingresos', officialCode: '14.1' },
  { code: 'PE.JOURNAL', name: 'Libro Diario', officialCode: '5.1' },
  { code: 'PE.CASH_BANKS', name: 'Libro Caja y Bancos', officialCode: '1.1' },
  { code: 'PE.WITHHOLDINGS_BOOK', name: 'Libro de Retenciones', officialCode: '34' }
];

