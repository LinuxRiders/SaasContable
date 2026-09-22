import { describe, it, expect } from 'vitest';
import { validateJournalEntry } from '../validator.js';

describe('Journal Entry Validator', () => {
  const chartOfAccounts = [
    { code: '6011101', isPostable: true, requiresCostCenter: false },
    { code: '4011101', isPostable: true, requiresCostCenter: false },
    { code: '4212101', isPostable: true, requiresCostCenter: false },
    { code: '6311101', isPostable: true, requiresCostCenter: true },
    { code: '39', isPostable: false, requiresCostCenter: false }
  ];

  const validDoc = {
    totals: { taxableAmount: 10000, exemptAmount: 0, unaffectedAmount: 0, taxAmount: 1800, totalAmount: 11800 }
  };

  const validEntry = {
    operationType: 'COMPRA',
    templateId: 'PL-01',
    lines: [
      { side: 'D', accountCode: '6011101', functionalAmountCents: 10000, role: 'BASE' },
      { side: 'D', accountCode: '4011101', functionalAmountCents: 1800, role: 'TAX' },
      { side: 'H', accountCode: '4212101', functionalAmountCents: 11800, role: 'COUNTERPART' }
    ]
  };

  const template = {
    operationType: 'COMPRA',
    requiresCostCenter: false
  };

  const isPeriodClosed = false;

  it('validates a correct entry with no errors', () => {
    const reasons = validateJournalEntry(validEntry, validDoc, chartOfAccounts, template, isPeriodClosed);
    expect(reasons).toHaveLength(0);
  });

  it('detects UNBALANCED', () => {
    const entry = {
      ...validEntry,
      lines: [
        { side: 'D', accountCode: '6011101', functionalAmountCents: 10000, role: 'BASE' },
        { side: 'H', accountCode: '4212101', functionalAmountCents: 11800, role: 'COUNTERPART' }
      ]
    };
    const reasons = validateJournalEntry(entry, validDoc, chartOfAccounts, template, isPeriodClosed);
    expect(reasons).toContain('UNBALANCED');
  });

  it('detects INCONSISTENT_AMOUNTS', () => {
    const badDoc = {
      totals: { taxableAmount: 10000, exemptAmount: 0, unaffectedAmount: 0, taxAmount: 1800, totalAmount: 15000 }
    };
    const reasons = validateJournalEntry(validEntry, badDoc, chartOfAccounts, template, isPeriodClosed);
    expect(reasons).toContain('INCONSISTENT_AMOUNTS');
  });

  it('allows 0.01 tolerance for INCONSISTENT_AMOUNTS', () => {
    // 100.00 base, 18.00 igv, 118.01 total (1 cent diff)
    const docWithTolerance = {
      totals: { taxableAmount: 10000, exemptAmount: 0, unaffectedAmount: 0, taxAmount: 1800, totalAmount: 11801 }
    };
    const reasons = validateJournalEntry(validEntry, docWithTolerance, chartOfAccounts, template, isPeriodClosed);
    expect(reasons).not.toContain('INCONSISTENT_AMOUNTS');

    // 2 cents diff
    const docWithoutTolerance = {
      totals: { taxableAmount: 10000, exemptAmount: 0, unaffectedAmount: 0, taxAmount: 1800, totalAmount: 11802 }
    };
    const reasons2 = validateJournalEntry(validEntry, docWithoutTolerance, chartOfAccounts, template, isPeriodClosed);
    expect(reasons2).toContain('INCONSISTENT_AMOUNTS');
  });

  it('detects PERIOD_CLOSED', () => {
    const reasons = validateJournalEntry(validEntry, validDoc, chartOfAccounts, template, true);
    expect(reasons).toContain('PERIOD_CLOSED');
  });

  it('detects TEMPLATE_MISMATCH', () => {
    const badTemplate = { operationType: 'VENTA' };
    const reasons = validateJournalEntry(validEntry, validDoc, chartOfAccounts, badTemplate, isPeriodClosed);
    expect(reasons).toContain('TEMPLATE_MISMATCH');
  });

  it('detects MISSING_COST_CENTER', () => {
    const entry = {
      ...validEntry,
      lines: [
        { side: 'D', accountCode: '6311101', functionalAmountCents: 10000, role: 'BASE', costCenter: null },
        { side: 'D', accountCode: '4011101', functionalAmountCents: 1800, role: 'TAX' },
        { side: 'H', accountCode: '4212101', functionalAmountCents: 11800, role: 'COUNTERPART' }
      ]
    };
    const reasons = validateJournalEntry(entry, validDoc, chartOfAccounts, template, isPeriodClosed);
    expect(reasons).toContain('MISSING_COST_CENTER');
  });

  it('detects ACCOUNT_NOT_FOUND', () => {
    const entry = {
      ...validEntry,
      lines: [
        { side: 'D', accountCode: '9999999', functionalAmountCents: 10000, role: 'BASE' },
        { side: 'H', accountCode: '4212101', functionalAmountCents: 10000, role: 'COUNTERPART' }
      ]
    };
    const reasons = validateJournalEntry(entry, validDoc, chartOfAccounts, template, isPeriodClosed);
    expect(reasons).toContain('ACCOUNT_NOT_FOUND');
  });

  it('detects ACCOUNT_NOT_POSTABLE', () => {
    const entry = {
      ...validEntry,
      lines: [
        { side: 'D', accountCode: '39', functionalAmountCents: 10000, role: 'BASE' },
        { side: 'H', accountCode: '4212101', functionalAmountCents: 10000, role: 'COUNTERPART' }
      ]
    };
    const reasons = validateJournalEntry(entry, validDoc, chartOfAccounts, template, isPeriodClosed);
    expect(reasons).toContain('ACCOUNT_NOT_POSTABLE');
  });

  it('detects multiple errors', () => {
    const entry = {
      operationType: 'COMPRA',
      templateId: 'PL-01',
      lines: [
        { side: 'D', accountCode: '39', functionalAmountCents: 10000, role: 'BASE' }, // NOT_POSTABLE
        { side: 'H', accountCode: '999', functionalAmountCents: 9000, role: 'COUNTERPART' } // NOT_FOUND, UNBALANCED
      ]
    };
    const badDoc = {
      totals: { taxableAmount: 10000, exemptAmount: 0, unaffectedAmount: 0, taxAmount: 0, totalAmount: 10000 }
    };
    const badTemplate = { operationType: 'VENTA' }; // MISMATCH

    const reasons = validateJournalEntry(entry, badDoc, chartOfAccounts, badTemplate, true);
    
    expect(reasons).toContain('UNBALANCED');
    expect(reasons).toContain('PERIOD_CLOSED');
    expect(reasons).toContain('TEMPLATE_MISMATCH');
    expect(reasons).toContain('ACCOUNT_NOT_FOUND');
    expect(reasons).toContain('ACCOUNT_NOT_POSTABLE');
  });
});

