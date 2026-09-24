export function mapSessionRole(rol) {
  if (!rol) return 'ADMIN';
  const clean = String(rol).trim().toLowerCase();
  if (clean === 'maker' || clean === 'contador') return 'MAKER';
  if (clean === 'checker' || clean === 'revisor' || clean === 'supervisor') return 'CHECKER';
  if (clean === 'auditor' || clean === 'auditora') return 'AUDITOR';
  if (clean === 'admin' || clean === 'administrador') return 'ADMIN';
  return 'UNKNOWN';
}

// Matrix of Role x Operation
const MATRIX = {
  'MAKER': [
    'VIEW_ACCOUNTING_CONFIG',
    'LIST_TEMPLATES',
    'LIST_SAMPLES',
    'INGEST',
    'INGEST_DOCUMENTS',
    'REGISTER_MANUAL_DOCUMENT',
    'VIEW_RECEIVED_DOCUMENTS',
    'SET_DEMO_TOGGLES',
    'GET_BATCH',
    'LIST_BATCHES',
    'QUERY_INTAKE_RESULTS',
    'QUERY_STAGING',
    'GET_JOURNAL_ENTRY',
    'UPDATE_STAGING',
    'REVALIDATE',
    'CANCEL',
    'QUERY_PENDING_APPROVAL',
    'VIEW_TRACE',
    'GET_TRACEABILITY',
    'GET_RAW_PAYLOAD',
    'GET_DEMO_SETTINGS',
    'SET_FX_SERVICE_DOWN',
    'RESET_DEMO_DATA'
  ],
  'CHECKER': [
    'VIEW_ACCOUNTING_CONFIG',
    'VIEW_RECEIVED_DOCUMENTS',
    'SET_DEMO_TOGGLES',
    'QUERY_PENDING_APPROVAL',
    'QUERY_STAGING',
    'VIEW_TRACE',
    'GET_TRACEABILITY',
    'GET_RAW_PAYLOAD',
    'APPROVE',
    'REJECT',
    'GET_DEMO_SETTINGS',
    'SET_FX_SERVICE_DOWN',
    'RESET_DEMO_DATA'
  ],
  'AUDITOR': [
    'VIEW_ACCOUNTING_CONFIG',
    'VIEW_CONFIG_AUDIT',
    'VIEW_RECEIVED_DOCUMENTS',
    'LIST_TEMPLATES',
    'LIST_SAMPLES',
    'GET_BATCH',
    'LIST_BATCHES',
    'QUERY_INTAKE_RESULTS',
    'QUERY_STAGING',
    'GET_JOURNAL_ENTRY',
    'QUERY_PENDING_APPROVAL',
    'VIEW_TRACE',
    'GET_TRACEABILITY',
    'GET_RAW_PAYLOAD',
    'GET_TEMPLATE',
    'GET_DEMO_SETTINGS',
    'SET_FX_SERVICE_DOWN',
    'RESET_DEMO_DATA'
  ],
  'ADMIN': [
    'VIEW_ACCOUNTING_CONFIG',
    'VIEW_CONFIG_AUDIT',
    'VIEW_RECEIVED_DOCUMENTS',
    'SET_DEMO_TOGGLES',
    'EDIT_ACCOUNT_MAPPING',
    'EDIT_CLASSIFICATION_RULES',
    'EDIT_TEMPLATES',
    'RUN_TEMPLATE_TESTS',
    'ACTIVATE_TEMPLATES',
    'SIMULATE',
    'LIST_TEMPLATES',
    'GET_TEMPLATE',
    'LIST_SAMPLES',
    'GET_BATCH',
    'LIST_BATCHES',
    'QUERY_INTAKE_RESULTS',
    'QUERY_STAGING',
    'GET_JOURNAL_ENTRY',
    'QUERY_PENDING_APPROVAL',
    'VIEW_TRACE',
    'GET_TRACEABILITY',
    'GET_RAW_PAYLOAD',
    'GET_DEMO_SETTINGS',
    'SET_FX_SERVICE_DOWN',
    'RESET_DEMO_DATA'
  ],
  'UNKNOWN': []
};

export function can(role, operation) {
  const allowed = MATRIX[role] || [];
  return allowed.includes(operation);
}
