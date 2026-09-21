import React, { createContext, useContext, useState, useEffect } from 'react';
import { generarAsientoContable } from '../utils/accountingEngine';
import { mockEmpresas } from '../data/mockEmpresas';
import { mockPlanContable } from '../data/mockPlanContable';
import { mockBancos } from '../data/mockBancos';
import { mockPlantillas } from '../data/mockPlantillas';
import { 
  mockVouchersIniciales, 
  mockFacturasCompras, 
  mockFacturasVentas, 
  mockPartidasExtracto 
} from '../data/mockTransacciones';

const AccountingContext = createContext(null);

export const AccountingProvider = ({ children }) => {
  // --- ESTADOS PRINCIPALES ---
  const [empresas, setEmpresas] = useState(mockEmpresas);
  const [empresaActiva, setEmpresaActiva] = useState(mockEmpresas[0]);
  const [periodoActivo, setPeriodoActivo] = useState("SETIEMBRE_2026");
  const [planesPorEmpresa, setPlanesPorEmpresa] = useState(
    mockEmpresas.reduce((acc, emp) => {
      acc[emp.id] = mockPlanContable;
      return acc;
    }, {})
  );
  
  const planContable = planesPorEmpresa[empresaActiva?.id] || [];
  const [bancos, setBancos] = useState(mockBancos);
  const [plantillas, setPlantillas] = useState(mockPlantillas);
  const [compras, setCompras] = useState(mockFacturasCompras);
  const [ventas, setVentas] = useState(mockFacturasVentas);
  const [vouchers, setVouchers] = useState(mockVouchersIniciales);
  const [partidasExtracto, setPartidasExtracto] = useState(mockPartidasExtracto);
  const [cierreEjecutado, setCierreEjecutado] = useState(false);

  // --- HELPERS CONTABLES ---
  // Generar siguiente número correlativo de voucher
  const generarCorrelativoVoucher = () => {
    const nextNum = vouchers.length + 1;
    return `VOU-09-${String(nextNum).padStart(4, '0')}`;
  };

  // 1. REGISTRAR EMPRESA
  const agregarEmpresa = (nuevaEmpresa, modoInicializacion = 'PCGE_2026', planPersonalizado = []) => {
    const id = String(empresas.length + 1).padStart(2, '0');
    
    let planParaEmpresa = [];
    if (modoInicializacion === 'PCGE_2026') {
      planParaEmpresa = [...mockPlanContable];
    } else if (modoInicializacion === 'IMPORTAR_EXCEL') {
      planParaEmpresa = planPersonalizado;
    } else if (modoInicializacion === 'EN_BLANCO') {
      planParaEmpresa = [];
    }

    const emp = {
      ...nuevaEmpresa,
      id,
      asientosCount: 0,
      cuentasCount: planParaEmpresa.length,
      estado: "ACTIVA"
    };
    
    setEmpresas([...empresas, emp]);
    setPlanesPorEmpresa(prev => ({
      ...prev,
      [id]: planParaEmpresa
    }));
    setEmpresaActiva(emp);
  };

  // 2. MANTENIMIENTO DEL PLAN CONTABLE
  const agregarCuenta = (nuevaCuenta) => {
    setPlanesPorEmpresa(prev => ({
      ...prev,
      [empresaActiva.id]: [...(prev[empresaActiva.id] || []), nuevaCuenta]
    }));
  };

  const modificarCuenta = (codigo, cuentaActualizada) => {
    setPlanesPorEmpresa(prev => ({
      ...prev,
      [empresaActiva.id]: (prev[empresaActiva.id] || []).map(c => c.codigo === codigo ? { ...c, ...cuentaActualizada } : c)
    }));
  };

  const eliminarCuenta = (codigo) => {
    setPlanesPorEmpresa(prev => ({
      ...prev,
      [empresaActiva.id]: (prev[empresaActiva.id] || []).filter(c => c.codigo !== codigo)
    }));
  };

  const reemplazarPlanContable = (nuevoPlan) => {
    if (!empresaActiva) return;
    setPlanesPorEmpresa(prev => ({
      ...prev,
      [empresaActiva.id]: nuevoPlan
    }));
  };

  // 3. REGISTRAR CUENTA BANCARIA
  const agregarBanco = (nuevoBanco) => {
    const banco = {
      ...nuevoBanco,
      id: `BC_${Date.now()}`,
      saldoLibros: parseFloat(nuevoBanco.saldoInicial || 0),
      saldoExtracto: parseFloat(nuevoBanco.saldoInicial || 0),
      diferenciaGMF: 0.00,
      estado: "CUADRADO"
    };
    setBancos(prev => [...prev, banco]);
  };

  // 4. MÓDULO DE COMPRAS (Cálculo 1.18, Crédito vs Contado con doble asiento)
  const registrarCompra = ({ ruc, razonSocial, serieNumero, fecha, concepto, plantillaCodigo, total, modalidad, bancoPago, centroCostos }) => {
    const totalNum = parseFloat(total);
    const subtotal = parseFloat((totalNum / 1.18).toFixed(2));
    const igv = parseFloat((totalNum - subtotal).toFixed(2));

    const plant = plantillas.find(p => p.codigo === plantillaCodigo) || plantillas[0];

    // Utilizar el Motor Contable para Asiento 1: Provisión
    const engineProv = generarAsientoContable({
      tipoOperacion: 'COMPRA',
      total: totalNum,
      concepto,
      plantilla: plant,
      centroCostos,
      ruc,
      razonSocial
    }, planContable);

    if (!engineProv.esValido) {
      alert("Error de motor contable (Provisión Compra):\n" + engineProv.errores.join('\n'));
      return;
    }

    const voucherProvNum = generarCorrelativoVoucher();
    let voucherPagoNum = null;

    const nuevoVoucherProvision = {
      id: voucherProvNum,
      numero: voucherProvNum,
      fecha,
      subdiario: "05 Compras",
      tipoDoc: "FAC",
      docRef: serieNumero,
      entidadRuc: ruc,
      entidadNombre: razonSocial,
      glosa: `Provisión Compra ${serieNumero} - ${concepto}`,
      estado: "ASENTADO",
      lineas: engineProv.lineas
    };

    const nuevosVouchers = [nuevoVoucherProvision];

    // Camino B: Al Contado
    if (modalidad === "CONTADO" && bancoPago) {
      const bancoObj = bancos.find(b => b.alias === bancoPago);
      const ctaBanco = bancoObj ? bancoObj.codigoContable : "104101";

      const enginePago = generarAsientoContable({
        tipoOperacion: 'PAGO',
        total: totalNum,
        plantilla: plant,
        bancoCobroPago: ctaBanco,
        razonSocial
      }, planContable);

      if (!enginePago.esValido) {
        alert("Error de motor contable (Pago Compra):\n" + enginePago.errores.join('\n'));
        return;
      }

      const vNum2 = `VOU-09-${String(vouchers.length + 2).padStart(4, '0')}`;
      voucherPagoNum = vNum2;

      const nuevoVoucherPago = {
        id: vNum2,
        numero: vNum2,
        fecha,
        subdiario: "02 Egresos / Pagos",
        tipoDoc: "OPE",
        docRef: `PAGO-${serieNumero}`,
        entidadRuc: ruc,
        entidadNombre: razonSocial,
        glosa: `Cancelación al Contado Factura ${serieNumero} via ${bancoPago}`,
        estado: "ASENTADO",
        lineas: enginePago.lineas
      };
      nuevosVouchers.push(nuevoVoucherPago);

      // Descontar saldo del banco
      setBancos(prev => prev.map(b => b.alias === bancoPago ? { ...b, saldoLibros: b.saldoLibros - totalNum } : b));
    }

    // Guardar factura
    const nuevaFactura = {
      id: `FC-${Date.now()}`,
      tipoDoc: "01 Factura",
      serieNumero,
      fecha,
      ruc,
      razonSocial,
      concepto,
      plantilla: plantillaCodigo,
      total: totalNum,
      subtotal,
      igv,
      modalidad,
      bancoPago: modalidad === "CONTADO" ? bancoPago : "",
      estadoPago: modalidad === "CONTADO" ? "PAGADO" : "PENDIENTE",
      saldoPendiente: modalidad === "CONTADO" ? 0.00 : totalNum,
      voucherProvision: voucherProvNum,
      voucherPago: voucherPagoNum
    };

    setCompras(prev => [nuevaFactura, ...prev]);
    setVouchers(prev => [...nuevosVouchers, ...prev]);
  };

  // 5. MÓDULO DE VENTAS (Crédito vs Contado con cobro inmediato)
  const registrarVenta = ({ ruc, razonSocial, serieNumero, fecha, concepto, plantillaCodigo, total, modalidad, bancoCobro }) => {
    const totalNum = parseFloat(total);
    const subtotal = parseFloat((totalNum / 1.18).toFixed(2));
    const igv = parseFloat((totalNum - subtotal).toFixed(2));

    const plant = plantillas.find(p => p.codigo === plantillaCodigo) || plantillas[3];

    // Utilizar el Motor Contable para Asiento 1: Provisión
    const engineProv = generarAsientoContable({
      tipoOperacion: 'VENTA',
      total: totalNum,
      concepto,
      plantilla: plant,
      ruc,
      razonSocial
    }, planContable);

    if (!engineProv.esValido) {
      alert("Error de motor contable (Provisión Venta):\n" + engineProv.errores.join('\n'));
      return;
    }

    const voucherProvNum = generarCorrelativoVoucher();
    let voucherCobroNum = null;

    const nuevoVoucherProvision = {
      id: voucherProvNum,
      numero: voucherProvNum,
      fecha,
      subdiario: "08 Ventas",
      tipoDoc: "FAC",
      docRef: serieNumero,
      entidadRuc: ruc,
      entidadNombre: razonSocial,
      glosa: `Provisión Venta ${serieNumero} - ${concepto}`,
      estado: "ASENTADO",
      lineas: engineProv.lineas
    };

    const nuevosVouchers = [nuevoVoucherProvision];

    // Camino B: Al Contado (Cobro Inmediato)
    if (modalidad === "CONTADO" && bancoCobro) {
      const bancoObj = bancos.find(b => b.alias === bancoCobro);
      const ctaBanco = bancoObj ? bancoObj.codigoContable : "104101";
      
      const engineCobro = generarAsientoContable({
        tipoOperacion: 'COBRO',
        total: totalNum,
        plantilla: plant,
        bancoCobroPago: ctaBanco,
        razonSocial
      }, planContable);

      if (!engineCobro.esValido) {
        alert("Error de motor contable (Cobro Venta):\n" + engineCobro.errores.join('\n'));
        return;
      }

      const vNum2 = `VOU-09-${String(vouchers.length + 2).padStart(4, '0')}`;
      voucherCobroNum = vNum2;

      const nuevoVoucherCobro = {
        id: vNum2,
        numero: vNum2,
        fecha,
        subdiario: "01 Ingresos / Cobranzas",
        tipoDoc: "OPE",
        docRef: `COBRO-${serieNumero}`,
        entidadRuc: ruc,
        entidadNombre: razonSocial,
        glosa: `Cobro al Contado Factura ${serieNumero} ingresado a ${bancoCobro}`,
        estado: "ASENTADO",
        lineas: engineCobro.lineas
      };
      nuevosVouchers.push(nuevoVoucherCobro);

      // Incrementar saldo del banco
      setBancos(prev => prev.map(b => b.alias === bancoCobro ? { ...b, saldoLibros: b.saldoLibros + totalNum } : b));
    }

    const nuevaFacturaVenta = {
      id: `FV-${Date.now()}`,
      tipoDoc: "01 Factura",
      serieNumero,
      fecha,
      ruc,
      razonSocial,
      concepto,
      plantilla: plantillaCodigo,
      total: totalNum,
      subtotal,
      igv,
      modalidad,
      bancoCobro: modalidad === "CONTADO" ? bancoCobro : "",
      estadoCobro: modalidad === "CONTADO" ? "COBRADO" : "PENDIENTE",
      saldoPendiente: modalidad === "CONTADO" ? 0.00 : totalNum,
      voucherProvision: voucherProvNum,
      voucherCobro: voucherCobroNum
    };

    setVentas(prev => [nuevaFacturaVenta, ...prev]);
    setVouchers(prev => [...nuevosVouchers, ...prev]);
  };

  // 6. MÓDULO DE TESORERÍA (Pagos Multi-Banco y Cobros de facturas a crédito)
  const pagarFacturaPendiente = (facturaId, pagosMultiBanco) => {
    // pagosMultiBanco: [{ bancoAlias: "BCP_SOLES", monto: 5000 }, { bancoAlias: "INTERBANK_SOLES", monto: 6800 }]
    const fact = compras.find(f => f.id === facturaId);
    if (!fact) return;

    const montoTotalPagado = pagosMultiBanco.reduce((acc, p) => acc + parseFloat(p.monto || 0), 0);
    const voucherNum = generarCorrelativoVoucher();

    // Líneas del asiento de pago
    // Debe: 4212101 por el total de la obligación
    // Haber: Cada banco por su respectivo monto asignado
    const lineasPago = [
      { cta: "4212101", desc: `CANCELACIÓN TOTAL DEUDA FAC ${fact.serieNumero}`, cc: "", debe: montoTotalPagado, haber: 0.00 }
    ];

    pagosMultiBanco.forEach(p => {
      const bObj = bancos.find(b => b.alias === p.bancoAlias);
      const ctaB = bObj ? bObj.codigoContable : "104101";
      lineasPago.push({
        cta: ctaB,
        desc: `DESEMBOLSO DESDE ${p.bancoAlias}`,
        cc: "",
        debe: 0.00,
        haber: parseFloat(p.monto)
      });
      // Actualizar saldo del banco
      setBancos(prev => prev.map(b => b.alias === p.bancoAlias ? { ...b, saldoLibros: b.saldoLibros - parseFloat(p.monto) } : b));
    });

    const nuevoVoucherPago = {
      id: voucherNum,
      numero: voucherNum,
      fecha: new Date().toISOString().split('T')[0],
      subdiario: "02 Egresos / Pagos",
      tipoDoc: "OPE",
      docRef: `PAGO-TES-${fact.serieNumero}`,
      entidadRuc: fact.ruc,
      entidadNombre: fact.razonSocial,
      glosa: `Liquidación Tesorería Multi-Banco Factura ${fact.serieNumero}`,
      estado: "ASENTADO",
      lineas: lineasPago
    };

    setVouchers(prev => [nuevoVoucherPago, ...prev]);
    setCompras(prev => prev.map(f => f.id === facturaId ? { ...f, estadoPago: "PAGADO", saldoPendiente: 0.00, voucherPago: voucherNum } : f));
  };

  const cobrarFacturaPendiente = (facturaId, bancoCobroAlias, monto) => {
    const fact = ventas.find(f => f.id === facturaId);
    if (!fact) return;

    const montoNum = parseFloat(monto || fact.saldoPendiente);
    const voucherNum = generarCorrelativoVoucher();
    const bObj = bancos.find(b => b.alias === bancoCobroAlias);
    const ctaB = bObj ? bObj.codigoContable : "104101";

    const nuevoVoucherCobro = {
      id: voucherNum,
      numero: voucherNum,
      fecha: new Date().toISOString().split('T')[0],
      subdiario: "01 Ingresos / Cobranzas",
      tipoDoc: "OPE",
      docRef: `COBRO-TES-${fact.serieNumero}`,
      entidadRuc: fact.ruc,
      entidadNombre: fact.razonSocial,
      glosa: `Cobro Factura ${fact.serieNumero} en ${bancoCobroAlias}`,
      estado: "ASENTADO",
      lineas: [
        { cta: ctaB, desc: `RECAUDO EN ${bancoCobroAlias}`, cc: "", debe: montoNum, haber: 0.00 },
        { cta: "1212101", desc: `CANCELACIÓN CUENTA POR COBRAR - ${fact.razonSocial}`, cc: "", debe: 0.00, haber: montoNum }
      ]
    };

    setVouchers(prev => [nuevoVoucherCobro, ...prev]);
    setBancos(prev => prev.map(b => b.alias === bancoCobroAlias ? { ...b, saldoLibros: b.saldoLibros + montoNum } : b));
    setVentas(prev => prev.map(f => f.id === facturaId ? { ...f, estadoCobro: "COBRADO", saldoPendiente: 0.00, voucherCobro: voucherNum } : f));
  };

  // 7. CONCILIACIÓN BANCARIA (Autoconciliar y Generar Ajuste GMF)
  const autoconciliarPartidas = () => {
    setPartidasExtracto(prev => prev.map(p => {
      if (p.valorExtracto === p.valorLibros) {
        return { ...p, estado: "CONCILIADO", accion: "CONCILIADO" };
      }
      return p;
    }));
  };

  const generarAjusteGMF = (partidaId) => {
    const part = partidasExtracto.find(p => p.id === partidaId);
    if (!part) return;

    const montoAjuste = Math.abs(part.valorExtracto);
    const voucherNum = generarCorrelativoVoucher();

    // Asiento de ajuste bancario (GMF / Comisiones bancarias no registradas en libros)
    // Debe: 6511101 (Gastos de gestión / bancarios) con amarre / Haber: 104101 (Banco BCP)
    const nuevoVoucher = {
      id: voucherNum,
      numero: voucherNum,
      fecha: part.fecha,
      subdiario: "02 Egresos / Pagos",
      tipoDoc: "BAN",
      docRef: "GMF-AJUSTE",
      entidadRuc: "20100047218",
      entidadNombre: "Banco de Crédito del Perú",
      glosa: `Ajuste Conciliación Bancaria - GMF/Comisiones ${part.referencia}`,
      estado: "ASENTADO",
      lineas: [
        { cta: "6511101", desc: "GASTOS BANCARIOS / GMF REGISTRADO", cc: "CC-ADMIN", debe: montoAjuste, haber: 0.00 },
        { cta: "104101", desc: "BANCO BCP - REGISTRO DE SALIDA", cc: "", debe: 0.00, haber: montoAjuste },
        { cta: "9411101", desc: "DESTINO GASTOS ADMINISTRATIVOS", cc: "CC-ADMIN", debe: montoAjuste, haber: 0.00 },
        { cta: "7911101", desc: "CARGAS IMPUTABLES A CUENTAS DE GASTO", cc: "", debe: 0.00, haber: montoAjuste }
      ]
    };

    setVouchers(prev => [nuevoVoucher, ...prev]);
    setPartidasExtracto(prev => prev.map(p => p.id === partidaId ? { ...p, valorLibros: p.valorExtracto, estado: "CONCILIADO", accion: "CONCILIADO" } : p));
    setBancos(prev => prev.map(b => b.alias === "BCP_SOLES" ? { ...b, saldoLibros: b.saldoLibros - montoAjuste, diferenciaGMF: 0.00, estado: "CUADRADO" } : b));
  };

  // 8. CIERRE CONTABLE ANUAL (Refundición de cuentas e inicio de nuevo año)
  const ejecutarCierreContable = () => {
    // 1. Calcular Utilidad: Ingresos (Elemento 7) - Gastos (Elemento 6)
    let totalIngresos = 0;
    let totalGastos = 0;

    vouchers.forEach(v => {
      v.lineas.forEach(l => {
        if (l.cta.startsWith('7') && !l.cta.startsWith('79')) {
          totalIngresos += (l.haber - l.debe);
        } else if (l.cta.startsWith('6')) {
          totalGastos += (l.debe - l.haber);
        }
      });
    });

    const utilidadNeta = totalIngresos - totalGastos;
    const vCierreNum = `VOU-12-CIERRE`;

    // Asiento de Cierre (Voltea todas las cuentas de ingresos y gastos para dejarlas en 0)
    const lineasCierre = [
      { cta: "7012101", desc: "CIERRE DE CUENTAS DE INGRESOS (REFUNDICIÓN)", cc: "", debe: totalIngresos, haber: 0.00 },
      { cta: "6011101", desc: "CIERRE DE CUENTAS DE GASTOS/COSTOS", cc: "", debe: 0.00, haber: totalGastos },
      { cta: "8911101", desc: "RESULTADO DEL EJERCICIO - UTILIDAD NETA", cc: "", debe: 0.00, haber: utilidadNeta }
    ];

    const voucherCierre = {
      id: vCierreNum,
      numero: vCierreNum,
      fecha: "2026-12-31",
      subdiario: "00 Cierre y Regularización",
      tipoDoc: "CIE",
      docRef: "CIERRE-2026",
      entidadRuc: empresaActiva.ruc,
      entidadNombre: empresaActiva.razonSocial,
      glosa: "Asiento de Cierre Anual y Refundición de Cuentas de Gestión 2026",
      estado: "ASENTADO",
      lineas: lineasCierre
    };

    // Asiento de Apertura 2027 (Jala saldos de Bancos 10 y Activos)
    const vAperturaNum = `VOU-01-APERTURA-2027`;
    const lineasApertura = [
      { cta: "104101", desc: "SALDO INICIAL BANCO BCP SOLES", cc: "", debe: 145200.10, haber: 0.00 },
      { cta: "104102", desc: "SALDO INICIAL BANCO INTERBANK", cc: "", debe: 62450.00, haber: 0.00 },
      { cta: "1212101", desc: "SALDO INICIAL CUENTAS POR COBRAR", cc: "", debe: 14160.00, haber: 0.00 },
      { cta: "5011101", desc: "CAPITAL SOCIAL REINVERTIDO", cc: "", debe: 0.00, haber: 200000.00 },
      { cta: "8911101", desc: "UTILIDADES ACUMULADAS", cc: "", debe: 0.00, haber: 21810.10 }
    ];

    const voucherApertura = {
      id: vAperturaNum,
      numero: vAperturaNum,
      fecha: "2027-01-01",
      subdiario: "00 Apertura",
      tipoDoc: "APE",
      docRef: "APERTURA-2027",
      entidadRuc: empresaActiva.ruc,
      entidadNombre: empresaActiva.razonSocial,
      glosa: "Asiento de Apertura del Nuevo Ejercicio Fiscal 2027",
      estado: "ASENTADO",
      lineas: lineasApertura
    };

    setVouchers(prev => [voucherApertura, voucherCierre, ...prev]);
    setCierreEjecutado(true);
  };

  return (
    <AccountingContext.Provider value={{
      empresas,
      empresaActiva,
      setEmpresaActiva,
      agregarEmpresa,
      periodoActivo,
      setPeriodoActivo,
      planContable,
      agregarCuenta,
      modificarCuenta,
      eliminarCuenta,
      reemplazarPlanContable,
      bancos,
      agregarBanco,
      plantillas,
      compras,
      registrarCompra,
      ventas,
      registrarVenta,
      pagarFacturaPendiente,
      cobrarFacturaPendiente,
      vouchers,
      partidasExtracto,
      autoconciliarPartidas,
      generarAjusteGMF,
      ejecutarCierreContable,
      cierreEjecutado
    }}>
      {children}
    </AccountingContext.Provider>
  );
};

export const useAccounting = () => {
  const context = useContext(AccountingContext);
  if (!context) {
    throw new Error('useAccounting debe ser usado dentro de un AccountingProvider');
  }
  return context;
};
