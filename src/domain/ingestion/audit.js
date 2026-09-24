export function buildAuditEvent({ id, at, tenantId, traceId, userId, role, action, entityType, entityId, detail }) {
  const allowedActions = [
    'RAW_RECEIVED', 'DUPLICATE_DETECTED', 'PARSE_FAILED', 'REJECTED_NOT_TENANT',
    'DOCUMENT_CANONICALIZED', 'DRAFT_CREATED', 'SENT_TO_STAGING', 'STAGING_UPDATED',
    'REVALIDATED', 'MOVED_TO_PENDING_APPROVAL', 'ENTRY_CANCELLED',
    'ACTION_DENIED', 'INVALID_TRANSITION', 'CONFLICT', 'DEMO_RESET',
    'ACCOUNT_MAPPING_SAVED',
    'CLASSIFICATION_RULE_SAVED',
    'CLASSIFICATION_RULE_STATUS_CHANGED',
    'TEMPLATE_CREATED',
    'TEMPLATE_DUPLICATED',
    'TEMPLATE_DRAFT_SAVED',
    'TEMPLATE_VERSION_CREATED',
    'TEMPLATE_TESTS_RUN',
    'TEMPLATE_ACTIVATED',
    'TEMPLATE_DEACTIVATED',
    'TEMPLATE_RETIRED',
    'TEMPLATE_USAGE_RECORDED',
    'MANUAL_DOCUMENT_REGISTERED'
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
