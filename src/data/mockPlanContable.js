export const mockPlanContable = [
  // --- ELEMENTO 1: ACTIVO DISPONIBLE Y EXIGIBLE ---
  {
    codigo: "10",
    descripcion: "EFECTIVO Y EQUIVALENTES DE EFECTIVO",
    elemento: 1,
    esCuentaU: false,
    moneda: "MN",
    tipoAnalisis: "Sin Análisis",
    requiereCC: false
  },
  {
    codigo: "101",
    descripcion: "CAJA",
    elemento: 1,
    esCuentaU: false,
    moneda: "MN",
    tipoAnalisis: "Sin Análisis",
    requiereCC: false
  },
  {
    codigo: "1011101",
    descripcion: "CAJA CHICA CENTRAL MN",
    elemento: 1,
    esCuentaU: true,
    moneda: "MN",
    tipoAnalisis: "Por Documento / RUC",
    requiereCC: false,
    rubroEF1: "EF-01",
    rubroEF2: "",
    saldoDeudor: 4500.00,
    saldoAcreedor: 0
  },
  {
    codigo: "104",
    descripcion: "CUENTAS CORRIENTES EN INSTITUCIONES FINANCIERAS",
    elemento: 1,
    esCuentaU: false,
    moneda: "MN",
    tipoAnalisis: "Sin Análisis",
    requiereCC: false
  },
  {
    codigo: "104101",
    descripcion: "BANCO BCP - CUENTA CORRIENTE MN (BCP_SOLES)",
    elemento: 1,
    esCuentaU: true,
    moneda: "MN",
    tipoAnalisis: "Por Documento / RUC",
    requiereCC: false,
    rubroEF1: "EF-01",
    rubroEF2: "",
    saldoDeudor: 145251.30,
    saldoAcreedor: 0
  },
  {
    codigo: "104102",
    descripcion: "BANCO INTERBANK - CTA CTE MN (INTERBANK_SOLES)",
    elemento: 1,
    esCuentaU: true,
    moneda: "MN",
    tipoAnalisis: "Por Documento / RUC",
    requiereCC: false,
    rubroEF1: "EF-01",
    rubroEF2: "",
    saldoDeudor: 62450.00,
    saldoAcreedor: 0
  },
  {
    codigo: "104103",
    descripcion: "BANCO BBVA - CTA CTE USD (BBVA_DOLARES)",
    elemento: 1,
    esCuentaU: true,
    moneda: "ME",
    tipoAnalisis: "Por Documento / RUC",
    requiereCC: false,
    rubroEF1: "EF-01",
    rubroEF2: "",
    saldoDeudor: 28500.00,
    saldoAcreedor: 0
  },
  {
    codigo: "12",
    descripcion: "CUENTAS POR COBRAR COMERCIALES - TERCEROS",
    elemento: 1,
    esCuentaU: false,
    moneda: "MN",
    tipoAnalisis: "Sin Análisis",
    requiereCC: false
  },
  {
    codigo: "1212101",
    descripcion: "FACTURAS, BOLETAS Y OTROS POR COBRAR - EMITIDAS EN CARTERA",
    elemento: 1,
    esCuentaU: true,
    moneda: "MN",
    tipoAnalisis: "Por Documento / RUC",
    requiereCC: false,
    rubroEF1: "EF-01",
    rubroEF2: "",
    saldoDeudor: 38900.00,
    saldoAcreedor: 0
  },

  // --- ELEMENTO 2: ACTIVO REALIZABLE ---
  {
    codigo: "20",
    descripcion: "MERCADERÍAS",
    elemento: 2,
    esCuentaU: false,
    moneda: "MN",
    tipoAnalisis: "Sin Análisis",
    requiereCC: false
  },
  {
    codigo: "2011101",
    descripcion: "MERCADERÍAS MANUFACTURADAS - COSTO",
    elemento: 2,
    esCuentaU: true,
    moneda: "MN",
    tipoAnalisis: "Por Documento / RUC",
    requiereCC: false,
    rubroEF1: "EF-01",
    rubroEF2: "",
    saldoDeudor: 54000.00,
    saldoAcreedor: 0
  },

  // --- ELEMENTO 3: ACTIVO INMOVILIZADO ---
  {
    codigo: "33",
    descripcion: "PROPIEDAD, PLANTA Y EQUIPO",
    elemento: 3,
    esCuentaU: false,
    moneda: "MN",
    tipoAnalisis: "Sin Análisis",
    requiereCC: false
  },
  {
    codigo: "3351101",
    descripcion: "EQUIPOS PARA PROCESAMIENTO DE INFORMACIÓN (CÓMPUTO)",
    elemento: 3,
    esCuentaU: true,
    moneda: "MN",
    tipoAnalisis: "Por Documento / RUC",
    requiereCC: false,
    rubroEF1: "EF-01",
    rubroEF2: "",
    saldoDeudor: 18400.00,
    saldoAcreedor: 0
  },

  // --- ELEMENTO 4: PASIVO ---
  {
    codigo: "40",
    descripcion: "TRIBUTOS, CONTRAPRESTACIONES Y APORTES AL SISTEMA PÚBLICO",
    elemento: 4,
    esCuentaU: false,
    moneda: "MN",
    tipoAnalisis: "Sin Análisis",
    requiereCC: false
  },
  {
    codigo: "4011101",
    descripcion: "IGV - CUENTA PROPIA (CRÉDITO Y DÉBITO FISCAL)",
    elemento: 4,
    esCuentaU: true,
    moneda: "MN",
    tipoAnalisis: "Por Documento / RUC",
    requiereCC: false,
    rubroEF1: "EF-01",
    rubroEF2: "",
    saldoDeudor: 4200.00,
    saldoAcreedor: 7600.00
  },
  {
    codigo: "42",
    descripcion: "CUENTAS POR PAGAR COMERCIALES - TERCEROS",
    elemento: 4,
    esCuentaU: false,
    moneda: "MN",
    tipoAnalisis: "Sin Análisis",
    requiereCC: false
  },
  {
    codigo: "4212101",
    descripcion: "FACTURAS, BOLETAS Y OTROS POR PAGAR - EMITIDAS",
    elemento: 4,
    esCuentaU: true,
    moneda: "MN",
    tipoAnalisis: "Por Documento / RUC",
    requiereCC: false,
    rubroEF1: "EF-01",
    rubroEF2: "",
    saldoDeudor: 0,
    saldoAcreedor: 49200.00
  },

  // --- ELEMENTO 5: PATRIMONIO ---
  {
    codigo: "50",
    descripcion: "CAPITAL",
    elemento: 5,
    esCuentaU: false,
    moneda: "MN",
    tipoAnalisis: "Sin Análisis",
    requiereCC: false
  },
  {
    codigo: "5011101",
    descripcion: "CAPITAL SOCIAL - ACCIONES SUSCRITAS Y PAGADAS",
    elemento: 5,
    esCuentaU: true,
    moneda: "MN",
    tipoAnalisis: "Sin Análisis",
    requiereCC: false,
    rubroEF1: "EF-01",
    rubroEF2: "",
    saldoDeudor: 0,
    saldoAcreedor: 100000.00
  },

  // --- ELEMENTO 6: GASTOS POR NATURALEZA (CON AMARRES AUTOMÁTICOS) ---
  {
    codigo: "60",
    descripcion: "COMPRAS",
    elemento: 6,
    esCuentaU: false,
    moneda: "MN",
    tipoAnalisis: "Sin Análisis",
    requiereCC: false
  },
  {
    codigo: "6011101",
    descripcion: "MERCADERÍAS MANUFACTURADAS",
    elemento: 6,
    esCuentaU: true,
    moneda: "MN",
    tipoAnalisis: "Por Documento / RUC",
    amarre1: "2011101",
    amarre2: "6111101",
    amarre3: "",
    requiereCC: false,
    rubroEF1: "",
    rubroEF2: "EF-02",
    saldoDeudor: 62000.00,
    saldoAcreedor: 0
  },
  {
    codigo: "61",
    descripcion: "VARIACIÓN DE INVENTARIOS",
    elemento: 6,
    esCuentaU: false,
    moneda: "MN",
    tipoAnalisis: "Sin Análisis",
    requiereCC: false
  },
  {
    codigo: "611",
    descripcion: "MERCADERÍAS",
    elemento: 6,
    esCuentaU: false,
    moneda: "MN",
    tipoAnalisis: "Sin Análisis",
    requiereCC: false
  },
  {
    codigo: "6111101",
    descripcion: "VARIACIÓN DE MERCADERÍAS",
    elemento: 6,
    esCuentaU: true,
    moneda: "MN",
    tipoAnalisis: "Por Documento / RUC",
    requiereCC: false,
    rubroEF1: "",
    rubroEF2: "EF-02",
    saldoDeudor: 0,
    saldoAcreedor: 0
  },
  {
    codigo: "63",
    descripcion: "GASTOS DE SERVICIOS PRESTADOS POR TERCEROS",
    elemento: 6,
    esCuentaU: false,
    moneda: "MN",
    tipoAnalisis: "Sin Análisis",
    requiereCC: false
  },
  {
    codigo: "6311101",
    descripcion: "TRANSPORTE DE CARGA Y SERVICIOS LOGÍSTICOS",
    elemento: 6,
    esCuentaU: true,
    moneda: "MN",
    tipoAnalisis: "Por Documento / RUC",
    amarre1: "9411101",
    amarre2: "7911101",
    amarre3: "CC-LOGISTICA",
    requiereCC: true,
    rubroEF1: "",
    rubroEF2: "EF-02",
    saldoDeudor: 8500.00,
    saldoAcreedor: 0
  },
  {
    codigo: "6361101",
    descripcion: "SUMINISTRO DE ENERGÍA ELÉCTRICA Y AGUA",
    elemento: 6,
    esCuentaU: true,
    moneda: "MN",
    tipoAnalisis: "Por Documento / RUC",
    amarre1: "9411101",
    amarre2: "7911101",
    amarre3: "CC-ADMIN",
    requiereCC: true,
    rubroEF1: "",
    rubroEF2: "EF-02",
    saldoDeudor: 3200.00,
    saldoAcreedor: 0
  },
  {
    codigo: "65",
    descripcion: "OTROS GASTOS DE GESTIÓN",
    elemento: 6,
    esCuentaU: false,
    moneda: "MN",
    tipoAnalisis: "Sin Análisis",
    requiereCC: false
  },
  {
    codigo: "6511101",
    descripcion: "SEGUROS DE TRANSPORTE Y BIENES",
    elemento: 6,
    esCuentaU: true,
    moneda: "MN",
    tipoAnalisis: "Por Documento / RUC",
    amarre1: "9411101",
    amarre2: "7911101",
    amarre3: "CC-ADMIN",
    requiereCC: true,
    rubroEF1: "",
    rubroEF2: "EF-02",
    saldoDeudor: 2100.00,
    saldoAcreedor: 0
  },
  {
    codigo: "659",
    descripcion: "OTROS GASTOS DE GESTIÓN",
    elemento: 6,
    esCuentaU: false,
    moneda: "MN",
    tipoAnalisis: "Sin Análisis",
    requiereCC: false
  },
  {
    codigo: "6591101",
    descripcion: "OTROS GASTOS DE GESTIÓN - DIVERSOS",
    elemento: 6,
    esCuentaU: true,
    moneda: "MN",
    tipoAnalisis: "Por Documento / RUC",
    amarre1: "9411101",
    amarre2: "7911101",
    amarre3: "",
    requiereCC: true,
    rubroEF1: "",
    rubroEF2: "EF-02",
    saldoDeudor: 0,
    saldoAcreedor: 0
  },

  // --- ELEMENTO 7: INGRESOS ---
  {
    codigo: "70",
    descripcion: "VENTAS",
    elemento: 7,
    esCuentaU: false,
    moneda: "MN",
    tipoAnalisis: "Sin Análisis",
    requiereCC: false
  },
  {
    codigo: "7012101",
    descripcion: "VENTA DE MERCADERÍAS - MERCADO LOCAL",
    elemento: 7,
    esCuentaU: true,
    moneda: "MN",
    tipoAnalisis: "Por Documento / RUC",
    requiereCC: false,
    rubroEF1: "",
    rubroEF2: "EF-02",
    saldoDeudor: 0,
    saldoAcreedor: 128450.00
  },
  {
    codigo: "7032101",
    descripcion: "VENTA DE SERVICIOS - MERCADO LOCAL",
    elemento: 7,
    esCuentaU: true,
    moneda: "MN",
    tipoAnalisis: "Por Documento / RUC",
    requiereCC: false,
    rubroEF1: "",
    rubroEF2: "EF-02",
    saldoDeudor: 0,
    saldoAcreedor: 34000.00
  },

  // --- ELEMENTO 8: SALDOS INTERMEDIARIOS DE GESTIÓN Y CIERRE ---
  {
    codigo: "89",
    descripcion: "DETERMINACIÓN DEL RESULTADO DEL EJERCICIO",
    elemento: 8,
    esCuentaU: false,
    moneda: "MN",
    tipoAnalisis: "Sin Análisis",
    requiereCC: false
  },
  {
    codigo: "8911101",
    descripcion: "UTILIDAD DEL EJERCICIO",
    elemento: 8,
    esCuentaU: true,
    moneda: "MN",
    tipoAnalisis: "Sin Análisis",
    requiereCC: false,
    rubroEF1: "EF-01",
    rubroEF2: "EF-02",
    saldoDeudor: 0,
    saldoAcreedor: 0
  },

  // --- ELEMENTO 9: COSTOS Y GASTOS POR FUNCIÓN ---
  {
    codigo: "7911101",
    descripcion: "CARGAS IMPUTABLES A CUENTAS DE COSTOS Y GASTOS",
    elemento: 7,
    esCuentaU: true,
    moneda: "MN",
    tipoAnalisis: "Sin Análisis",
    requiereCC: false,
    saldoDeudor: 0,
    saldoAcreedor: 13800.00
  },
  {
    codigo: "94",
    descripcion: "GASTOS DE ADMINISTRACIÓN",
    elemento: 9,
    esCuentaU: false,
    moneda: "MN",
    tipoAnalisis: "Sin Análisis",
    requiereCC: false
  },
  {
    codigo: "9411101",
    descripcion: "GASTOS ADMINISTRATIVOS GENERALES",
    elemento: 9,
    esCuentaU: true,
    moneda: "MN",
    tipoAnalisis: "Por Documento / RUC",
    requiereCC: true,
    saldoDeudor: 8500.00,
    saldoAcreedor: 0
  },
  {
    codigo: "95",
    descripcion: "GASTOS DE VENTAS",
    elemento: 9,
    esCuentaU: false,
    moneda: "MN",
    tipoAnalisis: "Sin Análisis",
    requiereCC: false
  },
  {
    codigo: "9511101",
    descripcion: "GASTOS DE VENTAS Y MARKETING",
    elemento: 9,
    esCuentaU: true,
    moneda: "MN",
    tipoAnalisis: "Por Documento / RUC",
    requiereCC: true,
    saldoDeudor: 5300.00,
    saldoAcreedor: 0
  }
];
