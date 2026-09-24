/**
 * Reglas semilla de clasificación de la operación contable para la empresa 01.
 * Conforme a data-model.md §11 y T075.
 * 7 activas + 1 propuesta (PROPOSED) para demostración y pruebas.
 */

export const mockReglasClasificacion = [
  {
    id: 'cr-01',
    tenantId: '01',
    name: 'Proveedor de mercadería',
    scope: 'DOCUMENT',
    priority: 20,
    status: 'ACTIVE',
    version: 1,
    operationTypeCode: 'MERCHANDISE_PURCHASE',
    condition: {
      fn: 'and',
      args: [
        { fn: 'eq', args: [{ fn: 'party', args: ['ISSUER'], prop: 'fiscalId' }, '20100000009'] },
        { fn: 'eq', args: [{ field: 'documentTypeCode' }, 'INVOICE'] },
        { fn: 'eq', args: [{ field: 'perspective' }, 'RECEIVED'] }
      ]
    },
    createdAt: '2026-01-01T00:00:00Z',
    createdBy: 'system'
  },
  {
    id: 'cr-02',
    tenantId: '01',
    name: 'Proveedor de energía',
    scope: 'DOCUMENT',
    priority: 20,
    status: 'ACTIVE',
    version: 1,
    operationTypeCode: 'UTILITIES_EXPENSE',
    condition: {
      fn: 'and',
      args: [
        { fn: 'eq', args: [{ fn: 'party', args: ['ISSUER'], prop: 'fiscalId' }, '20100000017'] },
        { fn: 'eq', args: [{ field: 'perspective' }, 'RECEIVED'] }
      ]
    },
    createdAt: '2026-01-01T00:00:00Z',
    createdBy: 'system'
  },
  {
    id: 'cr-03',
    tenantId: '01',
    name: 'Venta de mercadería',
    scope: 'DOCUMENT',
    priority: 20,
    status: 'ACTIVE',
    version: 1,
    operationTypeCode: 'MERCHANDISE_SALE',
    condition: {
      fn: 'and',
      args: [
        { fn: 'eq', args: [{ field: 'documentTypeCode' }, 'INVOICE'] },
        { fn: 'eq', args: [{ field: 'perspective' }, 'ISSUED'] },
        {
          fn: 'gt',
          args: [
            {
              fn: 'countLines',
              args: [
                { fn: 'startsWith', args: [{ line: 'itemCode' }, 'MER-'] }
              ]
            },
            0
          ]
        }
      ]
    },
    createdAt: '2026-01-01T00:00:00Z',
    createdBy: 'system'
  },
  {
    id: 'cr-04',
    tenantId: '01',
    name: 'Devolución de compra',
    scope: 'DOCUMENT',
    priority: 20,
    status: 'ACTIVE',
    version: 1,
    operationTypeCode: 'PURCHASE_RETURN',
    condition: {
      fn: 'and',
      args: [
        { fn: 'eq', args: [{ field: 'documentTypeCode' }, 'CREDIT_NOTE'] },
        { fn: 'eq', args: [{ field: 'perspective' }, 'RECEIVED'] },
        { fn: 'eq', args: [{ field: 'fields.creditNoteReason' }, '07'] }
      ]
    },
    createdAt: '2026-01-01T00:00:00Z',
    createdBy: 'system'
  },
  {
    id: 'cr-05',
    tenantId: '01',
    name: 'Fletes',
    scope: 'LINE',
    priority: 10,
    status: 'ACTIVE',
    version: 1,
    operationTypeCode: 'TRANSPORT_EXPENSE',
    condition: {
      fn: 'contains',
      args: [
        { fn: 'lower', args: [{ line: 'description' }] },
        'flete'
      ]
    },
    createdAt: '2026-01-01T00:00:00Z',
    createdBy: 'system'
  },
  {
    id: 'cr-06',
    tenantId: '01',
    name: 'Mercadería por código',
    scope: 'LINE',
    priority: 10,
    status: 'ACTIVE',
    version: 1,
    operationTypeCode: 'MERCHANDISE_PURCHASE',
    condition: {
      fn: 'and',
      args: [
        { fn: 'startsWith', args: [{ line: 'itemCode' }, 'MER-'] },
        { fn: 'eq', args: [{ field: 'documentTypeCode' }, 'INVOICE'] },
        { fn: 'eq', args: [{ field: 'perspective' }, 'RECEIVED'] }
      ]
    },
    createdAt: '2026-01-01T00:00:00Z',
    createdBy: 'system'
  },
  {
    id: 'cr-07',
    tenantId: '01',
    name: 'Comisiones bancarias',
    scope: 'LINE',
    priority: 10,
    status: 'ACTIVE',
    version: 1,
    operationTypeCode: 'BANK_CHARGES',
    condition: {
      fn: 'and',
      args: [
        { fn: 'eq', args: [{ line: 'fields.movementType' }, 'CHARGE'] },
        { fn: 'eq', args: [{ field: 'documentTypeCode' }, 'BANK_STATEMENT'] }
      ]
    },
    createdAt: '2026-01-01T00:00:00Z',
    createdBy: 'system'
  },
  {
    id: 'cr-08',
    tenantId: '01',
    name: 'Propuesta: equipos de cómputo',
    scope: 'DOCUMENT',
    priority: 15,
    status: 'PROPOSED',
    version: 1,
    operationTypeCode: 'FIXED_ASSET_ACQUISITION',
    condition: {
      fn: 'gt',
      args: [
        {
          fn: 'countLines',
          args: [
            { fn: 'contains', args: [{ fn: 'lower', args: [{ line: 'description' }] }, 'cómputo'] }
          ]
        },
        0
      ]
    },
    createdAt: '2026-01-01T00:00:00Z',
    createdBy: 'system'
  }
];

