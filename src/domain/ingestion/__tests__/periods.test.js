import { describe, it, expect } from 'vitest';
import { toAccountingPeriod, isPeriodOpen, isReadOnly } from '../periods.js';

describe('Periods', () => {
  describe('toAccountingPeriod', () => {
    it('converts issueDate to { ejercicio, mes } and accountingPeriod "YYYY-MM"', () => {
      expect(toAccountingPeriod('2026-09-15')).toEqual({
        ejercicio: '2026',
        mes: 9,
        accountingPeriod: '2026-09'
      });
    });
  });

  describe('isPeriodOpen', () => {
    const empresa = {
      periodos: [
        { ejercicio: '2026', mes: 9, estado: 'ABIERTO' },
        { ejercicio: '2026', mes: 8, estado: 'CERRADO' }
      ]
    };

    it('returns true for 2026-09 ABIERTO', () => {
      expect(isPeriodOpen(empresa, '2026-09-15')).toBe(true);
    });

    it('returns false for 2026-08 CERRADO', () => {
      expect(isPeriodOpen(empresa, '2026-08-10')).toBe(false);
    });

    it('returns false for missing month', () => {
      expect(isPeriodOpen(empresa, '2026-07-01')).toBe(false);
    });
  });

  describe('isReadOnly', () => {
    it('is true if activePeriod is CERRADO', () => {
      const empresa = {
        periodos: [
          { ejercicio: '2026', mes: 9, nombrePeriodo: 'SETIEMBRE_2026', estado: 'CERRADO' }
        ]
      };
      const activePeriod = { ejercicio: '2026', nombrePeriodo: 'SETIEMBRE_2026' }; 
      
      expect(isReadOnly(empresa, activePeriod)).toBe(true);
    });
    
    it('is false if activePeriod is ABIERTO', () => {
      const empresa = {
        periodos: [
          { ejercicio: '2026', mes: 9, estado: 'ABIERTO', nombrePeriodo: 'SETIEMBRE_2026' }
        ]
      };
      const activePeriod = { ejercicio: '2026', nombrePeriodo: 'SETIEMBRE_2026' };
      
      expect(isReadOnly(empresa, activePeriod)).toBe(false);
    });
  });
});
