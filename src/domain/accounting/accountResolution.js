/**
 * Resolución pura de cuentas contables a partir de AccountRef y validación de cuentas de plantilla.
 * Conforme a contracts/domain-api.md §5.
 * Agnosticismo (RD-14): sin nombres de cuentas ni reglas específicas de país.
 */

/**
 * Resuelve una referencia de cuenta (AccountRef) contra el mapa y plan de cuentas.
 * @param {import('./types.js').AccountRef} accountRef
 * @param {{
 *   mapping?: import('./types.js').AccountMapping|{ entries: Array<any> },
 *   chart: Array<Object>,
 *   qualifier?: string|null,
 *   lineOperationType?: string|null
 * }} options
 * @returns {{ ok: boolean, accountCode?: string, accountRole?: string|null, pending?: Array<{ code: string, message: string, roleCode?: string, qualifier?: string|null }> }}
 */
export function resolveAccount(accountRef, { mapping, chart, qualifier = null, lineOperationType = null }) {
  if (!accountRef || !accountRef.kind) {
    return {
      ok: false,
      pending: [{ code: 'ACCOUNT_UNRESOLVED', message: 'Referencia de cuenta inválida o sin kind' }]
    };
  }

  // 1. LITERAL
  if (accountRef.kind === 'LITERAL') {
    const code = accountRef.accountCode;
    if (!code) {
      return {
        ok: false,
        pending: [{ code: 'ACCOUNT_UNRESOLVED', message: 'Referencia literal sin accountCode' }]
      };
    }

    const acc = (chart || []).find(a => (a.codigo || a.code) === code);
    if (!acc) {
      return {
        ok: false,
        pending: [{ code: 'ACCOUNT_UNRESOLVED', message: `Cuenta literal '${code}' no existe en el plan de cuentas` }]
      };
    }

    if (!acc.esCuentaU || acc.activo === false) {
      return {
        ok: false,
        pending: [{ code: 'ACCOUNT_UNRESOLVED', message: `Cuenta literal '${code}' no es imputable o está inactiva` }]
      };
    }

    return {
      ok: true,
      accountCode: acc.codigo || acc.code,
      accountRole: null
    };
  }

  // 2. ROLE
  if (accountRef.kind === 'ROLE') {
    const roleCode = accountRef.roleCode;
    if (!roleCode) {
      return {
        ok: false,
        pending: [{ code: 'ACCOUNT_UNRESOLVED', message: 'Referencia de tipo ROLE sin roleCode' }]
      };
    }

    const rawEntries = mapping?.entries || [];
    const entries = Array.isArray(rawEntries)
      ? rawEntries
      : Object.entries(rawEntries).map(([k, v]) => {
          if (typeof v === 'string') return { roleCode: k, accountCode: v };
          return { roleCode: v.roleCode || k, qualifier: v.qualifier, accountCode: v.accountCode };
        });
    const entry = entries.find(e => e.roleCode === roleCode && (e.qualifier || null) === (qualifier || null));
    if (!entry) {
      return {
        ok: false,
        pending: [{
          code: 'ACCOUNT_UNRESOLVED',
          roleCode,
          qualifier: qualifier || null,
          message: `Rol de cuenta '${roleCode}'${qualifier ? ` (${qualifier})` : ''} no está mapeado`
        }]
      };
    }

    const acc = (chart || []).find(a => (a.codigo || a.code) === entry.accountCode);
    if (!acc || !acc.esCuentaU || acc.activo === false) {
      return {
        ok: false,
        pending: [{
          code: 'ACCOUNT_UNRESOLVED',
          roleCode,
          qualifier: qualifier || null,
          message: `Cuenta mapeada '${entry.accountCode}' para rol '${roleCode}' no es válida o está inactiva en el plan`
        }]
      };
    }

    return {
      ok: true,
      accountCode: acc.codigo || acc.code,
      accountRole: roleCode
    };
  }

  // 3. BY_OPERATION_TYPE
  if (accountRef.kind === 'BY_OPERATION_TYPE') {
    const mappingByOp = accountRef.byOperationType || {};
    const target = (lineOperationType && mappingByOp[lineOperationType]) || accountRef.fallback;

    if (!target) {
      return {
        ok: false,
        pending: [{
          code: 'ACCOUNT_UNRESOLVED',
          message: `No hay asignación de cuenta para la operación '${lineOperationType || 'SIN_OPERACION'}' y no se definió fallback`
        }]
      };
    }

    if (target.accountCode) {
      return resolveAccount({ kind: 'LITERAL', accountCode: target.accountCode }, { mapping, chart, qualifier, lineOperationType });
    }

    if (target.roleCode) {
      return resolveAccount({ kind: 'ROLE', roleCode: target.roleCode }, { mapping, chart, qualifier, lineOperationType });
    }

    return {
      ok: false,
      pending: [{ code: 'ACCOUNT_UNRESOLVED', message: 'Destino de operación sin accountCode ni roleCode' }]
    };
  }

  return {
    ok: false,
    pending: [{ code: 'ACCOUNT_UNRESOLVED', message: `Tipo de referencia desconocido: ${accountRef.kind}` }]
  };
}

