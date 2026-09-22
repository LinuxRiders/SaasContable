/**
 * @fileoverview Tabla semilla de tipos de cambio de venta USD -> PEN (R-12, RF-07)
 * Días hábiles de 2026-06-01 a 2026-09-30 con tasas en milésimas (ej. 3.750 = 3750).
 * Incluye 2026-09-14 = 3751 y 2026-09-15 = 3750.
 */

function generateMockFxRates() {
  const rates = [];
  const start = new Date('2026-06-01T12:00:00.000Z');
  const end = new Date('2026-09-30T12:00:00.000Z');

  let current = new Date(start);
  let baseRate = 3740; // 3.740

  while (current <= end) {
    const dayOfWeek = current.getUTCDay(); // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const dateStr = current.toISOString().slice(0, 10);
      let rateMilli;

      if (dateStr === '2026-09-14') {
        rateMilli = 3751;
      } else if (dateStr === '2026-09-15') {
        rateMilli = 3750;
      } else {
        // Generación pseudo-aleatoria estable
        const dayOffset = Math.floor((current - start) / (24 * 60 * 60 * 1000));
        const delta = Math.sin(dayOffset * 0.15) * 15 + ((dayOffset % 7) - 3);
        rateMilli = Math.round(baseRate + delta);
      }

      rates.push({
        date: dateStr,
        rateMilli
      });
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return rates;
}

export const mockTiposCambio = generateMockFxRates();

