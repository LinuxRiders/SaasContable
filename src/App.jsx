import React, { useState } from 'react';
import { AccountingProvider } from './context/AccountingContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { EmpresasView } from './views/EmpresasView';
import { PlanContableView } from './views/PlanContableView';
import { BancosView } from './views/BancosView';
import { PlantillasEmpresaView } from './views/PlantillasEmpresaView';
import { UsuariosView } from './views/UsuariosView';
import { ComprasView } from './views/ComprasView';
import { VentasView } from './views/VentasView';
import { TesoreriaView } from './views/TesoreriaView';
import { LibrosContablesView } from './views/LibrosContablesView';
import { ConciliacionView } from './views/ConciliacionView';
import { LiquidacionIGVView } from './views/LiquidacionIGVView';
import { CierreEjercicioView } from './views/CierreEjercicioView';
import { BackupsView } from './views/BackupsView';
import { TablasSunatView } from './views/TablasSunatView';

import { IngestionView } from './views/IngestionView';
import { BandejaView } from './views/BandejaView';
import { PendientesAprobacionView } from './views/PendientesAprobacionView';
import { PlantillasGlobalesView } from './views/PlantillasGlobalesView';

import { LoginView } from './views/LoginView';
import { useAccounting } from './context/AccountingContext';

export function AppContent() {
  const { sesionUsuario, empresaActiva } = useAccounting();
  const [activeTab, setActiveTab] = React.useState('empresas');

  React.useEffect(() => {
    if (empresaActiva) {
      setActiveTab('compras');
    } else {
      setActiveTab('empresas');
    }
  }, [empresaActiva]);

  const tabTitles = {
    empresas: "Información de Compañías Usuarias (Figma 118-2)",
    plan: "Plan Contable General Empresarial (PCGE 2026)",
    bancos: "Catálogo de Cuentas Bancarias y Tesorería",
    plantillas: "Plantillas de Automatización Contable",
    usuarios: "Usuarios del Estudio y Segregación de Funciones",
    compras: "Módulo de Compras (Gestión Proveedores y Cálculo IGV)",
    ventas: "Módulo de Ventas (Gestión Clientes y Débito Fiscal)",
    tesoreria: "Tesorería - Gestión de Cobros, Pagos y Multi-Banco",
    libros: "Libros Contables: Diario, Mayor Auxiliar y Balances",
    conciliacion: "Conciliación Bancaria y Detalle de Desembolsos",
    liquidacion: "Liquidación Mensual de IGV (SUNAT)",
    cierre: "Cierre Contable Anual y Asientos de Refundición",
    ingestion: "Ingestión Manual de Comprobantes (Maker)",
    bandeja: "Bandeja de Entrada (Borradores y Staging)",
    pendientes: "Pendientes de Aprobación (Checker)"
  };

  const renderView = () => {
    switch (activeTab) {
      case 'empresas':
        return <EmpresasView />;
      case 'plan':
        return <PlanContableView />;
      case 'bancos':
        return <BancosView />;
      case 'plantillas':
        return <PlantillasEmpresaView onNavigate={(tab) => setActiveTab(tab)} />;
      case 'usuarios':
        return <UsuariosView />;
      case 'compras':
        return <ComprasView />;
      case 'ventas':
        return <VentasView />;
      case 'tesoreria':
        return <TesoreriaView />;
      case 'libros':
        return <LibrosContablesView />;
      case 'conciliacion':
        return <ConciliacionView />;
      case 'liquidacion':
        return <LiquidacionIGVView />;
      case 'cierre':
        return <CierreEjercicioView />;
      case 'backups':
        return <BackupsView />;
      case 'tablas_sunat':
        return <TablasSunatView />;
      case 'plantillas_globales':
        return <PlantillasGlobalesView />;
      case 'ingestion':
        return <IngestionView />;
      case 'bandeja':
        return <BandejaView />;
      case 'pendientes':
        return <PendientesAprobacionView />;
      default:
        return <EmpresasView />;
    }
  };

  if (!sesionUsuario) {
    return <LoginView />;
  }

  return (
    <div className="app-layout">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="main-area">
        <Header title={tabTitles[activeTab] || "Sistema Contable"} />
        {renderView()}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AccountingProvider>
      <AppContent />
    </AccountingProvider>
  );
}
