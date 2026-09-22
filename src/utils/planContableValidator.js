/**
 * Funciones puras para auditar la integridad del Catálogo de Cuentas (PCGE)
 */

export const auditarPlanContable = (cuentas) => {
  const codesSet = new Set(cuentas.map(c => c.codigo));
  const cuentasU = cuentas.filter(c => c.esCuentaU);
  const cuentasSinteticas = cuentas.filter(c => !c.esCuentaU);
  
  let amarresValidos = 0;
  const amarresHuerfanos = [];
  const cuentasHuerfanas = [];
  const alertas = [];

  // Auditar cada cuenta
  cuentas.forEach(acc => {
    // 1. Revisar si la cuenta analítica no tiene padres
    if (acc.codigo.length > 2) {
      let tienePadre = false;
      for (let i = 1; i < acc.codigo.length; i++) {
        if (codesSet.has(acc.codigo.substring(0, i))) {
          tienePadre = true;
          break;
        }
      }
      if (!tienePadre) {
        cuentasHuerfanas.push(acc.codigo);
      }
    }

    // 2. Revisar amarres de destino
    if (acc.amarre1 || acc.amarre2) {
      let amarreValido = true;
      if (acc.amarre1 && !codesSet.has(acc.amarre1)) {
        amarresHuerfanos.push({ origen: acc.codigo, destino: acc.amarre1, tipo: 'Debe' });
        amarreValido = false;
      }
      if (acc.amarre2 && !codesSet.has(acc.amarre2)) {
        amarresHuerfanos.push({ origen: acc.codigo, destino: acc.amarre2, tipo: 'Haber' });
        amarreValido = false;
      }
      if (amarreValido) amarresValidos++;
    }
  });

  // Generar alertas
  if (cuentasHuerfanas.length > 0) {
    alertas.push({
      tipo: 'error',
      mensaje: `Existen ${cuentasHuerfanas.length} cuentas huérfanas sin ancestros (sintéticas).`
    });
  }

  if (amarresHuerfanos.length > 0) {
    alertas.push({
      tipo: 'warning',
      mensaje: `Se detectaron ${amarresHuerfanos.length} amarres apuntando a cuentas inexistentes.`
    });
  }

  if (cuentas.length === 0) {
    alertas.push({ tipo: 'error', mensaje: 'El plan contable está vacío.' });
  } else if (cuentasHuerfanas.length === 0 && amarresHuerfanos.length === 0) {
    alertas.push({ tipo: 'success', mensaje: 'El plan superó todas las pruebas de integridad.' });
  }

  return {
    totalCuentas: cuentas.length,
    cuentasU: cuentasU.length,
    cuentasSinteticas: cuentasSinteticas.length,
    amarresValidos,
    amarresHuerfanos,
    cuentasHuerfanas,
    alertas
  };
};

export const autoGenerarCuentasPadre = (cuentas) => {
  const accountsMap = new Map();
  cuentas.forEach(c => accountsMap.set(c.codigo, { ...c }));

  const allCodes = Array.from(accountsMap.keys());
  
  allCodes.forEach(code => {
    // Empezamos desde nivel 2 para generar niveles intermedios si faltan
    for (let i = 2; i < code.length; i++) {
      const parentCode = code.substring(0, i);
      if (!accountsMap.has(parentCode)) {
        accountsMap.set(parentCode, {
          codigo: parentCode,
          descripcion: `CUENTA SINTÉTICA ${parentCode}`,
          elemento: parseInt(parentCode.charAt(0), 10),
          moneda: 'MN',
          esCuentaU: false,
          tipoAnalisis: "Solo Monto / Sin Análisis",
          requiereCentroCostos: false
        });
      }
    }
  });

  const arrayResult = Array.from(accountsMap.values());
  arrayResult.sort((a, b) => a.codigo.localeCompare(b.codigo));
  return arrayResult;
};
