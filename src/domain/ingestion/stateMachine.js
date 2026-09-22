const TRANSITIONS = {
  'DRAFT': ['PENDING_INPUT', 'PENDING_APPROVAL'],
  'PENDING_INPUT': ['DRAFT', 'CANCELLED'],
  'PENDING_APPROVAL': [],
  'POSTED': [],
  'POSTED_PENDING_PUBLISH': [],
  'REJECTED': [],
  'CANCELLED': []
};

export function assertTransition(fromState, toState) {
  const allowed = TRANSITIONS[fromState];
  if (!allowed || !allowed.includes(toState)) {
    const err = new Error(`INVALID_TRANSITION: Cannot transition from ${fromState} to ${toState}`);
    err.code = 'INVALID_TRANSITION';
    throw err;
  }
}

