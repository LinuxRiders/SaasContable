import { describe, it, expect, beforeEach } from 'vitest';
import * as repository from '../../storage/repository.js';
import { memoryStorage } from '../../storage/memoryStorage.js';
import { ensureSeeded } from '../../ingestion/demoService.js';
import { resolveTenantContext } from '../context.js';

describe('accounting/context', () => {
  beforeEach(() => {
    repository.init(memoryStorage());
    ensureSeeded(repository);
  });

  it('resolves valid tenant context for company 01', () => {
    const ctx = { tenantId: '01', userId: 'admin_pedro', role: 'ADMIN' };
    const res = resolveTenantContext(repository, ctx);
    expect(res.ok).toBe(true);
    expect(res.data.empresa.id).toBe('01');
    expect(res.data.pack.code).toBe('PE');
    expect(res.data.functionalCurrency).toBe('PEN');
    expect(res.data.tenantFiscalId).toBe('20450656934');
    expect(res.data.chart.length).toBeGreaterThan(0);
  });

  it('fails with VALIDATION_ERROR if tenantId is missing or unknown', () => {
    const ctxEmpty = { tenantId: null, userId: 'admin', role: 'ADMIN' };
    const resEmpty = resolveTenantContext(repository, ctxEmpty);
    expect(resEmpty.ok).toBe(false);
    expect(resEmpty.error.code).toBe('VALIDATION_ERROR');

    const ctxUnknown = { tenantId: '99', userId: 'admin', role: 'ADMIN' };
    const resUnknown = resolveTenantContext(repository, ctxUnknown);
    expect(resUnknown.ok).toBe(false);
    expect(resUnknown.error.code).toBe('VALIDATION_ERROR');
  });

  it('fails with NO_JURISDICTION_PACK if company lacks jurisdictionCode or has invalid pack', () => {
    // Modify company in repo
    const empresas = repository.getGlobal('empresas');
    empresas[0].jurisdictionCode = null;
    repository.setGlobal('empresas', empresas);

    const ctx = { tenantId: '01', userId: 'admin', role: 'ADMIN' };
    const res = resolveTenantContext(repository, ctx);
    expect(res.ok).toBe(false);
    expect(res.error.code).toBe('NO_JURISDICTION_PACK');
  });
});

