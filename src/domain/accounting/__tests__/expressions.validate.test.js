import { describe, it, expect } from 'vitest';
import { validateExpression, inferType } from '../expressions/validate.js';

describe('expressions/validate', () => {
  const dummyDocType = {
    code: 'INVOICE',
    headerFields: [
      { key: 'costCenter', label: 'Centro de costo', type: 'STRING', required: false },
      { key: 'paymentTerms', label: 'Condiciones de pago', type: 'CODE', required: false }
    ],
    lineFields: [
      { key: 'costCenter', label: 'Centro de costo', type: 'STRING', required: false }
    ],
    allowedTaxCodes: ['VAT', 'EXCISE'],
    allowedWithholdingCodes: ['INCOME_TAX_FEES']
  };

  it('detects invalid node shape (e.g. multiple forms or empty object)', () => {
    const invalidNode = { const: 10, field: 'totals.netMinor' };
    const res = validateExpression(invalidNode);
    expect(res.ok).toBe(false);
    expect(res.errors[0].path).toBe('$');
    expect(res.errors[0].reason).toMatch(/Forma de nodo inválida/);

    const emptyNode = {};
    const resEmpty = validateExpression(emptyNode);
    expect(resEmpty.ok).toBe(false);
    expect(resEmpty.errors[0].reason).toMatch(/Forma de nodo inválida/);
  });

  it('detects functions outside whitelist', () => {
    const badFn = { fn: 'evalCode', args: ['1+1'] };
    const res = validateExpression(badFn);
    expect(res.ok).toBe(false);
    expect(res.errors[0].path).toBe('$');
    expect(res.errors[0].reason).toMatch(/fuera de la lista blanca/);
  });

  it('detects incorrect function arity', () => {
    // sub expects exactly 2 arguments
    const badArity = { fn: 'sub', args: [100] };
    const res = validateExpression(badArity);
    expect(res.ok).toBe(false);
    expect(res.errors[0].path).toBe('$');
    expect(res.errors[0].reason).toMatch(/Aridad incorrecta/);
  });

  it('detects result type mismatch (MONEY vs BOOL)', () => {
    // Expected BOOL, but add returns MONEY
    const expr = { fn: 'add', args: [100, 200] };
    const res = validateExpression(expr, { expectedType: 'BOOL' });
    expect(res.ok).toBe(false);
    expect(res.errors[0].path).toBe('$');
    expect(res.errors[0].reason).toMatch(/Tipo de resultado distinto del esperado/);
  });

  it('detects depth exceeding 12', () => {
    // Build tree of depth 14
    let deepNode = 1;
    for (let i = 0; i < 14; i++) {
      deepNode = { fn: 'not', args: [deepNode] };
    }
    const res = validateExpression(deepNode);
    expect(res.ok).toBe(false);
    expect(res.errors.some(e => e.reason.includes('Profundidad máxima excedida'))).toBe(true);
  });

  it('detects node count exceeding 200', () => {
    // Build array of 210 elements inside an add
    const args = Array.from({ length: 210 }, (_, i) => ({ const: i }));
    const largeExpr = { fn: 'add', args };
    const res = validateExpression(largeExpr);
    expect(res.ok).toBe(false);
    expect(res.errors.some(e => e.reason.includes('Número máximo de nodos excedido'))).toBe(true);
  });

  it('detects fields.x path that does not exist in schema', () => {
    const expr = { field: 'fields.nonExistentField' };
    const res = validateExpression(expr, { documentType: dummyDocType });
    expect(res.ok).toBe(false);
    expect(res.errors[0].path).toBe('$');
    expect(res.errors[0].reason).toMatch(/no existe en el esquema/);
  });

  it('detects tax code not allowed for document type', () => {
    const expr = { fn: 'taxAmount', args: ['UNKNOWN_TAX'] };
    const res = validateExpression(expr, { documentType: dummyDocType });
    expect(res.ok).toBe(false);
    expect(res.errors[0].path).toBe('$.args[0]');
    expect(res.errors[0].reason).toMatch(/no admitido/);
  });

  it('detects line expression without line context', () => {
    const expr = { line: 'amountMinor' };
    const res = validateExpression(expr, { lineContext: false });
    expect(res.ok).toBe(false);
    expect(res.errors[0].path).toBe('$');
    expect(res.errors[0].reason).toMatch(/sin contexto de línea/);

    // Inside line context it should pass
    const resWithLine = validateExpression(expr, { lineContext: true });
    expect(resWithLine.ok).toBe(true);
  });

  it('passes valid expressions in line and sum context', () => {
    const sumExpr = {
      fn: 'sumLines',
      args: [
        { line: 'amountMinor' },
        { fn: 'eq', args: [{ line: 'operationTypeCode' }, 'MERCHANDISE_PURCHASE'] }
      ]
    };
    const res = validateExpression(sumExpr, { expectedType: 'MONEY', lineContext: false });
    expect(res.ok).toBe(true);
  });
});

