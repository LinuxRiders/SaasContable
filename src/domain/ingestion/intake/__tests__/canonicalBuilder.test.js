import { describe, it, expect } from 'vitest';
import { buildCanonical, annotateFiscalIds } from '../canonicalBuilder.js';

describe('buildCanonical (T013)', () => {
  const rawPayload = {
    id: 'raw-1',
    tenantId: '01',
    traceId: 'trace-1',
    receivedAt: '2026-09-20T10:00:00.000Z'
  };

  const draft = {
    documentTypeCode: 'INVOICE',
    perspective: null,
    operationTypeCode: null,
    series: 'F001',
    number: '00000123',
    issueDate: '2026-09-10',
    currency: 'PEN',
    parties: [{ role: 'ISSUER', fiscalIdType: 'RUC', fiscalId: '20100000009', name: 'Proveedor' }],
    fields: {},
    lines: [{ description: 'Item' }],
    taxes: [],
    withholdings: [],
    references: [],
    totals: { totalMinor: 100 },
    extraction: { sourceFormat: 'XML', extractorId: 'ubl-2.1@PE', documentTypeConfidence: 1, fieldProvenance: [] }
  };

  it('fills identity, traceability and revision 1', () => {
    const canonical = buildCanonical(draft, {
      rawPayload,
      tenantId: '01',
      jurisdictionCode: 'PE',
      idGenerator: () => 'canonical-1'
    });

    expect(canonical.id).toBe('canonical-1');
    expect(canonical.tenantId).toBe('01');
    expect(canonical.jurisdictionCode).toBe('PE');
    expect(canonical.rawPayloadRef).toBe('raw-1');
    expect(canonical.revision).toBe(1);
    expect(canonical.receivedAt).toBe(rawPayload.receivedAt);
    expect(canonical.traceId).toBe(rawPayload.traceId);
    expect(canonical.documentTypeCode).toBe('INVOICE');
  });

  it('appends #row=N to rawPayloadRef when a row number is given', () => {
    const canonical = buildCanonical(draft, {
      rawPayload,
      rowNumber: 2,
      tenantId: '01',
      jurisdictionCode: 'PE',
      idGenerator: () => 'canonical-2'
    });
    expect(canonical.rawPayloadRef).toBe('raw-1#row=2');
  });

  it('does not mutate the original draft arrays/objects', () => {
    const canonical = buildCanonical(draft, {
      rawPayload,
      tenantId: '01',
      jurisdictionCode: 'PE',
      idGenerator: () => 'canonical-3'
    });
    canonical.parties[0].name = 'MUTATED';
    expect(draft.parties[0].name).toBe('Proveedor');
  });
});

describe('annotateFiscalIds (T013)', () => {
  const pack = {
    fiscalIdTypes: [
      { code: 'RUC', pattern: '^(10|15|17|20)\\d{9}$' },
      { code: 'DNI', pattern: '^\\d{8}$' }
    ]
  };

  it('leaves valid fiscal ids untouched and produces no warnings', () => {
    const canonical = {
      parties: [{ role: 'ISSUER', fiscalIdType: 'RUC', fiscalId: '20100000009' }],
      extraction: { fieldProvenance: [] }
    };
    const { canonical: result, warnings } = annotateFiscalIds(canonical, { pack });
    expect(warnings).toHaveLength(0);
    expect(result.extraction.fieldProvenance).toHaveLength(0);
  });

  it('flags invalid fiscal ids with confidence 0 and a warning', () => {
    const canonical = {
      parties: [{ role: 'RECEIVER', fiscalIdType: 'RUC', fiscalId: '1234' }],
      extraction: { fieldProvenance: [] }
    };
    const { canonical: result, warnings } = annotateFiscalIds(canonical, { pack });
    expect(warnings).toHaveLength(1);
    expect(warnings[0].code).toBe('INVALID_FISCAL_ID');
    expect(result.extraction.fieldProvenance[0]).toMatchObject({
      path: 'parties[RECEIVER].fiscalId',
      confidence: 0
    });
  });

  it('does not mutate the original canonical document', () => {
    const canonical = {
      parties: [{ role: 'RECEIVER', fiscalIdType: 'RUC', fiscalId: '1234' }],
      extraction: { fieldProvenance: [] }
    };
    annotateFiscalIds(canonical, { pack });
    expect(canonical.extraction.fieldProvenance).toHaveLength(0);
  });
});
