import * as XLSX from 'xlsx';

export const descargarPlantillaExcel = () => {
  const data = [
    { CUENTA: '10', DESCRIPCION: 'EFECTIVO Y EQUIVALENTES DE EFECTIVO', NIVEL: 2, MONEDA: 'MN', AMARRE_1_DEBE: '', AMARRE_2_HABER: '', TIPO_ANALISIS: 'Solo Monto / Sin Análisis', EXIGE_CC: 'NO' },
    { CUENTA: '104', DESCRIPCION: 'Cuentas corrientes en instituciones financieras', NIVEL: 3, MONEDA: 'MN', AMARRE_1_DEBE: '', AMARRE_2_HABER: '', TIPO_ANALISIS: 'Banco / Conciliación', EXIGE_CC: 'NO' },
    { CUENTA: '1041', DESCRIPCION: 'Cuentas corrientes operativas', NIVEL: 4, MONEDA: 'MN', AMARRE_1_DEBE: '', AMARRE_2_HABER: '', TIPO_ANALISIS: 'Banco / Conciliación', EXIGE_CC: 'NO' },
    { CUENTA: '104101', DESCRIPCION: 'BANCO BCP MN', NIVEL: 6, MONEDA: 'MN', AMARRE_1_DEBE: '', AMARRE_2_HABER: '', TIPO_ANALISIS: 'Banco / Conciliación', EXIGE_CC: 'NO' },
    { CUENTA: '12', DESCRIPCION: 'CUENTAS POR COBRAR COMERCIALES – TERCEROS', NIVEL: 2, MONEDA: 'MN', AMARRE_1_DEBE: '', AMARRE_2_HABER: '', TIPO_ANALISIS: 'Por Documento / RUC', EXIGE_CC: 'NO' },
    { CUENTA: '121', DESCRIPCION: 'Facturas, boletas y otros comprobantes por cobrar', NIVEL: 3, MONEDA: 'MN', AMARRE_1_DEBE: '', AMARRE_2_HABER: '', TIPO_ANALISIS: 'Por Documento / RUC', EXIGE_CC: 'NO' },
    { CUENTA: '1212', DESCRIPCION: 'Emitidas en cartera', NIVEL: 4, MONEDA: 'MN', AMARRE_1_DEBE: '', AMARRE_2_HABER: '', TIPO_ANALISIS: 'Por Documento / RUC', EXIGE_CC: 'NO' },
    { CUENTA: '121201', DESCRIPCION: 'Facturas por Cobrar ME', NIVEL: 6, MONEDA: 'ME', AMARRE_1_DEBE: '', AMARRE_2_HABER: '', TIPO_ANALISIS: 'Por Documento / RUC', EXIGE_CC: 'NO' },
    { CUENTA: '63', DESCRIPCION: 'GASTOS DE SERVICIOS PRESTADOS POR TERCEROS', NIVEL: 2, MONEDA: 'MN', AMARRE_1_DEBE: '', AMARRE_2_HABER: '', TIPO_ANALISIS: 'Solo Monto / Sin Análisis', EXIGE_CC: 'SI' },
    { CUENTA: '631', DESCRIPCION: 'Transporte, correos y gastos de viaje', NIVEL: 3, MONEDA: 'MN', AMARRE_1_DEBE: '9411101', AMARRE_2_HABER: '7911101', TIPO_ANALISIS: 'Centro de Costos', EXIGE_CC: 'SI' }
  ];

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Plan Contable");

  XLSX.writeFile(workbook, "Plantilla_PCGE_Estandar.xlsx");
};

export const exportarPlanAExcel = (cuentas, nombreArchivo = "Catalogo_Exportado.xlsx") => {
  const data = cuentas.map(c => ({
    CUENTA: c.codigo,
    DESCRIPCION: c.descripcion,
    NIVEL: c.codigo.length,
    MONEDA: c.moneda || 'MN',
    AMARRE_1_DEBE: c.amarre1 || '',
    AMARRE_2_HABER: c.amarre2 || '',
    TIPO_ANALISIS: c.tipoAnalisis || 'Solo Monto / Sin Análisis',
    EXIGE_CC: c.requiereCentroCostos ? 'SI' : 'NO'
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Catálogo");

  XLSX.writeFile(workbook, nombreArchivo);
};
