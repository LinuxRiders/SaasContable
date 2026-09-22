import { describe, it, expect } from 'vitest';
import { resolveRate, convert } from '../fx.js';
import { mockTiposCambio } from '../../../data/mockTiposCambio.js';
import { evaluateTemplate } from '../../templates/evaluator.js';
import { buildAccountIndex } from '../accounts.js';
import { mockPlanContable } from '../../../data/mockPlanContable.js';

describe('FX Domain Module (T086, R-02, R-12, RF-07)', () => {
  const sampleRates = [
    { date: '2026-09-11', rateMilli: 3748 }, // Viernes
    { date: '2026-09-14', rateMilli: 3751 }, // Lunes
    { date: '2026-09-15', rateMilli: 3750 }  // Martes
  ];

  it('resolves exact rate on business day when service is up (R-12.1)', () => {
    const rate = resolveRate(sampleRates, '2026-09-15', false);
    expect(rate).toEqual({
      rateMilli: 3750,
      rateDate: '2026-09-15',
      provisional: false
    });
  });

  it('resolves previous rate as provisional on weekend when service is up (R-12.2)', () => {
    // 2026-09-13 es Domingo
    const rate = resolveRate(sampleRates, '2026-09-13', false);
    expect(rate).toEqual({
      rateMilli: 3748,
      rateDate: '2026-09-11',
      provisional: true
    });
  });

  it('resolves previous rate as provisional when service is down even if exact rate exists (R-12.3)', () => {
    // En 2026-09-15 con servicio caído, toma la tasa anterior (2026-09-14)
    const rate = resolveRate(sampleRates, '2026-09-15', true);
    expect(rate).toEqual({
      rateMilli: 3751,
      rateDate: '2026-09-14',
      provisional: true
    });
  });

  it('returns null when no prior rate exists (R-12.4)', () => {
    // Fecha anterior a la primera tasa registrada
    const rate = resolveRate(sampleRates, '2026-05-01', false);
    expect(rate).toBeNull();

    // Fecha del primer registro con servicio caído -> no hay tasa anterior
    const rateFirstDown = resolveRate(sampleRates, '2026-09-11', true);
    expect(rateFirstDown).toBeNull();
  });

  it('matches plan §3 exact calculation: USD 1,000.00 with rate 3.751', () => {
    const rateMilli = 3751;
    const totalOriginalCents = 100000; // USD 1,000.00
    const igvOriginalCents = 15254;    // USD 152.54

    const totalPEN = convert(totalOriginalCents, rateMilli);
    const igvPEN = convert(igvOriginalCents, rateMilli);
    const basePEN = totalPEN - igvPEN;

    expect(totalPEN).toBe(375100);
    expect(igvPEN).toBe(57218);
    expect(basePEN).toBe(317882);

    // Verificación de cuadre contable
    // Debe: basePEN (317882) + igvPEN (57218) + destino (317882) = 692982
    // Haber: totalPEN (375100) + contra-destino (317882) = 692982
    const totalDebe = basePEN + igvPEN + basePEN;
    const totalHaber = totalPEN + basePEN;
    expect(totalDebe).toBe(totalHaber);
  });

  it('property test: Debit == Credit on 1,000 pseudo-random USD invoices including split templates', () => {
    const catalog = buildAccountIndex(mockPlanContable);

    // Plantilla con prorrateo (split) 60/40
    const splitVersion = {
      versionNumber: 1,
      status: 'ACTIVE',
      defaults: {
        baseAccount: '6011101',
        taxAccount: '4011101',
        counterpartAccount: '4212101',
        costCenter: 'CC-ADMIN'
      },
      documentRules: [],
      lineRules: [
        {
          id: 'RULE-SPLIT',
          name: 'Prorrateo 60/40',
          priority: 10,
          when: {
            field: 'line.amountCents',
            op: 'gte',
            value: 1
          },
          action: {
            split: [
              { percentBp: 6000, accountCode: '6011101', costCenter: 'CC-ADMIN' },
              { percentBp: 4000, accountCode: '6591101', costCenter: 'CC-LOGISTICA' }
            ]
          }
        }
      ]
    };

    // LCG pseudo-aleatorio con semilla fija
    let seed = 42;
    function random() {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    }

    for (let i = 0; i < 1000; i++) {
      // Monto total entre USD 10.00 y USD 50,000.00
      const totalUSD = Math.floor(random() * 4999000) + 1000;
      // Tasa entre 3.500 y 4.200
      const rateMilli = Math.floor(random() * 700) + 3500;

      // Base e IGV en USD aproximados
      const baseUSD = Math.round(totalUSD / 1.18);
      const igvUSD = totalUSD - baseUSD;

      // Conversión R-02
      const totalPEN = convert(totalUSD, rateMilli);
      const igvPEN = convert(igvUSD, rateMilli);
      const basePEN = totalPEN - igvPEN;

      const doc = {
        operationType: 'COMPRA',
        currency: 'USD',
        totals: {
          totalAmount: totalUSD,
          taxAmount: igvUSD,
          taxableAmount: baseUSD
        },
        lines: [
          { lineNo: 1, description: 'Servicio general', amountCents: baseUSD, taxCode: 'IGV' }
        ]
      };

      const result = evaluateTemplate({
        version: splitVersion,
        document: doc,
        functionalAmounts: {
          baseCents: basePEN,
          igvCents: igvPEN,
          totalCents: totalPEN,
          lineBaseCents: [basePEN]
        },
        accountIndex: catalog
      });

      const sumDebits = result.lines
        .filter(l => l.side === 'D')
        .reduce((sum, l) => sum + l.functionalAmountCents, 0);

      const sumCredits = result.lines
        .filter(l => l.side === 'H')
        .reduce((sum, l) => sum + l.functionalAmountCents, 0);

      expect(sumDebits).toBe(sumCredits);
    }
  });
});
