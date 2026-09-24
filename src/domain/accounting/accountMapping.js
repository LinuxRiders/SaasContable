/**
 * Lógica pura de validación, precarga y comparación de mapa de cuentas.
 * Conforme a contracts/domain-api.md §5 y research R-07.
 * Agnosticismo (RD-14): no menciona planes ni cuentas fijas.
 */

/**
 * Valida una entrada individual del mapa de cuentas.
 * @param {{ roleCode: string, qualifier?: string|null, accountCode: string }} entry
 * @param {{ pack: import('./types.js').JurisdictionPack, chart: Array<Object> }} ctx
 * @returns {{ ok: boolean, code?: string, message?: string }}
 */
export function validateMappingEntry(entry, { pack, chart }) {
  if (!entry || !entry.roleCode || !entry.accountCode) {
    return { ok: false, code: 'INVALID_ENTRY', message: 'Entrada incompleta: se requiere roleCode y accountCode' };
  }

  const role = (pack?.accountRoles || []).find(r => r.code === entry.roleCode);
  if (!role) {
    return { ok: false, code: 'ROLE_UNKNOWN', message: `Rol '${entry.roleCode}' desconocido en el paquete de jurisdicción` };
  }

  if (role.qualifier) {
    if (!entry.qualifier) {
      return { ok: false, code: 'QUALIFIER_REQUIRED', message: `El rol '${entry.roleCode}' requiere calificador (${role.qualifier.name})` };
    }
  } else {
    if (entry.qualifier) {
      return { ok: false, code: 'QUALIFIER_NOT_ALLOWED', message: `El rol '${entry.roleCode}' no admite calificador` };
    }
  }

  const account = (chart || []).find(a => a.codigo === entry.accountCode);
  if (!account) {
    return { ok: false, code: 'ACCOUNT_NOT_FOUND', message: `Cuenta '${entry.accountCode}' no existe en el plan de cuentas` };
  }

  if (!account.esCuentaU) {
    return { ok: false, code: 'ACCOUNT_NOT_POSTABLE', message: `Cuenta '${entry.accountCode}' es de agrupación (no es imputable)` };
  }

  if (account.activo === false) {
    return { ok: false, code: 'ACCOUNT_INACTIVE', message: `Cuenta '${entry.accountCode}' está inactiva` };
  }

  return { ok: true };
}

/**
 * Valida un conjunto completo de entradas de mapa de cuentas.
 * @param {Array<{ roleCode: string, qualifier?: string|null, accountCode: string }>} entries
 * @param {{ pack: import('./types.js').JurisdictionPack, chart: Array<Object> }} ctx
 * @returns {{ ok: boolean, errors: Array<{ roleCode: string, qualifier?: string|null, code: string, message: string }> }}
 */
export function validateMapping(entries, { pack, chart }) {
  const errors = [];
  const seenKeys = new Set();

  for (const entry of entries || []) {
    const key = `${entry.roleCode}::${entry.qualifier || ''}`;
    if (seenKeys.has(key)) {
      errors.push({
        roleCode: entry.roleCode,
        qualifier: entry.qualifier || null,
        code: 'DUPLICATE_ENTRY',
        message: `Entrada duplicada para rol '${entry.roleCode}'${entry.qualifier ? ` (${entry.qualifier})` : ''}`
      });
      continue;
    }
    seenKeys.add(key);

    const valRes = validateMappingEntry(entry, { pack, chart });
    if (!valRes.ok) {
      errors.push({
        roleCode: entry.roleCode,
        qualifier: entry.qualifier || null,
        code: valRes.code,
        message: valRes.message
      });
    }
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

/**
 * Precarga el mapa de cuentas a partir de sugerencias del paquete y el plan de la empresa.
 * No sobreescribe entradas ya existentes.
 * @param {import('./types.js').JurisdictionPack} pack
 * @param {Array<Object>} chart
 * @param {Array<{ roleCode: string, qualifier?: string|null, accountCode: string }>} [existingEntries=[]]
 * @returns {{ entries: Array<{ roleCode: string, qualifier: string|null, accountCode: string }>, unmappedRoles: string[] }}
 */
export function preloadMapping(pack, chart, existingEntries = []) {
  const resultEntries = [...existingEntries];
  const seenKeys = new Set(existingEntries.map(e => `${e.roleCode}::${e.qualifier || ''}`));
  const unmappedRoles = [];

  const postableAccounts = (chart || [])
    .filter(a => a.esCuentaU && a.activo !== false)
    .sort((a, b) => a.codigo.localeCompare(b.codigo));

  const findFirstMatching = (prefix) => {
    if (!prefix) return null;
    return postableAccounts.find(a => a.codigo.startsWith(prefix)) || null;
  };

  for (const role of pack?.accountRoles || []) {
    if (role.qualifier?.suggestions) {
      for (const [qualVal, suggestedPrefix] of Object.entries(role.qualifier.suggestions)) {
        const key = `${role.code}::${qualVal}`;
        if (seenKeys.has(key)) continue;

        const match = findFirstMatching(suggestedPrefix);
        if (match) {
          resultEntries.push({
            roleCode: role.code,
            qualifier: qualVal,
            accountCode: match.codigo
          });
          seenKeys.add(key);
        } else {
          unmappedRoles.push(role.code);
        }
      }
    } else {
      const key = `${role.code}::`;
      if (seenKeys.has(key)) continue;

      const match = findFirstMatching(role.suggestedAccountCode);
      if (match) {
        resultEntries.push({
          roleCode: role.code,
          qualifier: null,
          accountCode: match.codigo
        });
        seenKeys.add(key);
      } else {
        unmappedRoles.push(role.code);
      }
    }
  }

  return {
    entries: resultEntries,
    unmappedRoles: Array.from(new Set(unmappedRoles))
  };
}

/**
 * Compara dos versiones del mapa de cuentas y devuelve la lista de roles modificados.
 * @param {Array<{ roleCode: string, qualifier?: string|null, accountCode: string }>} prevEntries
 * @param {Array<{ roleCode: string, qualifier?: string|null, accountCode: string }>} nextEntries
 * @returns {string[]} Lista de códigos de roles modificados
 */
export function diffMappingRoles(prevEntries = [], nextEntries = []) {
  const prevMap = new Map();
  for (const e of prevEntries) {
    prevMap.set(`${e.roleCode}::${e.qualifier || ''}`, e.accountCode);
  }

  const nextMap = new Map();
  for (const e of nextEntries) {
    nextMap.set(`${e.roleCode}::${e.qualifier || ''}`, e.accountCode);
  }

  const changedRoles = new Set();

  for (const [key, nextAcc] of nextMap.entries()) {
    const roleCode = key.split('::')[0];
    const prevAcc = prevMap.get(key);
    if (prevAcc !== nextAcc) {
      changedRoles.add(roleCode);
    }
  }

  for (const [key] of prevMap.entries()) {
    const roleCode = key.split('::')[0];
    if (!nextMap.has(key)) {
      changedRoles.add(roleCode);
    }
  }

  return Array.from(changedRoles);
}

