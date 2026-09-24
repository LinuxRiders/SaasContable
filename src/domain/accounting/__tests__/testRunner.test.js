import { describe, it, expect } from 'vitest';
import { runTests } from '../testRunner.js';

describe('runTests (contracts/domain-api.md §6)', () => {
  const dummyPack = {
    code: 'TEST',
    version: 1,
    defaultFunctionalCurrency: 'PEN',
    roundingToleranceMinor: 5
  };

  const dummyChart = [
    { codigo: '6011101', descripcion: 'Mercaderías', activo: true, esCuentaU: true },
    { codigo: '4011101', descripcion: 'IGV', activo: true, esCuentaU: true },
    { codigo: '4212101', descripcion: 'Proveedores', activo: true, esCuentaU: true }
  ];

  const tenantMapping = {
    entries: [
      { roleCode: 'EXPENSE', accountCode: '6011101' },
      { roleCode: 'TAX', accountCode: '4011101' },
      { roleCode: 'PAYABLE', accountCode: '4212101' }
    ]
  };

  const simpleVersion = {
    id: 'T_SIMPLE',
    version: 1,
    lines: [
      {
        id: 'l1',
        side: 'DEBIT',
        accountRef: { kind: 'ROLE', roleCode: 'EXPENSE' },
        amount: 1000
      },
      {
        id: 'l2',
        side: 'DEBIT',
        accountRef: { kind: 'ROLE', roleCode: 'TAX' },
        amount: 180
      },
      {
        id: 'l3',
        side: 'CREDIT',
        accountRef: { kind: 'ROLE', roleCode: 'PAYABLE' },
        amount: 1180,
        balancingLine: true
      }
    ]
  };

  it('caso positivo que pasa con status PASS', () => {
    const version = {
      ...simpleVersion,
      testCases: [
        {
          id: 'case_ok',
          name: 'Caso exitoso',
          mappingSource: 'TENANT',
          input: { currency: 'PEN', fields: {}, lines: [] },
          expectedLines: [
            { side: 'DEBIT', accountCode: '6011101', functionalAmountMinor: 1000 },
            { side: 'DEBIT', accountCode: '4011101', functionalAmountMinor: 180 },
            { side: 'CREDIT', accountCode: '4212101', functionalAmountMinor: 1180 }
          ]
        }
      ]
    };

    const run = runTests(version, {
      pack: dummyPack,
      tenantMapping,
      chart: dummyChart,
      functionalCurrency: 'PEN'
    });

    expect(run.results).toHaveLength(1);
    expect(run.results[0].testCaseId).toBe('case_ok');
    expect(run.results[0].status).toBe('PASS');
    expect(run.results[0].differences).toHaveLength(0);
  });

  it('falla con diferencia legible ante una cuenta distinta ("Línea 2: se esperaba 4011101, se obtuvo 4212101")', () => {
    const version = {
      ...simpleVersion,
      testCases: [
        {
          id: 'case_wrong_acc',
          name: 'Caso con cuenta incorrecta esperada',
          mappingSource: 'TENANT',
          input: { currency: 'PEN', fields: {}, lines: [] },
          expectedLines: [
            { side: 'DEBIT', accountCode: '6011101', functionalAmountMinor: 1000 },
            // Se espera 4212101 en línea 2 pero la plantilla genera 4011101
            { side: 'DEBIT', accountCode: '4212101', functionalAmountMinor: 180 },
            { side: 'CREDIT', accountCode: '4212101', functionalAmountMinor: 1180 }
          ]
        }
      ]
    };

    const run = runTests(version, {
      pack: dummyPack,
      tenantMapping,
      chart: dummyChart,
      functionalCurrency: 'PEN'
    });

    expect(run.results[0].status).toBe('FAIL');
    expect(run.results[0].differences.some(d => d.includes('Línea 2: se esperaba 4212101, se obtuvo 4011101'))).toBe(true);
  });

  it('caso negativo con expectedPending pasa si se producen los motivos esperados', () => {
    const versionWithReq = {
      ...simpleVersion,
      requiredInputs: ['fields.costCenter'],
      testCases: [
        {
          id: 'case_neg_pass',
          name: 'Falta costCenter',
          mappingSource: 'TENANT',
          input: { currency: 'PEN', fields: {}, lines: [] },
          expectedPending: ['MISSING_INPUT']
        }
      ]
    };

    const run = runTests(versionWithReq, {
      pack: dummyPack,
      tenantMapping,
      chart: dummyChart,
      functionalCurrency: 'PEN'
    });

    expect(run.results[0].status).toBe('PASS');
    expect(run.results[0].differences).toHaveLength(0);
  });

  it('soporta mappingSource INLINE vs TENANT', () => {
    const inlineMapping = {
      entries: [
        { roleCode: 'EXPENSE', accountCode: '6011101' },
        // TAX no está mapeado en inlineMapping
        { roleCode: 'PAYABLE', accountCode: '4212101' }
      ]
    };

    const version = {
      ...simpleVersion,
      testCases: [
        {
          id: 'case_inline',
          name: 'Usa inline incompleto',
          mappingSource: 'INLINE',
          accountMapping: inlineMapping,
          input: { currency: 'PEN', fields: {}, lines: [] },
          expectedPending: ['ACCOUNT_UNRESOLVED']
        }
      ]
    };

    const run = runTests(version, {
      pack: dummyPack,
      tenantMapping,
      chart: dummyChart,
      functionalCurrency: 'PEN'
    });

    expect(run.results[0].status).toBe('PASS');
  });

  it('asiento que no cuadra resulta en FAIL', () => {
    const unbalancedVersion = {
      id: 'T_UNBALANCED',
      version: 1,
      lines: [
        {
          id: 'l1',
          side: 'DEBIT',
          accountRef: { kind: 'ROLE', roleCode: 'EXPENSE' },
          amount: 1000
        },
        {
          id: 'l2',
          side: 'CREDIT',
          accountRef: { kind: 'ROLE', roleCode: 'PAYABLE' },
          amount: 500,
          balancingLine: true
        }
      ],
      testCases: [
        {
          id: 'case_unbalanced',
          name: 'Descuadre',
          mappingSource: 'TENANT',
          input: { currency: 'PEN', fields: {}, lines: [] },
          expectedLines: [
            { side: 'DEBIT', accountCode: '6011101', functionalAmountMinor: 1000 },
            { side: 'CREDIT', accountCode: '4212101', functionalAmountMinor: 500 }
          ]
        }
      ]
    };

    const run = runTests(unbalancedVersion, {
      pack: dummyPack,
      tenantMapping,
      chart: dummyChart,
      functionalCurrency: 'PEN'
    });

    expect(run.results[0].status).toBe('FAIL');
    expect(run.results[0].differences.some(d => d.includes('UNBALANCED'))).toBe(true);
  });
});

