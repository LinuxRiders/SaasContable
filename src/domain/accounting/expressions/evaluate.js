import { FUNCTIONS } from './functions.js';

function getPath(obj, path) {
  if (!obj || typeof path !== 'string') return null;
  const parts = path.split('.');
  let curr = obj;
  for (const p of parts) {
    if (curr === null || curr === undefined || typeof curr !== 'object') {
      return null;
    }
    curr = curr[p];
  }
  return curr !== undefined ? curr : null;
}

/**
 * Evalúa una expresión AST en el contexto de un documento contable.
 * Función pura, determinista y sin efectos secundarios.
 *
 * @param {import('../types.js').Expression} node - Nodo de la expresión AST
 * @param {{ document?: any, line?: any, pack?: any, issueDate?: string }} ctx - Contexto de evaluación
 * @returns {any} Resultado de la evaluación
 */
export function evaluateExpression(node, ctx = {}) {
  // Primitivos directos
  if (node === null || node === undefined || typeof node !== 'object') {
    return node;
  }

  // Si es un arreglo literal de primitivos/expresiones
  if (Array.isArray(node)) {
    return node.map(item => evaluateExpression(item, ctx));
  }

  // Constante explícita
  if ('const' in node) {
    return node.const;
  }

  // Campo de documento
  if ('field' in node) {
    return getPath(ctx.document, node.field);
  }

  // Campo de línea
  if ('line' in node) {
    if (!ctx.line) {
      const err = new Error("No se puede evaluar la expresión 'line' sin contexto de línea");
      err.code = 'LINE_CONTEXT_REQUIRED';
      throw err;
    }
    return getPath(ctx.line, node.line);
  }

  // Llamada a función
  if ('fn' in node) {
    const fnDef = FUNCTIONS[node.fn];
    if (!fnDef) {
      const err = new Error(`Función desconocida o no permitida: ${node.fn}`);
      err.code = 'UNKNOWN_FUNCTION';
      throw err;
    }

    if (fnDef.needsLine && !ctx.line) {
      const err = new Error(`La función ${node.fn} requiere contexto de línea`);
      err.code = 'LINE_CONTEXT_REQUIRED';
      throw err;
    }

    let result;
    if (fnDef.isLazy) {
      result = fnDef.impl(ctx, node.args || [], evaluateExpression);
    } else {
      const evaluatedArgs = (node.args || []).map(arg => evaluateExpression(arg, ctx));
      result = fnDef.impl(ctx, evaluatedArgs);
    }

    if (node.prop) {
      result = (result && typeof result === 'object')
        ? (result[node.prop] !== undefined ? result[node.prop] : null)
        : null;
    }

    return result;
  }

  return node;
}

