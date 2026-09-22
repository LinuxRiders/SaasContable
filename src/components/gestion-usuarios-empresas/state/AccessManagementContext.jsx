import React, { createContext, useContext, useMemo, useReducer } from 'react';
import { useAccounting } from '../../../context/AccountingContext';
import {
  COMPANY_DELEGABLE_PERMISSION_IDS,
  PERMISSIONS,
  initialAuditEvents,
  initialRoles,
  initialUsers
} from '../fixtures/accessFixtures';

const AccessManagementContext = createContext(null);

const cloneInitialState = () => ({
  users: structuredClone(initialUsers),
  roles: structuredClone(initialRoles),
  auditEvents: structuredClone(initialAuditEvents)
});

const createId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const reducer = (state, action) => {
  switch (action.type) {
    case 'INVITE_USER':
      return {
        ...state,
        users: [...state.users, action.user],
        auditEvents: [action.audit, ...state.auditEvents]
      };
    case 'SET_USER_STATUS':
      return {
        ...state,
        users: state.users.map((user) => user.id === action.userId ? { ...user, status: action.status } : user),
        auditEvents: [action.audit, ...state.auditEvents]
      };
    case 'REVOKE_ASSIGNMENT':
      return {
        ...state,
        users: state.users.map((user) => user.id === action.userId
          ? { ...user, assignments: user.assignments.filter((item) => item.companyId !== action.companyId) }
          : user),
        auditEvents: [action.audit, ...state.auditEvents]
      };
    case 'CREATE_ROLE':
      return { ...state, roles: [...state.roles, action.role], auditEvents: [action.audit, ...state.auditEvents] };
    case 'UPDATE_ROLE':
      return {
        ...state,
        roles: state.roles.map((role) => role.id === action.role.id ? action.role : role),
        auditEvents: [action.audit, ...state.auditEvents]
      };
    case 'RESET':
      return cloneInitialState();
    default:
      return state;
  }
};

export const AccessManagementProvider = ({ children }) => {
  const { sesionUsuario } = useAccounting();
  const [state, dispatch] = useReducer(reducer, undefined, cloneInitialState);

  const currentUser = useMemo(
    () => state.users.find((user) => user.loginUserId === sesionUsuario?.usuarioId) || null,
    [state.users, sesionUsuario]
  );

  const getRole = (roleId) => state.roles.find((role) => role.id === roleId) || null;

  const getAccessibleCompanyIds = () => {
    if (!currentUser || currentUser.status !== 'HABILITADO') return [];
    if (currentUser.allCompanies || getRole(currentUser.studyRoleId)?.allCompanies) return null;
    return currentUser.assignments
      .filter((assignment) => assignment.status === 'ACTIVE')
      .map((assignment) => assignment.companyId);
  };

  const getCompanyRoles = (companyId) => state.roles.filter((role) =>
    role.active && role.scope === 'COMPANY' && (role.origin === 'STUDY' || role.companyId === companyId)
  );

  const getUsersForCompany = (companyId) => state.users.filter((user) =>
    user.status !== 'SUSPENDIDO' && (
      user.allCompanies || user.assignments.some((assignment) => assignment.companyId === companyId && assignment.status !== 'REVOKED')
    )
  );

  const inviteUser = ({ name, email, document, studyRoleId, allCompanies, assignments }) => {
    const user = {
      id: createId('USR'), name: name.trim(), email: email.trim(), document: document.trim() || 'Sin documento',
      studyRoleId: studyRoleId || null, status: 'PENDIENTE', allCompanies: Boolean(allCompanies),
      assignments: assignments.map((assignment) => ({ ...assignment, status: 'PENDING' }))
    };
    dispatch({
      type: 'INVITE_USER', user,
      audit: { id: createId('AUD'), action: 'INVITATION_CREATED', detail: `Se creó una invitación pendiente para ${user.email}.`, at: new Date().toISOString() }
    });
  };

  const setUserStatus = (userId, status) => dispatch({
    type: 'SET_USER_STATUS', userId, status,
    audit: { id: createId('AUD'), action: 'MEMBERSHIP_STATUS_CHANGED', detail: `La membresía cambió a ${status}.`, at: new Date().toISOString() }
  });

  const revokeAssignment = (userId, companyId) => dispatch({
    type: 'REVOKE_ASSIGNMENT', userId, companyId,
    audit: { id: createId('AUD'), action: 'ASSIGNMENT_REVOKED', detail: `Se revocó el acceso a la empresa ${companyId}.`, at: new Date().toISOString() }
  });

  const createRole = ({ name, description, scope, companyId, permissions, origin = 'STUDY', sourceRoleId = null }) => {
    const safePermissions = scope === 'COMPANY'
      ? permissions.filter((permission) => COMPANY_DELEGABLE_PERMISSION_IDS.includes(permission))
      : permissions;
    const role = {
      id: createId(scope === 'STUDY' ? 'ROLE' : 'LOCAL'), name: name.trim(), description: description.trim(),
      scope, companyId: companyId || null, permissions: safePermissions, origin, sourceRoleId,
      template: scope === 'COMPANY' && origin === 'STUDY', active: true, system: false
    };
    dispatch({
      type: 'CREATE_ROLE', role,
      audit: { id: createId('AUD'), action: 'ROLE_CREATED', detail: `Se creó el rol ${role.name}.`, at: new Date().toISOString() }
    });
  };

  const updateRole = (roleId, changes) => {
    const current = getRole(roleId);
    if (!current || current.system) return;
    const permissions = current.scope === 'COMPANY'
      ? changes.permissions.filter((permission) => COMPANY_DELEGABLE_PERMISSION_IDS.includes(permission))
      : changes.permissions;
    const role = { ...current, ...changes, permissions };
    dispatch({
      type: 'UPDATE_ROLE', role,
      audit: { id: createId('AUD'), action: 'ROLE_UPDATED', detail: `Se actualizó el rol ${role.name}.`, at: new Date().toISOString() }
    });
  };

  const copyRoleToCompany = (roleId, companyId) => {
    const source = getRole(roleId);
    if (!source || source.scope !== 'COMPANY') return;
    createRole({
      name: `${source.name} personalizado`, description: `Copia local de ${source.name}.`,
      scope: 'COMPANY', companyId, permissions: source.permissions, origin: 'COPIED', sourceRoleId: source.id
    });
  };

  const value = {
    ...state,
    permissionsCatalog: PERMISSIONS,
    currentUser,
    getRole,
    getAccessibleCompanyIds,
    getCompanyRoles,
    getUsersForCompany,
    inviteUser,
    setUserStatus,
    revokeAssignment,
    createRole,
    updateRole,
    copyRoleToCompany,
    resetAccessData: () => dispatch({ type: 'RESET' })
  };

  return <AccessManagementContext.Provider value={value}>{children}</AccessManagementContext.Provider>;
};

export const useAccessManagement = () => {
  const context = useContext(AccessManagementContext);
  if (!context) throw new Error('useAccessManagement debe usarse dentro de AccessManagementProvider');
  return context;
};
