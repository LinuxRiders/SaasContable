import { describe, it, expect } from 'vitest';
import {
  resolveAccount,
  rolesUsedBy,
  checkTemplateAccounts
} from '../accountResolution.js';

describe('accountResolution domain logic', () => {
  const mockChart = [
    { codigo: '42', descripcion: 'Cuentas por pagar comerciales', esCuentaU: false, activo: true },
    { codigo: '4212101', descripcion: 'Facturas por pagar MN', esCuentaU: true, activo: true },
    { codigo: '4212102', descripcion: 'Facturas por pagar ME', esCuentaU: true, activo: false },
    { codigo: '6011101', descripcion: 'Mercaderías manufacturadas', esCuentaU: true, activo: true },
    { codigo: '6311101', descripcion: 'Transporte de carga', esCuentaU: true, activo: true },
    { codigo: '941101', descripcion: 'Administración gral', esCuentaU: true, activo: true }
  ];

  const mockMapping = {
    tenantId: '01',
    version: 1,
    entries: [
      { roleCode: 'SUPPLIERS_PAYABLE', qualifier: null, accountCode: '4212101' },
      { roleCode: 'MERCHANDISE_PURCHASE', qualifier: null, accountCode: '6011101' },
      { roleCode: 'COST_DESTINATION', qualifier: 'CC-ADMIN', accountCode: '941101' }
    ]
  };

  describe('resolveAccount - LITERAL', () => {
    it('resolves existing postable active account', () => {
      const ref = { kind: 'LITERAL', accountCode: '4212101' };
      const res = resolveAccount(ref, { mapping: mockMapping, chart: mockChart });
      expect(res.ok).toBe(true);
      expect(res.accountCode).toBe('4212101');
      expect(res.accountRole).toBeNull();
    });

    it('fails when literal account does not exist in chart', () => {
      const ref = { kind: 'LITERAL', accountCode: '999999' };
      const res = resolveAccount(ref, { mapping: mockMapping, chart: mockChart });
      expect(res.ok).toBe(false);
      expect(res.pending[0].code).toBe('ACCOUNT_UNRESOLVED');
    });

    it('fails when literal account is grouping (not postable)', () => {
      const ref = { kind: 'LITERAL', accountCode: '42' };
      const res = resolveAccount(ref, { mapping: mockMapping, chart: mockChart });
      expect(res.ok).toBe(false);
      expect(res.pending[0].code).toBe('ACCOUNT_UNRESOLVED');
    });

    it('fails when literal account is inactive', () => {
      const ref = { kind: 'LITERAL', accountCode: '4212102' };
      const res = resolveAccount(ref, { mapping: mockMapping, chart: mockChart });
      expect(res.ok).toBe(false);
      expect(res.pending[0].code).toBe('ACCOUNT_UNRESOLVED');
    });
  });

  describe('resolveAccount - ROLE', () => {
    it('resolves mapped role without qualifier', () => {
      const ref = { kind: 'ROLE', roleCode: 'SUPPLIERS_PAYABLE' };
      const res = resolveAccount(ref, { mapping: mockMapping, chart: mockChart });
      expect(res.ok).toBe(true);
      expect(res.accountCode).toBe('4212101');
      expect(res.accountRole).toBe('SUPPLIERS_PAYABLE');
    });

    it('resolves mapped role with qualifier', () => {
      const ref = { kind: 'ROLE', roleCode: 'COST_DESTINATION' };
      const res = resolveAccount(ref, { mapping: mockMapping, chart: mockChart, qualifier: 'CC-ADMIN' });
      expect(res.ok).toBe(true);
      expect(res.accountCode).toBe('941101');
      expect(res.accountRole).toBe('COST_DESTINATION');
    });

    it('fails for unmapped role', () => {
      const ref = { kind: 'ROLE', roleCode: 'VAT_CREDIT' };
      const res = resolveAccount(ref, { mapping: mockMapping, chart: mockChart });
      expect(res.ok).toBe(false);
      expect(res.pending[0].code).toBe('ACCOUNT_UNRESOLVED');
    });

    it('fails for role with unmapped qualifier', () => {
      const ref = { kind: 'ROLE', roleCode: 'COST_DESTINATION' };
      const res = resolveAccount(ref, { mapping: mockMapping, chart: mockChart, qualifier: 'CC-VENTAS' });
      expect(res.ok).toBe(false);
      expect(res.pending[0].code).toBe('ACCOUNT_UNRESOLVED');
    });
  });

  describe('resolveAccount - BY_OPERATION_TYPE', () => {
    const ref = {
      kind: 'BY_OPERATION_TYPE',
      byOperationType: {
        MERCHANDISE_PURCHASE: { roleCode: 'MERCHANDISE_PURCHASE' },
        FREIGHT_EXPENSE: { accountCode: '6311101' }
      },
      fallback: { roleCode: 'MERCHANDISE_PURCHASE' }
    };

    it('resolves operation mapped to roleCode', () => {
      const res = resolveAccount(ref, {
        mapping: mockMapping,
        chart: mockChart,
        lineOperationType: 'MERCHANDISE_PURCHASE'
      });
      expect(res.ok).toBe(true);
      expect(res.accountCode).toBe('6011101');
    });

    it('resolves operation mapped to literal accountCode', () => {
      const res = resolveAccount(ref, {
        mapping: mockMapping,
        chart: mockChart,
        lineOperationType: 'FREIGHT_EXPENSE'
      });
      expect(res.ok).toBe(true);
      expect(res.accountCode).toBe('6311101');
    });

    it('uses fallback when operation is not mapped', () => {
      const res = resolveAccount(ref, {
        mapping: mockMapping,
        chart: mockChart,
        lineOperationType: 'OTHER_OPERATION'
      });
      expect(res.ok).toBe(true);
      expect(res.accountCode).toBe('6011101');
    });

    it('fails when operation is unmapped and no fallback provided', () => {
      const refNoFallback = {
        kind: 'BY_OPERATION_TYPE',
        byOperationType: {
          MERCHANDISE_PURCHASE: { roleCode: 'MERCHANDISE_PURCHASE' }
        }
      };
      const res = resolveAccount(refNoFallback, {
        mapping: mockMapping,
        chart: mockChart,
        lineOperationType: 'UNKNOWN_OP'
      });
      expect(res.ok).toBe(false);
      expect(res.pending[0].code).toBe('ACCOUNT_UNRESOLVED');
    });
  });

  describe('rolesUsedBy and checkTemplateAccounts', () => {
    const templateVersion = {
      lines: [
        {
          id: 'l1',
          side: 'DEBIT',
          accountRef: {
            kind: 'ROLE',
            roleCode: 'MERCHANDISE_PURCHASE'
          }
        },
        {
          id: 'l2',
          side: 'CREDIT',
          accountRef: {
            kind: 'ROLE',
            roleCode: 'SUPPLIERS_PAYABLE'
          }
        },
        {
          id: 'l3',
          side: 'DEBIT',
          accountRef: {
            kind: 'BY_OPERATION_TYPE',
            byOperationType: {
              CUSTOMS_TAX: { roleCode: 'CUSTOMS_PAYABLE' }
            },
            fallback: { accountCode: '6311101' }
          }
        }
      ]
    };

    it('extracts roles and literal accounts used by template version', () => {
      const used = rolesUsedBy(templateVersion);
      expect(used.roles).toContain('MERCHANDISE_PURCHASE');
      expect(used.roles).toContain('SUPPLIERS_PAYABLE');
      expect(used.roles).toContain('CUSTOMS_PAYABLE');
      expect(used.literalAccounts).toContain('6311101');
    });

    it('detects unresolved accounts in checkTemplateAccounts when CUSTOMS_PAYABLE is not mapped', () => {
      const check = checkTemplateAccounts(templateVersion, { mapping: mockMapping, chart: mockChart });
      expect(check.ok).toBe(false);
      expect(check.unresolved.some(u => u.roleCode === 'CUSTOMS_PAYABLE')).toBe(true);
    });

    it('passes checkTemplateAccounts when all roles are mapped', () => {
      const fullMapping = {
        ...mockMapping,
        entries: [
          ...mockMapping.entries,
          { roleCode: 'CUSTOMS_PAYABLE', qualifier: null, accountCode: '4212101' }
        ]
      };
      const check = checkTemplateAccounts(templateVersion, { mapping: fullMapping, chart: mockChart });
      expect(check.ok).toBe(true);
      expect(check.unresolved.length).toBe(0);
    });
  });
});

