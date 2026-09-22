import { describe, it, expect } from 'vitest';
import { buildDedupKey, dedupHash } from '../dedup.js';

describe('Deduplication Key & Hash (T068, RF-03, RD-04, R-04)', () => {
  const sampleDoc = {
    type: '01',
    seriesAndNumber: 'F001-00000123',
    issueDate: '2026-09-15',
    issuer: { ruc: '20555555551', name: 'PROVEEDOR SAC' }
  };

  it('builds canonical key in format tenantId|rucEmisor|tipoDoc|serieNumero|fechaEmision', () => {
    const key = buildDedupKey('01', sampleDoc);
    expect(key).toBe('01|20555555551|01|F001-00000123|2026-09-15');
  });

  it('normalizes spaces, lowercase and unpadded numbers in serieNumero (F1-123 -> F001-00000123)', () => {
    const docWithMessyNumber = {
      ...sampleDoc,
      seriesAndNumber: '  f1 - 123  '
    };
    const key = buildDedupKey('01', docWithMessyNumber);
    expect(key).toBe('01|20555555551|01|F001-00000123|2026-09-15');
  });

  it('normalizes documentNumber or serieNumero alias properties', () => {
    const docWithDocNumber = {
      type: '01',
      documentNumber: 'f001-123',
      issueDate: '2026-09-15',
      issuer: { fiscalId: '20555555551' }
    };
    const key = buildDedupKey('01', docWithDocNumber);
    expect(key).toBe('01|20555555551|01|F001-00000123|2026-09-15');
  });

  it('different tenant produces different key and different hash (CA-16.3 isolation)', async () => {
    const keyTenant1 = buildDedupKey('01', sampleDoc);
    const keyTenant2 = buildDedupKey('02', sampleDoc);

    expect(keyTenant1).not.toBe(keyTenant2);

    const hash1 = await dedupHash(keyTenant1);
    const hash2 = await dedupHash(keyTenant2);

    expect(hash1).not.toBe(hash2);
  });

  it('same document produces identical hash', async () => {
    const key1 = buildDedupKey('01', sampleDoc);
    const key2 = buildDedupKey('01', {
      ...sampleDoc,
      seriesAndNumber: ' f001 - 00000123 '
    });

    const hash1 = await dedupHash(key1);
    const hash2 = await dedupHash(key2);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('different issueDate or issuer produces different hash', async () => {
    const key1 = buildDedupKey('01', sampleDoc);
    const keyDiffDate = buildDedupKey('01', { ...sampleDoc, issueDate: '2026-09-16' });
    const keyDiffIssuer = buildDedupKey('01', {
      ...sampleDoc,
      issuer: { ruc: '20999999999' }
    });

    const hash1 = await dedupHash(key1);
    const hash2 = await dedupHash(keyDiffDate);
    const hash3 = await dedupHash(keyDiffIssuer);

    expect(hash1).not.toBe(hash2);
    expect(hash1).not.toBe(hash3);
  });

  it('supports custom injected sha256 function', async () => {
    const mockSha = (str) => Promise.resolve(`sha-${str}`);
    const key = buildDedupKey('01', sampleDoc);
    const hash = await dedupHash(key, mockSha);

    expect(hash).toBe(`sha-${key}`);
  });
});

