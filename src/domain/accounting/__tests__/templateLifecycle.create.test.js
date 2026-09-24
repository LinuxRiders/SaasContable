import { describe, it, expect } from 'vitest';
import {
  newTemplate,
  duplicateTemplate,
  saveDraft,
  canEdit
} from '../templateLifecycle.js';

describe('templateLifecycle create & edit domain logic', () => {
  const mockDefinition = {
    code: 'CUSTOM_PURCHASE',
    name: 'Compra personalizada',
    documentTypeCode: 'INVOICE',
    perspective: 'RECEIVED',
    operationTypeCode: 'MERCHANDISE_PURCHASE',
    priority: 10,
    legalBookCode: 'PE.PURCHASES_REGISTER',
    glosa: 'Compra de mercaderías',
    lines: [
      { id: 'l1', side: 'DEBIT', accountRef: { kind: 'ROLE', roleCode: 'PURCHASES_MERCHANDISE' }, amount: { field: 'totals.netMinor' } },
      { id: 'l2', side: 'CREDIT', accountRef: { kind: 'ROLE', roleCode: 'SUPPLIERS_PAYABLE' }, amount: { field: 'totals.totalMinor' }, balancingLine: true }
    ],
    testCases: []
  };

  it('newTemplate creates a TENANT template with v1 DRAFT', () => {
    const tpl = newTemplate({
      definition: mockDefinition,
      tenantId: '01',
      createdBy: 'admin_pedro',
      createdAt: '2026-09-22T10:00:00Z',
      id: 'tpl-101'
    });

    expect(tpl.id).toBe('tpl-101');
    expect(tpl.scope).toBe('TENANT');
    expect(tpl.tenantId).toBe('01');
    expect(tpl.duplicatedFrom).toBeNull();
    expect(tpl.versions).toHaveLength(1);

    const v1 = tpl.versions[0];
    expect(v1.version).toBe(1);
    expect(v1.status).toBe('DRAFT');
    expect(v1.documentTypeCode).toBe('INVOICE');
    expect(v1.lines).toHaveLength(2);
  });

  it('duplicateTemplate creates a TENANT template copied from source with duplicatedFrom', () => {
    const sourceTemplate = {
      id: 'PACK.PE.PURCHASE',
      code: 'PE_INVOICE_PURCHASE',
      name: 'Factura Compra Base',
      scope: 'PACK',
      version: 1,
      lines: mockDefinition.lines,
      testCases: [{ id: 'tc1', name: 'Caso base' }]
    };

    const duplicate = duplicateTemplate(sourceTemplate, 1, {
      tenantId: '01',
      createdBy: 'admin_pedro',
      createdAt: '2026-09-22T10:00:00Z',
      id: 'tpl-dup-1',
      newCode: 'MY_PURCHASE',
      newName: 'Mi compra personalizada'
    });

    expect(duplicate.id).toBe('tpl-dup-1');
    expect(duplicate.scope).toBe('TENANT');
    expect(duplicate.duplicatedFrom).toBe('PACK.PE.PURCHASE');
    expect(duplicate.code).toBe('MY_PURCHASE');
    expect(duplicate.versions[0].version).toBe(1);
    expect(duplicate.versions[0].status).toBe('DRAFT');
    expect(duplicate.versions[0].lines).toHaveLength(2);
    expect(duplicate.versions[0].testCases).toHaveLength(1);
  });

  it('saveDraft modifies an existing DRAFT version', () => {
    const tpl = newTemplate({
      definition: mockDefinition,
      tenantId: '01',
      createdBy: 'admin_pedro',
      createdAt: '2026-09-22T10:00:00Z',
      id: 'tpl-101'
    });

    const res = saveDraft(tpl, 1, {
      name: 'Nombre modificado',
      priority: 25,
      glosa: 'Glosa modificada'
    });

    expect(res.ok).toBe(true);
    expect(res.template.name).toBe('Nombre modificado');
    expect(res.version.priority).toBe(25);
    expect(res.version.glosa).toBe('Glosa modificada');
  });

  it('saveDraft rejects modifying a PUBLISHED version', () => {
    const tpl = newTemplate({
      definition: mockDefinition,
      tenantId: '01',
      createdBy: 'admin_pedro',
      createdAt: '2026-09-22T10:00:00Z',
      id: 'tpl-101'
    });

    // Poner estado en PUBLISHED
    tpl.versions[0].status = 'PUBLISHED';

    const res = saveDraft(tpl, 1, { priority: 99 });
    expect(res.ok).toBe(false);
    expect(res.code).toBe('NOT_EDITABLE');
  });

  it('canEdit returns false for PACK templates or PUBLISHED versions', () => {
    const packTpl = { scope: 'PACK' };
    expect(canEdit(packTpl, { status: 'PUBLISHED' }, 0).editable).toBe(false);

    const tenantPublished = { scope: 'TENANT' };
    expect(canEdit(tenantPublished, { status: 'PUBLISHED' }, 0).editable).toBe(false);

    const tenantDraft = { scope: 'TENANT' };
    expect(canEdit(tenantDraft, { status: 'DRAFT' }, 0).editable).toBe(true);
  });
});

