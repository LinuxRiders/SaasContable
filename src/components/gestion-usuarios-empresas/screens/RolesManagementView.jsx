import React, { useState } from 'react';
import { Copy, Pencil, Plus, Shield, Users } from 'lucide-react';
import { useAccounting } from '../../../context/AccountingContext';
import { useAccessManagement } from '../state/AccessManagementContext';
import { RoleEditorModal } from './parts/RoleEditorModal';

const OriginBadge = ({ role, scope }) => {
  if (role.system) return <span className="access-origin access-origin--system">Sistema</span>;
  if (scope === 'COMPANY' && role.origin === 'STUDY') return <span className="access-origin access-origin--inherited">Heredado del estudio</span>;
  if (role.origin === 'COPIED') return <span className="access-origin access-origin--copied">Copiado y personalizado</span>;
  if (role.origin === 'LOCAL') return <span className="access-origin access-origin--local">Local</span>;
  return <span className="access-origin access-origin--study">Plantilla del estudio</span>;
};

export const RolesManagementView = ({ scope = 'STUDY' }) => {
  const { empresaActiva } = useAccounting();
  const { roles, users, currentUser, permissionsCatalog, getRole, getCompanyRoles, copyRoleToCompany } = useAccessManagement();
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  const visibleRoles = scope === 'COMPANY'
    ? getCompanyRoles(empresaActiva?.id)
    : roles.filter((role) => role.scope === 'STUDY' || (role.scope === 'COMPANY' && role.origin === 'STUDY'));

  const studyPermissions = getRole(currentUser?.studyRoleId)?.permissions || [];
  const companyAssignment = currentUser?.assignments.find((assignment) => assignment.companyId === empresaActiva?.id);
  const companyPermissions = getRole(companyAssignment?.roleId)?.permissions || [];
  const canManage = currentUser?.allCompanies || (scope === 'COMPANY'
    ? companyPermissions.includes('company.roles.manage')
    : studyPermissions.includes('study.roles.manage'));

  const openCreate = () => { setSelectedRole(null); setEditorOpen(true); };
  const openEdit = (role) => { setSelectedRole(role); setEditorOpen(true); };

  const usageCount = (roleId) => users.reduce((total, user) =>
    total + (user.studyRoleId === roleId ? 1 : 0) + user.assignments.filter((assignment) => assignment.roleId === roleId).length, 0
  );

  return (
    <div className="content-body access-page">
      <div className="access-page__header">
        <div>
          <div className="access-eyebrow">{scope === 'COMPANY' ? 'CONFIGURACIÓN DE LA EMPRESA' : 'ADMINISTRACIÓN DEL ESTUDIO'}</div>
          <h2>{scope === 'COMPANY' ? `Roles de ${empresaActiva?.abreviatura}` : 'Roles y permisos'}</h2>
          <p>{scope === 'COMPANY'
            ? 'Utiliza plantillas heredadas o crea variantes locales dentro del límite delegado.'
            : 'Administra roles globales y plantillas reutilizables para las empresas.'}</p>
        </div>
        {canManage && <button className="btn btn--primary" onClick={openCreate}><Plus size={15} /> {scope === 'COMPANY' ? 'Crear rol local' : 'Crear rol'}</button>}
      </div>

      <div className="access-role-grid">
        {visibleRoles.map((role) => {
          const inherited = scope === 'COMPANY' && role.origin === 'STUDY';
          return (
            <article key={role.id} className="access-role-card">
              <div className="access-role-card__top">
                <div className="access-role-icon"><Shield size={18} /></div>
                <OriginBadge role={role} scope={scope} />
              </div>
              <h3>{role.name}</h3>
              <p>{role.description}</p>
              <div className="access-role-stats">
                <span><Users size={13} /> {usageCount(role.id)} asignaciones</span>
                <span>{role.permissions.length} permisos</span>
              </div>
              <div className="access-permission-preview">
                {role.permissions.slice(0, 4).map((permissionId) => (
                  <span key={permissionId}>{permissionsCatalog.find((item) => item.id === permissionId)?.label || permissionId}</span>
                ))}
                {role.permissions.length > 4 && <span>+{role.permissions.length - 4} más</span>}
              </div>
              <div className="access-role-card__actions">
                {canManage && inherited ? (
                  <button className="btn btn--secondary btn--sm" onClick={() => copyRoleToCompany(role.id, empresaActiva.id)}><Copy size={13} /> Copiar y personalizar</button>
                ) : canManage ? (
                  <button className="btn btn--secondary btn--sm" disabled={role.system} onClick={() => openEdit(role)}><Pencil size={13} /> Editar</button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      <div className="access-policy-note">
        <Shield size={16} /> Los roles locales solo incluyen permisos del ámbito empresa. Las políticas obligatorias no pueden modificarse.
      </div>

      <RoleEditorModal
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        role={selectedRole}
        scope={scope}
        companyId={empresaActiva?.id}
      />
    </div>
  );
};
