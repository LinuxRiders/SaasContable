/**
 * @fileoverview Evaluador de condiciones para reglas de plantillas (data-model §4.3, research R-20)
 */

/**
 * Normaliza un texto para comparación: sin tildes ni diacríticos, en mayúsculas y sin espacios extras
 * @param {string} text
 * @returns {string}
 */
export function normalizeText(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

/**
 * Lee el valor de un campo desde el documento o la línea
 * @param {string} field
 * @param {Object} doc
 * @param {Object} [line]
 * @returns {*}
 */
export function readField(field, doc = {}, line = {}) {
  if (field.startsWith('line.')) {
    const lineProp = field.substring(5);
    return line[lineProp];
  }

  if (field === 'issuer.fiscalId') {
    return doc.issuer?.fiscalId || doc.issuer?.ruc;
  }
  if (field === 'issuer.name') {
    return doc.issuer?.name || doc.issuer?.razonSocial;
  }
  if (field === 'receiver.fiscalId') {
    return doc.receiver?.fiscalId || doc.receiver?.ruc;
  }
  if (field === 'receiver.name') {
    return doc.receiver?.name || doc.receiver?.razonSocial;
  }

  return doc[field];
}

/**
 * Evalúa una condición contra el documento y la línea
 * @param {import('./types.js').Condition} condition
 * @param {Object} doc
 * @param {Object} [line]
 * @returns {boolean}
 */
export function evaluateCondition(condition, doc, line) {
  if (!condition) return false;

  if (condition.op === 'and') {
    return (condition.args || []).every(arg => evaluateCondition(arg, doc, line));
  }

  if (condition.op === 'or') {
    return (condition.args || []).some(arg => evaluateCondition(arg, doc, line));
  }

  if (condition.op === 'not') {
    return !evaluateCondition(condition.arg, doc, line);
  }

  const rawVal = readField(condition.field, doc, line);
  const target = condition.value;

  const isText = typeof rawVal === 'string' || typeof target === 'string';

  switch (condition.op) {
    case 'contains': {
      const v = normalizeText(rawVal);
      const t = normalizeText(target);
      return v.includes(t);
    }
    case 'startsWith': {
      const v = normalizeText(rawVal);
      const t = normalizeText(target);
      return v.startsWith(t);
    }
    case 'equals': {
      if (isText) {
        return normalizeText(rawVal) === normalizeText(target);
      }
      return rawVal === target;
    }
    case 'gt':
      return Number(rawVal) > Number(target);
    case 'gte':
      return Number(rawVal) >= Number(target);
    case 'lt':
      return Number(rawVal) < Number(target);
    case 'lte':
      return Number(rawVal) <= Number(target);
    case 'between': {
      if (!Array.isArray(target) || target.length !== 2) return false;
      const num = Number(rawVal);
      return num >= Number(target[0]) && num <= Number(target[1]);
    }
    case 'in': {
      if (!Array.isArray(target)) return false;
      if (isText) {
        const v = normalizeText(rawVal);
        return target.map(item => normalizeText(item)).includes(v);
      }
      return target.includes(rawVal);
    }
    default:
      return false;
  }
}
