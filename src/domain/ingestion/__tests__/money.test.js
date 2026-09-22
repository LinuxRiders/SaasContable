import { describe, it, expect } from 'vitest';
import { parseDecimalToCents, roundHalfUpDiv, withinTolerance, sumCents, formatPEN, formatMoney } from '../money.js';

describe('Money', () => {
  describe('parseDecimalToCents', () => {
    it('converts "847.46" to 84746', () => {
      expect(parseDecimalToCents("847.46")).toBe(84746);
    });

    it('rejects 3 decimals, text, and empty string', () => {
      expect(() => parseDecimalToCents("847.465")).toThrow();
      expect(() => parseDecimalToCents("abc")).toThrow();
      expect(() => parseDecimalToCents("")).toThrow();
    });
  });

  describe('roundHalfUpDiv', () => {
    it('rounds half up at .5', () => {
      expect(roundHalfUpDiv(5, 10)).toBe(1); // 0.5 -> 1
      expect(roundHalfUpDiv(4, 10)).toBe(0); // 0.4 -> 0
      expect(roundHalfUpDiv(-5, 10)).toBe(-1); // -0.5 -> -1
    });
  });

  describe('withinTolerance', () => {
    it('checks if two values are within tolerance', () => {
      expect(withinTolerance(100, 101, 1)).toBe(true);
      expect(withinTolerance(100, 102, 1)).toBe(false);
    });
  });

  describe('sumCents', () => {
    it('sums an array of cents', () => {
      expect(sumCents([10, 20, 30])).toBe(60);
      expect(sumCents([])).toBe(0);
    });
  });

  describe('formatPEN', () => {
    it('formats 123456 as "S/ 1,234.56"', () => {
      expect(formatPEN(123456)).toBe("S/ 1,234.56");
    });
  });

  describe('formatMoney', () => {
    it('formats money with given currency', () => {
      expect(formatMoney(123456, 'USD')).toBe("$ 1,234.56");
      expect(formatMoney(123456, 'PEN')).toBe("S/ 1,234.56");
    });
  });
});

