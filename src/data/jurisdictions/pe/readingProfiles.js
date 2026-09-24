/**
 * Perfiles de lectura del paquete de jurisdicción para Perú (PE).
 * Conforme a data-model.md §7 y research R-03.
 * Contiene todas las reglas de lectura de formatos de entrada (UBL, CSV) específicas de Perú.
 */
export const peReadingProfiles = {
  ubl: {
    version: '2.1',
    roots: {
      Invoice: { lineTag: 'InvoiceLine', qtyTag: 'InvoicedQuantity' },
      CreditNote: { lineTag: 'CreditNoteLine', qtyTag: 'CreditedQuantity' },
      DebitNote: { lineTag: 'DebitNoteLine', qtyTag: 'DebitedQuantity' }
    },
    documentTypeByOfficialCode: {
      '01': 'INVOICE',
      '03': 'SALES_RECEIPT',
      '07': 'CREDIT_NOTE',
      '08': 'DEBIT_NOTE'
    },
    rootDefaultDocumentType: {
      CreditNote: 'CREDIT_NOTE',
      DebitNote: 'DEBIT_NOTE'
    },
    fiscalIdTypeBySchemeId: {
      '6': 'RUC',
      '1': 'DNI',
      '4': 'CE'
    },
    taxCodeBySchemeId: {
      '1000': 'VAT',
      '2000': 'EXCISE',
      '7152': 'BAG_TAX'
    },
    adjustmentReasonField: 'creditNoteReason',
    countryCode: 'PE'
  },
  csv: {
    PE_BOLETAS_VENTA_V1: {
      separator: ',',
      header: true,
      issuerIsTenant: true,
      columns: {
        tipo_comprobante: { to: 'documentTypeCode', lookup: 'documentTypeByOfficialCode' },
        serie: { to: 'series' },
        numero: { to: 'number' },
        fecha_emision: { to: 'issueDate' },
        moneda: { to: 'currency' },
        tipo_doc_cliente: { to: 'parties[RECEIVER].fiscalIdType', lookup: { '1': 'DNI', '6': 'RUC', '4': 'CE' } },
        num_doc_cliente: { to: 'parties[RECEIVER].fiscalId' },
        nombre_cliente: { to: 'parties[RECEIVER].name' },
        descripcion: { to: 'lines[0].description' },
        valor_venta: { to: 'lines[0].amountMinor', money: true },
        igv: { to: 'taxes[VAT].amountMinor', money: true, rateBp: 1800 },
        importe_total: { to: 'totals.totalMinor', money: true }
      }
    }
  }
};

