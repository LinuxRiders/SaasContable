import { describe, it, expect } from 'vitest';
import { resolveRate, convert } from '../fx.js';
import { mockTiposCambio } from '../../../data/mockTiposCambio.js';

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
});
