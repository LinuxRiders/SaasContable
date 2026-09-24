import { describe, it, expect } from 'vitest';
import { pePack } from '../index.js';
import { peBaseTemplates } from '../pe/templates.js';
import { mockPlanContable } from '../../../data/mockPlanContable.js';
import { mockMapasConfig } from '../../../data/mockMapasCuentas.js';
import { preloadMapping } from '../../../domain/accounting/accountMapping.js';
import { runTests } from '../../../domain/accounting/testRunner.js';
import { evaluateTemplate } from '../../../domain/accounting/templateEvaluation.js';
import { checkBalance } from '../../../domain/accounting/balance.js';

describe('peTemplates: 3 plantillas base (SC-001)', () => {
  // Plan contable ampliado con activo: true
  const chart = mockPlanContable.map(acc => ({
    ...acc,
    activo: acc.activo !== undefined ? acc.activo : true
  }));

  // Mapa de cuentas de la empresa 01 (completo)
  const cfg01 = mockMapasConfig['01'];
  const { entries: tenantEntries } = preloadMapping(pePack, chart, cfg01.explicitMappings || []);
  const tenantMapping = { entries: tenantEntries };

  it('las 3 plantillas base pasan todos sus casos de prueba con el plan y mapa de la empresa 01', () => {
    expect(peBaseTemplates).toHaveLength(3);

    for (const template of peBaseTemplates) {
      const run = runTests(template, {
        pack: pePack,
        tenantMapping,
        chart,
        functionalCurrency: 'PEN'
      });

      if (!run.ok) {
        console.error(`Fallo en plantilla ${template.code}:`, JSON.stringify(run.results, null, 2));
      }

      expect(run.ok, `Plantilla ${template.code} debería pasar todos sus testCases`).toBe(true);
      for (const res of run.results) {
        expect(res.status).toBe('PASS');
        expect(res.differences).toHaveLength(0);
      }
    }
  });

  it('cada asiento positivo generado por las 3 plantillas cuadra con los totales de SDD §21.4', () => {
    const expectedTotals = {
      'PE.RECEIVED.INVOICE.MERCHANDISE_PURCHASE': 218000,
      'PE.INTERNAL.PAYROLL_SUMMARY.PAYROLL': 2180000,
      'PE.ISSUED.INVOICE.MERCHANDISE_SALE': 236000
    };

    for (const template of peBaseTemplates) {
      const positiveCase = template.testCases.find(tc => tc.expectedLines && tc.expectedLines.length > 0);
      expect(positiveCase, `Plantilla ${template.code} debe tener al menos un caso positivo`).toBeDefined();

      const evalResult = evaluateTemplate(template, positiveCase.input, {
        pack: pePack,
        mapping: tenantMapping,
        chart,
        functionalCurrency: 'PEN'
      });

      expect(evalResult.ok, `Evaluación de ${template.code} debe ser exitosa`).toBe(true);

      const bal = checkBalance(evalResult.lines);
      expect(bal.ok, `El asiento de ${template.code} debe estar balanceado`).toBe(true);
      expect(bal.debitMinor).toBe(bal.creditMinor);

      const expectedTotal = expectedTotals[template.code];
      expect(bal.debitMinor, `Total de ${template.code} debe coincidir con SDD §21.4`).toBe(expectedTotal);
    }
  });
});

