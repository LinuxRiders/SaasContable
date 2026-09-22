import { describe, it, expect } from 'vitest';
import { validateCanonical } from '../canonical.js';

describe('Canonical Document Validation', () => {
  const validDoc = {
    type: '01',
    seriesAndNumber: 'F001-00000456',
    issueDate: '2026-09-15',
    currency: 'PEN',
    issuer: { ruc: '20555555551', name: 'EMISOR' },
    receiver: { ruc: '20450656934', name: 'RECEPTOR' },
    lines: [{ description: 'Item', amount: 100, taxType: 'IGV' }],
    totals: { totalAmount: 118, taxAmount: 18, taxableAmount: 100, exemptAmount: 0, unaffectedAmount: 0 }
  };

  it('accepts a valid canonical document', () => {
    expect(() => validateCanonical(validDoc)).not.toThrow();
  });

  it('rejects RUC with wrong length or non-numeric', () => {
    const doc1 = { ...validDoc, issuer: { ...validDoc.issuer, ruc: '123' } };
    expect(() => validateCanonical(doc1)).toThrow('RUC del emisor inválido');

    const doc2 = { ...validDoc, receiver: { ...validDoc.receiver, ruc: 'A0450656934' } };
    expect(() => validateCanonical(doc2)).toThrow('RUC del receptor inválido');
  });

  it('rejects unsupported currency', () => {
    const doc = { ...validDoc, currency: 'EUR' };
    expect(() => validateCanonical(doc)).toThrow('Moneda no soportada: EUR');
  });

  it('rejects same issuer and receiver', () => {
    const doc = { ...validDoc, receiver: { ...validDoc.receiver, ruc: '20555555551' } };
    expect(() => validateCanonical(doc)).toThrow('Emisor y receptor no pueden ser la misma empresa');
  });
});

