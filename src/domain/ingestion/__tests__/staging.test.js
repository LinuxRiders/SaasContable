import { describe, it, expect } from 'vitest';
import { 
  allowedActions, 
  applyStagingUpdate, 
  ageHours, 
  isOverdue 
} from '../staging.js';

describe('Staging Domain Logic (T075, RF-10, RF-11, CA-10.4, CA-11.4)', () => {
  describe('allowedActions', () => {
    it('MISSING_COST_CENTER allows COMPLETE and CANCEL', () => {
      const actions = allowedActions(['MISSING_COST_CENTER']);
      expect(actions).toEqual(expect.arrayContaining(['COMPLETE', 'CANCEL']));
      expect(actions).toHaveLength(2);
    });

    it('INCONSISTENT_AMOUNTS allows ONLY CANCEL', () => {
      const actions = allowedActions(['INCONSISTENT_AMOUNTS']);
      expect(actions).toEqual(['CANCEL']);
    });

    it('TEMPLATE_INACTIVE allows CHANGE_TEMPLATE and CANCEL', () => {
      const actions = allowedActions(['TEMPLATE_INACTIVE']);
      expect(actions).toEqual(expect.arrayContaining(['CHANGE_TEMPLATE', 'CANCEL']));
      expect(actions).toHaveLength(2);
    });

    it('PERIOD_CLOSED allows REVALIDATE and CANCEL', () => {
      const actions = allowedActions(['PERIOD_CLOSED']);
      expect(actions).toEqual(expect.arrayContaining(['REVALIDATE', 'CANCEL']));
      expect(actions).toHaveLength(2);
    });

    it('calculates intersection of actions across multiple reasons, plus CANCEL always available', () => {
      // MISSING_COST_CENTER (COMPLETE, CANCEL) + UNBALANCED (CHANGE_TEMPLATE, CANCEL)
      // Intersección: CANCEL
      const actions = allowedActions(['MISSING_COST_CENTER', 'UNBALANCED']);
      expect(actions).toEqual(['CANCEL']);
    });

    it('any combination with INCONSISTENT_AMOUNTS results in only CANCEL', () => {
      const actions = allowedActions(['INCONSISTENT_AMOUNTS', 'PERIOD_CLOSED']);
      expect(actions).toEqual(['CANCEL']);
    });
  });

  describe('applyStagingUpdate and forbidden fields (CA-11.4)', () => {
    const baseEntry = {
      id: 'entry-1',
      templateId: 'PL-06',
      entityVersion: 1,
      lines: [
        { lineNo: 1, side: 'D', accountCode: '6591101', role: 'BASE', costCenter: null },
        { lineNo: 2, side: 'D', accountCode: '4011101', role: 'TAX', costCenter: null },
        { lineNo: 3, side: 'H', accountCode: '4212101', role: 'COUNTERPART', costCenter: null }
      ],
      analyticTags: {}
    };

    it('allows updating costCenter, analyticTags, and templateId', () => {
      const update = {
        id: 'entry-1',
        expectedVersion: 1,
        costCenter: 'CC-ADMIN',
        analyticTags: { proyecto: 'PROY-A' },
        templateId: 'PL-07'
      };

      const updated = applyStagingUpdate(baseEntry, update);
      expect(updated.templateId).toBe('PL-07');
      expect(updated.analyticTags).toEqual({ proyecto: 'PROY-A' });
      // CC asignado a la línea base
      const baseLine = updated.lines.find(l => l.role === 'BASE');
      expect(baseLine.costCenter).toBe('CC-ADMIN');
    });

    it('rejects forbidden fields (montos, cuentas, fecha, etc.) with VALIDATION_ERROR', () => {
      const forbiddenUpdates = [
        { totalCents: 9999 },
        { totalAmount: 9999 },
        { issueDate: '2026-09-01' },
        { accountCode: '6011101' },
        { lines: [] },
        { currency: 'USD' }
      ];

      for (const forbidden of forbiddenUpdates) {
        expect(() => {
          applyStagingUpdate(baseEntry, { id: 'entry-1', expectedVersion: 1, ...forbidden });
        }).toThrowError(/VALIDATION_ERROR/);
      }
    });
  });

  describe('ageHours and isOverdue (CA-10.4)', () => {
    const stagedAt = '2026-09-15T10:00:00.000Z';

    it('ageHours calculates correct elapsed hours', () => {
      const now24h = '2026-09-16T10:00:00.000Z';
      expect(ageHours(stagedAt, now24h)).toBe(24);
    });

    it('48 hours exact is NOT overdue (isOverdue = false)', () => {
      const now48hExact = '2026-09-17T10:00:00.000Z';
      expect(ageHours(stagedAt, now48hExact)).toBe(48);
      expect(isOverdue(stagedAt, now48hExact)).toBe(false);
    });

    it('48 hours + 1 minute IS overdue (isOverdue = true)', () => {
      const now48hPlus1Min = '2026-09-17T10:01:00.000Z';
      expect(ageHours(stagedAt, now48hPlus1Min)).toBeGreaterThan(48);
      expect(isOverdue(stagedAt, now48hPlus1Min)).toBe(true);
    });

    it('72 hours is overdue', () => {
      const now72h = '2026-09-18T10:00:00.000Z';
      expect(isOverdue(stagedAt, now72h)).toBe(true);
    });
  });
});

