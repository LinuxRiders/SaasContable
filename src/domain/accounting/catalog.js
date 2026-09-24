/**
 * Funciones puras de consulta al catálogo del paquete de jurisdicción.
 * Conforme a contracts/domain-api.md §1.
 */

/**
 * Obtiene la definición de un tipo de documento vigente a una fecha.
 * @param {import('./types.js').JurisdictionPack} pack - Paquete de jurisdicción
 * @param {string} code - Código del tipo de documento (ej. 'INVOICE')
 * @param {string} [date] - Fecha YYYY-MM-DD
 * @returns {import('./types.js').DocumentTypeDefinition|null}
 */
export function getDocumentType(pack, code, date) {
  if (!pack || !pack.documentTypes || !code) return null;
  const doc = pack.documentTypes.find(d => d.code === code);
  if (!doc) return null;

  if (date) {
    if (doc.effectiveFrom && doc.effectiveFrom > date) return null;
    if (doc.effectiveTo && doc.effectiveTo < date) return null;
  }

  return doc;
}

/**
 * Obtiene la tasa de un impuesto vigente a una fecha.
 * @param {import('./types.js').JurisdictionPack} pack - Paquete de jurisdicción
 * @param {string} taxCode - Código de impuesto (ej. 'VAT')
 * @param {string} date - Fecha YYYY-MM-DD
 * @returns {{ rateBp: number, effectiveFrom: string, effectiveTo: string|null }|null}
 */
export function getTaxRate(pack, taxCode, date) {
  if (!pack || !pack.taxes || !taxCode) return null;
  const tax = pack.taxes.find(t => t.code === taxCode);
  if (!tax || !tax.rates) return null;

  const rate = tax.rates.find(r => {
    if (r.effectiveFrom && r.effectiveFrom > date) return false;
    if (r.effectiveTo && r.effectiveTo < date) return false;
    return true;
  });

  if (!rate) return null;
  return {
    rateBp: rate.rateBp,
    effectiveFrom: rate.effectiveFrom,
    effectiveTo: rate.effectiveTo ?? null
  };
}

/**
 * Obtiene los códigos de tipos de operación admitidos para un tipo de documento y perspectiva.
 * @param {import('./types.js').JurisdictionPack} pack - Paquete de jurisdicción
 * @param {import('./types.js').DocumentTypeDefinition} documentType - Tipo de documento
 * @param {'RECEIVED'|'ISSUED'|'INTERNAL'} perspective - Perspectiva
 * @returns {string[]} Códigos de tipos de operación
 */
export function getOperationTypes(pack, documentType, perspective) {
  if (documentType?.operationTypesByPerspective && documentType.operationTypesByPerspective[perspective]) {
    return documentType.operationTypesByPerspective[perspective];
  }

  if (pack?.operationTypes && perspective) {
    return pack.operationTypes
      .filter(op => op.allowedPerspectives?.includes(perspective))
      .map(op => op.code);
  }

  return [];
}

/**
 * Obtiene la definición de un rol de cuenta por su código.
 * @param {import('./types.js').JurisdictionPack} pack - Paquete de jurisdicción
 * @param {string} roleCode - Código del rol (ej. 'SUPPLIERS_PAYABLE')
 * @returns {import('./types.js').AccountRole|null}
 */
export function getAccountRole(pack, roleCode) {
  if (!pack || !pack.accountRoles || !roleCode) return null;
  return pack.accountRoles.find(r => r.code === roleCode) || null;
}

