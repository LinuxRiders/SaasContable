import { describe, it, expect } from 'vitest';
import { decideIntake, isFieldRequired } from '../intakeDecision.js';

const documentType = {
  requiredPartyRoles: ['ISSUER', 'RECEIVER'],
  headerFields: [{ key: 'creditNoteReason', required: true }],
  linesRequired: true,
  lineFields: [{ key: 'amountMinor', required: true }]
};

describe('decideIntake (T015)', () => {
  it('returns NOT_FOR_TENANT when the tenant fiscal id is not among the parties', () => {
    const canonical = {
      parties: [{ role: 'ISSUER', fiscalId: '20100000009' }, { role: 'RECEIVER', fiscalId: '20100000025' }],
      extraction: { fieldProvenance: [] }
    };
    const res = decideIntake(canonical, { documentType, tenantFiscalId: '20450656934' });
    expect(res.status).toBe('NOT_FOR_TENANT');
  });

  it('returns DUPLICATE when the dedup hash is already indexed', () => {
    const canonical = { parties: [{ role: 'RECEIVER', fiscalId: '20450656934' }], extraction: { fieldProvenance: [] } };
    const res = decideIntake(canonical, {
      documentType,
      tenantFiscalId: '20450656934',
      dedupHash: 'hash-1',
      dedupIndex: { 'hash-1': 'intake-record-5' }
    });
    expect(res.status).toBe('DUPLICATE');
    expect(res.duplicateOfIntakeRecordId).toBe('intake-record-5');
  });

  it('returns RECEIVED_NEEDS_REVIEW when a required field is below threshold', () => {
    const canonical = {
      parties: [{ role: 'RECEIVER', fiscalId: '20450656934' }],
      extraction: {
        fieldProvenance: [
          { path: 'parties[ISSUER].fiscalId', confidence: 0.4 }
        ]
      }
    };
    const res = decideIntake(canonical, { documentType, tenantFiscalId: '20450656934', threshold: 0.85 });
    expect(res.status).toBe('RECEIVED_NEEDS_REVIEW');
    expect(res.lowConfidenceFields).toContain('parties[ISSUER].fiscalId');
  });

  it('returns RECEIVED when all required fields meet the threshold', () => {
    const canonical = {
      parties: [{ role: 'RECEIVER', fiscalId: '20450656934' }],
      extraction: {
        fieldProvenance: [
          { path: 'lines[0].description', confidence: 0.5 } // not a required field
        ]
      }
    };
    const res = decideIntake(canonical, { documentType, tenantFiscalId: '20450656934', threshold: 0.85 });
    expect(res.status).toBe('RECEIVED');
  });

  it('adds FUTURE_ISSUE_DATE as a warning without changing status', () => {
    const canonical = {
      parties: [{ role: 'RECEIVER', fiscalId: '20450656934' }],
      issueDate: '2026-12-01',
      extraction: { fieldProvenance: [] }
    };
    const res = decideIntake(canonical, { documentType, tenantFiscalId: '20450656934', today: '2026-09-20' });
    expect(res.status).toBe('RECEIVED');
    expect(res.warnings.some((w) => w.code === 'FUTURE_ISSUE_DATE')).toBe(true);
  });

  it('a low-confidence non-required field does not trigger review, but is listed', () => {
    const canonical = {
      parties: [{ role: 'RECEIVER', fiscalId: '20450656934' }],
      extraction: { fieldProvenance: [{ path: 'fields.paymentTerms', confidence: 0.3 }] }
    };
    const res = decideIntake(canonical, { documentType, tenantFiscalId: '20450656934' });
    expect(res.status).toBe('RECEIVED');
    expect(res.lowConfidenceFields).toContain('fields.paymentTerms');
  });
});

describe('isFieldRequired (T015)', () => {
  it('treats base canonical fields as always required', () => {
    expect(isFieldRequired('issueDate', documentType)).toBe(true);
    expect(isFieldRequired('totals.totalMinor', documentType)).toBe(true);
  });

  it('treats required party roles as required', () => {
    expect(isFieldRequired('parties[ISSUER].fiscalId', documentType)).toBe(true);
  });

  it('treats required header fields as required', () => {
    expect(isFieldRequired('fields.creditNoteReason', documentType)).toBe(true);
  });

  it('treats non-required optional fields as not required', () => {
    expect(isFieldRequired('fields.paymentTerms', documentType)).toBe(false);
  });
});
