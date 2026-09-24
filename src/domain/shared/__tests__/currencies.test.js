import { describe, it, expect } from 'vitest';
import { MINOR_UNITS, minorUnitsOf } from '../currencies.js';

describe('currencies domain', () => {
  it('returns correct minor units for standard currencies', () => {
    expect(minorUnitsOf('PEN')).toBe(2);
    expect(minorUnitsOf('USD')).toBe(2);
    expect(minorUnitsOf('EUR')).toBe(2);
    expect(minorUnitsOf('COP')).toBe(2);
    expect(minorUnitsOf('MXN')).toBe(2);
    expect(minorUnitsOf('CLP')).toBe(0);
    expect(minorUnitsOf('JPY')).toBe(0);
  });

  it('handles lowercase currency codes gracefully', () => {
    expect(minorUnitsOf('pen')).toBe(2);
    expect(minorUnitsOf('usd')).toBe(2);
  });

  it('throws UNKNOWN_CURRENCY for unknown or invalid currencies', () => {
    expect(() => minorUnitsOf('XYZ')).toThrowError();
    try {
      minorUnitsOf('XYZ');
    } catch (err) {
      expect(err.code).toBe('UNKNOWN_CURRENCY');
    }

    expect(() => minorUnitsOf(null)).toThrowError();
    try {
      minorUnitsOf(null);
    } catch (err) {
      expect(err.code).toBe('UNKNOWN_CURRENCY');
    }
  });
});

