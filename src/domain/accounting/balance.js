/**
 * Verificación pura de balance contable (RD-03).
 * Suma débitos y créditos en moneda funcional y verifica que sean estrictamente iguales y mayores a cero.
 * Agnóstico de cualquier jurisdicción.
 */

/**
 * @typedef {Object} BalanceResult
 * @property {boolean} ok - Indica si el asiento está perfectamente balanceado
 * @property {number} debitMinor - Total de débitos en unidades mínimas
 * @property {number} creditMinor - Total de créditos en unidades mínimas
 * @property {number} differenceMinor - Diferencia absoluta entre débitos y créditos
 */

/**
 * Verifica si un conjunto de líneas contables está balanceado.
 * @param {Array<{ side: 'DEBIT'|'CREDIT', functionalAmountMinor?: number, amountMinor?: number }>} lines
 * @returns {BalanceResult}
 */
export function checkBalance(lines) {
  if (!Array.isArray(lines) || lines.length === 0) {
    return {
      ok: false,
      debitMinor: 0,
      creditMinor: 0,
      differenceMinor: 0
    };
  }

  let debitMinor = 0;
  let creditMinor = 0;

  for (const line of lines) {
    const amount = Number(line.functionalAmountMinor ?? line.amountMinor ?? 0);
    if (line.side === 'DEBIT') {
      debitMinor += amount;
    } else if (line.side === 'CREDIT') {
      creditMinor += amount;
    }
  }

  const differenceMinor = Math.abs(debitMinor - creditMinor);
  const ok = lines.length > 0 && debitMinor > 0 && debitMinor === creditMinor;

  return {
    ok,
    debitMinor,
    creditMinor,
    differenceMinor
  };
}

