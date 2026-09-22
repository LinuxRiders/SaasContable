export function mapSessionRole(rol) {
  switch (rol) {
    case 'Maker': return 'MAKER';
    case 'Checker': return 'CHECKER';
    case 'Auditor': return 'AUDITOR';
    case 'Admin': return 'ADMIN';
    default: return 'UNKNOWN';
  }
}

// Matrix of Role x Operation
const MATRIX = {
  'MAKER': [
    'LIST_TEMPLATES',
    'LIST_SAMPLES',
    'INGEST',
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
    'QUERY_PENDING_APPROVAL',
    'QUERY_STAGING',
    'VIEW_TRACE',
    'GET_TRACEABILITY',
    'GET_RAW_PAYLOAD',
    'APPROVE',
    'GET_DEMO_SETTINGS',
    'SET_FX_SERVICE_DOWN',
    'RESET_DEMO_DATA'
  ],
  'AUDITOR': [
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
    'LIST_TEMPLATE_BANK',
    'GET_TEMPLATE',
    'LIST_COMPANY_TEMPLATE_ACTIVATIONS',
    'GET_DEMO_SETTINGS',
    'SET_FX_SERVICE_DOWN',
    'RESET_DEMO_DATA'
  ],
  'ADMIN': [
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
    'APPROVE',
    'LIST_TEMPLATE_BANK',
    'GET_TEMPLATE',
    'LIST_COMPANY_TEMPLATE_ACTIVATIONS',
    'EDIT_TEMPLATES',
    'CREATE_TEMPLATE',
    'SAVE_TEMPLATE_DRAFT',
    'EDIT_TEMPLATE',
    'DELETE_TEMPLATE_DRAFT',
    'RUN_TEMPLATE_TESTS',
    'ACTIVATE_TEMPLATE_VERSION',
    'RETIRE_TEMPLATE',
    'SET_COMPANY_TEMPLATE_ACTIVATION',
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

