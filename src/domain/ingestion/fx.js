/**
 * @fileoverview Lógica pura de tipo de cambio y conversión monetaria (R-02, R-12, RF-07)
 */

import { roundHalfUpDiv } from './money.js';

/**
 * Convierte un monto en céntimos aplicando la tasa en milésimas con redondeo half-up.
 * Fórmula: round(cents * rateMilli / 1000)
 *
 * @param {number} cents Monto en céntimos de la moneda original
 * @param {number} rateMilli Tasa de cambio en milésimas (ej. 3.751 = 3751)
 * @returns {number} Monto en céntimos PEN
 */
export function convert(cents, rateMilli) {
  if (typeof cents !== 'number' || typeof rateMilli !== 'number') {
    throw new Error('convert: cents and rateMilli must be numbers');
  }
  return roundHalfUpDiv(cents * rateMilli, 1000);
}

/**
 * Resuelve la tasa de cambio aplicable a una fecha según las reglas R-12:
 * 1. Servicio disponible y hay tasa exacta para la fecha -> esa tasa, provisional: false.
 * 2. Servicio disponible y no hay tasa exacta -> tasa más reciente anterior, provisional: true.
 * 3. Servicio caído -> tasa más reciente anterior a la fecha de emisión, provisional: true.
 * 4. No hay ninguna tasa anterior -> null.
 *
 * @param {Array<{date: string, rateMilli: number}>|Record<string, number>} rates Tabla de tasas
 * @param {string} date Fecha en formato YYYY-MM-DD
 * @param {boolean} [serviceDown=false] Indicador de servicio caído
 * @returns {{rateMilli: number, rateDate: string, provisional: boolean}|null}
 */
export function resolveRate(rates, date, serviceDown = false) {
  if (!rates || !date) return null;

  // Normalizar lista de tasas a array ordenado ascendentemente por fecha
  let rateList = [];
  if (Array.isArray(rates)) {
    rateList = [...rates];
  } else if (typeof rates === 'object') {
    rateList = Object.entries(rates).map(([d, r]) => ({
      date: d,
      rateMilli: typeof r === 'number' ? r : r.rateMilli
    }));
  }

  rateList.sort((a, b) => a.date.localeCompare(b.date));

  if (!serviceDown) {
    // 1. Tasa exacta del día
    const exact = rateList.find(r => r.date === date);
    if (exact) {
      return {
        rateMilli: exact.rateMilli,
        rateDate: date,
        provisional: false
      };
    }

    // 2. Tasa más reciente anterior
    const priorRates = rateList.filter(r => r.date < date);
    if (priorRates.length > 0) {
      const latestPrior = priorRates[priorRates.length - 1];
      return {
        rateMilli: latestPrior.rateMilli,
        rateDate: latestPrior.date,
        provisional: true
      };
    }

    // 4. Sin tasa previa
    return null;
  }

  // 3. Servicio caído: buscar estrictamente anterior a date
  const priorRates = rateList.filter(r => r.date < date);
  if (priorRates.length > 0) {
    const latestPrior = priorRates[priorRates.length - 1];
    return {
      rateMilli: latestPrior.rateMilli,
      rateDate: latestPrior.date,
      provisional: true
    };
  }

  // 4. Sin tasa previa
  return null;
}

