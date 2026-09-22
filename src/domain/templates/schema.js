/**
 * @fileoverview Validador de esquemas de plantillas y reglas contables (data-model §4.3 - §4.4)
 */

const VALID_DOC_FIELDS = [
  'issuer.fiscalId',
  'issuer.name',
  'receiver.fiscalId',
  'receiver.name',
  'currency',
  'totalCents',
  'issueDate',
  'operationType'
];

const VALID_LINE_FIELDS = [
  ...VALID_DOC_FIELDS,
  'line.description',
  'line.amountCents',
  'line.taxCode'
];

const VALID_OPERATORS = [
  'contains',
  'startsWith',
  'equals',
  'gt',
  'gte',
  'lt',
  'lte',
  'between',
  'in'
];

/**
 * Valida una condición (recursiva)
 * @param {import('./types.js').Condition} cond
 * @param {string} basePath
 * @param {boolean} isLineRule
 * @param {Array<{path: string, message: string}>} errors
 */
function validateCondition(cond, basePath, isLineRule, errors) {
  if (!cond || typeof cond !== 'object') {
    errors.push({ path: basePath, message: 'La condición debe ser un objeto válido' });
    return;
  }

  if (cond.op === 'and' || cond.op === 'or') {
    if (!Array.isArray(cond.args) || cond.args.length < 2) {
      errors.push({ path: `${basePath}.args`, message: `Operador '${cond.op}' requiere al menos 2 condiciones en 'args'` });
    } else {
      cond.args.forEach((arg, idx) => {
        validateCondition(arg, `${basePath}.args[${idx}]`, isLineRule, errors);
      });
    }
    return;
  }

  if (cond.op === 'not') {
    if (!cond.arg) {
      errors.push({ path: `${basePath}.arg`, message: "Operador 'not' requiere una condición en 'arg'" });
    } else {
      validateCondition(cond.arg, `${basePath}.arg`, isLineRule, errors);
    }
    return;
  }

  if (!VALID_OPERATORS.includes(cond.op)) {
    errors.push({ path: `${basePath}.op`, message: `Operador desconocido: '${cond.op}'` });
  }

  const allowedFields = isLineRule ? VALID_LINE_FIELDS : VALID_DOC_FIELDS;
  if (!cond.field || !allowedFields.includes(cond.field)) {
    errors.push({
      path: `${basePath}.field`,
      message: `Campo '${cond.field}' no permitido o desconocido para este tipo de regla`
    });
  }

  if (cond.value === undefined || cond.value === null || cond.value === '') {
    errors.push({ path: `${basePath}.value`, message: 'El valor de la condición no puede estar vacío' });
  } else if (cond.op === 'between') {
    if (!Array.isArray(cond.value) || cond.value.length !== 2 || typeof cond.value[0] !== 'number' || typeof cond.value[1] !== 'number' || cond.value[0] > cond.value[1]) {
      errors.push({ path: `${basePath}.value`, message: "Operador 'between' requiere un arreglo [min, max] con min <= max" });
    }
  } else if (cond.op === 'in') {
    if (!Array.isArray(cond.value) || cond.value.length === 0) {
      errors.push({ path: `${basePath}.value`, message: "Operador 'in' requiere un arreglo no vacío" });
    }
  }
}

/**
 * Valida una acción de comprobante
 */
function validateDocumentAction(action, basePath, errors) {
  if (!action || typeof action !== 'object' || Object.keys(action).length === 0) {
    errors.push({ path: basePath, message: 'La acción de comprobante no puede estar vacía' });
    return;
  }
}

/**
 * Valida una acción de línea
 */
function validateLineAction(action, basePath, errors) {
  if (!action || typeof action !== 'object' || Object.keys(action).length === 0) {
    errors.push({ path: basePath, message: 'La acción de línea no puede estar vacía' });
    return;
  }

  if (action.split) {
    if (action.baseAccount || action.costCenter) {
      errors.push({ path: basePath, message: "La acción 'split' excluye 'baseAccount' y 'costCenter'" });
    }
    if (!Array.isArray(action.split) || action.split.length < 2) {
      errors.push({ path: `${basePath}.split`, message: "'split' requiere al menos 2 partes" });
    } else {
      let totalBp = 0;
      action.split.forEach((part, idx) => {
        if (!part.account || typeof part.account !== 'string') {
          errors.push({ path: `${basePath}.split[${idx}].account`, message: 'Cuenta contable requerida en la parte del split' });
        }
        if (typeof part.basisPoints !== 'number' || part.basisPoints <= 0 || !Number.isInteger(part.basisPoints)) {
          errors.push({ path: `${basePath}.split[${idx}].basisPoints`, message: 'basisPoints debe ser un entero positivo' });
        } else {
          totalBp += part.basisPoints;
        }
      });
      if (totalBp !== 10000) {
        errors.push({ path: `${basePath}.split`, message: `La suma de basisPoints debe ser exactamente 10000 (actual: ${totalBp})` });
      }
    }
  }
}

