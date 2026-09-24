/**
 * ISO 4217 minor units table.
 * No jurisdictional rules: international standard.
 */
export const MINOR_UNITS = Object.freeze({
  PEN: 2,
  USD: 2,
  EUR: 2,
  COP: 2,
  MXN: 2,
  CLP: 0,
  JPY: 0
});

/**
 * Returns the number of minor units (decimal places) for a given currency code.
 * @param {string} currency - ISO 4217 currency code (e.g. 'PEN', 'USD')
 * @returns {number} Decimal places
 * @throws {Error} With code 'UNKNOWN_CURRENCY' if not supported
 */
export function minorUnitsOf(currency) {
  if (typeof currency !== 'string' || !(currency.toUpperCase() in MINOR_UNITS)) {
    const err = new Error(`Moneda desconocida o no soportada: ${currency}`);
    err.code = 'UNKNOWN_CURRENCY';
    throw err;
  }
  return MINOR_UNITS[currency.toUpperCase()];
}

