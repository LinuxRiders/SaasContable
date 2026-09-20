export const mockVouchersIniciales = [
  {
    id: "VOU-09-0012",
    numero: "VOU-09-0012",
    fecha: "2026-09-02",
    subdiario: "01 Ingresos / Cobranzas",
    tipoDoc: "FAC",
    docRef: "F001-492",
    entidadRuc: "20450656934",
    entidadNombre: "Pachatusantrek SAC",
    glosa: "Cobranza Factura F001-492 por Servicios Turísticos",
    estado: "ASENTADO",
    lineas: [
      { cta: "104101", desc: "BANCO BCP - CUENTA CORRIENTE MN", cc: "", debe: 24500.00, haber: 0.00 },
      { cta: "1212101", desc: "FACTURAS, BOLETAS POR COBRAR", cc: "", debe: 0.00, haber: 24500.00 }
    ]
  },
  {
    id: "VOU-09-0034",
    numero: "VOU-09-0034",
    fecha: "2026-09-05",
    subdiario: "02 Egresos / Pagos",
    tipoDoc: "PLA",
    docRef: "PLA-2026-09",
    entidadRuc: "20100010001",
    entidadNombre: "Personal Cusco Operaciones",
    glosa: "Pago Planilla Quincenal Personal Cusco",
    estado: "ASENTADO",
    lineas: [
      { cta: "4212101", desc: "CUENTAS POR PAGAR DIVERSAS", cc: "CC-ADMIN", debe: 32150.00, haber: 0.00 },
      { cta: "104101", desc: "BANCO BCP - CUENTA CORRIENTE MN", cc: "", debe: 0.00, haber: 32150.00 }
    ]
  },
  {
    id: "VOU-09-0078",
    numero: "VOU-09-0078",
    fecha: "2026-09-12",
    subdiario: "01 Ingresos / Cobranzas",
    tipoDoc: "REC",
    docRef: "REC-082-184",
    entidadRuc: "20527433542",
    entidadNombre: "Misterios Perú Travel E.I.R.L.",
    glosa: "Depósito Servicios Turísticos Misterios Perú",
    estado: "ASENTADO",
    lineas: [
      { cta: "104101", desc: "BANCO BCP - CUENTA CORRIENTE MN", cc: "", debe: 48900.00, haber: 0.00 },
      { cta: "1212101", desc: "FACTURAS, BOLETAS POR COBRAR", cc: "", debe: 0.00, haber: 48900.00 }
    ]
  },
  {
    id: "VOU-09-0105",
    numero: "VOU-09-0105",
    fecha: "2026-09-18",
    subdiario: "02 Egresos / Pagos",
    tipoDoc: "FAC",
    docRef: "F003-8892",
    entidadRuc: "20600387550",
    entidadNombre: "Kamil Heavy Parts E.I.R.L.",
    glosa: "Pago Proveedores Combustible Kamil Heavy",
    estado: "ASENTADO",
    lineas: [
      { cta: "4212101", desc: "FACTURAS POR PAGAR", cc: "CC-LOGISTICA", debe: 18420.30, haber: 0.00 },
      { cta: "104101", desc: "BANCO BCP - CUENTA CORRIENTE MN", cc: "", debe: 0.00, haber: 18420.30 }
    ]
  },
  {
    id: "VOU-09-0142",
    numero: "VOU-09-0142",
    fecha: "2026-09-25",
    subdiario: "01 Ingresos / Cobranzas",
    tipoDoc: "OPE",
    docRef: "OPE-9482183",
    entidadRuc: "20610957120",
    entidadNombre: "Asa SM Sociedad Anónima Cerrada",
    glosa: "Transferencia Interbancaria Asa SM SAC",
    estado: "ASENTADO",
    lineas: [
      { cta: "104101", desc: "BANCO BCP - CUENTA CORRIENTE MN", cc: "", debe: 55050.80, haber: 0.00 },
      { cta: "1212101", desc: "FACTURAS, BOLETAS POR COBRAR", cc: "", debe: 0.00, haber: 55050.80 }
    ]
  },
  {
    id: "VOU-09-0199",
    numero: "VOU-09-0199",
    fecha: "2026-09-30",
    subdiario: "02 Egresos / Pagos",
    tipoDoc: "SUN",
    docRef: "SUN-2045065",
    entidadRuc: "20131312955",
    entidadNombre: "SUNAT - Tributos Internos",
    glosa: "Pago Impuestos SUNAT Período 08/2026",
    estado: "ASENTADO",
    lineas: [
      { cta: "4011101", desc: "IGV - CUENTA PROPIA", cc: "", debe: 45550.00, haber: 0.00 },
      { cta: "104101", desc: "BANCO BCP - CUENTA CORRIENTE MN", cc: "", debe: 0.00, haber: 45550.00 }
    ]
  }
];

