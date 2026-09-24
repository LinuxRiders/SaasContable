import { describe, it, expect } from 'vitest';
import { validateDocument } from '../documentValidation.js';
import { pePack, SAMPLE_DOCUMENTS } from '../../../data/jurisdictions/index.js';

describe('documentValidation (US6, contracts/domain-api.md §2, SDD §20.5)', () => {
  const invoiceSample = SAMPLE_DOCUMENTS.find(s => s.id === 'PE-01-MERCHANDISE-PURCHASE')?.document;

  it('documentos de ejemplo válidos pasan la validación exitosamente', () => {
    expect(invoiceSample).toBeDefined();
    const res = validateDocument(invoiceSample, { pack: pePack });
    expect(res.ok).toBe(true);
  });

  it('campo obligatorio faltante produce SCHEMA_INVALID', () => {
    // Factura sin amountMinor en la línea
    const invalidDoc = JSON.parse(JSON.stringify(invoiceSample));
    delete invalidDoc.lines[0].amountMinor;

    const res = validateDocument(invalidDoc, { pack: pePack });
    expect(res.ok).toBe(false);
    expect(res.pending[0].reasonCode).toBe('SCHEMA_INVALID');
    expect(res.pending[0].details.errors.some(e => e.field?.includes('amountMinor'))).toBe(true);
  });

  it('tipo de dato erróneo produce SCHEMA_INVALID', () => {
    // Importe como texto en vez de entero minor
    const invalidDoc = JSON.parse(JSON.stringify(invoiceSample));
    invalidDoc.lines[0].amountMinor = "cien-soles";

    const res = validateDocument(invalidDoc, { pack: pePack });
    expect(res.ok).toBe(false);
    expect(res.pending[0].reasonCode).toBe('SCHEMA_INVALID');
  });

  it('parte exigida ausente produce SCHEMA_INVALID', () => {
    // Factura sin parte RECEIVER
    const invalidDoc = JSON.parse(JSON.stringify(invoiceSample));
    invalidDoc.parties = invalidDoc.parties.filter(p => p.role !== 'RECEIVER');

    const res = validateDocument(invalidDoc, { pack: pePack });
    expect(res.ok).toBe(false);
    expect(res.pending[0].reasonCode).toBe('SCHEMA_INVALID');
    expect(res.pending[0].details.errors.some(e => e.message?.includes('RECEIVER'))).toBe(true);
  });

  it('impuesto no admitido produce SCHEMA_INVALID', () => {
    const invalidDoc = JSON.parse(JSON.stringify(invoiceSample));
    invalidDoc.taxes.push({
      taxCode: 'UNKNOWN_CUSTOM_TAX',
      baseMinor: 1000,
      rateBp: 500,
      amountMinor: 50
    });

    const res = validateDocument(invalidDoc, { pack: pePack });
    expect(res.ok).toBe(false);
    expect(res.pending[0].reasonCode).toBe('SCHEMA_INVALID');
    expect(res.pending[0].details.errors.some(e => e.message?.includes('UNKNOWN_CUSTOM_TAX'))).toBe(true);
  });

  it('nota de crédito sin referencia produce SCHEMA_INVALID', () => {
    const cnSample = SAMPLE_DOCUMENTS.find(s => s.id === 'PE-04-PURCHASE-RETURN')?.document;
    expect(cnSample).toBeDefined();

    const invalidCn = JSON.parse(JSON.stringify(cnSample));
    invalidCn.references = []; // Sin referencias

    const res = validateDocument(invalidCn, { pack: pePack });
    expect(res.ok).toBe(false);
    expect(res.pending[0].reasonCode).toBe('SCHEMA_INVALID');
  });

  it('incoherencia net + tax != total produce SCHEMA_INVALID', () => {
    const invalidDoc = JSON.parse(JSON.stringify(invoiceSample));
    invalidDoc.totals.totalMinor = 99999999; // Total completamente descuadrado

    const res = validateDocument(invalidDoc, { pack: pePack });
    expect(res.ok).toBe(false);
    expect(res.pending[0].reasonCode).toBe('SCHEMA_INVALID');
  });

  it('taxAmount que no coincide con mulRate(base, tasa vigente) produce SCHEMA_INVALID', () => {
    const invalidDoc = JSON.parse(JSON.stringify(invoiceSample));
    // Base 100000 con tasa 1800 debe dar 18000, ponemos 25000
    invalidDoc.taxes[0].amountMinor = 25000;

    const res = validateDocument(invalidDoc, { pack: pePack });
    expect(res.ok).toBe(false);
    expect(res.pending[0].reasonCode).toBe('SCHEMA_INVALID');
    expect(res.pending[0].details.errors.some(e => e.message?.includes('tasa vigente'))).toBe(true);
  });

  it('tipo de comprobante no vigente produce CATALOG_NOT_EFFECTIVE', () => {
    const expiredDoc = JSON.parse(JSON.stringify(invoiceSample));
    expiredDoc.issueDate = '1990-01-01'; // Anterior a effectiveFrom '2020-01-01'

    const res = validateDocument(expiredDoc, { pack: pePack });
    expect(res.ok).toBe(false);
    expect(res.pending[0].reasonCode).toBe('CATALOG_NOT_EFFECTIVE');
  });

  it('guía de remisión produce DOCUMENT_TYPE_NOT_ACCOUNTABLE', () => {
    const waybillDoc = {
      id: 'doc-waybill-01',
      tenantId: '01',
      documentTypeCode: 'DISPATCH_GUIDE',
      issueDate: '2026-09-15',
      currency: 'PEN',
      parties: [{ role: 'ISSUER', fiscalId: '20100000009' }]
    };

    const res = validateDocument(waybillDoc, { pack: pePack });
    expect(res.ok).toBe(false);
    expect(res.pending[0].reasonCode).toBe('DOCUMENT_TYPE_NOT_ACCOUNTABLE');
  });
});
