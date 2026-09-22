export const generarAsientoContable = (transaccion, planContable) => {
  const { tipoOperacion, total, concepto, plantilla, bancoCobroPago, centroCostos, ruc, razonSocial } = transaccion;
  const totalNum = parseFloat(total);
  
  // Asumiendo que las operaciones son gravadas con IGV 18% por defecto si no se especifica otra cosa.
  const subtotal = parseFloat((totalNum / 1.18).toFixed(2));
  const igv = parseFloat((totalNum - subtotal).toFixed(2));

  let lineas = [];
  
  if (tipoOperacion === 'COMPRA') {
    const ctaBase = plantilla.cuentaBase;
    const ctaIgv = plantilla.cuentaImpuesto || "4011101";
    const ctaPasivo = plantilla.cuentaObligacion || "4212101";

    lineas.push({ cta: ctaBase, desc: `COMPRA / GASTO - ${concepto}`, cc: centroCostos || "", debe: subtotal, haber: 0.00 });
    lineas.push({ cta: ctaIgv, desc: "IGV - CRÉDITO FISCAL 18%", cc: "", debe: igv, haber: 0.00 });
    lineas.push({ cta: ctaPasivo, desc: `PROVEEDORES - ${razonSocial}`, cc: "", debe: 0.00, haber: totalNum });

    // Amarres Automáticos
    const cuentaInfo = planContable.find(c => c.codigo === ctaBase);
    if (cuentaInfo && cuentaInfo.amarre1 && cuentaInfo.amarre2) {
      lineas.push(
        { cta: cuentaInfo.amarre1, desc: "DESTINO DEL GASTO / COSTO", cc: centroCostos || cuentaInfo.amarre3 || "CC-ADMIN", debe: subtotal, haber: 0.00 },
        { cta: cuentaInfo.amarre2, desc: "CARGAS IMPUTABLES A CUENTAS DE COSTOS Y GASTOS", cc: "", debe: 0.00, haber: subtotal }
      );
    }
  } else if (tipoOperacion === 'VENTA') {
    const ctaBase = plantilla.cuentaBase;
    const ctaIgv = plantilla.cuentaImpuesto || "4011101";
    const ctaActivo = plantilla.cuentaObligacion || "1212101";

    lineas.push({ cta: ctaActivo, desc: `CLIENTES - ${razonSocial}`, cc: "", debe: totalNum, haber: 0.00 });
    lineas.push({ cta: ctaBase, desc: `VENTA - ${concepto}`, cc: "", debe: 0.00, haber: subtotal });
    lineas.push({ cta: ctaIgv, desc: "IGV - DÉBITO FISCAL 18%", cc: "", debe: 0.00, haber: igv });
  } else if (tipoOperacion === 'PAGO') {
    const ctaPasivo = plantilla?.cuentaObligacion || "4212101";
    const ctaBanco = bancoCobroPago || "104101";
    lineas.push({ cta: ctaPasivo, desc: `CANCELACIÓN OBLIGACIÓN PROVEEDOR - ${razonSocial}`, cc: "", debe: totalNum, haber: 0.00 });
    lineas.push({ cta: ctaBanco, desc: `SALIDA DE FONDOS`, cc: "", debe: 0.00, haber: totalNum });
  } else if (tipoOperacion === 'COBRO') {
    const ctaActivo = plantilla?.cuentaObligacion || "1212101";
    const ctaBanco = bancoCobroPago || "104101";
    lineas.push({ cta: ctaBanco, desc: `INGRESO DE FONDOS`, cc: "", debe: totalNum, haber: 0.00 });
    lineas.push({ cta: ctaActivo, desc: `CANCELACIÓN CUENTA POR COBRAR - ${razonSocial}`, cc: "", debe: 0.00, haber: totalNum });
  }

  // Gates / Validaciones de Integridad
  const errores = [];

  // Gate 1: Partida Doble Absoluta
  let sumDebe = 0;
  let sumHaber = 0;
  lineas.forEach(l => {
    sumDebe += l.debe;
    sumHaber += l.haber;
  });
  
  // Fix precision errors
  sumDebe = parseFloat(sumDebe.toFixed(2));
  sumHaber = parseFloat(sumHaber.toFixed(2));

  if (Math.abs(sumDebe - sumHaber) > 0.001) {
    errores.push(`Descuadre detectado: Debe = ${sumDebe}, Haber = ${sumHaber}. Diferencia = ${Math.abs(sumDebe - sumHaber).toFixed(2)}`);
  }

  // Gate 2 & 3: Cuentas 'U' y Centros de Costos
  lineas.forEach((l, index) => {
    const cuentaInfo = planContable.find(c => c.codigo === l.cta);
    if (!cuentaInfo) {
      errores.push(`Cuenta ${l.cta} no existe en el plan contable.`);
    } else {
      if (!cuentaInfo.esCuentaU) {
        errores.push(`La cuenta ${l.cta} es una cuenta sintética (padre). Solo se admiten cuentas analíticas (U).`);
      }
      if (cuentaInfo.requiereCC && !l.cc) {
        errores.push(`La cuenta ${l.cta} requiere un Centro de Costos obligatorio.`);
      }
    }
  });

  return {
    lineas,
    sumDebe,
    sumHaber,
    esValido: errores.length === 0,
    errores
  };
};
