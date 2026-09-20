import React, { useState } from 'react';
import { AccountingProvider } from './context/AccountingContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { EmpresasView } from './views/EmpresasView';
import { PlanContableView } from './views/PlanContableView';
import { BancosView } from './views/BancosView';
import { PlantillasView } from './views/PlantillasView';
import { UsuariosView } from './views/UsuariosView';
import { ComprasView } from './views/ComprasView';
import { VentasView } from './views/VentasView';
import { TesoreriaView } from './views/TesoreriaView';
import { LibrosContablesView } from './views/LibrosContablesView';
import { ConciliacionView } from './views/ConciliacionView';
import { LiquidacionIGVView } from './views/LiquidacionIGVView';
import { CierreEjercicioView } from './views/CierreEjercicioView';

export function AppContent() {
  const [activeTab, setActiveTab] = useState('compras');

  const tabTitles = {
    empresas: "Información de Compañías Usuarias (Figma 118-2)",
    plan: "Plan Contable General Empresarial (PCGE 2026)",
    bancos: "Catálogo de Cuentas Bancarias y Tesorería",
    plantillas: "Plantillas de Automatización Contable",
    usuarios: "Usuarios del Estudio y Segregación de Funciones",
    compras: "Módulo de Compras (Gestión Proveedores y Cálculo IGV)",
    ventas: "Módulo de Ventas (Gestión Clientes y Débito Fiscal)",
    tesoreria: "Tesorería — Gestión de Cobros, Pagos y Multi-Banco",
    libros: "Libros Contables: Diario, Mayor Auxiliar y Balances",
    conciliacion: "Conciliación Bancaria y Detalle de Desembolsos",
    liquidacion: "Liquidación Mensual de IGV (SUNAT)",
    cierre: "Cierre Contable Anual y Asientos de Refundición"
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
        return <PlantillasView />;
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
      default:
        return <ComprasView />;
    }
  };

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
