import { describe, it, expect } from 'vitest';
import { normalizeText, readField, evaluateCondition } from '../conditions.js';

describe('Condition Evaluator (T032)', () => {
  const doc = {
    issuer: { fiscalId: '20555555551', name: 'Transportes Andinos' },
    receiver: { fiscalId: '20100047218', name: 'Pachatusantrek' },
    currency: 'PEN',
    totalCents: 11800,
    issueDate: '2026-09-15',
    operationType: 'COMPRA'
  };

  const line = {
    description: 'Servicio de Fleté Cusco - Puno',
    amountCents: 10000,
    taxCode: 'IGV'
  };

  describe('normalizeText', () => {
    it('removes accents and converts to uppercase', () => {
      expect(normalizeText('Fleté')).toBe('FLETE');
      expect(normalizeText('Camión / Guía')).toBe('CAMION / GUIA');
    });
  });

  describe('readField', () => {
    it('reads document fields correctly', () => {
      expect(readField('issuer.fiscalId', doc, line)).toBe('20555555551');
      expect(readField('issuer.name', doc, line)).toBe('Transportes Andinos');
      expect(readField('currency', doc, line)).toBe('PEN');
      expect(readField('totalCents', doc, line)).toBe(11800);
      expect(readField('issueDate', doc, line)).toBe('2026-09-15');
      expect(readField('operationType', doc, line)).toBe('COMPRA');
    });

    it('reads line fields correctly', () => {
      expect(readField('line.description', doc, line)).toBe('Servicio de Fleté Cusco - Puno');
      expect(readField('line.amountCents', doc, line)).toBe(10000);
      expect(readField('line.taxCode', doc, line)).toBe('IGV');
    });
  });

  describe('Comparators', () => {
    it('contains (accent and case insensitive)', () => {
      expect(evaluateCondition({ op: 'contains', field: 'line.description', value: 'flete' }, doc, line)).toBe(true);
      expect(evaluateCondition({ op: 'contains', field: 'line.description', value: 'FLETE' }, doc, line)).toBe(true);
      expect(evaluateCondition({ op: 'contains', field: 'line.description', value: 'AVION' }, doc, line)).toBe(false);
    });

    it('startsWith', () => {
      expect(evaluateCondition({ op: 'startsWith', field: 'line.description', value: 'servicio' }, doc, line)).toBe(true);
      expect(evaluateCondition({ op: 'startsWith', field: 'line.description', value: 'flete' }, doc, line)).toBe(false);
    });

    it('equals', () => {
      expect(evaluateCondition({ op: 'equals', field: 'currency', value: 'pen' }, doc, line)).toBe(true);
      expect(evaluateCondition({ op: 'equals', field: 'totalCents', value: 11800 }, doc, line)).toBe(true);
      expect(evaluateCondition({ op: 'equals', field: 'totalCents', value: 10000 }, doc, line)).toBe(false);
    });

    it('gt and gte', () => {
      expect(evaluateCondition({ op: 'gt', field: 'line.amountCents', value: 5000 }, doc, line)).toBe(true);
      expect(evaluateCondition({ op: 'gt', field: 'line.amountCents', value: 10000 }, doc, line)).toBe(false);
      expect(evaluateCondition({ op: 'gte', field: 'line.amountCents', value: 10000 }, doc, line)).toBe(true);
    });

    it('lt and lte', () => {
      expect(evaluateCondition({ op: 'lt', field: 'line.amountCents', value: 15000 }, doc, line)).toBe(true);
      expect(evaluateCondition({ op: 'lt', field: 'line.amountCents', value: 10000 }, doc, line)).toBe(false);
      expect(evaluateCondition({ op: 'lte', field: 'line.amountCents', value: 10000 }, doc, line)).toBe(true);
    });

    it('between', () => {
      expect(evaluateCondition({ op: 'between', field: 'line.amountCents', value: [5000, 15000] }, doc, line)).toBe(true);
      expect(evaluateCondition({ op: 'between', field: 'line.amountCents', value: [10000, 10000] }, doc, line)).toBe(true);
      expect(evaluateCondition({ op: 'between', field: 'line.amountCents', value: [12000, 20000] }, doc, line)).toBe(false);
    });

    it('in', () => {
      expect(evaluateCondition({ op: 'in', field: 'currency', value: ['USD', 'PEN'] }, doc, line)).toBe(true);
      expect(evaluateCondition({ op: 'in', field: 'currency', value: ['EUR', 'GBP'] }, doc, line)).toBe(false);
    });
  });

  describe('Nested logical operators (and, or, not)', () => {
    it('evaluates and/or/not nested across 3 levels', () => {
      const nestedCond = {
        op: 'and',
        args: [
          { op: 'equals', field: 'currency', value: 'PEN' },
          {
            op: 'or',
            args: [
              { op: 'contains', field: 'line.description', value: 'AVION' },
              {
                op: 'not',
                arg: {
                  op: 'equals',
                  field: 'line.taxCode',
                  value: 'EXO'
                }
              }
            ]
          }
        ]
      };
      expect(evaluateCondition(nestedCond, doc, line)).toBe(true);
    });
  });
});
