import { validateFiscalId } from '../../shared/fiscalId.js';

/**
 * Construcción y sellado de documentos canónicos a partir de borradores de lectores.
 * Conforme a contracts/domain-api.md §4 y data-model.md §3.
 */

/**
 * Convierte un borrador de lector en un CanonicalDocument completo con identidad y trazabilidad.
 * @param {import('./types.js').CanonicalDraft} draft
 * @param {Object} context
 * @param {import('./types.js').RawPayload} context.rawPayload
 * @param {number|null} [context.rowNumber]
 * @param {string} context.tenantId
 * @param {string} context.jurisdictionCode
 * @param {number} [context.documentTypeVersion=1]
 * @param {() => string} context.idGenerator
 * @returns {Object} CanonicalDocument
 */
export function buildCanonical(draft, {
  rawPayload,
  rowNumber = null,
  tenantId,
  jurisdictionCode,
  documentTypeVersion = 1,
  idGenerator = () => crypto.randomUUID()
}) {
  const canonicalId = idGenerator();
  const rawPayloadRef = rowNumber ? `${rawPayload.id}#row=${rowNumber}` : rawPayload.id;

  return {
    id: canonicalId,
    tenantId,
    jurisdictionCode,
    rawPayloadRef,
    revision: 1,
    documentTypeCode: draft.documentTypeCode,
    documentTypeVersion: documentTypeVersion || draft.documentTypeVersion || 1,
    perspective: draft.perspective || null,
    operationTypeCode: draft.operationTypeCode || null,
    series: draft.series || '',
    number: draft.number || '',
    issueDate: draft.issueDate,
    dueDate: draft.dueDate || null,
    currency: draft.currency,
    parties: Array.isArray(draft.parties) ? draft.parties.map(p => ({ ...p })) : [],
    fields: { ...(draft.fields || {}) },
    lines: Array.isArray(draft.lines) ? draft.lines.map(l => ({ ...l })) : [],
    taxes: Array.isArray(draft.taxes) ? draft.taxes.map(t => ({ ...t })) : [],
    withholdings: Array.isArray(draft.withholdings) ? draft.withholdings.map(w => ({ ...w })) : [],
    references: Array.isArray(draft.references) ? draft.references.map(r => ({ ...r })) : [],
    totals: { ...(draft.totals || {}) },
    extraction: {
      sourceFormat: draft.extraction?.sourceFormat || 'UNKNOWN',
      extractorId: draft.extraction?.extractorId || 'unknown',
      documentTypeConfidence: draft.extraction?.documentTypeConfidence ?? 1.0,
      fieldProvenance: Array.isArray(draft.extraction?.fieldProvenance)
        ? draft.extraction.fieldProvenance.map(fp => ({ ...fp }))
        : [],
      notFound: draft.extraction?.notFound ? [...draft.extraction.notFound] : [],
      attachments: draft.extraction?.attachments ? [...draft.extraction.attachments] : []
    },
    deduplicationHash: draft.deduplicationHash || null,
    receivedAt: rawPayload.receivedAt,
    traceId: rawPayload.traceId
  };
}

/**
 * Valida cada parte del documento contra los tipos de identificador fiscal del paquete.
 * Las partes inválidas bajan a confianza 0 en fieldProvenance y generan una advertencia INVALID_FISCAL_ID.
 * @param {Object} canonical - Documento canónico
 * @param {Object} context
 * @param {Object} context.pack - Paquete de jurisdicción con fiscalIdTypes
 * @returns {{ canonical: Object, warnings: Array<{ code: string, detail: Object }> }}
 */
export function annotateFiscalIds(canonical, { pack }) {
  const warnings = [];
  const updatedCanonical = {
    ...canonical,
    extraction: {
      ...canonical.extraction,
      fieldProvenance: Array.isArray(canonical.extraction?.fieldProvenance)
        ? canonical.extraction.fieldProvenance.map(fp => ({ ...fp }))
        : []
    }
  };

  const fiscalIdTypes = pack?.fiscalIdTypes || [];

  for (const party of canonical.parties || []) {
    const def = fiscalIdTypes.find(t => t.code === party.fiscalIdType) || {};
    const valRes = validateFiscalId(party.fiscalId, def);

    if (!valRes.ok) {
      warnings.push({
        code: 'INVALID_FISCAL_ID',
        detail: {
          role: party.role,
          fiscalId: party.fiscalId,
          fiscalIdType: party.fiscalIdType,
          reason: valRes.reason
        }
      });

      // Actualizar o agregar procedencia con confianza 0
      const path = `parties[${party.role}].fiscalId`;
      const provIndex = updatedCanonical.extraction.fieldProvenance.findIndex(p => p.path === path);
      if (provIndex >= 0) {
        updatedCanonical.extraction.fieldProvenance[provIndex].confidence = 0;
      } else {
        updatedCanonical.extraction.fieldProvenance.push({
          path,
          confidence: 0,
          value: party.fiscalId
        });
      }
    }
  }

  return { canonical: updatedCanonical, warnings };
}
