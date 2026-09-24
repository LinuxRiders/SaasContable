/**
 * Fuente única de los documentos de prueba de ingestión (SDD v3.0 §20.9, spec 002).
 * Todos los datos son ficticios. Los importes están en céntimos.
 * `generate-document-fixtures.mjs` produce a partir de aquí los archivos reales y el catálogo.
 */

export const TENANT = { tenantId: '01', fiscalIdType: 'RUC', fiscalId: '20450656934', name: 'PACHATUSANTREK SOCIEDAD ANÓNIMA CERRADA' };

export const PARTIES = {
  distribuidora: { fiscalIdType: 'RUC', fiscalId: '20100000009', name: 'DISTRIBUIDORA ANDINA DEMO S.A.C.' },
  electro: { fiscalIdType: 'RUC', fiscalId: '20100000017', name: 'ELECTRO SUR DEMO S.A.A.' },
  logistica: { fiscalIdType: 'RUC', fiscalId: '20100000025', name: 'LOGÍSTICA Y COMERCIO DEMO S.A.C.' },
  tecno: { fiscalIdType: 'RUC', fiscalId: '20100000033', name: 'TECNO EQUIPOS DEMO S.A.C.' },
  importadora: { fiscalIdType: 'RUC', fiscalId: '20100000041', name: 'IMPORTADORA DE EQUIPOS DEMO S.A.C.' },
  hoteles: { fiscalIdType: 'RUC', fiscalId: '20600000005', name: 'HOTELES DEL SUR DEMO S.A.C.' },
  asesor: { fiscalIdType: 'RUC', fiscalId: '10400000005', name: 'PÉREZ QUISPE JUAN (DEMO)' }
};

const line = (lineNo, itemCode, description, quantity, unitPriceMinor, rateBp = 1800, fields = {}) => {
  const amountMinor = quantity * unitPriceMinor;
  const taxMinor = Math.round((amountMinor * rateBp) / 10000);
  return { lineNo, itemCode, description, quantity, unitPriceMinor, amountMinor, taxMinor, rateBp, fields };
};

/**
 * Cada documento comercial se describe una sola vez y se renderiza en uno o varios formatos.
 * kind: 'INVOICE' | 'CREDIT_NOTE' (SUNAT 01 / 07)
 */
export const COMMERCIAL_DOCS = {
  facturaMercaderia: {
    kind: 'INVOICE', officialCode: '01', series: 'F001', number: '00000123', issueDate: '2026-09-10', dueDate: '2026-10-10',
    currency: 'PEN', issuer: PARTIES.distribuidora, receiver: TENANT,
    lines: [line(1, 'MER-001', 'Mochila de trekking 40 L', 20, 5000)]
  },
  facturaMixta: {
    kind: 'INVOICE', officialCode: '01', series: 'F002', number: '00000456', issueDate: '2026-09-14', dueDate: '2026-10-14',
    currency: 'PEN', issuer: PARTIES.logistica, receiver: TENANT,
    lines: [line(1, 'MER-002', 'Carpa para 2 personas', 10, 5000), line(2, 'SRV-FLT', 'Flete Lima - Cusco', 1, 10000)]
  },
  notaCredito: {
    kind: 'CREDIT_NOTE', officialCode: '07', series: 'FC01', number: '00000011', issueDate: '2026-09-15',
    currency: 'PEN', issuer: PARTIES.distribuidora, receiver: TENANT,
    reason: { code: '07', description: 'Devolución por ítem' },
    reference: { officialCode: '01', series: 'F001', number: '00000123', issueDate: '2026-09-10' },
    lines: [line(1, 'MER-001', 'Devolución: mochila de trekking 40 L', 4, 5000)]
  },
  facturaEmitida: {
    kind: 'INVOICE', officialCode: '01', series: 'F001', number: '00000789', issueDate: '2026-09-12', dueDate: '2026-09-27',
    currency: 'PEN', issuer: TENANT, receiver: PARTIES.hoteles,
    lines: [line(1, 'MER-100', 'Mochilas de trekking 40 L (venta)', 20, 10000)]
  },
  facturaUsd: {
    kind: 'INVOICE', officialCode: '01', series: 'F001', number: '00000501', issueDate: '2026-09-11', dueDate: '2026-10-11',
    currency: 'USD', issuer: PARTIES.importadora, receiver: TENANT,
    lines: [line(1, 'MER-010', 'Cuerdas de escalada 60 m', 10, 10000)]
  },
  facturaFotoNitida: {
    kind: 'INVOICE', officialCode: '01', series: 'F001', number: '00000130', issueDate: '2026-09-16', dueDate: '2026-10-16',
    currency: 'PEN', issuer: PARTIES.distribuidora, receiver: TENANT,
    lines: [line(1, 'MER-003', 'Bastones de trekking (par)', 10, 4000)]
  },
  facturaFotoBorrosa: {
    kind: 'INVOICE', officialCode: '01', series: 'F001', number: '00000131', issueDate: '2026-09-17', dueDate: '2026-10-17',
    currency: 'PEN', issuer: PARTIES.distribuidora, receiver: TENANT,
    lines: [line(1, 'MER-004', 'Linternas frontales LED', 10, 3000)]
  },
  facturaComputo: {
    kind: 'INVOICE', officialCode: '01', series: 'F003', number: '00000077', issueDate: '2026-09-19', dueDate: '2026-10-19',
    currency: 'PEN', issuer: PARTIES.tecno, receiver: TENANT,
    lines: [line(1, 'EQ-LAP-14', 'Laptop 14" para oficina (equipo de cómputo)', 1, 300000)]
  }
};

