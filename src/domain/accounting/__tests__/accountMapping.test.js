import { describe, it, expect } from 'vitest';
import {
  validateMappingEntry,
  validateMapping,
  preloadMapping,
  diffMappingRoles
} from '../accountMapping.js';

describe('accountMapping domain logic', () => {
  const mockPack = {
    code: 'PE',
    accountRoles: [
      {
        code: 'SUPPLIERS_PAYABLE',
        name: 'Proveedores por pagar',
        suggestedAccountCode: '4212'
      },
      {
        code: 'MERCHANDISE_PURCHASE',
        name: 'Compra de mercadería',
        suggestedAccountCode: '601'
      },
      {
        code: 'MERCHANDISE_INVENTORY',
        name: 'Mercaderías en almacén',
        suggestedAccountCode: '201'
      },
      {
        code: 'COST_DESTINATION',
        name: 'Destino del gasto',
        suggestedAccountCode: '94',
        qualifier: {
          name: 'costCenter',
          suggestions: {
            'CC-ADMIN': '94',
            'CC-VENTAS': '95'
          }
        }
      },
      {
        code: 'MISSING_SUGGESTION_ROLE',
        name: 'Rol sin sugerencia en plan',
        suggestedAccountCode: '3361' // no existirá en chart
      }
    ]
  };

  const mockChart = [
    { codigo: '42', descripcion: 'Cuentas por pagar comerciales', esCuentaU: false, activo: true },
    { codigo: '4212', descripcion: 'Emitidas', esCuentaU: false, activo: true },
    { codigo: '4212101', descripcion: 'Facturas por pagar MN', esCuentaU: true, activo: true },
    { codigo: '4212102', descripcion: 'Facturas por pagar ME', esCuentaU: true, activo: false }, // inactiva
    { codigo: '601', descripcion: 'Mercaderías', esCuentaU: false, activo: true },
    { codigo: '6011101', descripcion: 'Mercaderías manufacturadas', esCuentaU: true, activo: true },
    { codigo: '94', descripcion: 'Gastos de administración', esCuentaU: false, activo: true },
    { codigo: '941101', descripcion: 'Administración gral', esCuentaU: true, activo: true },
    { codigo: '95', descripcion: 'Gastos de ventas', esCuentaU: false, activo: true },
    { codigo: '951101', descripcion: 'Ventas gral', esCuentaU: true, activo: true }
  ];

  describe('validateMappingEntry', () => {
    it('validates a correct entry without qualifier', () => {
      const entry = { roleCode: 'SUPPLIERS_PAYABLE', qualifier: null, accountCode: '4212101' };
      const res = validateMappingEntry(entry, { pack: mockPack, chart: mockChart });
      expect(res.ok).toBe(true);
    });

    it('validates a correct entry with qualifier', () => {
      const entry = { roleCode: 'COST_DESTINATION', qualifier: 'CC-ADMIN', accountCode: '941101' };
      const res = validateMappingEntry(entry, { pack: mockPack, chart: mockChart });
      expect(res.ok).toBe(true);
    });

    it('rejects unknown roleCode', () => {
      const entry = { roleCode: 'NON_EXISTENT_ROLE', qualifier: null, accountCode: '4212101' };
      const res = validateMappingEntry(entry, { pack: mockPack, chart: mockChart });
      expect(res.ok).toBe(false);
      expect(res.code).toBe('ROLE_UNKNOWN');
    });

    it('rejects qualifier when role does not allow qualifier', () => {
      const entry = { roleCode: 'SUPPLIERS_PAYABLE', qualifier: 'UNEXPECTED', accountCode: '4212101' };
      const res = validateMappingEntry(entry, { pack: mockPack, chart: mockChart });
      expect(res.ok).toBe(false);
      expect(res.code).toBe('QUALIFIER_NOT_ALLOWED');
    });

    it('rejects non-existent account in chart', () => {
      const entry = { roleCode: 'SUPPLIERS_PAYABLE', qualifier: null, accountCode: '999999' };
      const res = validateMappingEntry(entry, { pack: mockPack, chart: mockChart });
      expect(res.ok).toBe(false);
      expect(res.code).toBe('ACCOUNT_NOT_FOUND');
    });

    it('rejects grouping account (esCuentaU = false)', () => {
      const entry = { roleCode: 'SUPPLIERS_PAYABLE', qualifier: null, accountCode: '4212' };
      const res = validateMappingEntry(entry, { pack: mockPack, chart: mockChart });
      expect(res.ok).toBe(false);
      expect(res.code).toBe('ACCOUNT_NOT_POSTABLE');
    });

    it('rejects inactive account (activo = false)', () => {
      const entry = { roleCode: 'SUPPLIERS_PAYABLE', qualifier: null, accountCode: '4212102' };
      const res = validateMappingEntry(entry, { pack: mockPack, chart: mockChart });
      expect(res.ok).toBe(false);
      expect(res.code).toBe('ACCOUNT_INACTIVE');
    });
  });

  describe('validateMapping', () => {
    it('detects duplicate (roleCode, qualifier) entries', () => {
      const entries = [
        { roleCode: 'SUPPLIERS_PAYABLE', qualifier: null, accountCode: '4212101' },
        { roleCode: 'SUPPLIERS_PAYABLE', qualifier: null, accountCode: '4212101' }
      ];
      const res = validateMapping(entries, { pack: mockPack, chart: mockChart });
      expect(res.ok).toBe(false);
      expect(res.errors.some(e => e.code === 'DUPLICATE_ENTRY')).toBe(true);
    });
  });

  describe('preloadMapping', () => {
    it('resolves accounts by suggested code prefix, applies qualifier suggestions, and detects unmapped roles', () => {
      const { entries, unmappedRoles } = preloadMapping(mockPack, mockChart, []);

      // SUPPLIERS_PAYABLE -> prefix '4212' -> resolved to '4212101'
      const supplierEntry = entries.find(e => e.roleCode === 'SUPPLIERS_PAYABLE');
      expect(supplierEntry).toBeDefined();
      expect(supplierEntry.accountCode).toBe('4212101');

      // COST_DESTINATION -> suggestions for CC-ADMIN (94 -> 941101) and CC-VENTAS (95 -> 951101)
      const costAdmin = entries.find(e => e.roleCode === 'COST_DESTINATION' && e.qualifier === 'CC-ADMIN');
      expect(costAdmin).toBeDefined();
      expect(costAdmin.accountCode).toBe('941101');

      const costVentas = entries.find(e => e.roleCode === 'COST_DESTINATION' && e.qualifier === 'CC-VENTAS');
      expect(costVentas).toBeDefined();
      expect(costVentas.accountCode).toBe('951101');

      // MISSING_SUGGESTION_ROLE -> prefix '3361' not found in chart -> in unmappedRoles
      expect(unmappedRoles).toContain('MISSING_SUGGESTION_ROLE');
    });

    it('does not overwrite existing entries', () => {
      const existing = [
        { roleCode: 'SUPPLIERS_PAYABLE', qualifier: null, accountCode: '4212101_CUSTOM' }
      ];
      const { entries } = preloadMapping(mockPack, mockChart, existing);
      const supplier = entries.find(e => e.roleCode === 'SUPPLIERS_PAYABLE');
      expect(supplier.accountCode).toBe('4212101_CUSTOM');
    });
  });

  describe('diffMappingRoles', () => {
    it('returns list of changed role keys between previous and next mapping', () => {
      const prev = [
        { roleCode: 'SUPPLIERS_PAYABLE', qualifier: null, accountCode: '4212101' },
        { roleCode: 'COST_DESTINATION', qualifier: 'CC-ADMIN', accountCode: '941101' }
      ];
      const next = [
        { roleCode: 'SUPPLIERS_PAYABLE', qualifier: null, accountCode: '4212109' }, // modified
        { roleCode: 'COST_DESTINATION', qualifier: 'CC-ADMIN', accountCode: '941101' }, // unchanged
        { roleCode: 'MERCHANDISE_PURCHASE', qualifier: null, accountCode: '6011101' } // added
      ];
      const changed = diffMappingRoles(prev, next);
      expect(changed).toContain('SUPPLIERS_PAYABLE');
      expect(changed).toContain('MERCHANDISE_PURCHASE');
      expect(changed).not.toContain('COST_DESTINATION');
    });
  });
});

