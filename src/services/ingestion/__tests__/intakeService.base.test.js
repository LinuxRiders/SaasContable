import { describe, it, expect, beforeEach } from 'vitest';
import * as repository from '../../storage/repository.js';
import { memoryStorage } from '../../storage/memoryStorage.js';
import { ensureSeeded } from '../demoService.js';
import { ingestFiles } from '../intakeService.js';

function fakeFile(name, type, bytes) {
  return {
    name,
    type,
    size: bytes.length,
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  };
}

describe('intakeService.ingestFiles — base (Phase 2 checkpoint)', () => {
  beforeEach(() => {
    repository.init(memoryStorage());
    ensureSeeded(repository);
  });

  const ctx = { tenantId: '01', userId: 'contador_maria', role: 'MAKER' };

  it('sends any file to DLQ while no readers are registered yet', async () => {
    const bytes = new TextEncoder().encode('<Invoice>fake</Invoice>');
    const res = await ingestFiles(ctx, { files: [fakeFile('test.xml', 'application/xml', bytes)] }, repository);

    expect(res.ok).toBe(true);
    expect(res.data.results).toHaveLength(1);
    expect(res.data.results[0].records[0].status).toBe('FAILED');
    expect(res.data.results[0].dlqEntryIds).toHaveLength(1);
    expect(res.data.summary.failed).toBe(1);

    const dlq = repository.readAppendOnly('01', 'dlq');
    expect(dlq).toHaveLength(1);
    expect(dlq[0].errorType).toBe('UNSUPPORTED_FORMAT');

    const rawPayloads = repository.readAppendOnly('01', 'rawPayloads');
    expect(rawPayloads).toHaveLength(1);
  });

  it('rejects an empty file before saving anything', async () => {
    const res = await ingestFiles(ctx, { files: [fakeFile('empty.xml', 'application/xml', new Uint8Array(0))] }, repository);
    expect(res.ok).toBe(true);
    expect(res.data.results[0].error.code).toBe('EMPTY_FILE');
    expect(res.data.results[0].rawPayloadId).toBeNull();
    expect(repository.readAppendOnly('01', 'rawPayloads')).toHaveLength(0);
  });

  it('rejects a file over 300 KB before saving anything', async () => {
    const bytes = new Uint8Array(300 * 1024 + 1);
    const res = await ingestFiles(ctx, { files: [fakeFile('big.xml', 'application/xml', bytes)] }, repository);
    expect(res.data.results[0].error.code).toBe('PAYLOAD_TOO_LARGE');
    expect(repository.readAppendOnly('01', 'rawPayloads')).toHaveLength(0);
  });

  it('processes files in a batch in order; one failure does not stop the others', async () => {
    const bytesA = new TextEncoder().encode('<A/>');
    const bytesB = new TextEncoder().encode('<B/>');
    const res = await ingestFiles(ctx, {
      files: [
        fakeFile('a.xml', 'application/xml', bytesA),
        fakeFile('', 'application/xml', new Uint8Array(0)),
        fakeFile('b.xml', 'application/xml', bytesB)
      ]
    }, repository);

    expect(res.data.results).toHaveLength(3);
    expect(res.data.results[0].fileName).toBe('a.xml');
    expect(res.data.results[1].error.code).toBe('EMPTY_FILE');
    expect(res.data.results[2].fileName).toBe('b.xml');
  });

  it('rejects ingestion for a role without INGEST_DOCUMENTS permission', async () => {
    const checkerCtx = { tenantId: '01', userId: 'revisor_luis', role: 'CHECKER' };
    const res = await ingestFiles(checkerCtx, { files: [] }, repository);
    expect(res.ok).toBe(false);
    expect(res.error.code).toBe('FORBIDDEN');
  });

  it('records a RAW_RECEIVED and PARSE_FAILED audit trail', async () => {
    const bytes = new TextEncoder().encode('<Invoice/>');
    await ingestFiles(ctx, { files: [fakeFile('test.xml', 'application/xml', bytes)] }, repository);
    const audit = repository.readAppendOnly('01', 'auditLog');
    const actions = audit.map((a) => a.action);
    expect(actions).toContain('RAW_RECEIVED');
    expect(actions).toContain('PARSE_FAILED');
  });
});
