export function buildAuditEvent({ id, at, tenantId, traceId, userId, role, action, entityType, entityId, detail }) {
  const allowedActions = [
    'RAW_RECEIVED', 'DUPLICATE_DETECTED', 'PARSE_FAILED', 'REJECTED_NOT_TENANT',
    'DOCUMENT_CANONICALIZED', 'DRAFT_CREATED', 'SENT_TO_STAGING', 'STAGING_UPDATED',
    'TEMPLATE_CHANGED', 'REVALIDATED', 'MOVED_TO_PENDING_APPROVAL', 'ENTRY_CANCELLED',
    'ACTION_DENIED', 'INVALID_TRANSITION', 'CONFLICT', 'DEMO_RESET', 'TEMPLATE_VERSION_CHANGED',
    'TEMPLATE_CREATED', 'TEMPLATE_DRAFT_CREATED', 'TEMPLATE_DRAFT_UPDATED', 'TEMPLATE_DRAFT_DELETED',
    'TEMPLATE_TESTS_RUN', 'TEMPLATE_VERSION_ACTIVATED', 'TEMPLATE_RETIRED',
    'TEMPLATE_COMPANY_ACTIVATED', 'TEMPLATE_COMPANY_DEACTIVATED'
  ];

  if (!allowedActions.includes(action)) {
    throw new Error(`Invalid audit action: ${action}`);
  }

  return {
    id,
    tenantId,
    traceId,
    at,
    userId,
    role,
    action,
    entityType,
    entityId,
    detail
  };
}

