export const PERMISSIONS = [
  { id: 'study.companies.manage', group: 'Estudio', label: 'Gestionar cartera de empresas', scope: 'STUDY' },
  { id: 'study.users.view', group: 'Estudio', label: 'Ver usuarios del estudio', scope: 'STUDY' },
  { id: 'study.users.invite', group: 'Estudio', label: 'Invitar usuarios', scope: 'STUDY' },
  { id: 'study.users.manage', group: 'Estudio', label: 'Suspender y reasignar usuarios', scope: 'STUDY' },
  { id: 'study.roles.manage', group: 'Estudio', label: 'Administrar roles y permisos', scope: 'STUDY' },
  { id: 'study.audit.view', group: 'Estudio', label: 'Consultar auditoría de accesos', scope: 'STUDY' },
  { id: 'company.users.manage', group: 'Empresa', label: 'Gestionar usuarios de la empresa', scope: 'COMPANY' },
  { id: 'company.roles.manage', group: 'Empresa', label: 'Gestionar roles locales', scope: 'COMPANY' },
  { id: 'operations.view', group: 'Operaciones', label: 'Consultar operaciones', scope: 'COMPANY' },
  { id: 'operations.register', group: 'Operaciones', label: 'Registrar operaciones', scope: 'COMPANY' },
  { id: 'operations.approve', group: 'Operaciones', label: 'Aprobar operaciones', scope: 'COMPANY' },
  { id: 'periods.close', group: 'Periodos', label: 'Cerrar periodos', scope: 'COMPANY' },
  { id: 'reports.view', group: 'Reportes', label: 'Consultar reportes', scope: 'COMPANY' },
  { id: 'reports.export', group: 'Reportes', label: 'Exportar reportes', scope: 'COMPANY' },
  { id: 'company.audit.view', group: 'Auditoría', label: 'Consultar actividad de la empresa', scope: 'COMPANY' }
];

export const COMPANY_DELEGABLE_PERMISSION_IDS = PERMISSIONS
  .filter((permission) => permission.scope === 'COMPANY')
  .map((permission) => permission.id);

export const initialRoles = [
  {
    id: 'ROLE_OWNER', name: 'Titular del estudio', description: 'Control total del estudio y su cartera.',
    scope: 'STUDY', origin: 'SYSTEM', system: true, allCompanies: true, active: true,
    permissions: PERMISSIONS.map((permission) => permission.id)
  },
  {
    id: 'ROLE_STUDY_ADMIN', name: 'Administrador del estudio', description: 'Gestiona empresas, usuarios, roles y auditoría.',
    scope: 'STUDY', origin: 'SYSTEM', system: true, allCompanies: true, active: true,
    permissions: ['study.companies.manage', 'study.users.view', 'study.users.invite', 'study.users.manage', 'study.roles.manage', 'study.audit.view']
  },
  {
    id: 'ROLE_STUDY_MEMBER', name: 'Colaborador del estudio', description: 'Accede únicamente a las empresas asignadas.',
    scope: 'STUDY', origin: 'SYSTEM', system: true, allCompanies: false, active: true,
    permissions: ['study.users.view']
  },
  {
    id: 'TPL_COMPANY_ADMIN', name: 'Administrador de empresa', description: 'Administra usuarios y configuración de una empresa.',
    scope: 'COMPANY', origin: 'STUDY', template: true, active: true,
    permissions: ['company.users.manage', 'company.roles.manage', 'operations.view', 'reports.view', 'reports.export', 'company.audit.view']
  },
  {
    id: 'TPL_CHECKER', name: 'Contador aprobador', description: 'Revisa, aprueba y cierra periodos.',
    scope: 'COMPANY', origin: 'STUDY', template: true, active: true,
    permissions: ['operations.view', 'operations.approve', 'periods.close', 'reports.view', 'reports.export', 'company.audit.view']
  },
  {
    id: 'TPL_MAKER', name: 'Asistente de registro', description: 'Registra documentos sin aprobar sus propias operaciones.',
    scope: 'COMPANY', origin: 'STUDY', template: true, active: true,
    permissions: ['operations.view', 'operations.register', 'reports.view']
  },
  {
    id: 'TPL_AUDITOR', name: 'Auditor de solo lectura', description: 'Consulta operaciones, reportes y actividad.',
    scope: 'COMPANY', origin: 'STUDY', template: true, active: true,
    permissions: ['operations.view', 'reports.view', 'reports.export', 'company.audit.view']
  },
  {
    id: 'TPL_MANAGER', name: 'Gerente cliente', description: 'Consulta indicadores y reportes de su empresa.',
    scope: 'COMPANY', origin: 'STUDY', template: true, active: true,
    permissions: ['operations.view', 'reports.view']
  }
];

