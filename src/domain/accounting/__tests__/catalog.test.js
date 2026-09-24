import { describe, it, expect } from 'vitest';
import { getDocumentType, getTaxRate, getOperationTypes, getAccountRole } from '../catalog.js';

describe('accounting/catalog', () => {
  const minimalPack = {
    code: 'MIN',
    version: 1,
    name: 'Minimal Test Pack',
    effectiveFrom: '2020-01-01',
    documentTypes: [
      {
        code: 'INVOICE',
        version: 1,
        name: 'Factura',
        effectiveFrom: '2021-01-01',
        effectiveTo: '2025-12-31',
        operationTypesByPerspective: {
          RECEIVED: ['PURCHASE_A', 'PURCHASE_B'],
          ISSUED: ['SALE_A']
        }
      },
      {
        code: 'OPEN_DOC',
        version: 1,
        name: 'Documento Abierto',
        effectiveFrom: '2022-01-01',
        effectiveTo: null
      }
    ],
    taxes: [
      {
        code: 'VAT',
        name: 'Impuesto al Valor Agregado',
        kind: 'VALUE_ADDED',
        rates: [
          { rateBp: 1600, effectiveFrom: '2020-01-01', effectiveTo: '2022-12-31' },
          { rateBp: 1800, effectiveFrom: '2023-01-01', effectiveTo: null }
        ]
      }
    ],
    operationTypes: [
      { code: 'GLOBAL_OP_1', name: 'Op 1', allowedPerspectives: ['RECEIVED', 'ISSUED'] },
      { code: 'GLOBAL_OP_2', name: 'Op 2', allowedPerspectives: ['INTERNAL'] }
    ],
    accountRoles: [
      { code: 'SUPPLIERS_PAYABLE', name: 'Proveedores por pagar', suggestedAccountCode: '4212' },
      { code: 'CUSTOMERS_RECEIVABLE', name: 'Clientes por cobrar', suggestedAccountCode: '1212' }
    ]
  };

  describe('getDocumentType', () => {
    it('returns document type when within effective range', () => {
      const doc = getDocumentType(minimalPack, 'INVOICE', '2023-06-15');
      expect(doc).not.toBeNull();
      expect(doc.code).toBe('INVOICE');
    });

    it('returns null before effectiveFrom', () => {
      const doc = getDocumentType(minimalPack, 'INVOICE', '2020-12-31');
      expect(doc).toBeNull();
    });

    it('returns null after effectiveTo', () => {
      const doc = getDocumentType(minimalPack, 'INVOICE', '2026-01-01');
      expect(doc).toBeNull();
    });

    it('returns document type when effectiveTo is null', () => {
      const doc = getDocumentType(minimalPack, 'OPEN_DOC', '2030-01-01');
      expect(doc).not.toBeNull();
      expect(doc.code).toBe('OPEN_DOC');
    });

    it('returns document type if date is not provided', () => {
      const doc = getDocumentType(minimalPack, 'INVOICE');
      expect(doc).not.toBeNull();
    });
  });

  describe('getTaxRate', () => {
    it('returns correct tax rate before, within, and with effectiveTo: null', () => {
      // Before 2020-01-01
      const rateBefore = getTaxRate(minimalPack, 'VAT', '2019-12-31');
      expect(rateBefore).toBeNull();

      // Within first rate bracket
      const rate1 = getTaxRate(minimalPack, 'VAT', '2021-05-10');
      expect(rate1).not.toBeNull();
      expect(rate1.rateBp).toBe(1600);
      expect(rate1.effectiveFrom).toBe('2020-01-01');
      expect(rate1.effectiveTo).toBe('2022-12-31');

      // Within open rate bracket
      const rate2 = getTaxRate(minimalPack, 'VAT', '2026-09-15');
      expect(rate2).not.toBeNull();
      expect(rate2.rateBp).toBe(1800);
      expect(rate2.effectiveTo).toBeNull();
    });

    it('returns null for unknown tax code', () => {
      expect(getTaxRate(minimalPack, 'NON_EXISTENT', '2026-09-15')).toBeNull();
    });
  });

  describe('getOperationTypes', () => {
    it('returns specific operation types from documentType.operationTypesByPerspective when defined', () => {
      const invoiceType = minimalPack.documentTypes[0];
      const ops = getOperationTypes(minimalPack, invoiceType, 'RECEIVED');
      expect(ops).toEqual(['PURCHASE_A', 'PURCHASE_B']);

      const salesOps = getOperationTypes(minimalPack, invoiceType, 'ISSUED');
      expect(salesOps).toEqual(['SALE_A']);
    });

    it('falls back to pack.operationTypes filtered by perspective when not defined on docType', () => {
      const openDocType = minimalPack.documentTypes[1];
      const ops = getOperationTypes(minimalPack, openDocType, 'INTERNAL');
      expect(ops).toEqual(['GLOBAL_OP_2']);
    });
  });

  describe('getAccountRole', () => {
    it('returns account role by code or null if not found', () => {
      const role = getAccountRole(minimalPack, 'SUPPLIERS_PAYABLE');
      expect(role).not.toBeNull();
      expect(role.suggestedAccountCode).toBe('4212');

      expect(getAccountRole(minimalPack, 'UNKNOWN_ROLE')).toBeNull();
    });
  });
});

