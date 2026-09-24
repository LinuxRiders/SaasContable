/**
 * Validación agnóstica de identificadores fiscales basada en definición del paquete.
 * Conforme a contracts/domain-api.md §1 y data-model.md §7.
 */

/**
 * Valida un identificador fiscal contra la definición provista por el paquete de jurisdicción.
 * @param {string} value - Valor del identificador fiscal (ej. "20450656934")
 * @param {{ pattern?: string, checkDigit?: { algorithm: string, weights: number[], map?: Record<string, number> } }} def - Definición del tipo de identificador fiscal
 * @returns {{ ok: boolean, reason?: string }}
 */
export function validateFiscalId(value, def = {}) {
  if (value === null || value === undefined || typeof value !== 'string') {
    return { ok: false, reason: 'INVALID_FORMAT' };
  }

  const trimmed = value.trim();
  if (trimmed === '') {
    return { ok: false, reason: 'EMPTY_VALUE' };
  }

  // 1. Validar patrón Regex si está definido
  if (def.pattern) {
    const reg = new RegExp(def.pattern);
    if (!reg.test(trimmed)) {
      return { ok: false, reason: 'PATTERN_MISMATCH' };
    }
  }

  // 2. Validar dígito verificador si está definido
  if (def.checkDigit) {
    const { algorithm, weights, map } = def.checkDigit;

    if (algorithm === 'MOD11' && Array.isArray(weights)) {
      if (trimmed.length !== weights.length + 1) {
        return { ok: false, reason: 'LENGTH_MISMATCH' };
      }

      let sum = 0;
      for (let i = 0; i < weights.length; i++) {
        const digit = Number(trimmed[i]);
        if (Number.isNaN(digit)) {
          return { ok: false, reason: 'NON_NUMERIC_DIGIT' };
        }
        sum += digit * weights[i];
      }

      const remainder = 11 - (sum % 11);
      const expectedDigit = map && map[remainder] !== undefined ? map[remainder] : remainder;
      const actualDigit = Number(trimmed[weights.length]);

      if (actualDigit !== expectedDigit) {
        return { ok: false, reason: 'CHECK_DIGIT_MISMATCH' };
      }
    }
  }

  return { ok: true };
}

