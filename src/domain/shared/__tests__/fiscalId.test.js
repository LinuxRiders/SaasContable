import { describe, it, expect } from 'vitest';
import { validateFiscalId } from '../fiscalId.js';

describe('validateFiscalId (T007)', () => {
  const rucDef = {
    code: 'RUC',
    name: 'Registro Único de Contribuyentes',
    pattern: '^(10|15|17|20)\\d{9}$',
    checkDigit: {
      algorithm: 'MOD11',
      weights: [5, 4, 3, 2, 7, 6, 5, 4, 3, 2],
      map: { 10: 0, 11: 1 }
    }
  };

  const dniDef = {
    code: 'DNI',
    name: 'Documento Nacional de Identidad',
    pattern: '^\\d{8}$'
  };

  it('validates correct RUCs with MOD11 algorithm', () => {
    expect(validateFiscalId('20450656934', rucDef)).toEqual({ ok: true });
    expect(validateFiscalId('20100000009', rucDef)).toEqual({ ok: true });
    expect(validateFiscalId('10400000005', rucDef)).toEqual({ ok: true });
  });

  it('rejects RUC with invalid check digit', () => {
    const res = validateFiscalId('20100000000', rucDef);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('CHECK_DIGIT_MISMATCH');
  });

  it('rejects RUC with pattern mismatch (wrong prefix or length)', () => {
    expect(validateFiscalId('30100000009', rucDef).ok).toBe(false);
    expect(validateFiscalId('2010000000', rucDef).ok).toBe(false);
    expect(validateFiscalId('201000000099', rucDef).ok).toBe(false);
    expect(validateFiscalId('ABC50656934', rucDef).ok).toBe(false);
  });

  it('validates DNI using only pattern', () => {
    expect(validateFiscalId('12345678', dniDef)).toEqual({ ok: true });
    expect(validateFiscalId('1234567', dniDef).ok).toBe(false);
    expect(validateFiscalId('123456789', dniDef).ok).toBe(false);
    expect(validateFiscalId('1234567A', dniDef).ok).toBe(false);
  });

  it('handles null, undefined or empty input gracefully', () => {
    expect(validateFiscalId('', rucDef).ok).toBe(false);
    expect(validateFiscalId(null, rucDef).ok).toBe(false);
    expect(validateFiscalId(undefined, rucDef).ok).toBe(false);
  });

  it('returns ok true if def has no pattern nor checkDigit', () => {
    expect(validateFiscalId('ANYTHING', { code: 'OTHER' })).toEqual({ ok: true });
  });
});

