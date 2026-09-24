import { describe, it, expect } from 'vitest';
import { resolvePerspective } from '../perspective.js';

describe('perspective: resolvePerspective (contracts/domain-api.md §2, T083)', () => {
  const tenantFiscalId = '20450656934';

  const dummyDocTypeCommercial = {
    code: 'INVOICE',
    allowedPerspectives: ['RECEIVED', 'ISSUED'],
    fixedPerspective: null
  };

  const dummyDocTypeInternal = {
    code: 'PAYROLL_SUMMARY',
    allowedPerspectives: ['INTERNAL'],
    fixedPerspective: 'INTERNAL'
  };

  it('receptor = tenant resuelve como RECEIVED', () => {
    const doc = {
      parties: [
        { role: 'ISSUER', fiscalId: '20100000009' },
        { role: 'RECEIVER', fiscalId: tenantFiscalId }
      ]
    };

    const res = resolvePerspective(doc, { documentType: dummyDocTypeCommercial, tenantFiscalId });
    expect(res.ok).toBe(true);
    expect(res.perspective).toBe('RECEIVED');
  });

  it('emisor = tenant resuelve como ISSUED', () => {
    const doc = {
      parties: [
        { role: 'ISSUER', fiscalId: tenantFiscalId },
        { role: 'RECEIVER', fiscalId: '20100000025' }
      ]
    };

    const res = resolvePerspective(doc, { documentType: dummyDocTypeCommercial, tenantFiscalId });
    expect(res.ok).toBe(true);
    expect(res.perspective).toBe('ISSUED');
  });

  it('fixedPerspective devuelve ese valor si el tenant es parte del documento', () => {
    const doc = {
      parties: [
        { role: 'ISSUER', fiscalId: tenantFiscalId }
      ]
    };

    const res = resolvePerspective(doc, { documentType: dummyDocTypeInternal, tenantFiscalId });
    expect(res.ok).toBe(true);
    expect(res.perspective).toBe('INTERNAL');
  });

  it('tenant ausente en las partes produce DOCUMENT_NOT_FOR_TENANT', () => {
    const doc = {
      parties: [
        { role: 'ISSUER', fiscalId: '20100000009' },
        { role: 'RECEIVER', fiscalId: '20100000025' }
      ]
    };

    const res = resolvePerspective(doc, { documentType: dummyDocTypeCommercial, tenantFiscalId });
    expect(res.ok).toBe(false);
    expect(res.pending[0].reasonCode).toBe('DOCUMENT_NOT_FOR_TENANT');
  });
});

