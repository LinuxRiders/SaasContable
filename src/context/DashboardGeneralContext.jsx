import React, { createContext, useContext, useState, useMemo } from 'react';
import { useAccounting } from './AccountingContext';
import { useAccessManagement } from '../components/gestion-usuarios-empresas/state/AccessManagementContext';
import { mockPlanContable } from '../data/mockPlanContable';

const DashboardGeneralContext = createContext(null);

export const DashboardGeneralProvider = ({ children, setActiveTab: parentSetActiveTab }) => {
  const { empresas, empresaActiva, planContable: contextPlanContable, vouchers, periodoActivo, estadoPeriodo } = useAccounting();
  const { currentUser, users } = useAccessManagement();

  const [activeTab, setActiveTabLocal] = useState('dashboard');
  const setActiveTab = parentSetActiveTab || setActiveTabLocal;

  // Estados de Filtro de Cuentas (activo cuando hay empresa seleccionada)
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState('');
  const [elementoSeleccionado, setElementoSeleccionado] = useState('');
  const [busquedaCuenta, setBusquedaCuenta] = useState('');

  // Plan Contable activo según la empresa
  const planContable = useMemo(() => {
    return (contextPlanContable && contextPlanContable.length > 0) ? contextPlanContable : mockPlanContable;
  }, [contextPlanContable]);

  const estudios = useMemo(() => [
    { id: 'est-1', razonSocial: 'ESTUDIO CONTABLE & TRIBUTARIO MATRIZ S.A.C.', ruc: '20608912345', plan: 'ENTERPRISE MULTITENANT' }
  ], []);

  const colaboradores = useMemo(() => users || [
    { id: 'usr-1', name: 'Diego Administrador', role: 'Administrador Principal', status: 'active' },
    { id: 'usr-2', name: 'María Contador', role: 'Contador General (Maker)', status: 'active' },
    { id: 'usr-3', name: 'Carlos Auditor', role: 'Auditor Externo (Checker)', status: 'active' }
  ], [users]);

  const accesos = useMemo(() => [
    { id: 'acc-1', modulo: 'Módulo de Compras & Proveedores', estado: 'ACTIVO' },
    { id: 'acc-2', modulo: 'Módulo de Ventas & Facturación', estado: 'ACTIVO' },
    { id: 'acc-3', modulo: 'Tesorería & Cuentas Bancarias', estado: 'ACTIVO' },
    { id: 'acc-4', modulo: 'Libros Electrónicos PLE SUNAT', estado: 'ACTIVO' },
    { id: 'acc-5', modulo: 'Liquidación Mensual de IGV', estado: 'ACTIVO' }
  ], []);

  const copiasSeguridad = useMemo(() => [
    { id: 'bck-01', fecha: '2026-01-28 23:59:00', sha256: '8f4c2e9b1a7d6e5f3c2b1a0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f', estado: 'VERIFICADO', tipo: 'AUTOMÁTICO' },
    { id: 'bck-02', fecha: '2026-01-27 23:59:00', sha256: '3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e', estado: 'VERIFICADO', tipo: 'AUTOMÁTICO' },
    { id: 'bck-03', fecha: '2026-01-26 23:59:00', sha256: '5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b', estado: 'VERIFICADO', tipo: 'MANUAL' }
  ], []);

  // Extracción de todos los movimientos contables desde los vouchers de la empresa
  const todosLosMovimientos = useMemo(() => {
    const lista = [];
    (vouchers || []).forEach(v => {
      (v.lineas || []).forEach((linea, idx) => {
        lista.push({
          id: `${v.id || v.numero}-${idx}`,
          voucherNumero: v.numero || v.id,
          fecha: v.fecha || '2026-01-15',
          concepto: v.glosa || linea.desc,
          docRef: v.docRef || '-',
          entidadNombre: v.entidadNombre || '-',
          cuentaCodigo: linea.cta,
          cuentaDesc: linea.desc,
          debe: linea.debe || 0,
          haber: linea.haber || 0,
          monto: (linea.debe || 0) > 0 ? linea.debe : linea.haber,
          tipo: (linea.debe || 0) > 0 ? 'DÉBITO' : 'CRÉDITO',
          estado: 'EFECTUADO'
        });
      });
    });

    if (lista.length === 0) {
      return [
        { id: 'mov-1', voucherNumero: 'VOU-01-0012', fecha: '2026-01-28', concepto: 'Cobranza Factura F001-000842 por Servicios', cuentaCodigo: '104101', cuentaDesc: 'BANCO BCP - CUENTA CORRIENTE MN', debe: 18450.00, haber: 0.00, monto: 18450.00, tipo: 'DÉBITO', estado: 'EFECTUADO' },
        { id: 'mov-2', voucherNumero: 'VOU-01-0012', fecha: '2026-01-28', concepto: 'Cancelación Cuentas por Cobrar Comerciales', cuentaCodigo: '1212101', cuentaDesc: 'FACTURAS, BOLETAS POR COBRAR', debe: 0.00, haber: 18450.00, monto: 18450.00, tipo: 'CRÉDITO', estado: 'EFECTUADO' },
        { id: 'mov-3', voucherNumero: 'VOU-01-0025', fecha: '2026-01-27', concepto: 'Pago Factura E001-3421 Cloud SAC', cuentaCodigo: '4212101', cuentaDesc: 'CUENTAS POR PAGAR COMERCIALES', debe: 4820.00, haber: 0.00, monto: 4820.00, tipo: 'DÉBITO', estado: 'EFECTUADO' },
        { id: 'mov-4', voucherNumero: 'VOU-01-0025', fecha: '2026-01-27', concepto: 'Desembolso BCP Servicios TI', cuentaCodigo: '104101', cuentaDesc: 'BANCO BCP - CUENTA CORRIENTE MN', debe: 0.00, haber: 4820.00, monto: 4820.00, tipo: 'CRÉDITO', estado: 'EFECTUADO' },
        { id: 'mov-5', voucherNumero: 'VOU-01-0038', fecha: '2026-01-26', concepto: 'Venta de Servicios Profesionales Asesoría', cuentaCodigo: '701201', cuentaDesc: 'VENTA LOCAL DE MERCADERÍAS/SERVICIOS', debe: 0.00, haber: 12500.00, monto: 12500.00, tipo: 'CRÉDITO', estado: 'EFECTUADO' },
        { id: 'mov-6', voucherNumero: 'VOU-01-0044', fecha: '2026-01-25', concepto: 'Pago Quincenal de Planilla Sueldos', cuentaCodigo: '4111101', cuentaDesc: 'SUELDOS Y SALARIOS POR PAGAR', debe: 14200.00, haber: 0.00, monto: 14200.00, tipo: 'DÉBITO', estado: 'EFECTUADO' },
        { id: 'mov-7', voucherNumero: 'VOU-01-0044', fecha: '2026-01-25', concepto: 'Salida Banco BCP Planilla', cuentaCodigo: '104101', cuentaDesc: 'BANCO BCP - CUENTA CORRIENTE MN', debe: 0.00, haber: 14200.00, monto: 14200.00, tipo: 'CRÉDITO', estado: 'EFECTUADO' },
        { id: 'mov-8', voucherNumero: 'VOU-01-0050', fecha: '2026-01-24', concepto: 'Pago Impuestos SUNAT Formulario 621 IGV', cuentaCodigo: '4011101', cuentaDesc: 'IGV - CUENTA PROPIA', debe: 3890.00, haber: 0.00, monto: 3890.00, tipo: 'DÉBITO', estado: 'EFECTUADO' },
        { id: 'mov-9', voucherNumero: 'VOU-01-0050', fecha: '2026-01-24', concepto: 'Salida Banco BBVA Pago Impuestos', cuentaCodigo: '104102', cuentaDesc: 'BANCO BBVA - CUENTA CORRIENTE MN', debe: 0.00, haber: 3890.00, monto: 3890.00, tipo: 'CRÉDITO', estado: 'EFECTUADO' },
        { id: 'mov-10', voucherNumero: 'VOU-01-0062', fecha: '2026-01-23', concepto: 'Ingreso Asesoría Financiera', cuentaCodigo: '104101', cuentaDesc: 'BANCO BCP - CUENTA CORRIENTE MN', debe: 7600.00, haber: 0.00, monto: 7600.00, tipo: 'DÉBITO', estado: 'EFECTUADO' }
      ];
    }
    return lista;
  }, [vouchers]);

  // Lista filtrada de movimientos según la cuenta o elemento seleccionado
  const movimientosFiltrados = useMemo(() => {
    return todosLosMovimientos.filter(m => {
      if (cuentaSeleccionada && !m.cuentaCodigo.startsWith(cuentaSeleccionada)) {
        return false;
      }
      if (elementoSeleccionado && !m.cuentaCodigo.startsWith(String(elementoSeleccionado))) {
        return false;
      }
      if (busquedaCuenta) {
        const term = busquedaCuenta.toLowerCase();
        const matchCode = m.cuentaCodigo.toLowerCase().includes(term);
        const matchDesc = m.cuentaDesc.toLowerCase().includes(term);
        const matchConcepto = m.concepto.toLowerCase().includes(term);
        if (!matchCode && !matchDesc && !matchConcepto) return false;
      }
      return true;
    });
  }, [todosLosMovimientos, cuentaSeleccionada, elementoSeleccionado, busquedaCuenta]);

  // Cuentas disponibles para el selector rápido de la empresa activa
  const cuentasParaFiltro = useMemo(() => {
    return planContable.filter(c => {
      if (elementoSeleccionado && c.elemento !== Number(elementoSeleccionado)) return false;
      if (busquedaCuenta) {
        const term = busquedaCuenta.toLowerCase();
        return c.codigo.toLowerCase().includes(term) || c.descripcion.toLowerCase().includes(term);
      }
      return true;
    });
  }, [planContable, elementoSeleccionado, busquedaCuenta]);

  // Información de la cuenta seleccionada
  const infoCuentaSeleccionada = useMemo(() => {
    if (!cuentaSeleccionada) return null;
    return planContable.find(c => c.codigo === cuentaSeleccionada) || {
      codigo: cuentaSeleccionada,
      descripcion: `CUENTA GRUPO ${cuentaSeleccionada}`,
      elemento: parseInt(cuentaSeleccionada.charAt(0), 10) || 1
    };
  }, [cuentaSeleccionada, planContable]);

  // Cálculos dinámicos según el filtro
  const metricasFiltradas = useMemo(() => {
    const totalDebe = movimientosFiltrados.reduce((acc, m) => acc + (m.debe || 0), 0);
    const totalHaber = movimientosFiltrados.reduce((acc, m) => acc + (m.haber || 0), 0);
    const countMovimientos = movimientosFiltrados.length;

    if (infoCuentaSeleccionada) {
      const elemento = infoCuentaSeleccionada.elemento;
      const esActivoOGasto = [1, 2, 3, 6].includes(elemento);
      const saldoBase = (infoCuentaSeleccionada.saldoDeudor || 0) - (infoCuentaSeleccionada.saldoAcreedor || 0);
      const saldoCalculado = esActivoOGasto 
        ? saldoBase + (totalDebe - totalHaber)
        : (infoCuentaSeleccionada.saldoAcreedor || 0) - (infoCuentaSeleccionada.saldoDeudor || 0) + (totalHaber - totalDebe);

      return {
        isFiltered: true,
        labelPrincipal: `Saldo Cta [${infoCuentaSeleccionada.codigo}]`,
        valorPrincipal: saldoCalculado,
        subtextPrincipal: `${infoCuentaSeleccionada.descripcion}`,
        totalDebe,
        totalHaber,
        flujoNeto: totalDebe - totalHaber,
        countMovimientos,
        naturaleza: esActivoOGasto ? 'DEUDORA (Activo/Gasto)' : 'ACREEDORA (Pasivo/Patrimonio/Ingreso)'
      };
    }

    const saldoTotalEmpresa = 328850.70;
    return {
      isFiltered: false,
      labelPrincipal: "Saldo Disponible Empresa",
      valorPrincipal: saldoTotalEmpresa,
      subtextPrincipal: "En cuentas bancarias y caja operativa",
      totalDebe,
      totalHaber,
      flujoNeto: totalDebe - totalHaber,
      countMovimientos,
      naturaleza: "CONSOLIDADO DE LA EMPRESA"
    };
  }, [movimientosFiltrados, infoCuentaSeleccionada]);

  const limpiarFiltroCuenta = () => {
    setCuentaSeleccionada('');
    setElementoSeleccionado('');
    setBusquedaCuenta('');
  };

  const currentFormattedUser = useMemo(() => {
    return {
      nombre: currentUser?.name || currentUser?.nombre || 'Administrador',
      rolPrincipal: currentUser?.studyRoleId?.replace('role-', '').toUpperCase() || 'ADMINISTRADOR MATRIZ',
      email: currentUser?.email || 'admin@contableos.pe'
    };
  }, [currentUser]);

  const value = {
    empresaActiva,
    empresas,
    estudios,
    colaboradores,
    accesos,
    copiasSeguridad,
    periodoActivo,
    estadoPeriodo,
    planContable,
    cuentasParaFiltro,
    cuentaSeleccionada,
    setCuentaSeleccionada,
    elementoSeleccionado,
    setElementoSeleccionado,
    busquedaCuenta,
    setBusquedaCuenta,
    limpiarFiltroCuenta,
    infoCuentaSeleccionada,
    metricasFiltradas,
    movimientosFiltrados,
    setActiveTab,
    currentUser: currentFormattedUser
  };

  return (
    <DashboardGeneralContext.Provider value={value}>
      {children}
    </DashboardGeneralContext.Provider>
  );
};

export const useDashboardGeneral = () => {
  const context = useContext(DashboardGeneralContext);
  if (!context) {
    throw new Error('useDashboardGeneral must be used within a DashboardGeneralProvider');
  }
  return context;
};
