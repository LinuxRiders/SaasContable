/**
 * Determina la perspectiva contable (RECEIVED, ISSUED, INTERNAL) de un documento para el tenant.
 * Función pura, determinista y agnóstica por jurisdicción (RD-14, R-08, T083).
 *
 * @param {Object} document - Documento canónico
 * @param {Object} options
 * @param {import('./types.js').DocumentTypeDefinition} options.documentType - Definición del tipo de comprobante
 * @param {string} options.tenantFiscalId - Identificador fiscal del tenant actual
 * @returns {{ ok: boolean, perspective?: 'RECEIVED'|'ISSUED'|'INTERNAL', pending?: Array<{ reasonCode: string, message: string }> }}
 */
export function resolvePerspective(document, { documentType, tenantFiscalId } = {}) {
  const parties = document?.parties || [];
  const hasTenant = parties.some(p => p.fiscalId === tenantFiscalId);

  if (!hasTenant) {
    return {
      ok: false,
      pending: [{
        reasonCode: 'DOCUMENT_NOT_FOR_TENANT',
        message: `El identificador fiscal de la empresa ('${tenantFiscalId}') no figura como parte en el documento`
      }]
    };
  }

  // 1. Si el tipo de documento tiene perspectiva fija
  if (documentType?.fixedPerspective) {
    return {
      ok: true,
      perspective: documentType.fixedPerspective
    };
  }

  // 2. Si el tenant es el receptor / cliente / pagador
  const isReceiver = parties.some(p =>
    (p.role === 'RECEIVER' || p.role === 'BUYER' || p.role === 'CUSTOMER') &&
    p.fiscalId === tenantFiscalId
  );

  if (isReceiver) {
    return {
      ok: true,
      perspective: 'RECEIVED'
    };
  }

  // 3. Si el tenant es el emisor / vendedor / proveedor
  const isIssuer = parties.some(p =>
    (p.role === 'ISSUER' || p.role === 'SELLER' || p.role === 'SUPPLIER') &&
    p.fiscalId === tenantFiscalId
  );

  if (isIssuer) {
    return {
      ok: true,
      perspective: 'ISSUED'
    };
  }

  // 4. Si el documento ya declara INTERNAL
  if (document?.perspective === 'INTERNAL') {
    return {
      ok: true,
      perspective: 'INTERNAL'
    };
  }

  return {
    ok: false,
    pending: [{
      reasonCode: 'DOCUMENT_NOT_FOR_TENANT',
      message: `No se pudo determinar si la empresa '${tenantFiscalId}' es emisor o receptor del documento`
    }]
  };
}