export const JSON_DOCS = {
  reciboHonorarios: {
    schema: 'contableos.document.v1', jurisdiction: 'PE', documentType: 'PROFESSIONAL_FEE_RECEIPT',
    series: 'E001', number: '45', issueDate: '2026-09-20', dueDate: null, currency: 'PEN',
    parties: [{ role: 'ISSUER', ...PARTIES.asesor, countryCode: 'PE' }, { role: 'RECEIVER', ...TENANT, countryCode: 'PE' }],
    fields: { serviceDescription: 'Asesoría contable del mes de setiembre', grossAmountMinor: 150000, costCenter: 'CC-ADMIN' },
    lines: [], taxes: [],
    withholdings: [{ withholdingCode: 'INCOME_TAX_FEES', baseMinor: 150000, rateBp: 800, amountMinor: 12000 }],
    references: [],
    totals: { netMinor: 150000, taxMinor: 0, withheldMinor: 12000, totalMinor: 150000, payableMinor: 138000 }
  },
  resumenPlanilla: {
    schema: 'contableos.document.v1', jurisdiction: 'PE', documentType: 'PAYROLL_SUMMARY',
    series: 'PLA', number: '2026-09', issueDate: '2026-09-30', dueDate: null, currency: 'PEN',
    parties: [{ role: 'ISSUER', ...TENANT, countryCode: 'PE' }],
    fields: {
      payrollPeriod: '2026-09', costCenter: 'CC-ADMIN', grossSalariesMinor: 1000000, employerHealthMinor: 90000,
      publicPensionMinor: 52000, privatePensionMinor: 78000, incomeTaxWithheldMinor: 15000, netPayableMinor: 855000
    },
    lines: [], taxes: [], withholdings: [], references: [],
    totals: { netMinor: 1000000, taxMinor: 0, withheldMinor: 145000, totalMinor: 1000000, payableMinor: 855000 }
  },
  notaCreditoSinReferencia: {
    schema: 'contableos.document.v1', jurisdiction: 'PE', documentType: 'CREDIT_NOTE',
    series: 'FC01', number: '12', issueDate: '2026-09-21', dueDate: null, currency: 'PEN',
    parties: [{ role: 'ISSUER', ...PARTIES.distribuidora, countryCode: 'PE' }, { role: 'RECEIVER', ...TENANT, countryCode: 'PE' }],
    fields: { creditNoteReason: '09' },
    lines: [{ lineNo: 1, description: 'Descuento por pronto pago', amountMinor: 5000, taxes: [{ taxCode: 'VAT', baseMinor: 5000, rateBp: 1800, amountMinor: 900 }], fields: {} }],
    taxes: [{ taxCode: 'VAT', baseMinor: 5000, rateBp: 1800, amountMinor: 900 }],
    withholdings: [], references: [],
    totals: { netMinor: 5000, taxMinor: 900, withheldMinor: 0, totalMinor: 5900, payableMinor: 5900 }
  }
};