export const mockFacturasCompras = [
  {
    id: "FC-01",
    tipoDoc: "01 Factura",
    serieNumero: "F001-0008492",
    fecha: "2026-09-10",
    ruc: "20600387550",
    razonSocial: "KAMIL HEAVY PARTS E.I.R.L.",
    concepto: "Repuestos y Filtros para Flota de Buses",
    plantilla: "COMPRA_MERCADERIA",
    total: 11800.00,
    subtotal: 10000.00,
    igv: 1800.00,
    modalidad: "CREDITO",
    bancoPago: "",
    estadoPago: "PENDIENTE",
    saldoPendiente: 11800.00,
    voucherProvision: "VOU-09-0210",
    voucherPago: null
  },
  {
    id: "FC-02",
    tipoDoc: "01 Factura",
    serieNumero: "E001-0002145",
    fecha: "2026-09-15",
    ruc: "20100128450",
    razonSocial: "ELECTRO SUR ESTE S.A.A.",
    concepto: "Consumo de Electricidad Oficina Central Setiembre",
    plantilla: "COMPRA_SERVICIOS_BASICOS",
    total: 3540.00,
    subtotal: 3000.00,
    igv: 540.00,
    modalidad: "CONTADO",
    bancoPago: "BCP_SOLES",
    estadoPago: "PAGADO",
    saldoPendiente: 0.00,
    voucherProvision: "VOU-09-0215",
    voucherPago: "VOU-09-0216"
  }
];

export const mockFacturasVentas = [
  {
    id: "FV-01",
    tipoDoc: "01 Factura",
    serieNumero: "F001-0001890",
    fecha: "2026-09-14",
    ruc: "20610957120",
    razonSocial: "ASA SM SOCIEDAD ANÓNIMA CERRADA",
    concepto: "Paquete Turístico Valle Sagrado 15 Pasajeros",
    plantilla: "VENTA_SERVICIOS_TURISTICOS",
    total: 14160.00,
    subtotal: 12000.00,
    igv: 2160.00,
    modalidad: "CREDITO",
    bancoCobro: "",
    estadoCobro: "PENDIENTE",
    saldoPendiente: 14160.00,
    voucherProvision: "VOU-09-0220",
    voucherCobro: null
  }
];

export const mockPartidasExtracto = [
  {
    id: "EXT-01",
    fecha: "2026-09-02",
    referencia: "TRF-9882199 - Cobranza Factura F001-492",
    valorExtracto: 24500.00,
    valorLibros: 24500.00,
    estado: "CONCILIADO",
    accion: "CONCILIADO"
  },
  {
    id: "EXT-02",
    fecha: "2026-09-05",
    referencia: "CHQ-00213 - Pago Planilla Quincenal",
    valorExtracto: -32150.00,
    valorLibros: -32150.00,
    estado: "CONCILIADO",
    accion: "CONCILIADO"
  },
  {
    id: "EXT-03",
    fecha: "2026-09-15",
    referencia: "GMF-4X1000 - Gravamen Financiero / Comisión Banco",
    valorExtracto: -51.20,
    valorLibros: 0.00,
    estado: "PENDIENTE_LIBRO",
    accion: "CREAR_AJUSTE"
  }
];
