import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '../../../Modal';
import { useAccessManagement } from '../../state/AccessManagementContext';

export const RoleEditorModal = ({ isOpen, onClose, role, scope, companyId }) => {
  const { permissionsCatalog, createRole, updateRole } = useAccessManagement();
  const initialScope = scope === 'COMPANY' ? 'COMPANY' : role?.scope || 'COMPANY';
  const [form, setForm] = useState({ name: '', description: '', scope: initialScope, permissions: [] });

  useEffect(() => {
    setForm({
      name: role?.name || '',
      description: role?.description || '',
      scope: scope === 'COMPANY' ? 'COMPANY' : role?.scope || 'COMPANY',
      permissions: role?.permissions || []
    });
  }, [role, scope, isOpen]);

  const availablePermissions = useMemo(
    () => permissionsCatalog.filter((permission) => permission.scope === form.scope),
    [permissionsCatalog, form.scope]
  );

  const togglePermission = (permissionId) => {
    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permissionId)
        ? current.permissions.filter((item) => item !== permissionId)
        : [...current.permissions, permissionId]
    }));
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    if (role) {
      updateRole(role.id, form);
    } else {
      createRole({
        ...form,
        companyId: form.scope === 'COMPANY' && scope === 'COMPANY' ? companyId : null,
        origin: form.scope === 'COMPANY' && scope === 'COMPANY' ? 'LOCAL' : 'STUDY'
      });
    }
    onClose();
  };

  const groups = [...new Set(availablePermissions.map((permission) => permission.group))];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={role ? `Editar rol: ${role.name}` : scope === 'COMPANY' ? 'Crear rol local' : 'Crear rol o plantilla'}
      maxWidth="720px"
      footer={
        <>
          <button className="btn btn--secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" onClick={handleSubmit} disabled={!form.name.trim()}>Guardar rol</button>
        </>
      }
    >
      <div className="access-form-grid">
        <div className="form-group">
          <label className="form-label form-label--required">Nombre</label>
          <input className="form-control" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </div>
        {scope === 'STUDY' && !role && (
          <div className="form-group">
            <label className="form-label">Ámbito</label>
            <select className="form-control" value={form.scope} onChange={(event) => setForm({ ...form, scope: event.target.value, permissions: [] })}>
              <option value="COMPANY">Plantilla para empresas</option>
              <option value="STUDY">Rol global del estudio</option>
            </select>
          </div>
        )}
      </div>
      <div className="form-group">
        <label className="form-label">Descripción</label>
        <textarea className="form-control" rows="2" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      </div>
      <div className="access-section-title">Permisos incluidos</div>
      <div className="access-permission-groups">
        {groups.map((group) => (
          <fieldset key={group} className="access-permission-group">
            <legend>{group}</legend>
            {availablePermissions.filter((permission) => permission.group === group).map((permission) => (
              <label key={permission.id} className="access-permission-option">
                <input type="checkbox" checked={form.permissions.includes(permission.id)} onChange={() => togglePermission(permission.id)} />
                <span>{permission.label}</span>
              </label>
            ))}
          </fieldset>
        ))}
      </div>
      {form.scope === 'COMPANY' && (
        <div className="callout callout--warning access-compact-callout">
          La separación entre quien registra y quien aprueba continúa siendo obligatoria, incluso si un rol reúne ambas capacidades.
        </div>
      )}
    </Modal>
  );
};