export const CSV_BOLETAS = {
  fileName: 'boletas-venta-2026-09-18.csv',
  header: ['tipo_comprobante', 'serie', 'numero', 'fecha_emision', 'moneda', 'tipo_doc_cliente', 'num_doc_cliente', 'nombre_cliente', 'descripcion', 'valor_venta', 'igv', 'importe_total'],
  rows: [
    ['03', 'B001', '00000101', '2026-09-18', 'PEN', '1', '40000001', 'CLIENTE DEMO UNO', 'Tour Valle Sagrado', '100.00', '18.00', '118.00'],
    ['03', 'B001', '00000102', '2026-09-18', 'PEN', '1', '40000002', 'CLIENTE DEMO DOS', 'Alquiler de bastones', '50.00', '9.00', '59.00'],
    ['03', 'B001', '00000103', '2026-09-18', 'PEN', '1', '40000003', 'CLIENTE DEMO TRES', 'Tour Montaña de Colores', '200.00', '36.00', '236.00']
  ]
};

/** Registro manual (no es archivo): lo que el Maker digita en el formulario. */
export const MANUAL_FORM_DEPRECIATION = {
  documentType: 'INTERNAL_DOCUMENT', operationTypeCode: 'DEPRECIATION', series: 'DEP', number: '2026-09', issueDate: '2026-09-30',
  currency: 'PEN', fields: { concept: 'Depreciación de activo fijo – setiembre 2026', costCenter: 'CC-ADMIN' },
  lines: [
    { lineNo: 1, description: 'Equipos de cómputo', amountMinor: 25000, fields: { assetClass: 'IT_EQUIPMENT' } },
    { lineNo: 2, description: 'Muebles y enseres', amountMinor: 10000, fields: { assetClass: 'FURNITURE' } }
  ],
  totals: { netMinor: 35000, taxMinor: 0, withheldMinor: 0, totalMinor: 35000, payableMinor: 0 }
};

/**
 * Los 16 documentos de prueba, en el orden del SDD §20.9.
 * render: cómo se genera el archivo. expected: resultado esperado de la ingestión (spec 002) y de la interpretación (spec 003).
 * lowConfidence: campos que el extractor simulado devuelve con confianza baja.
 */
