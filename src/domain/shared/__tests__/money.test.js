import { describe, it, expect } from 'vitest';
import { parseDecimalToMinor } from '../money.js';

describe('parseDecimalToMinor (T006)', () => {
  it('parses valid decimal strings to minor units integer', () => {
    expect(parseDecimalToMinor('1180.00', 2)).toBe(118000);
    expect(parseDecimalToMinor('5', 2)).toBe(500);
    expect(parseDecimalToMinor('5.5', 2)).toBe(550);
    expect(parseDecimalToMinor('0.05', 2)).toBe(5);
    expect(parseDecimalToMinor('0', 2)).toBe(0);
    expect(parseDecimalToMinor('0.00', 2)).toBe(0);
  });

  it('supports 0 minor units (e.g. JPY, CLP)', () => {
    expect(parseDecimalToMinor('1500', 0)).toBe(1500);
    expect(parseDecimalToMinor('5', 0)).toBe(5);
    expect(parseDecimalToMinor('0', 0)).toBe(0);
  });

  it('supports 3 minor units', () => {
    expect(parseDecimalToMinor('1.234', 3)).toBe(1234);
    expect(parseDecimalToMinor('1.2', 3)).toBe(1200);
  });

  it('rejects values with more decimals than minorUnits', () => {
    expect(() => parseDecimalToMinor('1.234', 2)).toThrowError();
    try {
      parseDecimalToMinor('1.234', 2);
    } catch (err) {
      expect(err.code).toBe('INVALID_AMOUNT');
    }

    expect(() => parseDecimalToMinor('1.5', 0)).toThrowError();
  });

  it('rejects negative numbers and invalid characters', () => {
    expect(() => parseDecimalToMinor('-1', 2)).toThrowError();
    expect(() => parseDecimalToMinor('-100.00', 2)).toThrowError();
    expect(() => parseDecimalToMinor('abc', 2)).toThrowError();
    expect(() => parseDecimalToMinor('1,180.00', 2)).toThrowError();
    expect(() => parseDecimalToMinor('', 2)).toThrowError();
    expect(() => parseDecimalToMinor(null, 2)).toThrowError();
    expect(() => parseDecimalToMinor(undefined, 2)).toThrowError();
  });
});

