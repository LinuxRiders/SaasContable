export const mockPlantillas = [
  {
    id: "PL-01",
    codigo: "COMPRA_MERCADERIA",
    nombre: "Compra de Mercaderías / Insumos",
    descripcion: "Asigna automáticamente costo al Debe (6011), IGV al Debe (4011) y Pasivo al Haber (4212).",
    tipoOperacion: "COMPRA",
    cuentaBase: "6011101",
    cuentaImpuesto: "4011101",
    cuentaObligacion: "4212101",
    aplicaIGV: true,
    tasaIGV: 0.18,
    requiereCC: false
  },
  {
    id: "PL-02",
    codigo: "COMPRA_SERVICIOS_LOGISTICA",
    nombre: "Servicios de Transporte y Flete",
    descripcion: "Asigna gasto de transporte al Debe (6311) con amarre a CC-LOGISTICA, IGV al Debe (4011) y Pasivo al Haber (4212).",
    tipoOperacion: "COMPRA",
    cuentaBase: "6311101",
    cuentaImpuesto: "4011101",
    cuentaObligacion: "4212101",
    aplicaIGV: true,
    tasaIGV: 0.18,
    requiereCC: true,
    ccDefault: "CC-LOGISTICA"
  },
  {
    id: "PL-03",
    codigo: "COMPRA_SERVICIOS_BASICOS",
    nombre: "Servicios Básicos (Luz / Agua / Internet)",
    descripcion: "Asigna suministro al Debe (6361), IGV al Debe (4011) y Pasivo al Haber (4212).",
    tipoOperacion: "COMPRA",
    cuentaBase: "6361101",
    cuentaImpuesto: "4011101",
    cuentaObligacion: "4212101",
    aplicaIGV: true,
    tasaIGV: 0.18,
    requiereCC: true,
    ccDefault: "CC-ADMIN"
  },
  {
    id: "PL-04",
    codigo: "VENTA_MERCADERIA_LOCAL",
    nombre: "Venta de Mercaderías en Mercado Local",
    descripcion: "Asigna derecho por cobrar al Debe (1212), Ingreso al Haber (7012) e IGV Débito al Haber (4011).",
    tipoOperacion: "VENTA",
    cuentaBase: "7012101",
    cuentaImpuesto: "4011101",
    cuentaObligacion: "1212101",
    aplicaIGV: true,
    tasaIGV: 0.18,
    requiereCC: false
  },
  {
    id: "PL-05",
    codigo: "VENTA_SERVICIOS_TURISTICOS",
    nombre: "Venta de Servicios Turísticos y Guía",
    descripcion: "Asigna derecho al Debe (1212), Ingreso al Haber (7032) e IGV Débito al Haber (4011).",
    tipoOperacion: "VENTA",
    cuentaBase: "7032101",
    cuentaImpuesto: "4011101",
    cuentaObligacion: "1212101",
    aplicaIGV: true,
    tasaIGV: 0.18,
    requiereCC: false
  }
];
