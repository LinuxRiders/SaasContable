import { describe, it, expect } from 'vitest';
import { diffVersions } from '../diff.js';

describe('diffVersions - Detección de diferencias entre versiones (T112, CA-22.3)', () => {
  const baseDefaults = {
    baseAccount: '6011101',
    taxAccount: '4011101',
    counterpartAccount: '4212101',
    appliesIgv: true,
    requiresCostCenter: false,
    defaultCostCenter: 'CC-ADMIN'
  };

  const v1 = {
    version: 1,
    defaults: baseDefaults,
    documentRules: [
      {
        ruleId: 'R-DOC-1',
        name: 'Regla Doc 1',
        priority: 1,
        when: { op: 'equals', field: 'currency', value: 'USD' },
        then: { counterpartAccount: '4212102' }
      }
    ],
    lineRules: [
      {
        ruleId: 'R-FLETE',
        name: 'Fletes Lima',
        priority: 1,
        when: { op: 'contains', field: 'line.description', value: 'FLETE' },
        then: { baseAccount: '6311101', costCenter: 'CC-LOGISTICA' }
      },
      {
        ruleId: 'R-SEGURO',
        name: 'Seguros',
        priority: 2,
        when: { op: 'contains', field: 'line.description', value: 'SEGURO' },
        then: {
          split: [
            { account: '6591101', basisPoints: 7000 },
            { account: '6591102', basisPoints: 3000 }
          ]
        }
      }
    ],
    testCases: [
      { caseId: 'TC-01', name: 'Caso Flete', expectedLines: [] }
    ]
  };

  it('devuelve lista vacía cuando no existen cambios entre versiones', () => {
    const diffs = diffVersions(v1, JSON.parse(JSON.stringify(v1)));
    expect(diffs).toEqual([]);
  });

  it('detecta cambios en las cuentas y configuración por defecto (defaults)', () => {
    const v2 = JSON.parse(JSON.stringify(v1));
    v2.defaults.baseAccount = '6591101';
    v2.defaults.requiresCostCenter = true;
    v2.defaults.defaultCostCenter = 'CC-GERENCIA';

    const diffs = diffVersions(v1, v2);
    expect(diffs.some(d => d.includes('baseAccount') || d.includes('Cuenta base'))).toBe(true);
    expect(diffs.some(d => d.includes('centro de costo') || d.includes('requiresCostCenter'))).toBe(true);
    expect(diffs.some(d => d.includes('CC-GERENCIA'))).toBe(true);
  });

  it('detecta cambio de cuenta o centro de costo en una regla existente', () => {
    const v2 = JSON.parse(JSON.stringify(v1));
    v2.lineRules[0].then.baseAccount = '6311109';
    v2.lineRules[0].then.costCenter = 'CC-TRANSPORTE';

    const diffs = diffVersions(v1, v2);
    expect(diffs.some(d => d.includes('R-FLETE') && (d.includes('6311109') || d.includes('cuenta')))).toBe(true);
    expect(diffs.some(d => d.includes('R-FLETE') && (d.includes('CC-TRANSPORTE') || d.includes('centro de costo')))).toBe(true);
  });

  it('detecta cambio de prorrateo (split) en una regla', () => {
    const v2 = JSON.parse(JSON.stringify(v1));
    v2.lineRules[1].then.split = [
      { account: '6591101', basisPoints: 5000 },
      { account: '6591102', basisPoints: 5000 }
    ];

    const diffs = diffVersions(v1, v2);
    expect(diffs.some(d => d.includes('R-SEGURO') && (d.includes('prorrateo') || d.includes('split')))).toBe(true);
  });

  it('detecta regla agregada y regla quitada', () => {
    const v2 = JSON.parse(JSON.stringify(v1));
    // Quitar R-SEGURO y agregar R-LUZ
    v2.lineRules = [
      v1.lineRules[0],
      {
        ruleId: 'R-LUZ',
        name: 'Servicio de Luz',
        priority: 2,
        when: { op: 'contains', field: 'line.description', value: 'LUZ' },
        then: { baseAccount: '6361101' }
      }
    ];

    const diffs = diffVersions(v1, v2);
    expect(diffs.some(d => d.includes('eliminó') && d.includes('R-SEGURO'))).toBe(true);
    expect(diffs.some(d => d.includes('agregó') && d.includes('R-LUZ'))).toBe(true);
  });

  it('detecta cambio en la prioridad de una regla', () => {
    const v2 = JSON.parse(JSON.stringify(v1));
    v2.lineRules[0].priority = 5;

    const diffs = diffVersions(v1, v2);
    expect(diffs.some(d => d.includes('R-FLETE') && d.includes('prioridad'))).toBe(true);
  });

  it('detecta casos de prueba agregados o eliminados', () => {
    const v2 = JSON.parse(JSON.stringify(v1));
    v2.testCases.push({
      caseId: 'TC-02',
      name: 'Caso Luz',
      expectedLines: []
    });

    const diffs = diffVersions(v1, v2);
    expect(diffs.some(d => d.includes('TC-02') && d.includes('caso de prueba'))).toBe(true);
  });
});

