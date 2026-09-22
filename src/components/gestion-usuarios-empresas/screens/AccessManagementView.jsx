import React, { useMemo, useState } from 'react';
import { Search, UserPlus, Grid3X3, List, ShieldCheck } from 'lucide-react';
import { useAccounting } from '../../../context/AccountingContext';
import { MetricCard } from '../../MetricCard';
import { useAccessManagement } from '../state/AccessManagementContext';
import { InviteUserModal } from './parts/InviteUserModal';
import { AccessMatrix } from './parts/AccessMatrix';

const StatusBadge = ({ status }) => {
  const type = status === 'HABILITADO' ? 'success' : status === 'PENDIENTE' ? 'warning' : 'neutral';
  return <span className={`badge badge--${type}`}>{status}</span>;
};

export const AccessManagementView = ({ scope = 'STUDY' }) => {
  const { empresas, empresaActiva, sesionUsuario } = useAccounting();
  const {
    users, roles, currentUser, getRole, getUsersForCompany,
    setUserStatus, revokeAssignment, resetAccessData
  } = useAccessManagement();
  const [search, setSearch] = useState('');
  const [display, setDisplay] = useState('LIST');
  const [inviteOpen, setInviteOpen] = useState(false);

  const scopedUsers = scope === 'COMPANY' && empresaActiva ? getUsersForCompany(empresaActiva.id) : users;
  const filteredUsers = scopedUsers.filter((user) =>
    `${user.name} ${user.email} ${user.document}`.toLowerCase().includes(search.toLowerCase())
  );
  const pending = scopedUsers.filter((user) => user.status === 'PENDIENTE').length;
  const active = scopedUsers.filter((user) => user.status === 'HABILITADO').length;

  const studyPermissions = getRole(currentUser?.studyRoleId)?.permissions || [];
  const companyAssignment = currentUser?.assignments.find((assignment) => assignment.companyId === empresaActiva?.id);
  const companyPermissions = getRole(companyAssignment?.roleId)?.permissions || [];
  const canManage = currentUser?.allCompanies || (scope === 'COMPANY'
    ? companyPermissions.includes('company.users.manage')
    : studyPermissions.some((permission) => ['study.users.manage', 'study.users.invite'].includes(permission)));
  const title = scope === 'COMPANY' ? `Usuarios de ${empresaActiva?.abreviatura}` : 'Usuarios y accesos del estudio';
  const subtitle = scope === 'COMPANY'
    ? 'Personas con acceso a esta empresa y el rol operativo que utilizan.'
    : 'Membresías del estudio, invitaciones y asignaciones por empresa.';

  const companyNames = useMemo(
    () => Object.fromEntries(empresas.map((company) => [company.id, company.abreviatura])),
    [empresas]
  );

  const handleReset = () => {
    if (window.confirm('¿Restablecer usuarios, roles y asignaciones a los datos iniciales?')) resetAccessData();
  };

  return (
    <div className="content-body access-page">
      <div className="access-page__header">
        <div>
          <div className="access-eyebrow">{scope === 'COMPANY' ? 'ADMINISTRACIÓN DE LA EMPRESA' : 'ADMINISTRACIÓN DEL ESTUDIO'}</div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <div className="access-header-actions">
          {scope === 'STUDY' && currentUser?.allCompanies && <button className="btn btn--secondary" onClick={handleReset}>Restablecer datos</button>}
          {canManage && (
            <button className="btn btn--primary" onClick={() => setInviteOpen(true)}>
              <UserPlus size={15} /> Invitar usuario
            </button>
          )}
        </div>
      </div>

      <div className="metrics-grid access-metrics">
        <MetricCard title="USUARIOS" value={scopedUsers.length} subtext={scope === 'COMPANY' ? 'Con alcance en esta empresa' : 'Membresías e invitaciones'} badgeText="Directorio" badgeType="info" />
        <MetricCard title="HABILITADOS" value={active} subtext="Con membresía activa" badgeText="Activos" badgeType="success" />
        <MetricCard title="PENDIENTES" value={pending} subtext="Requieren completar activación" badgeText={pending ? 'Por revisar' : 'Al día'} badgeType={pending ? 'warning' : 'success'} />
        <MetricCard title="CONTEXTO" value={scope === 'COMPANY' ? 'EMPRESA' : 'ESTUDIO'} subtext={scope === 'COMPANY' ? empresaActiva?.ruc : sesionUsuario?.codigoEstudio} badgeText="Ámbito" badgeType="neutral" />
      </div>

      <div className="access-toolbar">
        <div className="toolbar__search access-search">
          <Search size={15} className="toolbar__search-icon" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, correo o documento..." />
        </div>
        {scope === 'STUDY' && (
          <div className="access-view-switch" aria-label="Cambiar presentación">
            <button className={display === 'LIST' ? 'active' : ''} onClick={() => setDisplay('LIST')}><List size={14} /> Directorio</button>
            <button className={display === 'MATRIX' ? 'active' : ''} onClick={() => setDisplay('MATRIX')}><Grid3X3 size={14} /> Matriz</button>
          </div>
        )}
      </div>

      {display === 'MATRIX' && scope === 'STUDY' ? (
        <AccessMatrix users={filteredUsers} companies={empresas} />
      ) : (
        <div className="access-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol global</th>
                <th>{scope === 'COMPANY' ? 'Rol en la empresa' : 'Empresas asignadas'}</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const studyRole = getRole(user.studyRoleId);
                const companyAssignment = scope === 'COMPANY'
                  ? user.assignments.find((assignment) => assignment.companyId === empresaActiva?.id)
                  : null;
                return (
                  <tr key={user.id}>
                    <td><strong>{user.name}</strong><small>{user.email} · {user.document}</small></td>
                    <td>{studyRole?.name || <span className="access-muted">Usuario exclusivo de empresa</span>}</td>
                    <td>
                      {scope === 'COMPANY'
                        ? <span className="access-role-cell">{user.allCompanies ? 'Alcance total del estudio' : getRole(companyAssignment?.roleId)?.name || 'Sin rol'}</span>
                        : user.allCompanies
                          ? <span className="access-scope access-scope--all">Toda la cartera</span>
                          : <div className="access-chip-list">{user.assignments.map((assignment) => <span key={assignment.companyId} className="access-chip">{companyNames[assignment.companyId] || assignment.companyId}</span>)}</div>}
                    </td>
                    <td><StatusBadge status={user.status} /></td>
                    <td>
                      <div className="access-row-actions">
                        {scope === 'COMPANY' && !user.allCompanies && companyAssignment && canManage && (
                          <button className="btn btn--secondary btn--sm" onClick={() => revokeAssignment(user.id, empresaActiva.id)}>Revocar acceso</button>
                        )}
                        {scope === 'STUDY' && canManage && user.id !== currentUser?.id && (
                          <button className="btn btn--secondary btn--sm" onClick={() => setUserStatus(user.id, user.status === 'SUSPENDIDO' ? 'HABILITADO' : 'SUSPENDIDO')}>
                            {user.status === 'SUSPENDIDO' ? 'Reactivar' : 'Suspender'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredUsers.length === 0 && <div className="access-empty">No se encontraron usuarios en este ámbito.</div>}
        </div>
      )}

      <div className="access-policy-note">
        <ShieldCheck size={16} /> El rol define qué puede hacer una persona; la asignación determina en qué empresa puede hacerlo.
      </div>

      <InviteUserModal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        scope={scope}
        companies={empresas}
        activeCompany={empresaActiva}
      />
    </div>
  );
};
