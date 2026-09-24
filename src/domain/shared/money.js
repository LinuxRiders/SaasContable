/**
 * Utilidad compartida de manejo de importes decimales a unidades mínimas enteras.
 * Conforme a contracts/domain-api.md §1 y research R-05.
 * Agnóstico y determinista sin operaciones de punto flotante.
 */

/**
 * Convierte una cadena de importe decimal a un entero en unidades mínimas de la moneda.
 * @param {string|number} text - Cadena o número decimal (ej. "1180.00", "5", 5)
 * @param {number} minorUnits - Número de decimales de la moneda (ej. 2 para PEN/USD, 0 para CLP/JPY)
 * @returns {number} Entero en unidades mínimas
 * @throws {Error} Con `code: 'INVALID_AMOUNT'` ante formato no numérico, negativos o exceso de decimales
 */
export function parseDecimalToMinor(text, minorUnits = 2) {
  if (text === null || text === undefined) {
    const err = new Error('El importe no puede ser nulo o indefinido');
    err.code = 'INVALID_AMOUNT';
    throw err;
  }

  const str = String(text).trim();
  if (str === '' || !/^\d+(\.\d+)?$/.test(str)) {
    const err = new Error(`Importe inválido: '${text}'`);
    err.code = 'INVALID_AMOUNT';
    throw err;
  }

  const [intPart, decPart = ''] = str.split('.');
  if (decPart.length > minorUnits) {
    const err = new Error(`El importe '${text}' tiene más decimales (${decPart.length}) que las unidades mínimas (${minorUnits})`);
    err.code = 'INVALID_AMOUNT';
    throw err;
  }

  const paddedDec = decPart.padEnd(minorUnits, '0');
  const combined = minorUnits > 0 ? `${intPart}${paddedDec}` : intPart;
  return Number(combined);
}

