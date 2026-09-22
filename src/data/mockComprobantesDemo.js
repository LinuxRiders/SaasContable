/**
 * @fileoverview Catálogo de ejemplos de comprobantes demo para ingestión (quickstart, CA-18.4)
 */

export const mockComprobantesDemo = [
  {
    sampleId: 'SAMPLE-01-COMPRA-VALIDA',
    title: 'Compra válida PEN (PL-01)',
    expectedOutcome: 'ACCEPTED',
    fileName: 'F001-00000001.json',
    contentType: 'json',
    content: JSON.stringify({
      tipoDocumento: '01',
      serieNumero: 'F001-00000001',
      fechaEmision: '2026-09-15',
      moneda: 'PEN',
      emisor: { ruc: '20555555551', razonSocial: 'PROVEEDOR INDUSTRIAL SAC' },
      receptor: { ruc: '20450656934', razonSocial: 'PACHATUSANTREK SAC' },
      lineas: [{ descripcion: 'Mercadería comercial A', valor: '100.00', tributo: 'IGV' }],
      totales: { baseGravada: '100.00', igv: '18.00', total: '118.00' }
    }, null, 2)
  },
  {
    sampleId: 'SAMPLE-01B-COMPRA-DUPLICADA',
    title: 'Compra duplicada PEN (misma F001-00000001)',
    expectedOutcome: 'DUPLICATE',
    fileName: 'F001-00000001-copia.json',
    contentType: 'json',
    content: JSON.stringify({
      tipoDocumento: '01',
      serieNumero: 'F001-00000001',
      fechaEmision: '2026-09-15',
      moneda: 'PEN',
      emisor: { ruc: '20555555551', razonSocial: 'PROVEEDOR INDUSTRIAL SAC' },
      receptor: { ruc: '20450656934', razonSocial: 'PACHATUSANTREK SAC' },
      lineas: [{ descripcion: 'Mercadería comercial A', valor: '100.00', tributo: 'IGV' }],
      totales: { baseGravada: '100.00', igv: '18.00', total: '118.00' }
    }, null, 2)
  },
  {
    sampleId: 'SAMPLE-01C-DUPLICADO-DIFERENCIAS',
    title: 'Duplicado con diferencias (F001-00000001 con otro total)',
    expectedOutcome: 'DUPLICATE_WITH_DIFF',
    fileName: 'F001-00000001-diff.json',
    contentType: 'json',
    content: JSON.stringify({
      tipoDocumento: '01',
      serieNumero: 'F001-00000001',
      fechaEmision: '2026-09-15',
      moneda: 'PEN',
      emisor: { ruc: '20555555551', razonSocial: 'PROVEEDOR INDUSTRIAL SAC' },
      receptor: { ruc: '20450656934', razonSocial: 'PACHATUSANTREK SAC' },
      lineas: [{ descripcion: 'Mercadería comercial A (modificada)', valor: '150.00', tributo: 'IGV' }],
      totales: { baseGravada: '150.00', igv: '27.00', total: '177.00' }
    }, null, 2)
  },
  {
    sampleId: 'SAMPLE-14-LOTE-COMBINADO',
    title: 'Lote combinado Esc. 14 (Válida + Dañado + Duplicado)',
    expectedOutcome: 'MIXED',
    isBatch: true,
    batchFiles: [
      {
        fileName: 'F001-00000001.json',
        contentType: 'json',
        content: JSON.stringify({
          tipoDocumento: '01',
          serieNumero: 'F001-00000001',
          fechaEmision: '2026-09-15',
          moneda: 'PEN',
          emisor: { ruc: '20555555551', razonSocial: 'PROVEEDOR INDUSTRIAL SAC' },
          receptor: { ruc: '20450656934', razonSocial: 'PACHATUSANTREK SAC' },
          lineas: [{ descripcion: 'Mercadería comercial A', valor: '100.00', tributo: 'IGV' }],
          totales: { baseGravada: '100.00', igv: '18.00', total: '118.00' }
        }, null, 2)
      },
      {
        fileName: 'danado.json',
        contentType: 'json',
        content: '{ "tipoDocumento": "01", broken json ...'
      },
      {
        fileName: 'F001-00000001-copia.json',
        contentType: 'json',
        content: JSON.stringify({
          tipoDocumento: '01',
          serieNumero: 'F001-00000001',
          fechaEmision: '2026-09-15',
          moneda: 'PEN',
          emisor: { ruc: '20555555551', razonSocial: 'PROVEEDOR INDUSTRIAL SAC' },
          receptor: { ruc: '20450656934', razonSocial: 'PACHATUSANTREK SAC' },
          lineas: [{ descripcion: 'Mercadería comercial A', valor: '100.00', tributo: 'IGV' }],
          totales: { baseGravada: '100.00', igv: '18.00', total: '118.00' }
        }, null, 2)
      }
    ]
  },
  {
    sampleId: 'SAMPLE-02-VENTA-VALIDA',
    title: 'Venta válida PEN (PL-04)',
    expectedOutcome: 'ACCEPTED',
    fileName: 'F001-00000002.json',
    contentType: 'json',
    content: JSON.stringify({
      tipoDocumento: '01',
      serieNumero: 'F001-00000002',
      fechaEmision: '2026-09-16',
      moneda: 'PEN',
      emisor: { ruc: '20450656934', razonSocial: 'PACHATUSANTREK SAC' },
      receptor: { ruc: '20600000001', razonSocial: 'CLIENTE LOCAL SAC' },
      lineas: [{ descripcion: 'Venta de mercaderías local', valor: '200.00', tributo: 'IGV' }],
      totales: { baseGravada: '200.00', igv: '36.00', total: '236.00' }
    }, null, 2)
  },
  {
    sampleId: 'SAMPLE-03-ARCHIVO-DANADO',
    title: 'Archivo JSON dañado',
    expectedOutcome: 'FAILED',
    fileName: 'danado.json',
    contentType: 'json',
    content: '{ "tipoDocumento": "01", broken json ...'
  },
  {
    sampleId: 'SAMPLE-04-DATO-FALTANTE',
    title: 'Dato obligatorio faltante (sin fecha)',
    expectedOutcome: 'FAILED',
    fileName: 'sin_fecha.json',
    contentType: 'json',
    content: JSON.stringify({
      tipoDocumento: '01',
      serieNumero: 'F001-00000004',
      moneda: 'PEN',
      emisor: { ruc: '20555555551', razonSocial: 'PROVEEDOR SAC' },
      receptor: { ruc: '20450656934', razonSocial: 'PACHATUSANTREK SAC' },
      lineas: [{ descripcion: 'Item', valor: '100.00', tributo: 'IGV' }],
      totales: { baseGravada: '100.00', igv: '18.00', total: '118.00' }
    }, null, 2)
  },
  {
    sampleId: 'SAMPLE-05-OTRA-EMPRESA',
    title: 'Comprobante de otra empresa',
    expectedOutcome: 'REJECTED_NOT_TENANT',
    fileName: 'otra_empresa.json',
    contentType: 'json',
    content: JSON.stringify({
      tipoDocumento: '01',
      serieNumero: 'F001-00000005',
      fechaEmision: '2026-09-15',
      moneda: 'PEN',
      emisor: { ruc: '20555555551', razonSocial: 'PROVEEDOR SAC' },
      receptor: { ruc: '20999999999', razonSocial: 'EMPRESA AJENA SAC' },
      lineas: [{ descripcion: 'Item', valor: '100.00', tributo: 'IGV' }],
      totales: { baseGravada: '100.00', igv: '18.00', total: '118.00' }
    }, null, 2)
  },
  {
    sampleId: 'SAMPLE-06-PERIODO-CERRADO',
    title: 'Periodo cerrado (Agosto 2026)',
    expectedOutcome: 'PENDING_INPUT',
    fileName: 'periodo_cerrado.json',
    contentType: 'json',
    content: JSON.stringify({
      tipoDocumento: '01',
      serieNumero: 'F001-00000006',
      fechaEmision: '2026-08-20',
      moneda: 'PEN',
      emisor: { ruc: '20555555551', razonSocial: 'PROVEEDOR SAC' },
      receptor: { ruc: '20450656934', razonSocial: 'PACHATUSANTREK SAC' },
      lineas: [{ descripcion: 'Item', valor: '100.00', tributo: 'IGV' }],
      totales: { baseGravada: '100.00', igv: '18.00', total: '118.00' }
    }, null, 2)
  },
  {
    sampleId: 'SAMPLE-07-MONTOS-INCONSISTENTES',
    title: 'Montos inconsistentes (total no cuadra)',
    expectedOutcome: 'PENDING_INPUT',
    fileName: 'inconsistente.json',
    contentType: 'json',
    content: JSON.stringify({
      tipoDocumento: '01',
      serieNumero: 'F001-00000007',
      fechaEmision: '2026-09-15',
      moneda: 'PEN',
      emisor: { ruc: '20555555551', razonSocial: 'PROVEEDOR SAC' },
      receptor: { ruc: '20450656934', razonSocial: 'PACHATUSANTREK SAC' },
      lineas: [{ descripcion: 'Item', valor: '100.00', tributo: 'IGV' }],
      totales: { baseGravada: '100.00', igv: '18.00', total: '150.00' }
    }, null, 2)
  },
  {
    sampleId: 'SAMPLE-08-PLANTILLA-NO-CORRESPONDE',
    title: 'Compra PEN para usar con plantilla VENTA (PL-04)',
    expectedOutcome: 'PENDING_INPUT',
    fileName: 'mismatch_op.json',
    contentType: 'json',
    content: JSON.stringify({
      tipoDocumento: '01',
      serieNumero: 'F001-00000008',
      fechaEmision: '2026-09-15',
      moneda: 'PEN',
      emisor: { ruc: '20555555551', razonSocial: 'PROVEEDOR SAC' },
      receptor: { ruc: '20450656934', razonSocial: 'PACHATUSANTREK SAC' },
      lineas: [{ descripcion: 'Mercadería para comprar', valor: '100.00', tributo: 'IGV' }],
      totales: { baseGravada: '100.00', igv: '18.00', total: '118.00' }
    }, null, 2)
  },
  // 5 compras distintas para PL-06 (sin CC por defecto)
  ...[1, 2, 3, 4, 5].map(idx => ({
    sampleId: `SAMPLE-09-PL06-COMPRA-${idx}`,
    title: `Compra PL-06 Gasto de Gestión #${idx} (exige CC)`,
    expectedOutcome: 'PENDING_INPUT',
    fileName: `gasto_gestion_0${idx}.json`,
    contentType: 'json',
    content: JSON.stringify({
      tipoDocumento: '01',
      serieNumero: `F001-0000100${idx}`,
      fechaEmision: `2026-09-1${idx}`,
      moneda: 'PEN',
      emisor: { ruc: '20555555551', razonSocial: 'PROVEEDOR VARIOS SAC' },
      receptor: { ruc: '20450656934', razonSocial: 'PACHATUSANTREK SAC' },
      lineas: [{ descripcion: `Gasto administrativo #${idx}`, valor: '100.00', tributo: 'IGV' }],
      totales: { baseGravada: '100.00', igv: '18.00', total: '118.00' }
    }, null, 2)
  })),
  {
    sampleId: 'SAMPLE-10-PL07-REGLAS-MULTIPLE',
    title: 'Compra con FLETE, LUZ y SEGURO para PL-07',
    expectedOutcome: 'ACCEPTED',
    fileName: 'servicios_reglas_pl07.json',
    contentType: 'json',
    content: JSON.stringify({
      tipoDocumento: '01',
      serieNumero: 'F001-00000777',
      fechaEmision: '2026-09-18',
      moneda: 'PEN',
      emisor: { ruc: '20555555551', razonSocial: 'CONSORCIO SERVICIOS SAC' },
      receptor: { ruc: '20450656934', razonSocial: 'PACHATUSANTREK SAC' },
      lineas: [
        { descripcion: 'FLETE LIMA - CUSCO', valor: '100.00', tributo: 'IGV' },
        { descripcion: 'LUZ SETIEMBRE LOCAL CENTRAL', valor: '100.00', tributo: 'IGV' },
        { descripcion: 'SEGURO VEHICULAR FLOTA', valor: '100.00', tributo: 'IGV' }
      ],
      totales: { baseGravada: '300.00', igv: '54.00', total: '354.00' }
    }, null, 2)
  },
  {
    sampleId: 'SAMPLE-12-COMPRA-USD-PLAN3',
    title: 'Compra USD con FLETE (F001-00000456, USD 1,000.00, plan §3)',
    expectedOutcome: 'ACCEPTED',
    fileName: 'F001-00000456.json',
    contentType: 'json',
    content: JSON.stringify({
      tipoDocumento: '01',
      serieNumero: 'F001-00000456',
      fechaEmision: '2026-09-15',
      moneda: 'USD',
      emisor: { ruc: '20555555551', razonSocial: 'TRANSPORTES ANDINOS DEMO SAC' },
      receptor: { ruc: '20450656934', razonSocial: 'PACHATUSANTREK SAC' },
      lineas: [{ descripcion: 'Flete Cusco - Puno', valor: '847.46', tributo: 'IGV' }],
      totales: { baseGravada: '847.46', igv: '152.54', total: '1000.00' }
    }, null, 2)
  },
  {
    sampleId: 'SAMPLE-13-COMPRA-USD-SIN-TASA',
    title: 'Compra USD anterior a primera tasa (NO_FX_RATE)',
    expectedOutcome: 'ACCEPTED',
    fileName: 'F001-00000457.json',
    contentType: 'json',
    content: JSON.stringify({
      tipoDocumento: '01',
      serieNumero: 'F001-00000457',
      fechaEmision: '2026-05-15',
      moneda: 'USD',
      emisor: { ruc: '20555555551', razonSocial: 'TRANSPORTES ANDINOS DEMO SAC' },
      receptor: { ruc: '20450656934', razonSocial: 'PACHATUSANTREK SAC' },
      lineas: [{ descripcion: 'Flete internacional previo', valor: '847.46', tributo: 'IGV' }],
      totales: { baseGravada: '847.46', igv: '152.54', total: '1000.00' }
    }, null, 2)
  }
];
