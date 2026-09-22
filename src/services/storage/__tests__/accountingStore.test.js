import { describe, it, expect, beforeEach } from 'vitest';
import * as accountingStore from '../accountingStore.js';
import * as repository from '../repository.js';
import { memoryStorage } from '../memoryStorage.js';

describe('Accounting Store', () => {
  beforeEach(() => {
    const storage = memoryStorage();
    repository.init(storage);
  });

  it('save and load empresas returns the same data', () => {
    const empresas = [{ id: 'e1', name: 'Empresa 1' }];
    accountingStore.saveEmpresas(empresas);
    expect(accountingStore.loadEmpresas()).toEqual(empresas);
  });

  it('save and load chartOfAccounts per tenant returns the same data', () => {
    const chart = [{ code: '10', name: 'Caja' }];
    accountingStore.saveChartOfAccounts('tenant-1', chart);
    expect(accountingStore.loadChartOfAccounts('tenant-1')).toEqual(chart);
    expect(accountingStore.loadChartOfAccounts('tenant-2')).toBeNull();
  });

  it('save and load session returns the same data', () => {
    const session = { userId: 'u1' };
    accountingStore.saveSession(session);
    expect(accountingStore.loadSession()).toEqual(session);
  });

  it('returns null if no data is present', () => {
    expect(accountingStore.loadEmpresas()).toBeNull();
    expect(accountingStore.loadChartOfAccounts('tenant-1')).toBeNull();
    expect(accountingStore.loadSession()).toBeNull();
  });
  
  it('clearSession removes the session', () => {
    accountingStore.saveSession({ userId: 'u1' });
    accountingStore.clearSession();
    expect(accountingStore.loadSession()).toBeNull();
  });
});

