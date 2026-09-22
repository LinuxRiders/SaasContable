/**
 * @fileoverview Funciones de deduplicación de comprobantes (RF-03, RD-04, R-04)
 */

/**
 * Normaliza la serie y número de un comprobante (ej. F1-123 -> F001-00000123)
 * @param {string} serieNumero
 * @returns {string}
 */
export function normalizeSerieNumero(serieNumero) {
  if (!serieNumero) return '';
  const cleaned = String(serieNumero).replace(/\s+/g, '').toUpperCase();
  const parts = cleaned.split('-');
  if (parts.length !== 2) return cleaned;
  
  let [serie, num] = parts;
  const match = serie.match(/^([A-Z])(\d+)$/);
  if (match) {
    serie = match[1] + match[2].padStart(3, '0');
  } else if (serie.length < 4) {
    serie = serie.padStart(4, '0');
  }

  num = num.padStart(8, '0');
  return `${serie}-${num}`;
}

/**
 * Construye la clave de idempotencia normalizada: tenantId|rucEmisor|tipoDoc|serieNumero|fechaEmision
 * @param {string} tenantId
 * @param {Object} doc - Documento canónico o comprobante interpretado
 * @returns {string}
 */
export function buildDedupKey(tenantId, doc) {
  const tId = String(tenantId || '').trim().toUpperCase();
  const ruc = String(doc?.issuer?.ruc || doc?.issuer?.fiscalId || doc?.rucEmisor || '').trim().toUpperCase();
  const type = String(doc?.type || doc?.tipoDocumento || '01').trim().toUpperCase();
  const rawNum = doc?.seriesAndNumber || doc?.documentNumber || doc?.serieNumero || '';
  const num = normalizeSerieNumero(rawNum);
  const date = String(doc?.issueDate || doc?.fechaEmision || '').trim().toUpperCase();

  return `${tId}|${ruc}|${type}|${num}|${date}`;
}

/**
 * Calcula el hash SHA-256 de la clave de deduplicación en formato hexadecimal
 * @param {string} key
 * @param {Function} [sha256] - Función inyectada para calcular SHA-256
 * @returns {Promise<string>}
 */
export async function dedupHash(key, sha256) {
  if (typeof sha256 === 'function') {
    return await sha256(key);
  }

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const msgUint8 = new TextEncoder().encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  throw new Error('No SHA-256 implementation available');
}

