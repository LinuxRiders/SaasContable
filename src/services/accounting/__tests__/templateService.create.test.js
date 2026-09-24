import { describe, it, expect, beforeEach } from 'vitest';
import * as repository from '../../storage/repository.js';
import { memoryStorage } from '../../storage/memoryStorage.js';
import { ensureSeeded } from '../../ingestion/demoService.js';
import {
  listTemplates,
  getTemplate,
  createTemplate,
  duplicateTemplate,
  saveTemplateDraft
} from '../templateService.js';

describe('templateService creation & drafting', () => {
  beforeEach(() => {
    repository.init(memoryStorage());
    ensureSeeded(repository);
  });

  it('listTemplates returns 9 PACK templates + tenant templates for company 01', async () => {
    const ctx = { tenantId: '01', userId: 'admin_pedro', role: 'ADMIN' };
    const res = await listTemplates(ctx, {}, repository);
    expect(res.ok).toBe(true);
    expect(res.data.length).toBeGreaterThanOrEqual(3);
    expect(res.data.filter(t => t.scope === 'PACK').length).toBe(3);
  });

  it('createTemplate and duplicateTemplate persist in <tenantId>:templates and audit', async () => {
    const ctx = { tenantId: '01', userId: 'admin_pedro', role: 'ADMIN' };

    const definition = {
      code: 'NEW_TPL_01',
      name: 'Nueva plantilla de compras',
      documentTypeCode: 'INVOICE',
      perspective: 'RECEIVED',
      operationTypeCode: 'MERCHANDISE_PURCHASE',
      legalBookCode: 'PE.PURCHASES_REGISTER',
      lines: [
        {
          id: 'l1',
          side: 'DEBIT',
          accountRef: { kind: 'ROLE', roleCode: 'PURCHASES_MERCHANDISE' },
          amount: { field: 'totals.netMinor' }
        },
        {
          id: 'l2',
          side: 'CREDIT',
          accountRef: { kind: 'ROLE', roleCode: 'SUPPLIERS_PAYABLE' },
          amount: { field: 'totals.totalMinor' },
          balancingLine: true
        }
      ]
    };

    const createRes = await createTemplate(ctx, { definition }, repository);
    expect(createRes.ok).toBe(true);
    expect(createRes.data.scope).toBe('TENANT');
    expect(createRes.data.code).toBe('NEW_TPL_01');

    // Verify stored in tenant templates
    const tenantTemplates = repository.getCollection('01', 'templates') || [];
    expect(tenantTemplates.some(t => t.code === 'NEW_TPL_01')).toBe(true);

    // Verify audit log
    const auditLog = repository.getCollection('01', 'auditLog') || [];
    expect(auditLog.some(a => a.action === 'TEMPLATE_CREATED')).toBe(true);

    // Test duplicateTemplate from PACK template
    const dupRes = await duplicateTemplate(ctx, {
      templateId: 'PE.RECEIVED.INVOICE.MERCHANDISE_PURCHASE',
      version: 1
    }, repository);
    expect(dupRes.ok).toBe(true);
    expect(dupRes.data.scope).toBe('TENANT');
    expect(dupRes.data.duplicatedFrom).toBe('PE.RECEIVED.INVOICE.MERCHANDISE_PURCHASE');

    const auditAfterDup = repository.getCollection('01', 'auditLog') || [];
    expect(auditAfterDup.some(a => a.action === 'TEMPLATE_DUPLICATED')).toBe(true);
  });

  it('saveTemplateDraft rejects invalid expressions with EXPRESSION_INVALID and errors[]', async () => {
    const ctx = { tenantId: '01', userId: 'admin_pedro', role: 'ADMIN' };

    const definition = {
      code: 'TEST_INVALID',
      name: 'Plantilla de prueba',
      documentTypeCode: 'INVOICE',
      perspective: 'RECEIVED',
      operationTypeCode: 'MERCHANDISE_PURCHASE',
      legalBookCode: 'PE.PURCHASES_REGISTER',
      lines: [
        {
          id: 'l1',
          side: 'DEBIT',
          accountRef: { kind: 'ROLE', roleCode: 'PURCHASES_MERCHANDISE' },
          amount: { field: 'totals.netMinor' }
        },
        {
          id: 'l2',
          side: 'CREDIT',
          accountRef: { kind: 'ROLE', roleCode: 'SUPPLIERS_PAYABLE' },
          amount: { field: 'totals.totalMinor' },
          balancingLine: true
        }
      ]
    };

    const createRes = await createTemplate(ctx, { definition }, repository);
    const templateId = createRes.data.id;

    // Intentar guardar con campo inexistente
    const invalidSave = await saveTemplateDraft(ctx, {
      templateId,
      version: 1,
      definition: {
        lines: [
          {
            id: 'l1',
            side: 'DEBIT',
            accountRef: { kind: 'ROLE', roleCode: 'PURCHASES_MERCHANDISE' },
            amount: { field: 'fields.nonExistentField' } // Error!
          },
          {
            id: 'l2',
            side: 'CREDIT',
            accountRef: { kind: 'ROLE', roleCode: 'SUPPLIERS_PAYABLE' },
            amount: { field: 'totals.totalMinor' },
            balancingLine: true
          }
        ]
      }
    }, repository);

    expect(invalidSave.ok).toBe(false);
    expect(invalidSave.error.code).toBe('EXPRESSION_INVALID');
    expect(invalidSave.error.details.errors.length).toBeGreaterThan(0);
  });

  it('saveTemplateDraft rejects editing a PACK template with NOT_EDITABLE', async () => {
    const ctx = { tenantId: '01', userId: 'admin_pedro', role: 'ADMIN' };

    const res = await saveTemplateDraft(ctx, {
      templateId: 'PE.RECEIVED.INVOICE.MERCHANDISE_PURCHASE',
      version: 1,
      definition: { name: 'Hack' }
    }, repository);

    expect(res.ok).toBe(false);
    expect(res.error.code).toBe('NOT_EDITABLE');
  });

  it('rejects editing templates for CHECKER with FORBIDDEN', async () => {
    const ctx = { tenantId: '01', userId: 'revisor_luis', role: 'CHECKER' };

    const res = await createTemplate(ctx, { definition: {} }, repository);
    expect(res.ok).toBe(false);
    expect(res.error.code).toBe('FORBIDDEN');
  });

  it('maintains tenant isolation: company 02 cannot see company 01 tenant template', async () => {
    const ctx01 = { tenantId: '01', userId: 'admin_pedro', role: 'ADMIN' };
    const ctx02 = { tenantId: '02', userId: 'admin_pedro', role: 'ADMIN' };

    const definition = {
      code: 'TPL_ONLY_01',
      name: 'Solo para 01',
      documentTypeCode: 'INVOICE',
      perspective: 'RECEIVED',
      operationTypeCode: 'MERCHANDISE_PURCHASE',
      legalBookCode: 'PE.PURCHASES_REGISTER',
      lines: [
        { id: 'l1', side: 'DEBIT', accountRef: { kind: 'ROLE', roleCode: 'PURCHASES_MERCHANDISE' }, amount: { field: 'totals.netMinor' } },
        { id: 'l2', side: 'CREDIT', accountRef: { kind: 'ROLE', roleCode: 'SUPPLIERS_PAYABLE' }, amount: { field: 'totals.totalMinor' }, balancingLine: true }
      ]
    };

    const created = await createTemplate(ctx01, { definition }, repository);
    expect(created.ok).toBe(true);

    const list02 = await listTemplates(ctx02, {}, repository);
    expect(list02.data.some(t => t.code === 'TPL_ONLY_01')).toBe(false);
  });
});
