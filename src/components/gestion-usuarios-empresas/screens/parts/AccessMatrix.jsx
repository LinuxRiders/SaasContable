import React from 'react';
import { useAccessManagement } from '../../state/AccessManagementContext';

export const AccessMatrix = ({ users, companies }) => {
  const { getRole } = useAccessManagement();
  return (
    <div className="access-table-wrap">
      <table className="data-table access-matrix">
        <thead>
          <tr>
            <th>Usuario</th>
            {companies.map((company) => <th key={company.id}>{company.abreviatura}</th>)}
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td><strong>{user.name}</strong><small>{user.email}</small></td>
              {companies.map((company) => {
                const assignment = user.assignments.find((item) => item.companyId === company.id);
                const role = assignment ? getRole(assignment.roleId) : null;
                return (
                  <td key={company.id}>
                    {user.allCompanies ? <span className="access-scope access-scope--all">Alcance total</span>
                      : role ? <span className="access-role-cell">{role.name}</span>
                        : <span className="access-muted">Sin acceso</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
