import React from 'react';
import { useAccounting } from '../context/AccountingContext';
import { 
  Building2, 
  BookOpen, 
  Landmark, 
  FileCode2, 
  Users, 
  ShoppingCart, 
  TrendingUp, 
  Wallet, 
  Scale, 
  Receipt, 
  FileCheck, 
  LockKeyhole,
  CheckCircle2
} from 'lucide-react';

export const Sidebar = ({ activeTab, setActiveTab }) => {
  const { periodoActivo, empresaActiva } = useAccounting();

  const navItems = [
    {
      group: "1. CONFIGURACIÓN",
      items: [
        { id: "empresas", label: "Compañías Usuarias", shortcut: "[C1]", icon: Building2 },
        { id: "plan", label: "Plan Contable General", shortcut: "[C2]", icon: BookOpen },
        { id: "bancos", label: "Catálogo de Bancos", shortcut: "[C3]", icon: Landmark },
        { id: "plantillas", label: "Plantillas Automatización", shortcut: "[C4]", icon: FileCode2 },
        { id: "usuarios", label: "Usuarios y Segregación", shortcut: "[C5]", icon: Users }
      ]
    },
    {
      group: "2. OPERACIONES",
      items: [
        { id: "compras", label: "Compras (Proveedores)", shortcut: "[M1]", icon: ShoppingCart },
        { id: "ventas", label: "Ventas (Clientes)", shortcut: "[M2]", icon: TrendingUp },
        { id: "tesoreria", label: "Tesorería (Caja / Bancos)", shortcut: "[M3]", icon: Wallet }
      ]
    },
    {
      group: "3. CONTABILIDAD Y LIBROS",
      items: [
        { id: "libros", label: "Libro Diario y Mayor", shortcut: "[M4]", icon: Scale },
        { id: "conciliacion", label: "Conciliación Bancaria", shortcut: "[M5]", icon: FileCheck },
        { id: "liquidacion", label: "Liquidación Mensual IGV", shortcut: "[M6]", icon: Receipt }
      ]
    },
    {
      group: "4. CIERRE ANUAL",
      items: [
        { id: "cierre", label: "Cierre de Ejercicio", shortcut: "[M7]", icon: LockKeyhole }
      ]
    }
  ];

  return (
    <aside className="sidebar">
      {/* BRAND */}
      <div className="sidebar__header">
        <div>
          <div className="sidebar__brand-badge">[CONTABLE_OS v2.4]</div>
          <div className="sidebar__brand-sub">SISTEMA INTEGRAL CONTABLE</div>
        </div>
      </div>

      {/* PERIODO ACTIVO CARD */}
      <div className="sidebar__period-card">
        <div className="sidebar__period-title">PERÍODO FISCAL ACTIVO</div>
        <div className="sidebar__period-val">{periodoActivo}</div>
        <div className="sidebar__period-sub">
          <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }}></span>
          Cierre: Abierto
        </div>
      </div>

      {/* NAVEGACIÓN */}
      <nav className="sidebar__nav">
        {navItems.map((group, idx) => (
          <div key={idx}>
            <div className="sidebar__group-label">{group.group}</div>
            {group.items.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <div
                  key={item.id}
                  className={`sidebar__item ${isActive ? 'sidebar__item--active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                >
                  <span className="sidebar__item-shortcut">{item.shortcut}</span>
                  <Icon size={14} style={{ opacity: isActive ? 1 : 0.7 }} />
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* FOOTER STATUS */}
      <div className="sidebar__footer">
        <div className="sidebar__status-box">
          <div className="sidebar__status-title">
            <CheckCircle2 size={13} color="#10B981" />
            STATUS: CUADRADO [✓]
          </div>
          <div className="sidebar__status-desc">
            Partida Doble General validada. Plan PCGE alineado.
          </div>
        </div>
      </div>
    </aside>
  );
};
