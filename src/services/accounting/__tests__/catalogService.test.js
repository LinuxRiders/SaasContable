import { describe, it, expect, beforeEach } from 'vitest';
import * as repository from '../../storage/repository.js';
import { memoryStorage } from '../../storage/memoryStorage.js';
import { ensureSeeded } from '../../ingestion/demoService.js';
import {
  getJurisdictionPack,
  listDocumentTypes,
  getDocumentTypeSchema,
  listTaxes,
  listOperationTypes,
  listAccountRoles,
  listLegalBooks
} from '../catalogService.js';

describe('catalogService', () => {
  beforeEach(() => {
    repository.init(memoryStorage());
    ensureSeeded(repository);
  });

  it('lists 16 document types for company 01', async () => {
    const ctx = { tenantId: '01', userId: 'admin_pedro', role: 'ADMIN' };
    const res = await listDocumentTypes(ctx, {}, repository);
    expect(res.ok).toBe(true);
    expect(res.data.length).toBe(16);
  });

  it('retrieves full schema of CREDIT_NOTE with mandatory reference', async () => {
    const ctx = { tenantId: '01', userId: 'admin_pedro', role: 'ADMIN' };
    const res = await getDocumentTypeSchema(ctx, { code: 'CREDIT_NOTE' }, repository);
    expect(res.ok).toBe(true);
    expect(res.data.code).toBe('CREDIT_NOTE');
    expect(res.data.reference.required).toBe(true);
    expect(res.data.reference.documentTypeCodes).toContain('INVOICE');
  });

  it('lists taxes at two different dates reflecting effective rates', async () => {
    const ctx = { tenantId: '01', userId: 'admin_pedro', role: 'ADMIN' };
    
    // In PE pack, VAT rate is 1800 bp from 2011-03-01
    const res2026 = await listTaxes(ctx, { date: '2026-09-15' }, repository);
    expect(res2026.ok).toBe(true);
    const vat2026 = res2026.data.find(t => t.code === 'VAT');
    expect(vat2026).toBeDefined();
    expect(vat2026.rateBp).toBe(1800);

    // Before 2011-03-01
    const res2010 = await listTaxes(ctx, { date: '2010-01-01' }, repository);
    expect(res2010.ok).toBe(true);
    const vat2010 = res2010.data.find(t => t.code === 'VAT');
    expect(vat2010.rateBp).toBeNull();
  });

  it('returns FORBIDDEN for role without VIEW_ACCOUNTING_CONFIG permission', async () => {
    const ctx = { tenantId: '01', userId: 'intruder', role: 'GUEST' };
    const res = await getJurisdictionPack(ctx, repository);
    expect(res.ok).toBe(false);
    expect(res.error.code).toBe('FORBIDDEN');
  });

  it('returns NO_JURISDICTION_PACK if company lacks jurisdictionCode', async () => {
    const empresas = repository.getGlobal('empresas');
    empresas[0].jurisdictionCode = null;
    repository.setGlobal('empresas', empresas);

    const ctx = { tenantId: '01', userId: 'admin_pedro', role: 'ADMIN' };
    const res = await getJurisdictionPack(ctx, repository);
    expect(res.ok).toBe(false);
    expect(res.error.code).toBe('NO_JURISDICTION_PACK');
  });

  it('retrieves operationTypes, accountRoles, legalBooks and jurisdiction pack summary', async () => {
    const ctx = { tenantId: '01', userId: 'auditora_ana', role: 'AUDITOR' };
    
    const packRes = await getJurisdictionPack(ctx, repository);
    expect(packRes.ok).toBe(true);
    expect(packRes.data.code).toBe('PE');
    expect(packRes.data.documentTypesCount).toBe(16);

    const opsRes = await listOperationTypes(ctx, repository);
    expect(opsRes.ok).toBe(true);
    expect(opsRes.data.length).toBeGreaterThan(0);

    const rolesRes = await listAccountRoles(ctx, repository);
    expect(rolesRes.ok).toBe(true);
    expect(rolesRes.data.length).toBeGreaterThan(0);

    const booksRes = await listLegalBooks(ctx, repository);
    expect(booksRes.ok).toBe(true);
    expect(booksRes.data.length).toBeGreaterThan(0);
  });
});
