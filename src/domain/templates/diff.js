/**
 * @fileoverview Comparador de versiones de plantillas contables (HU-09, RF-22, CA-22.3)
 */

/**
 * Compara dos versiones de una plantilla y genera una lista de diferencias en lenguaje natural en español.
 * @param {import('./types.js').TemplateVersion} [previous]
 * @param {import('./types.js').TemplateVersion} [next]
 * @returns {string[]} Lista de diferencias encontradas
 */
export function diffVersions(previous, next) {
  if (!previous || !next) return [];

  const diffs = [];

  // 1. Diferencias en defaults
  const prevDef = previous.defaults || {};
  const nextDef = next.defaults || {};

  if (prevDef.baseAccount !== nextDef.baseAccount) {
    diffs.push(`Cuenta base por defecto cambiada de ${prevDef.baseAccount || 'ninguna'} a ${nextDef.baseAccount || 'ninguna'}`);
  }
  if (prevDef.taxAccount !== nextDef.taxAccount) {
    diffs.push(`Cuenta de IGV por defecto cambiada de ${prevDef.taxAccount || 'ninguna'} a ${nextDef.taxAccount || 'ninguna'}`);
  }
  if (prevDef.counterpartAccount !== nextDef.counterpartAccount) {
    diffs.push(`Cuenta de contrapartida por defecto cambiada de ${prevDef.counterpartAccount || 'ninguna'} a ${nextDef.counterpartAccount || 'ninguna'}`);
  }
  if (Boolean(prevDef.appliesIgv) !== Boolean(nextDef.appliesIgv)) {
    diffs.push(`Cálculo de IGV cambiado a ${nextDef.appliesIgv ? 'activo' : 'inactivo'}`);
  }
  if (Boolean(prevDef.requiresCostCenter) !== Boolean(nextDef.requiresCostCenter)) {
    diffs.push(`Exigencia de centro de costo cambiada a ${nextDef.requiresCostCenter ? 'obligatorio' : 'opcional'}`);
  }
  if ((prevDef.defaultCostCenter || '') !== (nextDef.defaultCostCenter || '')) {
    diffs.push(`Centro de costo por defecto cambiado de '${prevDef.defaultCostCenter || 'ninguno'}' a '${nextDef.defaultCostCenter || 'ninguno'}'`);
  }

  // 2. Comparar reglas (comprobante y línea)
  function compareRuleSet(prevRules = [], nextRules = [], ruleTypeLabel) {
    const prevMap = new Map(prevRules.map(r => [r.ruleId, r]));
    const nextMap = new Map(nextRules.map(r => [r.ruleId, r]));

    // Reglas agregadas
    for (const [id, r] of nextMap.entries()) {
      if (!prevMap.has(id)) {
        const label = (r.ruleId && r.name && r.ruleId !== r.name) ? `${r.ruleId} "${r.name}"` : (r.ruleId || r.name);
        diffs.push(`Se agregó la regla de ${ruleTypeLabel} '${label}'`);
      }
    }

    // Reglas eliminadas
    for (const [id, r] of prevMap.entries()) {
      if (!nextMap.has(id)) {
        const label = (r.ruleId && r.name && r.ruleId !== r.name) ? `${r.ruleId} "${r.name}"` : (r.ruleId || r.name);
        diffs.push(`Se eliminó la regla de ${ruleTypeLabel} '${label}'`);
      }
    }

    // Reglas modificadas
    for (const [id, nextR] of nextMap.entries()) {
      if (prevMap.has(id)) {
        const prevR = prevMap.get(id);
        const nameLabel = (nextR.ruleId && nextR.name && nextR.ruleId !== nextR.name) ? `${nextR.ruleId} "${nextR.name}"` : (nextR.ruleId || nextR.name);

        // Prioridad
        if (prevR.priority !== nextR.priority) {
          diffs.push(`Se cambió la prioridad de la regla '${nameLabel}' de ${prevR.priority} a ${nextR.priority}`);
        }

        // Acciones (then)
        const prevThen = prevR.then || {};
        const nextThen = nextR.then || {};

        if (prevThen.baseAccount !== nextThen.baseAccount) {
          diffs.push(`Se modificó la cuenta base en la regla '${nameLabel}' de ${prevThen.baseAccount || 'por defecto'} a ${nextThen.baseAccount || 'por defecto'}`);
        }

        if ((prevThen.costCenter || '') !== (nextThen.costCenter || '')) {
          diffs.push(`Se modificó el centro de costo en la regla '${nameLabel}' de '${prevThen.costCenter || 'ninguno'}' a '${nextThen.costCenter || 'ninguno'}'`);
        }

        if (prevThen.taxAccount !== nextThen.taxAccount) {
          diffs.push(`Se modificó la cuenta de IGV en la regla '${nameLabel}' de ${prevThen.taxAccount || 'por defecto'} a ${nextThen.taxAccount || 'por defecto'}`);
        }

        if (prevThen.counterpartAccount !== nextThen.counterpartAccount) {
          diffs.push(`Se modificó la contrapartida en la regla '${nameLabel}' de ${prevThen.counterpartAccount || 'por defecto'} a ${nextThen.counterpartAccount || 'por defecto'}`);
        }

        if (JSON.stringify(prevThen.split || null) !== JSON.stringify(nextThen.split || null)) {
          diffs.push(`Se modificó el prorrateo (split) en la regla '${nameLabel}'`);
        }

        // Condiciones (when)
        if (JSON.stringify(prevR.when) !== JSON.stringify(nextR.when)) {
          diffs.push(`Se modificaron las condiciones de evaluación de la regla '${nameLabel}'`);
        }
      }
    }
  }

  compareRuleSet(previous.documentRules || [], next.documentRules || [], 'comprobante');
  compareRuleSet(previous.lineRules || [], next.lineRules || [], 'línea');

  // 3. Comparar casos de prueba
  const prevCases = previous.testCases || [];
  const nextCases = next.testCases || [];
  const prevCaseMap = new Map(prevCases.map(c => [c.caseId, c]));
  const nextCaseMap = new Map(nextCases.map(c => [c.caseId, c]));

  for (const [id, c] of nextCaseMap.entries()) {
    const caseLabel = (c.caseId && c.name && c.caseId !== c.name) ? `${c.caseId} "${c.name}"` : (c.caseId || c.name);
    if (!prevCaseMap.has(id)) {
      diffs.push(`Se agregó el caso de prueba '${caseLabel}'`);
    } else {
      const prevC = prevCaseMap.get(id);
      if (JSON.stringify(prevC.expectedLines) !== JSON.stringify(c.expectedLines) ||
          JSON.stringify(prevC.document) !== JSON.stringify(c.document)) {
        diffs.push(`Se modificó el caso de prueba '${caseLabel}'`);
      }
    }
  }

  for (const [id, c] of prevCaseMap.entries()) {
    const caseLabel = (c.caseId && c.name && c.caseId !== c.name) ? `${c.caseId} "${c.name}"` : (c.caseId || c.name);
    if (!nextCaseMap.has(id)) {
      diffs.push(`Se eliminó el caso de prueba '${caseLabel}'`);
    }
  }

  return diffs;
}

export default diffVersions;
