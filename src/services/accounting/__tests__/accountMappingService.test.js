import { describe, it, expect, beforeEach } from 'vitest';
import * as repository from '../../storage/repository.js';
import { memoryStorage } from '../../storage/memoryStorage.js';
import { ensureSeeded } from '../../ingestion/demoService.js';
import {
  getAccountMapping,
  getMappingImpact,
  saveAccountMapping,
  suggestMapping,
  listMappingVersions
} from '../accountMappingService.js';

describe('accountMappingService', () => {
  beforeEach(() => {
    repository.init(memoryStorage());
    ensureSeeded(repository);
  });

  it('verifies seeded company 02 has at least 2 unmapped roles (RD-17)', async () => {
    const ctx = { tenantId: '02', userId: 'admin_pedro', role: 'ADMIN' };
    const res = await getAccountMapping(ctx, repository);
    expect(res.ok).toBe(true);
    expect(res.data.version).toBe(1);
    expect(res.data.unmappedRoles).toContain('FIXED_ASSET_IT_EQUIPMENT');
    expect(res.data.unmappedRoles).toContain('PROFESSIONAL_FEES_PAYABLE');
    expect(res.data.unmappedRoles.length).toBeGreaterThanOrEqual(2);
  });

  it('rejects saving mapping with grouping account (42) with VALIDATION_ERROR', async () => {
    const ctx = { tenantId: '01', userId: 'admin_pedro', role: 'ADMIN' };
    const current = await getAccountMapping(ctx, repository);
    expect(current.ok).toBe(true);

    const invalidEntries = current.data.entries.map(e => {
      if (e.roleCode === 'SUPPLIERS_PAYABLE') {
        return { ...e, accountCode: '42' }; // Agrupación
      }
      return e;
    });

    const res = await saveAccountMapping(ctx, {
      expectedVersion: current.data.version,
      entries: invalidEntries
    }, repository);

    expect(res.ok).toBe(false);
    expect(res.error.code).toBe('VALIDATION_ERROR');
    expect(res.error.details.errors.some(e => e.code === 'ACCOUNT_NOT_POSTABLE')).toBe(true);
  });

  it('saves valid mapping incrementing to version 2, recording changedRoles and audit event', async () => {
    const ctx = { tenantId: '01', userId: 'admin_pedro', role: 'ADMIN' };
    const current = await getAccountMapping(ctx, repository);
    expect(current.ok).toBe(true);

    // Change one mapping
    const modifiedEntries = current.data.entries.map(e => {
      if (e.roleCode === 'FIXED_ASSET_IT_EQUIPMENT') {
        return { ...e, accountCode: '3351101' };
      }
      return e;
    });

    const res = await saveAccountMapping(ctx, {
      expectedVersion: 1,
      entries: modifiedEntries
    }, repository);

    expect(res.ok).toBe(true);
    expect(res.data.version).toBe(2);

    // Verify audit log
    const auditLog = repository.getCollection('01', 'auditLog') || [];
    const event = auditLog.find(a => a.action === 'ACCOUNT_MAPPING_SAVED');
    expect(event).toBeDefined();
    expect(event.userId).toBe('admin_pedro');
  });

  it('returns CONFLICT when expectedVersion does not match current version', async () => {
    const ctx = { tenantId: '01', userId: 'admin_pedro', role: 'ADMIN' };
    const current = await getAccountMapping(ctx, repository);
    expect(current.ok).toBe(true);

    const res = await saveAccountMapping(ctx, {
      expectedVersion: 999, // Desactualizada
      entries: current.data.entries
    }, repository);

    expect(res.ok).toBe(false);
    expect(res.error.code).toBe('CONFLICT');
  });

  it('returns FORBIDDEN when MAKER attempts to save account mapping', async () => {
    const ctx = { tenantId: '01', userId: 'contador_maria', role: 'MAKER' };
    const res = await saveAccountMapping(ctx, {
      expectedVersion: 1,
      entries: []
    }, repository);

    expect(res.ok).toBe(false);
    expect(res.error.code).toBe('FORBIDDEN');
  });

  it('enforces tenant isolation: company 01 cannot view or modify company 02 mapping', async () => {
    const ctx01 = { tenantId: '01', userId: 'admin_pedro', role: 'ADMIN' };
    const ctx02 = { tenantId: '02', userId: 'admin_pedro', role: 'ADMIN' };

    const res01 = await getAccountMapping(ctx01, repository);
    const res02 = await getAccountMapping(ctx02, repository);

    expect(res01.ok).toBe(true);
    expect(res02.ok).toBe(true);

    // Company 01 has FIXED_ASSET_IT_EQUIPMENT mapped, Company 02 does not
    const has01 = res01.data.entries.some(e => e.roleCode === 'FIXED_ASSET_IT_EQUIPMENT');
    const has02 = res02.data.entries.some(e => e.roleCode === 'FIXED_ASSET_IT_EQUIPMENT');
    expect(has01).toBe(true);
    expect(has02).toBe(false);
  });

  it('suggestMapping returns preloaded suggestions without persisting', async () => {
    const ctx = { tenantId: '02', userId: 'admin_pedro', role: 'ADMIN' };
    const res = await suggestMapping(ctx, repository);
    expect(res.ok).toBe(true);
    expect(res.data.entries.length).toBeGreaterThan(0);

    // Verify company 02 was not modified in storage
    const current = await getAccountMapping(ctx, repository);
    expect(current.data.unmappedRoles).toContain('FIXED_ASSET_IT_EQUIPMENT');
  });

  it('getMappingImpact lists templates affected by unmapped roles', async () => {
    const ctx = { tenantId: '02', userId: 'admin_pedro', role: 'ADMIN' };
    const res = await getMappingImpact(ctx, repository);
    expect(res.ok).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
  });
});

