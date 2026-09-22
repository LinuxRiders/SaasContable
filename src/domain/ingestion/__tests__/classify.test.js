import { describe, it, expect } from 'vitest';
import { classifyOperation } from '../classify.js';

describe('Operation Classification', () => {
  const companyRuc = '20100047218';

  it('classifies as COMPRA when company is receiver', () => {
    const doc = { issuer: { ruc: '20555555551' }, receiver: { ruc: '20100047218' } };
    expect(classifyOperation(doc, companyRuc)).toBe('COMPRA');
  });

  it('classifies as VENTA when company is issuer', () => {
    const doc = { issuer: { ruc: '20100047218' }, receiver: { ruc: '20450656934' } };
    expect(classifyOperation(doc, companyRuc)).toBe('VENTA');
  });

  it('throws REJECTED_NOT_TENANT when company is neither', () => {
    const doc = { issuer: { ruc: '20555555551' }, receiver: { ruc: '20450656934' } };
    expect(() => classifyOperation(doc, companyRuc)).toThrow('REJECTED_NOT_TENANT');
  });
});