export const initialUsers = [
  {
    id: 'USR_ADMIN', loginUserId: 'admin_pedro', name: 'Pedro Admin', email: 'pedro@estudio.pe',
    document: 'DNI 10293847', studyRoleId: 'ROLE_STUDY_ADMIN', status: 'HABILITADO', allCompanies: true,
    assignments: []
  },
  {
    id: 'USR_MARIA', loginUserId: 'contador_maria', name: 'María Contador', email: 'maria@estudio.pe',
    document: 'DNI 09876543', studyRoleId: 'ROLE_STUDY_MEMBER', status: 'HABILITADO', allCompanies: false,
    assignments: [
      { companyId: '01', roleId: 'TPL_MAKER', status: 'ACTIVE' },
      { companyId: '02', roleId: 'TPL_MAKER', status: 'ACTIVE' }
    ]
  },
  {
    id: 'USR_REVISOR', loginUserId: 'revisor_luis', name: 'Luis Revisor', email: 'luis@estudio.pe',
    document: 'DNI 11223344', studyRoleId: 'ROLE_STUDY_MEMBER', status: 'HABILITADO', allCompanies: true,
    assignments: [
      { companyId: '01', roleId: 'TPL_CHECKER', status: 'ACTIVE' },
      { companyId: '02', roleId: 'TPL_CHECKER', status: 'ACTIVE' }
    ]
  },
  {
    id: 'USR_AUDITOR', loginUserId: 'auditora_ana', name: 'Ana Auditora', email: 'ana@estudio.pe',
    document: 'DNI 55667788', studyRoleId: 'ROLE_STUDY_MEMBER', status: 'HABILITADO', allCompanies: true,
    assignments: [
      { companyId: '01', roleId: 'TPL_AUDITOR', status: 'ACTIVE' },
      { companyId: '02', roleId: 'TPL_AUDITOR', status: 'ACTIVE' }
    ]
  },
  {
    id: 'USR_LUCIA', name: 'Lucía Fernández Quispe', email: 'lucia@estudio.pe', document: 'DNI 72345678',
    studyRoleId: 'ROLE_STUDY_MEMBER', status: 'HABILITADO', allCompanies: false,
    assignments: [
      { companyId: '01', roleId: 'TPL_MAKER', status: 'ACTIVE' },
      { companyId: '03', roleId: 'TPL_MAKER', status: 'ACTIVE' }
    ]
  },
  {
    id: 'USR_DIEGO', name: 'Diego Alonso Pari', email: 'diego@estudio.pe', document: 'DNI 74561230',
    studyRoleId: 'ROLE_STUDY_MEMBER', status: 'PENDIENTE', allCompanies: false,
    assignments: [{ companyId: '04', roleId: 'TPL_MAKER', status: 'PENDING' }]
  },
  {
    id: 'USR_GERENTE', name: 'Elena Vargas', email: 'gerencia@maralesa.com', document: 'DNI 44556677',
    studyRoleId: null, status: 'HABILITADO', allCompanies: false,
    assignments: [{ companyId: '02', roleId: 'TPL_MANAGER', status: 'ACTIVE' }]
  }
];

export const initialAuditEvents = [
  { id: 'AUD-001', action: 'ASSIGNMENT_CREATED', detail: 'María Contador fue asignada a PACHATUSANTREK SAC.', at: '2026-09-20T09:30:00.000Z' }
];
