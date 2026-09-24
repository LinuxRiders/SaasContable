import { FUNCTIONS } from './functions.js';

const VALID_FIELD_PREFIXES = [
  'series', 'number', 'issueDate', 'dueDate', 'currency', 'perspective',
  'operationTypeCode', 'documentTypeCode',
  'totals.netMinor', 'totals.taxMinor', 'totals.withheldMinor', 'totals.totalMinor', 'totals.payableMinor',
  'fields.'
];

const VALID_LINE_PREFIXES = [
  'lineNo', 'description', 'itemCode', 'quantity', 'unitPriceMinor',
  'amountMinor', 'operationTypeCode', 'fields.'
];

const SCHEMA_TYPE_MAP = {
  MONEY: 'MONEY',
  QUANTITY: 'INT',
  PERCENT: 'RATE_BP',
  CODE: 'STRING',
  STRING: 'STRING',
  DATE: 'DATE',
  BOOLEAN: 'BOOL'
};

function isTypeCompatible(expected, actual) {
  if (!expected || expected === 'ANY' || actual === 'ANY' || actual === 'NULL') {
    return true;
  }
  if (expected === actual) return true;
  if (expected === 'MONEY' && actual === 'INT') return true;
  if (expected === 'INT' && actual === 'MONEY') return true;
  if (expected === 'RATE_BP' && actual === 'INT') return true;
  if (expected === 'STRING' && actual === 'DATE') return true;
  return false;
}

/**
 * Infiere el tipo del resultado de evaluar un nodo AST.
 */
export function inferType(node, { documentType, lineContext = false } = {}) {
  if (node === null || node === undefined) return 'NULL';
  if (typeof node === 'boolean') return 'BOOL';
  if (typeof node === 'number') {
    return Number.isInteger(node) ? 'INT' : 'MONEY';
  }
  if (typeof node === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(node)) return 'DATE';
    return 'STRING';
  }
  if (Array.isArray(node)) return 'ARRAY';

  if ('const' in node) {
    return inferType(node.const, { documentType, lineContext });
  }

  if ('field' in node) {
    const path = node.field;
    if (path.startsWith('totals.') || path.endsWith('Minor')) return 'MONEY';
    if (path === 'issueDate' || path === 'dueDate') return 'DATE';
    if (path.startsWith('fields.')) {
      const fieldKey = path.slice(7);
      const fieldDef = documentType?.headerFields?.find(f => f.key === fieldKey);
      if (fieldDef && SCHEMA_TYPE_MAP[fieldDef.type]) {
        return SCHEMA_TYPE_MAP[fieldDef.type];
      }
      return 'ANY';
    }
    return 'STRING';
  }

  if ('line' in node) {
    const path = node.line;
    if (path === 'amountMinor' || path === 'unitPriceMinor') return 'MONEY';
    if (path === 'quantity' || path === 'lineNo') return 'INT';
    if (path.startsWith('fields.')) {
      const fieldKey = path.slice(7);
      const fieldDef = documentType?.lineFields?.find(f => f.key === fieldKey);
      if (fieldDef && SCHEMA_TYPE_MAP[fieldDef.type]) {
        return SCHEMA_TYPE_MAP[fieldDef.type];
      }
      return 'ANY';
    }
    return 'STRING';
  }

  if ('fn' in node) {
    const fnDef = FUNCTIONS[node.fn];
    if (!fnDef) return 'ANY';
    if (node.prop) {
      if (node.fn === 'party') return 'STRING';
      if (node.fn === 'reference') {
        if (node.prop === 'issueDate') return 'DATE';
        return 'STRING';
      }
      return 'ANY';
    }
    return fnDef.returns || 'ANY';
  }

  return 'ANY';
}

/**
 * Valida estáticamente una expresión AST.
 * Conforme a contracts/expression-language.md §4.
 *
 * @param {import('../types.js').Expression} rootNode - Nodo raíz a validar
 * @param {{ expectedType?: string, documentType?: any, lineContext?: boolean }} options - Opciones de validación
 * @returns {{ ok: boolean, errors: Array<{ path: string, reason: string }> }}
 */
