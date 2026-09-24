import { describe, it, expect } from 'vitest';
import { buildDedupKey } from '../dedup.js';

describe('dedup (T014)', () => {
  const baseDoc = {
    documentTypeCode: 'INVOICE',
    series: 'F001',
    number: '00000123',
    issueDate: '2026-09-20',
    parties: [
      { role: 'ISSUER', fiscalIdType: 'RUC', fiscalId: '20450656934' },
      { role: 'RECEIVER', fiscalIdType: 'RUC', fiscalId: '20100000009' }
    ]
  };

  it('normalizes series (uppercase) and strips leading zeros from number', () => {
    const key1 = buildDedupKey('01', baseDoc);
    const key2 = buildDedupKey('01', {
      ...baseDoc,
      series: 'f001',
      number: '123'
    });

    expect(key1).toBe('01|RUC:20450656934|INVOICE|F001-123|2026-09-20');
    expect(key1).toBe(key2);
  });

  it('handles empty series correctly', () => {
    const keyWithoutSeries = buildDedupKey('01', {
      ...baseDoc,
      series: '',
      number: '00000456'
    });

    expect(keyWithoutSeries).toBe('01|RUC:20450656934|INVOICE|456|2026-09-20');
  });

  it('produces different keys for different issuers', () => {
    const keyA = buildDedupKey('01', baseDoc);
    const keyB = buildDedupKey('01', {
      ...baseDoc,
      parties: [
        { role: 'ISSUER', fiscalIdType: 'RUC', fiscalId: '20999999999' }
      ]
    });

    expect(keyA).not.toBe(keyB);
  });

  it('produces different keys for different tenants', () => {
    const key01 = buildDedupKey('01', baseDoc);
    const key02 = buildDedupKey('02', baseDoc);

    expect(key01).not.toBe(key02);
  });

  it('produces different keys for different document types or issue dates', () => {
    const keyInvoice = buildDedupKey('01', baseDoc);
    const keyReceipt = buildDedupKey('01', { ...baseDoc, documentTypeCode: 'SALES_RECEIPT' });
    const keyOtherDate = buildDedupKey('01', { ...baseDoc, issueDate: '2026-09-21' });

    expect(keyInvoice).not.toBe(keyReceipt);
    expect(keyInvoice).not.toBe(keyOtherDate);
  });
});
