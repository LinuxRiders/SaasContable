import { describe, it, expect } from 'vitest';
import { runIntake } from '../runIntake.js';
import { createReaderRegistry } from '../readerRegistry.js';

const pack = { code: 'PE', documentTypes: [{ code: 'INVOICE', requiredPartyRoles: ['ISSUER', 'RECEIVER'] }] };

const fakeDraft = {
  documentTypeCode: 'INVOICE',
  series: 'F001',
  number: '00000123',
  issueDate: '2026-09-10',
  currency: 'PEN',
  parties: [
    { role: 'ISSUER', fiscalIdType: 'RUC', fiscalId: '20100000009', name: 'Proveedor' },
    { role: 'RECEIVER', fiscalIdType: 'RUC', fiscalId: '20450656934', name: 'Tenant' }
  ],
  fields: {},
  lines: [],
  taxes: [],
  withholdings: [],
  references: [],
  totals: { totalMinor: 1000 },
  extraction: { sourceFormat: 'XML', extractorId: 'fake', documentTypeConfidence: 1, fieldProvenance: [] }
};

function makeDeps(overrides = {}) {
  let counter = 0;
  return {
    tenant: { id: '01', fiscalId: '20450656934', fiscalIdType: 'RUC', name: 'Tenant' },
    empresa: { id: '01', ruc: '20450656934' },
    pack,
    registry: createReaderRegistry([
      { id: 'fakeReader', canHandle: (meta) => meta.sourceFormat === 'XML', read: () => ({ ok: true, drafts: [fakeDraft] }) }
    ]),
    dedupIndex: {},
    sha256Of: async (s) => `hash-of-${s}`,
    idGenerator: () => `id-${counter++}`,
    clock: () => '2026-09-20T10:00:00.000Z',
    actor: { userId: 'contador_maria', role: 'MAKER' },
    ...overrides
  };
}

describe('runIntake (T016)', () => {
  it('processes a valid draft into a RECEIVED intake record and canonical document', async () => {
    const result = await runIntake(
      { channel: 'UPLOAD', fileName: 'test.xml', mimeType: 'application/xml', sha256: 'abc', text: '<Invoice/>' },
      makeDeps()
    );

    expect(result.rawPayload.tenantId).toBe('01');
    expect(result.intakeRecords).toHaveLength(1);
    expect(result.intakeRecords[0].status).toBe('RECEIVED');
    expect(result.canonicalDocuments).toHaveLength(1);
    expect(result.dlqEntries).toHaveLength(0);
    expect(result.events.map((e) => e.type)).toEqual(['RawPayloadStored', 'DocumentReceived']);
    expect(Object.keys(result.dedupIndexAdditions)).toHaveLength(1);
  });

  it('sends to DLQ when no reader can handle the format', async () => {
    const deps = makeDeps({ registry: createReaderRegistry([]) });
    const result = await runIntake(
      { channel: 'UPLOAD', fileName: 'test.bin', mimeType: 'application/octet-stream', sha256: 'abc' },
      deps
    );

    expect(result.dlqEntries).toHaveLength(1);
    expect(result.dlqEntries[0].errorType).toBe('UNSUPPORTED_FORMAT');
    expect(result.intakeRecords[0].status).toBe('FAILED');
    expect(result.canonicalDocuments).toHaveLength(0);
  });

  it('sends to DLQ when the reader reports a read error', async () => {
    const deps = makeDeps({
      registry: createReaderRegistry([
        { id: 'brokenReader', canHandle: () => true, read: () => ({ ok: false, errorType: 'MALFORMED', errorMessage: 'bad xml' }) }
      ])
    });
    const result = await runIntake(
      { channel: 'UPLOAD', fileName: 'bad.xml', mimeType: 'application/xml', sha256: 'abc', text: '<broken' },
      deps
    );

    expect(result.dlqEntries[0].errorType).toBe('MALFORMED');
    expect(result.intakeRecords[0].status).toBe('FAILED');
  });
});