export function validateExpression(rootNode, { expectedType = null, documentType = null, lineContext = false } = {}) {
  const errors = [];
  let nodeCount = 0;

  function countAndCheckLimits(node, depth, currentPath) {
    nodeCount += 1;
    if (depth > 12) {
      errors.push({
        path: currentPath,
        reason: 'Profundidad máxima excedida (> 12)'
      });
      return false;
    }
    if (nodeCount > 200) {
      errors.push({
        path: currentPath,
        reason: 'Número máximo de nodos excedido (> 200)'
      });
      return false;
    }
    return true;
  }

  function validateNode(node, currentPath, inLineContext, depth) {
    if (!countAndCheckLimits(node, depth, currentPath)) return;

    if (node === null || node === undefined || typeof node !== 'object') {
      return;
    }

    if (Array.isArray(node)) {
      node.forEach((item, idx) => {
        validateNode(item, `${currentPath}[${idx}]`, inLineContext, depth + 1);
      });
      return;
    }

    // Verificar forma de nodo permitida
    const keys = Object.keys(node);
    const hasConst = 'const' in node;
    const hasField = 'field' in node;
    const hasLine = 'line' in node;
    const hasFn = 'fn' in node;

    const validForms = [hasConst, hasField, hasLine, hasFn].filter(Boolean).length;
    if (validForms !== 1) {
      errors.push({
        path: currentPath,
        reason: 'Forma de nodo inválida: debe tener exactamente uno de { const, field, line, fn }'
      });
      return;
    }

    if (hasConst) {
      return;
    }

    if (hasField) {
      if (typeof node.field !== 'string') {
        errors.push({
          path: currentPath,
          reason: 'El atributo "field" debe ser una cadena'
        });
        return;
      }

      if (node.field.startsWith('fields.')) {
        const fieldKey = node.field.slice(7);
        const headerFieldExists = documentType?.headerFields?.some(f => f.key === fieldKey);
        if (documentType && !headerFieldExists) {
          errors.push({
            path: currentPath,
            reason: `El campo de cabecera "${fieldKey}" no existe en el esquema del tipo ${documentType.code || ''}`
          });
        }
      }
      return;
    }

    if (hasLine) {
      if (!inLineContext) {
        errors.push({
          path: currentPath,
          reason: 'Expresión "line" sin contexto de línea (se requiere forEachDocumentLine, regla LINE o sumLines/countLines)'
        });
        return;
      }

      if (typeof node.line !== 'string') {
        errors.push({
          path: currentPath,
          reason: 'El atributo "line" debe ser una cadena'
        });
        return;
      }

      if (node.line.startsWith('fields.')) {
        const fieldKey = node.line.slice(7);
        const lineFieldExists = documentType?.lineFields?.some(f => f.key === fieldKey);
        if (documentType && !lineFieldExists) {
          errors.push({
            path: currentPath,
            reason: `El campo de línea "${fieldKey}" no existe en el esquema del tipo ${documentType.code || ''}`
          });
        }
      }
      return;
    }

    if (hasFn) {
      const fnName = node.fn;
      const fnDef = FUNCTIONS[fnName];

      if (!fnDef) {
        errors.push({
          path: currentPath,
          reason: `Función "${fnName}" fuera de la lista blanca permitida`
        });
        return;
      }

      if (fnDef.needsLine && !inLineContext) {
        errors.push({
          path: currentPath,
          reason: `La función "${fnName}" requiere contexto de línea`
        });
      }

      const args = node.args || [];
      if (!Array.isArray(args)) {
        errors.push({
          path: `${currentPath}.args`,
          reason: 'Los argumentos de "fn" deben ser un arreglo'
        });
        return;
      }

      // Validar aridad
      const minArgs = fnDef.minArgs !== undefined ? fnDef.minArgs : fnDef.params.length;
      const maxArgs = fnDef.varargs ? Infinity : fnDef.params.length;
      if (args.length < minArgs || args.length > maxArgs) {
        errors.push({
          path: currentPath,
          reason: `Aridad incorrecta para "${fnName}": se esperaban ${minArgs === maxArgs ? minArgs : `entre ${minArgs} y ${maxArgs}`} argumentos, pero se recibieron ${args.length}`
        });
      }

      // Validar prop
      if (node.prop) {
        if (!fnDef.allowsProp || !fnDef.allowsProp.includes(node.prop)) {
          errors.push({
            path: `${currentPath}.prop`,
            reason: `Propiedad "${node.prop}" no permitida en "${fnName}" (permitidas: ${(fnDef.allowsProp || []).join(', ')})`
          });
        }
      }

      // Validar impuestos y retenciones contra esquema
      if (['taxAmount', 'taxBase', 'taxRate', 'hasTax', 'lineTaxAmount'].includes(fnName)) {
        const taxCodeArg = typeof args[0] === 'string' ? args[0] : (args[0]?.const || null);
        if (taxCodeArg && documentType?.allowedTaxCodes) {
          if (!documentType.allowedTaxCodes.includes(taxCodeArg)) {
            errors.push({
              path: `${currentPath}.args[0]`,
              reason: `Código de impuesto "${taxCodeArg}" no admitido por el tipo de documento ${documentType.code || ''}`
            });
          }
        }
      }

      if (['withholdingAmount', 'withholdingBase', 'hasWithholding'].includes(fnName)) {
        const whCodeArg = typeof args[0] === 'string' ? args[0] : (args[0]?.const || null);
        if (whCodeArg && documentType?.allowedWithholdingCodes) {
          if (!documentType.allowedWithholdingCodes.includes(whCodeArg)) {
            errors.push({
              path: `${currentPath}.args[0]`,
              reason: `Código de retención "${whCodeArg}" no admitido por el tipo de documento ${documentType.code || ''}`
            });
          }
        }
      }

      // Validar argumentos recursivamente
      args.forEach((arg, idx) => {
        const argPath = `${currentPath}.args[${idx}]`;
        const argLineContext = (fnName === 'sumLines' || fnName === 'countLines') ? true : inLineContext;
        validateNode(arg, argPath, argLineContext, depth + 1);

        // Validar tipo de argumento esperado si está definido
        if (fnDef.params[idx] && fnDef.params[idx] !== 'ANY' && !fnDef.isLazy) {
          const argInferred = inferType(arg, { documentType, lineContext: argLineContext });
          if (!isTypeCompatible(fnDef.params[idx], argInferred)) {
            errors.push({
              path: argPath,
              reason: `Tipo de argumento inválido: se esperaba ${fnDef.params[idx]}, pero se infirió ${argInferred}`
            });
          }
        }
      });
    }
  }

  validateNode(rootNode, '$', lineContext, 1);

  // Validar tipo del resultado esperado en la raíz
  if (expectedType && errors.length === 0) {
    const inferred = inferType(rootNode, { documentType, lineContext });
    if (!isTypeCompatible(expectedType, inferred)) {
      errors.push({
        path: '$',
        reason: `Tipo de resultado distinto del esperado: se esperaba ${expectedType}, pero se infirió ${inferred}`
      });
    }
  }

  return {
    ok: errors.length === 0,
    errors
  };
}
