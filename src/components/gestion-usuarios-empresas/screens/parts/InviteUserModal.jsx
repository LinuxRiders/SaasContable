import React, { useMemo, useState } from 'react';
import { Modal } from '../../../Modal';
import { useAccessManagement } from '../../state/AccessManagementContext';

export const InviteUserModal = ({ isOpen, onClose, scope, companies, activeCompany }) => {
  const { roles, getCompanyRoles, inviteUser } = useAccessManagement();
  const [form, setForm] = useState({ name: '', email: '', document: '', studyRoleId: 'ROLE_STUDY_MEMBER' });
  const [assignments, setAssignments] = useState(() => activeCompany
    ? [{ companyId: activeCompany.id, roleId: 'TPL_MANAGER' }]
    : []
  );

  const studyRoles = roles.filter((role) => role.scope === 'STUDY' && role.active);
  const selectedCompanyIds = useMemo(() => new Set(assignments.map((item) => item.companyId)), [assignments]);

  const toggleCompany = (companyId) => {
    setAssignments((current) => selectedCompanyIds.has(companyId)
      ? current.filter((item) => item.companyId !== companyId)
      : [...current, { companyId, roleId: getCompanyRoles(companyId)[0]?.id || 'TPL_MAKER' }]
    );
  };

  const updateAssignmentRole = (companyId, roleId) => {
    setAssignments((current) => current.map((item) => item.companyId === companyId ? { ...item, roleId } : item));
  };

  const resetAndClose = () => {
    setForm({ name: '', email: '', document: '', studyRoleId: 'ROLE_STUDY_MEMBER' });
    setAssignments(activeCompany ? [{ companyId: activeCompany.id, roleId: 'TPL_MANAGER' }] : []);
    onClose();
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) return;
    inviteUser({
      ...form,
      studyRoleId: scope === 'STUDY' ? form.studyRoleId : null,
      allCompanies: false,
      assignments
    });
    resetAndClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={resetAndClose}
      title={scope === 'STUDY' ? 'Invitar usuario al estudio' : `Invitar usuario a ${activeCompany?.abreviatura}`}
      maxWidth="760px"
      footer={
        <>
          <button className="btn btn--secondary" onClick={resetAndClose}>Cancelar</button>
          <button className="btn btn--primary" onClick={handleSubmit} disabled={!form.name.trim() || !/^\S+@\S+\.\S+$/.test(form.email)}>
            Crear invitación
          </button>
        </>
      }
    >
      <div className="access-form-grid">
        <div className="form-group">
          <label className="form-label form-label--required">Nombre completo</label>
          <input className="form-control" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ej. Andrea Flores" />
        </div>
        <div className="form-group">
          <label className="form-label form-label--required">Correo</label>
          <input type="email" className="form-control" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="andrea@empresa.pe" />
        </div>
        <div className="form-group">
          <label className="form-label">Documento</label>
          <input className="form-control" value={form.document} onChange={(event) => setForm({ ...form, document: event.target.value })} placeholder="DNI 00000000" />
        </div>
        {scope === 'STUDY' && (
          <div className="form-group">
            <label className="form-label">Rol global del estudio</label>
            <select className="form-control" value={form.studyRoleId} onChange={(event) => setForm({ ...form, studyRoleId: event.target.value })}>
              {studyRoles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="access-section-title">Empresas y rol operativo</div>
      <div className="access-assignment-list">
        {(scope === 'COMPANY' ? [activeCompany] : companies).filter(Boolean).map((company) => {
          const assignment = assignments.find((item) => item.companyId === company.id);
          const checked = Boolean(assignment);
          return (
            <div className={`access-assignment-row ${checked ? 'access-assignment-row--selected' : ''}`} key={company.id}>
              <label className="access-assignment-company">
                <input type="checkbox" checked={checked} disabled={scope === 'COMPANY'} onChange={() => toggleCompany(company.id)} />
                <span><strong>{company.abreviatura}</strong><small>RUC {company.ruc}</small></span>
              </label>
              <select
                className="form-control"
                disabled={!checked}
                value={assignment?.roleId || ''}
                onChange={(event) => updateAssignmentRole(company.id, event.target.value)}
              >
                {!checked && <option value="">Sin acceso</option>}
                {getCompanyRoles(company.id).map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
              </select>
            </div>
          );
        })}
      </div>
      <div className="callout callout--info access-compact-callout">
        La persona quedará pendiente hasta completar su activación. Cada empresa puede tener un rol diferente.
      </div>
    </Modal>
  );
};
