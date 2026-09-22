import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { useAccessManagement } from './gestion-usuarios-empresas/state/AccessManagementContext';
import { 
  LayoutDashboard,
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
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';

// Isotipo geométrico minimalista (Hexágono con trazo técnico de 2.5px)
const HexagonIsotype = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2.5l7.5 4.33v8.66L12 19.82l-7.5-4.33V6.83L12 2.5z" />
    <circle cx="12" cy="11.5" r="2.5" fill="currentColor" />
  </svg>
);

export const Sidebar = ({ activeTab, setActiveTab }) => {
  const { periodoActivo, estadoPeriodo, empresaActiva, cerrarSesion } = useAccounting();
  const { currentUser, getRole } = useAccessManagement();
  const [collapsed, setCollapsed] = useState(false);

  const studyPermissions = getRole(currentUser?.studyRoleId)?.permissions || [];
  const companyAssignment = currentUser?.assignments?.find((assignment) => assignment.companyId === empresaActiva?.id);
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
      group: "ADMINISTRACIÓN DEL ESTUDIO",
      code: "SEC-01",
      items: [
        { id: "dashboard", label: "Dashboard General", shortcut: "[G00]", icon: LayoutDashboard },
        { id: "empresas", label: "Cartera de Empresas", shortcut: "[G01]", icon: Building2 },
        { id: "usuarios", label: "Gestión de Usuarios", shortcut: "[G02]", icon: Users, visible: canViewStudyUsers },
        { id: "roles_estudio", label: "Roles y Permisos", shortcut: "[G03]", icon: ShieldCheck, visible: canManageStudyRoles },
        { id: "backups", label: "Copias de Seguridad", shortcut: "[G04]", icon: Database },
      ]
    },
    {
      group: "CONFIGURACIÓN MAESTRA",
      code: "SEC-02",
      items: [
        { id: "tablas_sunat", label: "Tablas Maestras SUNAT", shortcut: "[G05]", icon: Table },
        { id: "plantillas_globales", label: "Plantillas Globales", shortcut: "[G06]", icon: FileCode2 }
      ]
    }
  ];

  const companyNavItems = [
    {
      group: "TABLERO & OPERACIONES",
      code: "MOD-01",
      items: [
        { id: "dashboard", label: "Dashboard de la Empresa", shortcut: "[M00]", icon: LayoutDashboard },
        { id: "compras", label: "Compras & Proveedores", shortcut: "[M01]", icon: ShoppingCart },
        { id: "ventas", label: "Ventas & Clientes", shortcut: "[M02]", icon: TrendingUp },
        { id: "tesoreria", label: "Tesorería & Cuentas", shortcut: "[M03]", icon: Wallet },
        { id: "conciliacion", label: "Conciliación Bancaria", shortcut: "[M04]", icon: FileCheck }
      ]
    },
    {
      group: "CONTABILIDAD Y LIBROS",
      code: "MOD-02",
      items: [
        { id: "libros", label: "Libros (Diario / Mayor)", shortcut: "[M05]", icon: Scale },
        { id: "liquidacion", label: "Liquidación de IGV", shortcut: "[M06]", icon: Receipt },
        { id: "cierre", label: "Cierre de Ejercicio", shortcut: "[M07]", icon: LockKeyhole }
      ]
    },
    {
      group: "CONFIGURACIÓN EMPRESA",
      code: "CFG-01",
      items: [
        { id: "plan", label: "Catálogo de Cuentas", shortcut: "[C01]", icon: BookOpen },
        { id: "plantillas", label: "Plantillas Contables", shortcut: "[C02]", icon: FileCode2 },
        { id: "usuarios_empresa", label: "Usuarios de Empresa", shortcut: "[C03]", icon: Users, visible: canManageCompanyUsers },
        { id: "roles_empresa", label: "Roles y Permisos", shortcut: "[C04]", icon: ShieldCheck, visible: canManageCompanyRoles }
      ]
    }
  ];

  const navItems = empresaActiva ? companyNavItems : globalNavItems;

  const userInitials = (currentUser?.name || currentUser?.nombre || 'AD')
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const userRoleName = currentUser?.studyRoleId?.replace('role-', '').toUpperCase() || 'ADMIN';

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : 'sidebar--expanded'}`}>
      {/* HEADER IDENTIDAD & TOGGLE (SIN COLISIÓN NI SUPERPOSICIÓN) */}
      <div 
        className="sidebar__header"
        style={collapsed ? { 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '8px', 
          padding: '12px 6px',
          minHeight: '80px'
        } : {}}
      >
        <div className="sidebar__brand-container" style={collapsed ? { justifyContent: 'center' } : {}}>
          <div className="sidebar__isotype" title="CONTABLE.OS">
            <HexagonIsotype />
          </div>
          {!collapsed && (
            <div className="sidebar__brand-info">
              <div className="sidebar__brand-badge">CONTABLE.OS</div>
              <div className="sidebar__brand-sub">SYS-VER::2.4.0-PROT</div>
            </div>
          )}
        </div>
        <button 
          className="sidebar__toggle-btn"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expandir menú (270px)" : "Contraer menú (72px)"}
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronRight size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </div>

      {/* PERIODO ACTIVO (Visible si hay empresa seleccionada) */}
      {empresaActiva && !collapsed && (
        <div className="sidebar__period-card">
          <div className="sidebar__period-title">PERÍODO FISCAL ACTIVO</div>
          <div className="sidebar__period-val">{periodoActivo || '2026-01'}</div>
          <div className="sidebar__period-sub">
            <span style={{ 
              width: 6, height: 6, borderRadius: '50%', 
              backgroundColor: estadoPeriodo === 'ABIERTO' ? '#10B981' : '#EF4444', 
              display: 'inline-block' 
            }}></span>
            <span>ESTADO: {estadoPeriodo || 'ABIERTO'}</span>
          </div>
        </div>
      )}

      {/* LISTA DE NAVEGACIÓN */}
      <nav className="sidebar__nav">
        {navItems.map((group, idx) => (
          <div key={idx} style={{ marginBottom: collapsed ? '6px' : '8px' }}>
            {!collapsed && (
              <div className="sidebar__group-label">
                <span>{group.group}</span>
              </div>
            )}
            {group.items.filter((item) => item.visible !== false).map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <div
                  key={item.id}
                  className={`sidebar__item ${isActive ? 'sidebar__item--active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                  title={collapsed ? `${item.shortcut} ${item.label}` : undefined}
                >
                  <Icon size={14} style={{ opacity: isActive ? 1 : 0.75, flexShrink: 0 }} />
                  {!collapsed && (
                    <>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                      <span className="sidebar__item-shortcut">{item.shortcut}</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* PIE DEL MENÚ: USUARIO CONECTADO & SALIR */}
      <div className="sidebar__footer">
        <div className="sidebar__user-card" title={`${currentUser?.name || 'Administrador'} (${userRoleName})`}>
          <div className="sidebar__user-avatar">
            {userInitials}
          </div>
          {!collapsed && (
            <div className="sidebar__user-info" style={{ flex: 1 }}>
              <div className="sidebar__user-name">{currentUser?.name || currentUser?.nombre || 'Admin Usuario'}</div>
              <div className="sidebar__user-role">
                <ShieldCheck size={11} color="#94A3B8" />
                <span>ROL: {userRoleName}</span>
              </div>
            </div>
          )}
          {!collapsed && (
            <button 
              onClick={handleLogout}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                transition: 'color 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#94A3B8'}
              title="Cerrar sesión"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
