/**
 * @fileoverview Inspección y validación de cuentas contables usadas en plantillas (research R-23, CA-19.6, CA-23.2)
 */

/**
 * Reúne todas las cuentas contables únicas usadas en defaults, reglas y splits de una versión de plantilla
 * @param {import('./types.js').TemplateVersion} version
 * @returns {string[]}
 */
export function accountsUsed(version) {
  const codes = new Set();

  if (version?.defaults) {
    if (version.defaults.baseAccount) codes.add(version.defaults.baseAccount);
    if (version.defaults.taxAccount) codes.add(version.defaults.taxAccount);
    if (version.defaults.counterpartAccount) codes.add(version.defaults.counterpartAccount);
  }

  (version?.documentRules || []).forEach(rule => {
    if (rule.then?.taxAccount) codes.add(rule.then.taxAccount);
    if (rule.then?.counterpartAccount) codes.add(rule.then.counterpartAccount);
  });

  (version?.lineRules || []).forEach(rule => {
    if (rule.then?.baseAccount) codes.add(rule.then.baseAccount);
    if (Array.isArray(rule.then?.split)) {
      rule.then.split.forEach(part => {
        if (part.account) codes.add(part.account);
      });
    }
  });

  return Array.from(codes);
}

/**
 * Valida las cuentas usadas en una versión contra un índice de cuentas normalizado
 * @param {import('./types.js').TemplateVersion} version
 * @param {Record<string, import('../ingestion/types.js').NormalizedAccount>} accountIndex
 * @returns {Array<{accountCode: string, problem: "NOT_FOUND"|"NOT_POSTABLE"}>}
 */
export function validateAccounts(version, accountIndex = {}) {
  const codes = accountsUsed(version);
  const errors = [];

  for (const code of codes) {
    const acc = accountIndex[code];
    if (!acc) {
      errors.push({ accountCode: code, problem: 'NOT_FOUND' });
    } else if (!acc.isPostable) {
      errors.push({ accountCode: code, problem: 'NOT_POSTABLE' });
    }
  }

  return errors;
}
