import { describe, it, expect } from 'vitest';
import { canEdit, nextVersionFrom } from '../templateLifecycle.js';

describe('templateLifecycle: versioning & immutability (RD-10, T094, T095)', () => {
  const tenantTemplate = {
    id: 'tmpl-01',
    code: 'T_CUSTOM_01',
    name: 'Plantilla Personalizada',
    scope: 'TENANT',
    retiredAt: null
  };

  const packTemplate = {
    id: 'tmpl-pack',
    code: 'PE_INVOICE_PURCHASE',
    name: 'Plantilla Base',
    scope: 'PACK',
    retiredAt: null
  };

  const draftVersion = {
    version: 1,
    status: 'DRAFT',
    documentTypeCode: 'INVOICE',
    perspective: 'RECEIVED',
    operationTypeCode: 'MERCHANDISE_PURCHASE',
    priority: 0,
    applicability: { fn: 'eq', args: [{ field: 'currency' }, { const: 'PEN' }] },
    legalBookCode: 'PE.PURCHASES_REGISTER',
    glosa: { const: 'Glosa v1' },
    requiredInputs: ['fields.costCenter'],
    lines: [
      { id: 'l1', side: 'DEBIT', account: { kind: 'ROLE', roleCode: 'PURCHASES_MERCHANDISE' }, amount: { field: 'totals.netMinor' } },
      { id: 'l2', side: 'CREDIT', account: { kind: 'ROLE', roleCode: 'SUPPLIERS_PAYABLE' }, amount: { field: 'totals.totalMinor' } }
    ],
    testCases: [
      { id: 'tc1', name: 'Caso 1', expectedLines: [] }
    ],
    lastTestRun: { at: '2026-09-01T00:00:00Z', status: 'PASS' },
    diffFromPrevious: null,
    createdBy: 'admin_pedro',
    createdAt: '2026-09-01T00:00:00Z'
  };

  const publishedVersion = {
    ...draftVersion,
    status: 'PUBLISHED'
  };

  describe('canEdit (RD-10)', () => {
    it('permite editar si la versión es DRAFT, sin uso y la plantilla es TENANT no retirada', () => {
      const res = canEdit(tenantTemplate, draftVersion, 0);
      expect(res.editable).toBe(true);
    });

    it('bloquea edición si la plantilla es de alcance PACK', () => {
      const res = canEdit(packTemplate, draftVersion, 0);
      expect(res.editable).toBe(false);
      expect(res.reason).toContain('paquete');
    });

    it('bloquea edición si la plantilla está retirada', () => {
      const res = canEdit({ ...tenantTemplate, retiredAt: '2026-09-10' }, draftVersion, 0);
      expect(res.editable).toBe(false);
      expect(res.reason).toContain('retirada');
    });

    it('bloquea edición si la versión es PUBLISHED', () => {
      const res = canEdit(tenantTemplate, publishedVersion, 0);
      expect(res.editable).toBe(false);
      expect(res.reason).toContain('DRAFT');
    });

    it('bloquea edición si el uso acumulado es mayor que 0 (RD-10)', () => {
      const res = canEdit(tenantTemplate, draftVersion, 5);
      expect(res.editable).toBe(false);
      expect(res.reason).toContain('RD-10');
    });
  });

  describe('nextVersionFrom (RD-10)', () => {
    it('crea versión v(n+1) en estado DRAFT copiando líneas, casos y metadatos con lastTestRun: null', () => {
      const v1Before = JSON.stringify(publishedVersion);
      const v2 = nextVersionFrom(publishedVersion, {
        createdBy: 'admin_nuevo',
        createdAt: '2026-09-15T12:00:00Z'
      });

      expect(v2.version).toBe(2);
      expect(v2.status).toBe('DRAFT');
      expect(v2.documentTypeCode).toBe('INVOICE');
      expect(v2.perspective).toBe('RECEIVED');
      expect(v2.operationTypeCode).toBe('MERCHANDISE_PURCHASE');
      expect(v2.priority).toBe(0);
      expect(v2.legalBookCode).toBe('PE.PURCHASES_REGISTER');
      expect(v2.glosa).toEqual({ const: 'Glosa v1' });
      expect(v2.requiredInputs).toEqual(['fields.costCenter']);
      expect(v2.lines).toHaveLength(2);
      expect(v2.testCases).toHaveLength(1);

      // Crítico: lastTestRun debe reiniciarse a null
      expect(v2.lastTestRun).toBeNull();
      expect(v2.diffFromPrevious).toBeNull();
      expect(v2.createdBy).toBe('admin_nuevo');
      expect(v2.createdAt).toBe('2026-09-15T12:00:00Z');

      // Modificar v2 no debe alterar la versión de origen (inmutabilidad profunda)
      v2.lines[0].side = 'CREDIT';
      v2.testCases.push({ id: 'tc2' });
      v2.applicability.args = [];

      expect(JSON.stringify(publishedVersion)).toBe(v1Before);
    });
  });
});

