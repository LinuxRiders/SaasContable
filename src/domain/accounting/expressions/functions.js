import { roundHalfUpDiv, formatMoney } from '../../ingestion/money.js';

function assertNonNullArithmetic(val) {
  if (val === null || val === undefined) {
    const err = new Error('NULL_IN_ARITHMETIC: Se recibió null en operación aritmética');
    err.code = 'NULL_IN_ARITHMETIC';
    throw err;
  }
}

/**
 * Registro de funciones del lenguaje de expresiones (lista blanca cerrada).
 * Conforme a contracts/expression-language.md §3.
 */
export const FUNCTIONS = {
  // Impuestos
  taxAmount: {
    name: 'taxAmount',
    params: ['STRING'],
    returns: 'MONEY',
    impl: (ctx, [code]) => {
      const tax = ctx.document?.taxes?.find(t => t.taxCode === code);
      return tax ? tax.amountMinor : 0;
    }
  },
  taxBase: {
    name: 'taxBase',
    params: ['STRING'],
    returns: 'MONEY',
    impl: (ctx, [code]) => {
      const tax = ctx.document?.taxes?.find(t => t.taxCode === code);
      return tax ? tax.baseMinor : 0;
    }
  },
  taxRate: {
    name: 'taxRate',
    params: ['STRING'],
    returns: 'RATE_BP',
    impl: (ctx, [code]) => {
      const tax = ctx.document?.taxes?.find(t => t.taxCode === code);
      return tax ? tax.rateBp : null;
    }
  },
  hasTax: {
    name: 'hasTax',
    params: ['STRING'],
    returns: 'BOOL',
    impl: (ctx, [code]) => {
      return Boolean(ctx.document?.taxes?.some(t => t.taxCode === code));
    }
  },
  lineTaxAmount: {
    name: 'lineTaxAmount',
    params: ['STRING'],
    returns: 'MONEY',
    needsLine: true,
    impl: (ctx, [code]) => {
      if (!ctx.line) {
        const err = new Error("lineTaxAmount requiere contexto de línea ('line')");
        err.code = 'LINE_CONTEXT_REQUIRED';
        throw err;
      }
      const tax = ctx.line.taxes?.find(t => t.taxCode === code);
      return tax ? tax.amountMinor : 0;
    }
  },

  // Retenciones
  withholdingAmount: {
    name: 'withholdingAmount',
    params: ['STRING'],
    returns: 'MONEY',
    impl: (ctx, [code]) => {
      const w = ctx.document?.withholdings?.find(x => x.withholdingCode === code);
      return w ? w.amountMinor : 0;
    }
  },
  withholdingBase: {
    name: 'withholdingBase',
    params: ['STRING'],
    returns: 'MONEY',
    impl: (ctx, [code]) => {
      const w = ctx.document?.withholdings?.find(x => x.withholdingCode === code);
      return w ? w.baseMinor : 0;
    }
  },
  hasWithholding: {
    name: 'hasWithholding',
    params: ['STRING'],
    returns: 'BOOL',
    impl: (ctx, [code]) => {
      return Boolean(ctx.document?.withholdings?.some(x => x.withholdingCode === code));
    }
  },

  // Partes y referencias
  party: {
    name: 'party',
    params: ['STRING'],
    returns: 'OBJECT',
    allowsProp: ['fiscalId', 'fiscalIdType', 'name', 'countryCode'],
    impl: (ctx, [role]) => {
      const p = ctx.document?.parties?.find(x => x.role === role);
      return p || null;
    }
  },
  reference: {
    name: 'reference',
    params: ['INT'],
    returns: 'OBJECT',
    allowsProp: ['documentTypeCode', 'series', 'number', 'issueDate'],
    impl: (ctx, [index]) => {
      const refs = ctx.document?.references;
      return refs && refs[index] ? refs[index] : null;
    }
  },
  hasReference: {
    name: 'hasReference',
    params: [],
    returns: 'BOOL',
    impl: (ctx) => {
      return Boolean(ctx.document?.references && ctx.document.references.length > 0);
    }
  },

  // Agregados
  sumLines: {
    name: 'sumLines',
    params: ['MONEY', 'BOOL'],
    minArgs: 1,
    isLazy: true,
    returns: 'MONEY',
    impl: (ctx, [exprNode, whereNode], evaluate) => {
      const lines = ctx.document?.lines || [];
      let total = 0;
      for (const line of lines) {
        const lineCtx = { ...ctx, line };
        if (whereNode !== undefined && whereNode !== null) {
          const matches = evaluate(whereNode, lineCtx);
          if (!matches) continue;
        }
        const val = evaluate(exprNode, lineCtx);
        assertNonNullArithmetic(val);
        total += Number(val);
      }
      return total;
    }
  },
  countLines: {
    name: 'countLines',
    params: ['BOOL'],
    minArgs: 0,
    isLazy: true,
    returns: 'INT',
    impl: (ctx, [whereNode], evaluate) => {
      const lines = ctx.document?.lines || [];
      if (whereNode === undefined || whereNode === null) {
        return lines.length;
      }
      let count = 0;
      for (const line of lines) {
        const lineCtx = { ...ctx, line };
        const matches = evaluate(whereNode, lineCtx);
        if (matches) count += 1;
      }
      return count;
    }
  },

  // Aritmética
  add: {
    name: 'add',
    params: ['MONEY'],
    varargs: true,
    returns: 'MONEY',
    impl: (ctx, args) => {
      let sum = 0;
      for (const a of args) {
        assertNonNullArithmetic(a);
        sum += Number(a);
      }
      return sum;
    }
  },
  sub: {
    name: 'sub',
    params: ['MONEY', 'MONEY'],
    returns: 'MONEY',
    impl: (ctx, [a, b]) => {
      assertNonNullArithmetic(a);
      assertNonNullArithmetic(b);
      return Number(a) - Number(b);
    }
  },
  mulRate: {
    name: 'mulRate',
    params: ['MONEY', 'RATE_BP'],
    returns: 'MONEY',
    impl: (ctx, [amount, rateBp]) => {
      assertNonNullArithmetic(amount);
      assertNonNullArithmetic(rateBp);
      return roundHalfUpDiv(Number(amount) * Number(rateBp), 10000);
    }
  },
  min: {
    name: 'min',
    params: ['MONEY', 'MONEY'],
    returns: 'MONEY',
    impl: (ctx, [a, b]) => {
      assertNonNullArithmetic(a);
      assertNonNullArithmetic(b);
      return Math.min(Number(a), Number(b));
    }
  },
  max: {
    name: 'max',
    params: ['MONEY', 'MONEY'],
    returns: 'MONEY',
    impl: (ctx, [a, b]) => {
      assertNonNullArithmetic(a);
      assertNonNullArithmetic(b);
      return Math.max(Number(a), Number(b));
    }
  },
  coalesce: {
    name: 'coalesce',
    params: ['ANY'],
    varargs: true,
    returns: 'ANY',
    impl: (ctx, args) => {
      for (const a of args) {
        if (a !== null && a !== undefined) return a;
      }
      return null;
    }
  },

  // Comparación
  eq: {
    name: 'eq',
    params: ['ANY', 'ANY'],
    returns: 'BOOL',
    impl: (ctx, [a, b]) => a === b
  },
  ne: {
    name: 'ne',
    params: ['ANY', 'ANY'],
    returns: 'BOOL',
    impl: (ctx, [a, b]) => a !== b
  },
  gt: {
    name: 'gt',
    params: ['ANY', 'ANY'],
    returns: 'BOOL',
    impl: (ctx, [a, b]) => a > b
  },
  gte: {
    name: 'gte',
    params: ['ANY', 'ANY'],
    returns: 'BOOL',
    impl: (ctx, [a, b]) => a >= b
  },
  lt: {
    name: 'lt',
    params: ['ANY', 'ANY'],
    returns: 'BOOL',
    impl: (ctx, [a, b]) => a < b
  },
  lte: {
    name: 'lte',
    params: ['ANY', 'ANY'],
    returns: 'BOOL',
    impl: (ctx, [a, b]) => a <= b
  },
  in: {
    name: 'in',
    params: ['ANY', 'ARRAY'],
    returns: 'BOOL',
    impl: (ctx, [value, list]) => {
      if (!Array.isArray(list)) return false;
      return list.includes(value);
    }
  },

  // Lógica
  and: {
    name: 'and',
    params: ['BOOL'],
    varargs: true,
    isLazy: true,
    returns: 'BOOL',
    impl: (ctx, argNodes, evaluate) => {
      for (const node of argNodes) {
        const val = evaluate(node, ctx);
        if (!val) return false;
      }
      return true;
    }
  },
  or: {
    name: 'or',
    params: ['BOOL'],
    varargs: true,
    isLazy: true,
    returns: 'BOOL',
    impl: (ctx, argNodes, evaluate) => {
      for (const node of argNodes) {
        const val = evaluate(node, ctx);
        if (val) return true;
      }
      return false;
    }
  },
  not: {
    name: 'not',
    params: ['BOOL'],
    returns: 'BOOL',
    impl: (ctx, [a]) => !a
  },
  isEmpty: {
    name: 'isEmpty',
    params: ['ANY'],
    returns: 'BOOL',
    impl: (ctx, [a]) => {
      if (a === null || a === undefined) return true;
      if (typeof a === 'string' && a.trim() === '') return true;
      if (Array.isArray(a) && a.length === 0) return true;
      return false;
    }
  },

  // Texto
  contains: {
    name: 'contains',
    params: ['STRING', 'STRING'],
    returns: 'BOOL',
    impl: (ctx, [text, sub]) => {
      if (typeof text !== 'string' || typeof sub !== 'string') return false;
      return text.includes(sub);
    }
  },
  startsWith: {
    name: 'startsWith',
    params: ['STRING', 'STRING'],
    returns: 'BOOL',
    impl: (ctx, [text, prefix]) => {
      if (typeof text !== 'string' || typeof prefix !== 'string') return false;
      return text.startsWith(prefix);
    }
  },
  lower: {
    name: 'lower',
    params: ['STRING'],
    returns: 'STRING',
    impl: (ctx, [text]) => {
      if (typeof text !== 'string') return '';
      return text.toLowerCase();
    }
  },
  concat: {
    name: 'concat',
    params: ['ANY'],
    varargs: true,
    returns: 'STRING',
    impl: (ctx, args) => {
      return args.map(a => (a === null || a === undefined ? '' : String(a))).join('');
    }
  },
  formatMoney: {
    name: 'formatMoney',
    params: ['MONEY'],
    returns: 'STRING',
    impl: (ctx, [amount]) => {
      if (amount === null || amount === undefined) return '';
      const currency = ctx.document?.currency || ctx.pack?.defaultFunctionalCurrency || '';
      return formatMoney(amount, currency);
    }
  },

  // Fechas
  year: {
    name: 'year',
    params: ['DATE'],
    returns: 'INT',
    impl: (ctx, [dateStr]) => {
      if (typeof dateStr !== 'string') return null;
      const parts = dateStr.split('-');
      return parseInt(parts[0], 10);
    }
  },
  month: {
    name: 'month',
    params: ['DATE'],
    returns: 'INT',
    impl: (ctx, [dateStr]) => {
      if (typeof dateStr !== 'string') return null;
      const parts = dateStr.split('-');
      return parseInt(parts[1], 10);
    }
  },
  period: {
    name: 'period',
    params: ['DATE'],
    returns: 'STRING',
    impl: (ctx, [dateStr]) => {
      if (typeof dateStr !== 'string') return null;
      const parts = dateStr.split('-');
      if (parts.length >= 2) return `${parts[0]}-${parts[1]}`;
      return dateStr;
    }
  },
  daysBetween: {
    name: 'daysBetween',
    params: ['DATE', 'DATE'],
    returns: 'INT',
    impl: (ctx, [a, b]) => {
      if (typeof a !== 'string' || typeof b !== 'string') return null;
      const msPerDay = 1000 * 60 * 60 * 24;
      const da = new Date(a + 'T00:00:00Z');
      const db = new Date(b + 'T00:00:00Z');
      return Math.round((db.getTime() - da.getTime()) / msPerDay);
    }
  }
};
