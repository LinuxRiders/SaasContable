export function normalizeAccount(rawAccount = {}) {
  const code = rawAccount.codigo || rawAccount.code;
  const isPostable = rawAccount.isPostable !== undefined ? rawAccount.isPostable : (rawAccount.esCuentaU === true);
  const requiresCostCenter = rawAccount.requiresCostCenter !== undefined
    ? rawAccount.requiresCostCenter
    : (rawAccount.requiereCC === true || rawAccount.requiereCentroCostos === true);
  const defaultCostCenter = rawAccount.defaultCostCenter !== undefined
    ? rawAccount.defaultCostCenter
    : ((rawAccount.amarre3 && rawAccount.amarre3.trim() !== '') ? rawAccount.amarre3 : null);

  const account = {
    code,
    isPostable,
    requiresCostCenter,
    defaultCostCenter
  };

  const destDebit = rawAccount.destDebit || rawAccount.amarre1;
  const destCredit = rawAccount.destCredit || rawAccount.amarre2;
  if (destDebit && destCredit) {
    account.destDebit = destDebit;
    account.destCredit = destCredit;
  }

  return account;
}

/**
 * Construye un mapa o índice indexado por código de cuenta normalizado
 * @param {Array<Object>} rawAccounts
 * @returns {Record<string, import('./types.js').NormalizedAccount>}
 */
export function buildAccountIndex(rawAccounts = []) {
  const index = {};
  for (const raw of rawAccounts) {
    const acc = normalizeAccount(raw);
    if (acc.code) {
      index[acc.code] = acc;
    }
  }
  return index;
}

/**
 * Obtiene el centro de costo por defecto según prioridad: plantilla > amarre3 de cuenta base > null
 * @param {Object} template
 * @param {import('./types.js').NormalizedAccount} [baseAccount]
 * @returns {string|null}
 */
export function defaultCostCenter(template = {}, baseAccount = null) {
  const tplCc = template.defaults?.defaultCostCenter || template.defaultCostCenter || template.ccDefault;
  if (tplCc) return tplCc;
  if (baseAccount?.defaultCostCenter) return baseAccount.defaultCostCenter;
  return null;
}

/**
 * Verifica las cuentas de las líneas generadas para un asiento
 * @param {import('./types.js').EntryLine[]} lines
 * @param {Record<string, import('./types.js').NormalizedAccount>} index
 * @param {Object} [template]
 * @returns {string[]} Lista de motivos de error detectados
 */
export function checkLineAccounts(lines = [], index = {}, template = {}) {
  const reasons = new Set();
  const tplRequiresCC = template.defaults?.requiresCostCenter ?? template.requiresCostCenter ?? template.requiereCC;

  for (const line of lines) {
    const acc = index[line.accountCode];
    if (!acc) {
      reasons.add('ACCOUNT_NOT_FOUND');
    } else {
      if (!acc.isPostable) {
        reasons.add('ACCOUNT_NOT_POSTABLE');
      }
      const isExpenseOrDest = line.role === 'BASE' || line.role === 'DEST_DEBIT';
      if ((acc.requiresCostCenter || (tplRequiresCC && isExpenseOrDest)) && !line.costCenter) {
        reasons.add('MISSING_COST_CENTER');
      }
    }
  }

  return Array.from(reasons);
}

