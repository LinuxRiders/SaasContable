/**
 * @fileoverview Lógica de dominio para la bandeja de excepciones (RF-10, RF-11, CA-10.4, CA-11.4)
 */

export const REASON_ACTIONS = {
  UNBALANCED: ['CHANGE_TEMPLATE', 'CANCEL'],
  INCONSISTENT_AMOUNTS: ['CANCEL'],
  PERIOD_CLOSED: ['REVALIDATE', 'CANCEL'],
  TEMPLATE_MISMATCH: ['CHANGE_TEMPLATE', 'CANCEL'],
  MISSING_COST_CENTER: ['COMPLETE', 'CANCEL'],
  ACCOUNT_NOT_FOUND: ['CHANGE_TEMPLATE', 'CANCEL'],
  ACCOUNT_NOT_POSTABLE: ['CHANGE_TEMPLATE', 'CANCEL'],
  NO_FX_RATE: ['REVALIDATE', 'CANCEL'],
  TEMPLATE_INACTIVE: ['CHANGE_TEMPLATE', 'CANCEL']
};

/**
 * Calcula las acciones permitidas para un asiento según la intersección de sus motivos,
 * con CANCEL siempre disponible (data-model §3).
 * @param {string[]} pendingReasons
 * @returns {string[]}
 */
export function allowedActions(pendingReasons = []) {
  if (!pendingReasons || pendingReasons.length === 0) {
    return ['CANCEL'];
  }

  // Obtener conjuntos de acciones por cada motivo conocido
  const actionSets = pendingReasons.map(r => new Set(REASON_ACTIONS[r] || ['CANCEL']));

  // Intersección de todos los conjuntos
  let intersection = actionSets[0];
  for (let i = 1; i < actionSets.length; i++) {
    intersection = new Set([...intersection].filter(x => actionSets[i].has(x)));
  }

  // CANCEL siempre está disponible
  intersection.add('CANCEL');

  return Array.from(intersection);
}

const ALLOWED_UPDATE_KEYS = new Set(['id', 'expectedVersion', 'costCenter', 'analyticTags', 'templateId']);

/**
 * Aplica una actualización permitida sobre un asiento en bandeja.
 * Rechaza campos prohibidos (montos, cuentas, fechas) con VALIDATION_ERROR (CA-11.4).
 * @param {Object} entry - JournalEntry
 * @param {Object} update - { id, expectedVersion, costCenter?, analyticTags?, templateId? }
 * @returns {Object} Asiento actualizado
 */
export function applyStagingUpdate(entry, update) {
  if (!update) return entry;

  for (const k of Object.keys(update)) {
    if (!ALLOWED_UPDATE_KEYS.has(k)) {
      const err = new Error(`Campo no editable: '${k}' (VALIDATION_ERROR)`);
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
  }

  const updated = {
    ...entry,
    lines: entry.lines ? entry.lines.map(l => ({ ...l })) : []
  };

  if (update.templateId) {
    updated.templateId = update.templateId;
  }

  if (update.analyticTags) {
    updated.analyticTags = { ...(updated.analyticTags || {}), ...update.analyticTags };
  }

  if (update.costCenter) {
    updated.costCenter = update.costCenter;
    updated.lines.forEach(l => {
      if (l.role === 'BASE' || l.role === 'DEST_DEBIT' || l.role === 'DEST_CREDIT') {
        l.costCenter = update.costCenter;
      }
    });
  }

  return updated;
}

/**
 * Calcula las horas transcurridas desde que el asiento entró a la bandeja
 * @param {string} stagedAt - ISO datetime
 * @param {string} [now] - ISO datetime
 * @returns {number}
 */
export function ageHours(stagedAt, now = new Date().toISOString()) {
  if (!stagedAt) return 0;
  const diffMs = new Date(now).getTime() - new Date(stagedAt).getTime();
  return diffMs / (1000 * 60 * 60);
}

/**
 * Determina si un asiento en bandeja está atrasado (> 48 horas, CA-10.4)
 * @param {string} stagedAt - ISO datetime
 * @param {string} [now] - ISO datetime
 * @returns {boolean}
 */
export function isOverdue(stagedAt, now = new Date().toISOString()) {
  return ageHours(stagedAt, now) > 48;
}