export const FIXTURES = [
  { id: 'DOC-01', title: 'Factura de mercadería (XML UBL)', file: '01-factura-mercaderia.xml', render: { as: 'UBL', doc: 'facturaMercaderia' },
    expected: { intake: 'RECEIVED', interpretation: 'PENDING_APPROVAL', template: 'PE.RECEIVED.INVOICE.MERCHANDISE_PURCHASE' } },
  { id: 'DOC-02', title: 'Factura con mercadería y flete (XML UBL)', file: '02-factura-mixta.xml', render: { as: 'UBL', doc: 'facturaMixta' },
    expected: { intake: 'RECEIVED', interpretation: 'PENDING_INPUT:MISSING_DIMENSION', template: 'PE.RECEIVED.INVOICE.PURCHASE_MIXED', note: 'La línea de flete exige centro de costo; el Maker lo informa (CC-LOGISTICA).' } },
  { id: 'DOC-03', title: 'Nota de crédito por devolución (XML UBL)', file: '03-nota-credito.xml', render: { as: 'UBL', doc: 'notaCredito' },
    expected: { intake: 'RECEIVED', interpretation: 'PENDING_APPROVAL', template: 'PE.RECEIVED.CREDIT_NOTE.PURCHASE_RETURN', note: 'Requiere haber cargado antes DOC-01 (referencia).' } },
  { id: 'DOC-04', title: 'Factura emitida por la empresa (XML UBL)', file: '04-factura-emitida.xml', render: { as: 'UBL', doc: 'facturaEmitida' },
    expected: { intake: 'RECEIVED', interpretation: 'PENDING_APPROVAL', template: 'PE.ISSUED.INVOICE.MERCHANDISE_SALE' } },
  { id: 'DOC-05', title: 'Factura en dólares (XML UBL)', file: '05-factura-usd.xml', render: { as: 'UBL', doc: 'facturaUsd' },
    expected: { intake: 'RECEIVED', interpretation: 'PENDING_APPROVAL', template: 'PE.RECEIVED.INVOICE.MERCHANDISE_PURCHASE', note: 'Con el servicio FX caído: tasa provisional y Checker obligatorio.' } },
  { id: 'DOC-06', title: 'Recibo por honorarios con retención (JSON)', file: '06-recibo-honorarios.json', render: { as: 'JSON', doc: 'reciboHonorarios' },
    expected: { intake: 'RECEIVED', interpretation: 'PENDING_APPROVAL', template: 'PE.RECEIVED.PROFESSIONAL_FEE_RECEIPT.PROFESSIONAL_FEES' } },
  { id: 'DOC-07', title: 'Resumen de planilla de setiembre (JSON)', file: '07-resumen-planilla.json', render: { as: 'JSON', doc: 'resumenPlanilla' },
    expected: { intake: 'RECEIVED', interpretation: 'PENDING_APPROVAL', template: 'PE.INTERNAL.PAYROLL_SUMMARY.PAYROLL' } },
  { id: 'DOC-08', title: 'Lote de 3 boletas de venta (CSV)', file: '08-boletas-venta.csv', render: { as: 'CSV' },
    expected: { intake: 'RECEIVED x3', interpretation: 'PENDING_INPUT:CLASSIFICATION_REQUIRED', note: 'Venta de bienes o de servicios: la decide el Maker. Al clasificar como SERVICE_SALE queda NO_TEMPLATE porque no hay plantilla base para boletas emitidas (el Admin debe crearla).' } },
  { id: 'DOC-09', title: 'Foto nítida de una factura de mercadería (JPG)', file: '09-foto-factura-nitida.jpg', render: { as: 'PHOTO', doc: 'facturaFotoNitida', quality: 'sharp' },
    expected: { intake: 'RECEIVED', interpretation: 'PENDING_APPROVAL', template: 'PE.RECEIVED.INVOICE.MERCHANDISE_PURCHASE', note: 'Leída de imagen: la DoA exige Checker.' } },
  { id: 'DOC-10', title: 'Foto borrosa de una factura (JPG)', file: '10-foto-factura-borrosa.jpg', render: { as: 'PHOTO', doc: 'facturaFotoBorrosa', quality: 'blurry' },
    lowConfidence: ['parties[ISSUER].fiscalId', 'totals.totalMinor', 'taxes[VAT].amountMinor'],
    expected: { intake: 'RECEIVED_NEEDS_REVIEW', interpretation: 'PENDING_INPUT:LOW_CONFIDENCE_EXTRACTION' } },
  { id: 'DOC-11', title: 'Factura de equipo de cómputo escaneada (PDF)', file: '11-factura-computo-escaneada.pdf', render: { as: 'SCANNED_PDF', doc: 'facturaComputo' },
    expected: { intake: 'RECEIVED', interpretation: 'PENDING_INPUT:CLASSIFICATION_REQUIRED', note: '¿Activo fijo o gasto? Lo decide el Maker (o la regla propuesta si el Admin la activa).' } },
  { id: 'DOC-12', title: 'Foto sin documento (PNG)', file: '12-foto-sin-documento.png', render: { as: 'LANDSCAPE' },
    expected: { intake: 'FAILED', dlqReason: 'UNREADABLE' } },
  { id: 'DOC-13', title: 'XML malformado', file: '13-xml-malformado.xml', render: { as: 'BROKEN_XML', doc: 'facturaMercaderia' },
    expected: { intake: 'FAILED', dlqReason: 'MALFORMED' } },
  { id: 'DOC-14', title: 'La factura DOC-01 en PDF', file: '14-factura-mercaderia.pdf', render: { as: 'TEXT_PDF', doc: 'facturaMercaderia' },
    expected: { intake: 'DUPLICATE', duplicateOf: 'DOC-01', note: 'Mismo emisor, tipo, serie-número y fecha que DOC-01.' } },
  { id: 'DOC-15', title: 'Nota de crédito sin referencia (JSON)', file: '15-nota-credito-sin-referencia.json', render: { as: 'JSON', doc: 'notaCreditoSinReferencia' },
    expected: { intake: 'RECEIVED', interpretation: 'PENDING_INPUT:SCHEMA_INVALID' } },
  { id: 'DOC-16', title: 'Depreciación del mes (registro manual)', file: null, render: { as: 'FORM' },
    expected: { intake: 'RECEIVED', interpretation: 'PENDING_APPROVAL', template: 'PE.INTERNAL.INTERNAL_DOCUMENT.DEPRECIATION' } }
];
