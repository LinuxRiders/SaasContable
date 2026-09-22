import { describe, it, expect, beforeEach } from 'vitest';
// Note: repository.js is not implemented yet. 
// We are writing tests first as per TDD.
import * as repository from '../repository.js';
import { memoryStorage } from '../memoryStorage.js';

describe('Storage Repository', () => {
  let storage;

  beforeEach(() => {
    storage = memoryStorage();
    repository.init(storage); // Assuming init allows injecting the storage object
  });

  it('uses namespaced keys with schema v1 and tenantId', () => {
    repository.setCollection('tenant-1', 'myColl', [{ id: 1 }]);
    const keys = storage.getKeys();
    expect(keys).toContain('contableos:v1:tenant-1:myColl');
  });

  it('isolates data between tenants', () => {
    repository.setCollection('tenant-1', 'coll', [{ data: 'A' }]);
    repository.setCollection('tenant-2', 'coll', [{ data: 'B' }]);
    
    expect(repository.getCollection('tenant-1', 'coll')).toEqual([{ data: 'A' }]);
    expect(repository.getCollection('tenant-2', 'coll')).toEqual([{ data: 'B' }]);
  });

  it('append-only collections do not expose update or delete', () => {
    repository.appendOnly('tenant-1', 'rawPayloads', [{ id: '1' }]);
    repository.appendOnly('tenant-1', 'rawPayloads', [{ id: '2' }]);
    
    const items = repository.readAppendOnly('tenant-1', 'rawPayloads');
    expect(items).toHaveLength(2);
    
    // There should be no update or delete functions exposed for these
    expect(repository.updateAppendOnly).toBeUndefined();
    expect(repository.deleteAppendOnly).toBeUndefined();
  });

  it('upsertVersioned rejects with CONFLICT if expectedVersion does not match', () => {
    repository.upsertVersioned('tenant-1', 'docs', { id: '1', version: 1 }, 0);
    
    expect(() => {
      repository.upsertVersioned('tenant-1', 'docs', { id: '1', version: 2 }, 0);
    }).toThrowError(/CONFLICT/);
    
    expect(() => {
      repository.upsertVersioned('tenant-1', 'docs', { id: '1', version: 2 }, 2);
    }).toThrowError(/CONFLICT/);
  });

  it('translates QuotaExceededError to STORAGE_FULL', () => {
    storage.simulateQuotaExceededError = true;
    expect(() => {
      repository.setCollection('t1', 'c1', [{ x: 1 }]);
    }).toThrowError(/STORAGE_FULL/);
  });

  it('clearNamespace({ keepSession: true }) clears all contableos:v1:* except global:session', () => {
    repository.setCollection('t1', 'c1', [{ id: 1 }]);
    repository.setGlobal('session', { user: 1 });
    repository.setGlobal('other', { data: 1 });
    
    repository.clearNamespace({ keepSession: true });
    
    expect(repository.getCollection('t1', 'c1')).toBeNull();
    expect(repository.getGlobal('other')).toBeNull();
    expect(repository.getGlobal('session')).toEqual({ user: 1 });
  });

  it('usageBytes calculates total usage correctly', () => {
    repository.setCollection('t1', 'c1', [{ id: 1 }]);
    const bytes = repository.usageBytes();
    expect(bytes).toBeGreaterThan(0);
  });
});

