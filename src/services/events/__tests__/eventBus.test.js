import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as repository from '../../storage/repository.js';
import { memoryStorage } from '../../storage/memoryStorage.js';
import { ensureSeeded } from '../../ingestion/demoService.js';
import { publish, subscribe, clearSubscribers, listEvents } from '../eventBus.js';

describe('eventBus', () => {
  beforeEach(() => {
    repository.init(memoryStorage());
    ensureSeeded(repository);
    clearSubscribers();
  });

  it('publishes and persists the event in <tenantId>:events', () => {
    const ctx = { tenantId: '01', userId: 'contador_maria', role: 'MAKER' };
    const event = publish(ctx, 'DocumentReceived', { documentTypeCode: 'INVOICE' }, {}, repository);

    expect(event.type).toBe('DocumentReceived');
    expect(event.tenantId).toBe('01');

    const stored = repository.readAppendOnly('01', 'events');
    expect(stored.some((e) => e.id === event.id)).toBe(true);
  });

  it('notifies subscribers of the type in a microtask', async () => {
    const ctx = { tenantId: '01', userId: 'contador_maria', role: 'MAKER' };
    const received = [];
    subscribe('DocumentReceived', (event) => {
      received.push(event);
    });

    publish(ctx, 'DocumentReceived', { foo: 'bar' }, {}, repository);
    expect(received.length).toBe(0);

    await Promise.resolve();
    await Promise.resolve();

    expect(received.length).toBe(1);
    expect(received[0].payload.foo).toBe('bar');
  });

  it('a failing subscriber does not affect other subscribers or the publisher', async () => {
    const ctx = { tenantId: '01', userId: 'contador_maria', role: 'MAKER' };
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const okReceived = [];

    subscribe('DocumentReceived', () => {
      throw new Error('subscriber failure');
    });
    subscribe('DocumentReceived', (event) => {
      okReceived.push(event);
    });

    expect(() => publish(ctx, 'DocumentReceived', {}, {}, repository)).not.toThrow();

    await Promise.resolve();
    await Promise.resolve();

    expect(okReceived.length).toBe(1);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('listEvents filters by type and respects limit', () => {
    const ctx = { tenantId: '01', userId: 'contador_maria', role: 'MAKER' };
    publish(ctx, 'RawPayloadStored', {}, {}, repository);
    publish(ctx, 'DocumentReceived', {}, {}, repository);
    publish(ctx, 'DocumentReceived', {}, {}, repository);

    const res = listEvents(ctx, { type: 'DocumentReceived' }, repository);
    expect(res.ok).toBe(true);
    expect(res.data.length).toBe(2);

    const limited = listEvents(ctx, { limit: 1 }, repository);
    expect(limited.data.length).toBe(1);
  });

  it('rejects listing for a role without VIEW_RECEIVED_DOCUMENTS', () => {
    const ctx = { tenantId: '01', userId: 'intruder', role: 'GUEST' };
    const res = listEvents(ctx, {}, repository);
    expect(res.ok).toBe(false);
    expect(res.error.code).toBe('FORBIDDEN');
  });
});
