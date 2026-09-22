import React from 'react';
import { useAccounting } from '../context/AccountingContext';
import { useAccessManagement } from './gestion-usuarios-empresas/state/AccessManagementContext';
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
  CheckCircle2,
  Database,
  Table,
  LogOut,
  ShieldCheck
} from 'lucide-react';

export const Sidebar = ({ activeTab, setActiveTab }) => {
  const { periodoActivo, estadoPeriodo, empresaActiva, cerrarSesion } = useAccounting();
  const { currentUser, getRole } = useAccessManagement();

  const studyPermissions = getRole(currentUser?.studyRoleId)?.permissions || [];
  const companyAssignment = currentUser?.assignments.find((assignment) => assignment.companyId === empresaActiva?.id);
  const companyPermissions = getRole(companyAssignment?.roleId)?.permissions || [];
  const canViewStudyUsers = currentUser?.allCompanies || studyPermissions.some((permission) =>
    ['study.users.view', 'study.users.manage', 'study.users.invite'].includes(permission)
  );
  const canManageStudyRoles = currentUser?.allCompanies || studyPermissions.includes('study.roles.manage');
  const canManageCompanyUsers = currentUser?.allCompanies || companyPermissions.includes('company.users.manage');
  const canManageCompanyRoles = currentUser?.allCompanies || companyPermissions.includes('company.roles.manage');

  const handleLogout = () => {
    if (window.confirm("¿Está seguro que desea cerrar sesión?")) {
      cerrarSesion();
    }
  };

  const globalNavItems = [
    {
      group: "1. ADMINISTRACIÓN DEL ESTUDIO",
      items: [
        { id: "empresas", label: "Cartera de Empresas", shortcut: "[G1]", icon: Building2 },
        { id: "usuarios", label: "Gestión de Usuarios", shortcut: "[G2]", icon: Users, visible: canViewStudyUsers },
        { id: "roles_estudio", label: "Roles y Permisos", shortcut: "[G3]", icon: ShieldCheck, visible: canManageStudyRoles },
        { id: "backups", label: "Copias de Seguridad", shortcut: "[G4]", icon: Database },
      ]
    },
    {
      group: "2. CONFIGURACIÓN MAESTRA",
      items: [
        { id: "tablas_sunat", label: "Tablas Maestras SUNAT", shortcut: "[G5]", icon: Table },
        { id: "plantillas_globales", label: "Plantillas Globales", shortcut: "[G6]", icon: FileCode2 }
      ]
    }
  ];

  const companyNavItems = [
    {
      group: "1. OPERACIONES",
      items: [
        { id: "compras", label: "Compras", shortcut: "[M1]", icon: ShoppingCart },
        { id: "ventas", label: "Ventas", shortcut: "[M2]", icon: TrendingUp },
        { id: "tesoreria", label: "Tesorería & Bancos", shortcut: "[M3]", icon: Wallet },
        { id: "conciliacion", label: "Conciliación Bancaria", shortcut: "[M4]", icon: FileCheck }
      ]
    },
    {
      group: "2. CONTABILIDAD Y LIBROS",
      items: [
        { id: "libros", label: "Libros (Diario / Mayor)", shortcut: "[M5]", icon: Scale },
        { id: "liquidacion", label: "Liquidación de IGV", shortcut: "[M6]", icon: Receipt },
        { id: "cierre", label: "Cierre de Ejercicio", shortcut: "[M7]", icon: LockKeyhole }
      ]
    },
    {
      group: "3. CONFIGURACIÓN",
      items: [
        { id: "plan", label: "Catálogo de Cuentas", shortcut: "[C1]", icon: BookOpen },
        { id: "plantillas", label: "Plantillas de la Empresa", shortcut: "[C2]", icon: FileCode2 },
        { id: "usuarios_empresa", label: "Usuarios de la Empresa", shortcut: "[C3]", icon: Users, visible: canManageCompanyUsers },
        { id: "roles_empresa", label: "Roles y Permisos", shortcut: "[C4]", icon: ShieldCheck, visible: canManageCompanyRoles }
      ]
    }
  ];

  const navItems = empresaActiva ? companyNavItems : globalNavItems;

  return (
    <aside className="sidebar">
      {/* BRAND */}
      <div className="sidebar__header">
        <div>
          <div className="sidebar__brand-badge">[CONTABLE_OS v2.4]</div>
          <div className="sidebar__brand-sub">SISTEMA INTEGRAL CONTABLE</div>
        </div>
      </div>

      {/* PERIODO ACTIVO CARD (Solo visible si hay empresa) */}
      {empresaActiva && (
        <div className="sidebar__period-card">
          <div className="sidebar__period-title">PERÍODO FISCAL ACTIVO</div>
          <div className="sidebar__period-val">{periodoActivo || 'N/A'}</div>
          <div className="sidebar__period-sub">
            <span style={{ 
              width: 6, height: 6, borderRadius: '50%', 
              backgroundColor: estadoPeriodo === 'ABIERTO' ? '#10B981' : '#EF4444', 
              display: 'inline-block' 
            }}></span>
            Estado: {estadoPeriodo || 'ABIERTO'}
          </div>
        </div>
      )}

      {/* NAVEGACIÓN */}
      <nav className="sidebar__nav">
        {navItems.map((group, idx) => (
          <div key={idx}>
            <div className="sidebar__group-label">{group.group}</div>
            {group.items.filter((item) => item.visible !== false).map(item => {
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
        {!empresaActiva && (
          <div 
            className="sidebar__item" 
            style={{ color: '#ef4444', marginBottom: '1rem' }}
            onClick={handleLogout}
          >
            <span className="sidebar__item-shortcut">[SALIR]</span>
            <LogOut size={14} />
            <span>Cerrar Sesión</span>
          </div>
        )}
        <div className="sidebar__status-box">
          <div className="sidebar__status-title">
            <CheckCircle2 size={13} color="#10B981" />
            STATUS: CUADRADO [✓]
          </div>
          <div className="sidebar__status-desc">
            Sistema operativo y sincronizado
          </div>
        </div>
      </div>
    </aside>
  );
};