/**
 * Extrae todos los roles y cuentas literales utilizados por una versión de plantilla.
 * @param {import('./types.js').TemplateVersion} templateVersion
 * @returns {{ roles: string[], literalAccounts: string[] }}
 */
export function rolesUsedBy(templateVersion) {
  const roles = new Set();
  const literalAccounts = new Set();

  for (const line of templateVersion?.lines || []) {
    const ref = line.accountRef;
    if (!ref) continue;

    if (ref.kind === 'ROLE' && ref.roleCode) {
      roles.add(ref.roleCode);
    } else if (ref.kind === 'LITERAL' && ref.accountCode) {
      literalAccounts.add(ref.accountCode);
    } else if (ref.kind === 'BY_OPERATION_TYPE') {
      if (ref.byOperationType) {
        for (const item of Object.values(ref.byOperationType)) {
          if (item?.roleCode) roles.add(item.roleCode);
          if (item?.accountCode) literalAccounts.add(item.accountCode);
        }
      }
      if (ref.fallback) {
        if (ref.fallback.roleCode) roles.add(ref.fallback.roleCode);
        if (ref.fallback.accountCode) literalAccounts.add(ref.fallback.accountCode);
      }
    }
  }

  return {
    roles: Array.from(roles),
    literalAccounts: Array.from(literalAccounts)
  };
}

/**
 * Verifica que todas las cuentas requeridas por una plantilla estén resueltas en el mapa y válidas en el plan.
 * @param {import('./types.js').TemplateVersion} templateVersion
 * @param {{ mapping?: import('./types.js').AccountMapping|{ entries: Array<any> }, chart: Array<Object> }} ctx
 * @returns {{ ok: boolean, unresolved: Array<{ roleCode?: string, accountCode?: string, message: string }> }}
 */
export function checkTemplateAccounts(templateVersion, { mapping, chart }) {
  const { roles, literalAccounts } = rolesUsedBy(templateVersion);
  const unresolved = [];

  // Verificar roles
  const rawEntries = mapping?.entries || [];
  const entries = Array.isArray(rawEntries)
    ? rawEntries
    : Object.entries(rawEntries).map(([k, v]) => {
        if (typeof v === 'string') return { roleCode: k, accountCode: v };
        return { roleCode: v.roleCode || k, qualifier: v.qualifier, accountCode: v.accountCode };
      });

  for (const roleCode of roles) {
    const roleEntries = entries.filter(e => e.roleCode === roleCode);
    if (roleEntries.length === 0) {
      unresolved.push({
        roleCode,
        message: `El rol de cuenta '${roleCode}' no está mapeado`
      });
      continue;
    }

    for (const entry of roleEntries) {
      const acc = (chart || []).find(a => (a.codigo || a.code) === entry.accountCode);
      if (!acc || !acc.esCuentaU || acc.activo === false) {
        unresolved.push({
          roleCode,
          accountCode: entry.accountCode,
          message: `La cuenta '${entry.accountCode}' asignada al rol '${roleCode}' no es válida o está inactiva`
        });
      }
    }
  }

  // Verificar cuentas literales
  for (const accountCode of literalAccounts) {
    const acc = (chart || []).find(a => a.codigo === accountCode);
    if (!acc || !acc.esCuentaU || acc.activo === false) {
      unresolved.push({
        accountCode,
        message: `La cuenta literal '${accountCode}' no existe, es de agrupación o está inactiva`
      });
    }
  }

  return {
    ok: unresolved.length === 0,
    unresolved
  };
}
