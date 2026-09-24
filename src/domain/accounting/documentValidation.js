import { getTaxRate } from './catalog.js';
import { roundHalfUpDiv } from '../ingestion/money.js';
import { evaluateExpression } from './expressions/evaluate.js';

/**
 * Valida que un documento canónico cumpla con el esquema normativo de su tipo.
 * Función pura, determinista y agnóstica por jurisdicción (RD-14, RD-15, SDD §20.5).
 *
 * @param {Object} document - Documento canónico
 * @param {Object} options
 * @param {import('./types.js').JurisdictionPack} options.pack - Paquete de jurisdicción
 * @returns {{ ok: boolean, pending?: Array<{ reasonCode: string, message: string, details?: Object }> }}
 */
export function validateDocument(document, { pack } = {}) {
  if (!document) {
    return {
      ok: false,
      pending: [{ reasonCode: 'SCHEMA_INVALID', message: 'Documento canónico no proporcionado' }]
    };
  }

  const docTypeCode = document.documentTypeCode;
  const docType = pack?.documentTypes?.find(d => d.code === docTypeCode);

  if (!docType) {
    return {
      ok: false,
      pending: [{ reasonCode: 'SCHEMA_INVALID', message: `Tipo de documento '${docTypeCode}' desconocido en el paquete normativo` }]
    };
  }

  // 1. Verificar si el tipo genera asiento contable
  if (docType.generatesEntry === false) {
    return {
      ok: false,
      pending: [{
        reasonCode: 'DOCUMENT_TYPE_NOT_ACCOUNTABLE',
        message: `El tipo de documento '${docType.code}' no genera asiento contable`
      }]
    };
  }

  // 2. Verificar vigencia del tipo de documento a la fecha de emisión
  const issueDate = document.issueDate;
  if (issueDate) {
    if (docType.effectiveFrom && issueDate < docType.effectiveFrom) {
      return {
        ok: false,
        pending: [{
          reasonCode: 'CATALOG_NOT_EFFECTIVE',
          message: `El tipo de comprobante '${docType.code}' no está vigente a la fecha ${issueDate} (inicia ${docType.effectiveFrom})`
        }]
      };
    }
    if (docType.effectiveTo && issueDate > docType.effectiveTo) {
      return {
        ok: false,
        pending: [{
          reasonCode: 'CATALOG_NOT_EFFECTIVE',
          message: `El tipo de comprobante '${docType.code}' ya no está vigente a la fecha ${issueDate} (venció ${docType.effectiveTo})`
        }]
      };
    }
  }

  const errors = [];
  const tolerance = docType.coherenceToleranceMinor ?? 1;

  // 3. Partes obligatorias
  const docParties = document.parties || [];
  for (const role of (docType.requiredPartyRoles || [])) {
    const hasParty = docParties.some(p => p.role === role);
    if (!hasParty) {
      errors.push({
        field: 'parties',
        message: `Parte requerida con rol '${role}' no fue encontrada en el documento`
      });
    }
  }

  // 4. Referencias obligatorias
  if (docType.reference?.required) {
    if (!document.references || document.references.length === 0) {
      errors.push({
        field: 'references',
        message: 'El documento exige al menos una referencia al comprobante de origen'
      });
    }
  }

  // 5. Impuestos admitidos y coherencia de tasa vigente
  const docTaxes = document.taxes || [];
  for (const t of docTaxes) {
    if (docType.allowedTaxCodes && !docType.allowedTaxCodes.includes(t.taxCode)) {
      errors.push({
        field: 'taxes',
        message: `Impuesto '${t.taxCode}' no admitido para el tipo de documento '${docType.code}'`
      });
      continue;
    }

    if (issueDate) {
      const rateInfo = getTaxRate(pack, t.taxCode, issueDate);
      if (!rateInfo) {
        errors.push({
          field: 'taxes',
          message: `No existe tasa vigente para el impuesto '${t.taxCode}' a la fecha ${issueDate}`
        });
      } else {
        const expectedTaxAmount = roundHalfUpDiv((t.baseMinor || 0) * rateInfo.rateBp, 10000);
        if (Math.abs((t.amountMinor || 0) - expectedTaxAmount) > tolerance) {
          errors.push({
            field: 'taxes',
            message: `El importe del impuesto '${t.taxCode}' (${t.amountMinor}) no coincide con la tasa vigente del ${rateInfo.rateBp / 100}% (esperado ${expectedTaxAmount})`
          });
        }
      }
    }
  }

  // 6. Campos de cabecera obligatorios y tipos
  for (const hf of (docType.headerFields || [])) {
    const val = document.fields?.[hf.key] !== undefined ? document.fields[hf.key] : document[hf.key];
    if (hf.required && (val === undefined || val === null || val === '')) {
      errors.push({
        field: `fields.${hf.key}`,
        message: `El campo de cabecera '${hf.key}' (${hf.label}) es obligatorio`
      });
    }
  }

  // 7. Líneas obligatorias y campos de línea
  const docLines = document.lines || [];
  if (docType.linesRequired && docLines.length === 0) {
    errors.push({
      field: 'lines',
      message: 'El documento requiere al menos una línea de detalle'
    });
  }

  for (let idx = 0; idx < docLines.length; idx++) {
    const l = docLines[idx];
    const lNo = l.lineNo ?? (idx + 1);

    for (const lf of (docType.lineFields || [])) {
      const val = l[lf.key] !== undefined
        ? l[lf.key]
        : (lf.key === 'amountMinor' && l.netMinor !== undefined ? l.netMinor : l.fields?.[lf.key]);
      if (lf.required && (val === undefined || val === null || val === '')) {
        errors.push({
          field: `lines[${lNo}].${lf.key}`,
          message: `El campo de línea '${lf.key}' en línea ${lNo} es obligatorio`
        });
      }

      if (val !== undefined && val !== null) {
        if (lf.type === 'MONEY' || lf.type === 'QUANTITY') {
          if (typeof val !== 'number' || isNaN(val)) {
            errors.push({
              field: `lines[${lNo}].${lf.key}`,
              message: `El campo '${lf.key}' en línea ${lNo} debe ser un valor numérico`
            });
          }
        }
      }
    }
  }

  // 8. Reglas de coherencia aritmética en totales
  if (document.totals) {
    const net = document.totals.netMinor;
    const tax = document.totals.taxMinor;
    const total = document.totals.totalMinor;

    if (net !== undefined && tax !== undefined && total !== undefined) {
      if (Math.abs((net + tax) - total) > tolerance) {
        errors.push({
          field: 'totals',
          message: `Incoherencia en totales: neto (${net}) + impuesto (${tax}) ≠ total (${total})`
        });
      }
    }
  }

  // 9. Reglas de coherencia declaradas en el tipo de comprobante
  for (const cr of (docType.coherenceRules || [])) {
    if (cr.check) {
      try {
        const pass = evaluateExpression(cr.check, { document, pack, issueDate });
        if (!pass) {
          // Evitar duplicar si ya se reportó falta de referencia
          if (cr.id === 'CN_REF_REQ' && (!document.references || document.references.length === 0)) {
            continue;
          }
          errors.push({
            ruleId: cr.id,
            message: cr.description
          });
        }
      } catch (err) {
        errors.push({
          ruleId: cr.id,
          message: `Error al evaluar regla de coherencia '${cr.id}': ${err.message}`
        });
      }
    }
  }

  if (errors.length > 0) {
    return {
      ok: false,
      pending: [{
        reasonCode: 'SCHEMA_INVALID',
        message: `El documento no cumple con el esquema '${docType.code}': ${errors[0].message}`,
        details: { errors }
      }]
    };
  }

  return { ok: true };
}
