import { describe, it, expect } from 'vitest';
import { diffVersions } from '../templateDiff.js';

describe('templateDiff: diffVersions (contracts/domain-api.md §6, T092)', () => {
  const baseVersion = {
    version: 1,
    documentTypeCode: 'INVOICE',
    perspective: 'RECEIVED',
    operationTypeCode: 'MERCHANDISE_PURCHASE',
    priority: 0,
    applicability: null,
    legalBookCode: 'PE.PURCHASES_REGISTER',
    glosa: { const: 'Compra de mercaderías' },
    lines: [
      {
        id: 'expense',
        side: 'DEBIT',
        account: { kind: 'ROLE', roleCode: 'PURCHASES_MERCHANDISE' },
        amount: { field: 'totals.netMinor' },
        emitWhen: null,
        dimensions: {},
        description: { const: 'Mercadería' }
      },
      {
        id: 'vat',
        side: 'DEBIT',
        account: { kind: 'ROLE', roleCode: 'VAT_CREDIT' },
        amount: { field: 'totals.taxMinor' },
        emitWhen: null,
        dimensions: {},
        description: { const: 'IGV' }
      },
      {
        id: 'payable',
        side: 'CREDIT',
        account: { kind: 'ROLE', roleCode: 'SUPPLIERS_PAYABLE' },
        amount: { field: 'totals.totalMinor' },
        emitWhen: null,
        dimensions: {},
        description: { const: 'Por pagar' }
      }
    ]
  };

  it('devuelve arreglo vacío cuando las dos versiones son idénticas', () => {
    const diff = diffVersions(baseVersion, JSON.parse(JSON.stringify(baseVersion)));
    expect(diff).toEqual([]);
  });

  it('detecta cambios de cabecera: prioridad, terna, libro, glosa y aplicabilidad', () => {
    const nextVersion = {
      ...baseVersion,
      priority: 10,
      operationTypeCode: 'RAW_MATERIAL_PURCHASE',
      legalBookCode: 'PE.JOURNAL',
      glosa: { const: 'Compra de materia prima' },
      applicability: { fn: 'eq', args: [{ field: 'currency' }, { const: 'PEN' }] }
    };

    const diff = diffVersions(baseVersion, nextVersion);

    expect(diff.some(d => d.includes('Prioridad: 0 → 10'))).toBe(true);
    expect(diff.some(d => d.includes("Tipo de operación: 'MERCHANDISE_PURCHASE' → 'RAW_MATERIAL_PURCHASE'"))).toBe(true);
    expect(diff.some(d => d.includes("Libro oficial: 'PE.PURCHASES_REGISTER' → 'PE.JOURNAL'"))).toBe(true);
    expect(diff.some(d => d.toLowerCase().includes('glosa'))).toBe(true);
    expect(diff.some(d => d.toLowerCase().includes('aplicabilidad'))).toBe(true);
  });

  it('detecta línea agregada y línea eliminada', () => {
    const nextVersion = {
      ...baseVersion,
      lines: [
        baseVersion.lines[0], // expense
        baseVersion.lines[2], // payable (vat eliminada)
        {
          id: 'retention',
          side: 'CREDIT',
          account: { kind: 'ROLE', roleCode: 'VAT_WITHHELD' },
          amount: { field: 'totals.withheldMinor' }
        }
      ]
    };

    const diff = diffVersions(baseVersion, nextVersion);

    expect(diff.some(d => d.includes("Línea 'vat' eliminada"))).toBe(true);
    expect(diff.some(d => d.includes("Línea 'retention' agregada"))).toBe(true);
  });

  it('detecta cambios en líneas existentes: lado, cuenta, importe, condición y dimensiones', () => {
    const nextVersion = {
      ...baseVersion,
      lines: [
        {
          ...baseVersion.lines[0],
          account: { kind: 'ROLE', roleCode: 'SUPPLIES_PURCHASE' },
          dimensions: { costCenter: { const: 'CC-ADMIN' } }
        },
        {
          ...baseVersion.lines[1],
          amount: { field: 'totals.payableMinor' },
          emitWhen: { fn: 'gt', args: [{ field: 'totals.taxMinor' }, { const: 0 }] }
        },
        {
          ...baseVersion.lines[2],
          side: 'DEBIT'
        }
      ]
    };

    const diff = diffVersions(baseVersion, nextVersion);

    expect(diff.some(d => d.includes("Línea 'expense': cuenta modificada"))).toBe(true);
    expect(diff.some(d => d.includes("Línea 'expense': dimensiones modificadas"))).toBe(true);
    expect(diff.some(d => d.includes("Línea 'vat': importe cambió"))).toBe(true);
    expect(diff.some(d => d.includes("Línea 'vat': condición de emisión modificada"))).toBe(true);
    expect(diff.some(d => d.includes("Línea 'payable': lado CREDIT → DEBIT"))).toBe(true);
  });
});