/**
 * Valida una lista de reglas
 */
function validateRules(rules, basePath, isLineRule, errors) {
  if (!Array.isArray(rules)) return;
  const priorities = new Set();

  rules.forEach((rule, idx) => {
    const rulePath = `${basePath}[${idx}]`;
    if (!rule.name || typeof rule.name !== 'string' || rule.name.trim() === '') {
      errors.push({ path: `${rulePath}.name`, message: 'El nombre de la regla es obligatorio' });
    }

    if (typeof rule.priority !== 'number' || rule.priority < 1 || !Number.isInteger(rule.priority)) {
      errors.push({ path: `${rulePath}.priority`, message: 'La prioridad debe ser un entero >= 1' });
    } else if (priorities.has(rule.priority)) {
      errors.push({ path: `${rulePath}.priority`, message: `Prioridad repetida en el grupo: ${rule.priority}` });
    } else {
      priorities.add(rule.priority);
    }

    validateCondition(rule.when, `${rulePath}.when`, isLineRule, errors);

    if (isLineRule) {
      validateLineAction(rule.then, `${rulePath}.then`, errors);
    } else {
      validateDocumentAction(rule.then, `${rulePath}.then`, errors);
    }
  });
}

/**
 * Valida la cabecera de la plantilla
 * @param {Object} header
 * @returns {{ok: boolean, errors: Array<{path: string, message: string}>}}
 */
export function validateTemplateHeader(header) {
  const errors = [];
  if (!header.code || !/^[A-Z0-9_]+$/.test(header.code)) {
    errors.push({ path: 'code', message: 'El código debe contener solo mayúsculas, números y guion bajo' });
  }
  if (!header.name || typeof header.name !== 'string' || header.name.trim() === '') {
    errors.push({ path: 'name', message: 'El nombre de la plantilla es obligatorio' });
  }
  if (header.operationType !== 'COMPRA' && header.operationType !== 'VENTA') {
    errors.push({ path: 'operationType', message: "El tipo de operación debe ser 'COMPRA' o 'VENTA'" });
  }
  return { ok: errors.length === 0, errors };
}

/**
 * Valida una versión de plantilla completa
 * @param {import('./types.js').TemplateVersion} version
 * @param {{operationType: "COMPRA"|"VENTA"}} [options]
 * @returns {{ok: boolean, errors: Array<{path: string, message: string}>}}
 */
export function validateTemplateVersion(version, options = {}) {
  const errors = [];

  if (!version || typeof version !== 'object') {
    return { ok: false, errors: [{ path: 'version', message: 'La versión debe ser un objeto' }] };
  }

  // Defaults
  if (!version.defaults || typeof version.defaults !== 'object') {
    errors.push({ path: 'defaults', message: 'defaults es obligatorio' });
  } else {
    if (!version.defaults.baseAccount) {
      errors.push({ path: 'defaults.baseAccount', message: 'Cuenta base obligatoria' });
    }
    if (!version.defaults.taxAccount) {
      errors.push({ path: 'defaults.taxAccount', message: 'Cuenta de IGV obligatoria' });
    }
    if (!version.defaults.counterpartAccount) {
      errors.push({ path: 'defaults.counterpartAccount', message: 'Cuenta de contrapartida obligatoria' });
    }
  }

  // Rules
  validateRules(version.documentRules || [], 'documentRules', false, errors);
  validateRules(version.lineRules || [], 'lineRules', true, errors);

  // Test cases
  if (Array.isArray(version.testCases)) {
    version.testCases.forEach((tc, idx) => {
      const tcPath = `testCases[${idx}]`;
      if (!Array.isArray(tc.expectedLines) || tc.expectedLines.length === 0) {
        errors.push({ path: `${tcPath}.expectedLines`, message: 'El caso de prueba debe tener al menos una expectedLine' });
      }
    });
  }

  return { ok: errors.length === 0, errors };
}
