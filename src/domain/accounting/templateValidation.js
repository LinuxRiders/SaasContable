import { validateExpression } from './expressions/validate.js';

/**
 * Valida estáticamente una versión de plantilla contable contra su paquete de jurisdicción y esquema.
 * Conforme a contracts/domain-api.md §6 y contracts/expression-language.md §4.
 *
 * @param {import('./types.js').TemplateVersion|Object} version - Versión de plantilla
 * @param {{ pack: import('./types.js').JurisdictionPack, scope?: 'PACK'|'TENANT' }} options
 * @returns {{ ok: boolean, errors: Array<{ path: string, code: string, message: string }>, warnings: Array<{ path: string, code: string, message: string }> }}
 */
export function validateTemplateVersion(version, { pack, scope = 'TENANT' }) {
  const errors = [];
  const warnings = [];

  if (!version) {
    return {
      ok: false,
      errors: [{ path: 'root', code: 'INVALID_VERSION', message: 'La versión de plantilla es nula o indefinida' }],
      warnings: []
    };
  }

  // 1. Validar tipo de documento
  const docType = (pack?.documentTypes || []).find(d => d.code === version.documentTypeCode);
  if (!docType) {
    errors.push({
      path: 'documentTypeCode',
      code: 'DOCUMENT_TYPE_NOT_FOUND',
      message: `Tipo de documento '${version.documentTypeCode}' no existe en el paquete de jurisdicción`
    });
  } else {
    if (docType.generatesEntry === false) {
      errors.push({
        path: 'documentTypeCode',
        code: 'DOCUMENT_TYPE_NOT_ACCOUNTABLE',
        message: `El tipo de documento '${docType.code}' no genera asiento contable (solo referencia)`
      });
    }

    // 2. Validar perspectiva
    if (version.perspective) {
      if (!docType.allowedPerspectives?.includes(version.perspective)) {
        errors.push({
          path: 'perspective',
          code: 'PERSPECTIVE_NOT_ALLOWED',
          message: `La perspectiva '${version.perspective}' no está admitida para el tipo '${docType.code}'`
        });
      }
    }

    // 3. Validar tipo de operación
    if (version.operationTypeCode) {
      const op = (pack?.operationTypes || []).find(o => o.code === version.operationTypeCode);
      if (!op) {
        errors.push({
          path: 'operationTypeCode',
          code: 'OPERATION_TYPE_NOT_FOUND',
          message: `Tipo de operación '${version.operationTypeCode}' desconocido en el paquete`
        });
      } else if (version.perspective && !op.allowedPerspectives?.includes(version.perspective)) {
        errors.push({
          path: 'perspective',
          code: 'PERSPECTIVE_NOT_ALLOWED',
          message: `El tipo de operación '${version.operationTypeCode}' no admite la perspectiva '${version.perspective}'`
        });
      }
    }
  }

  // 4. Validar libro legal
  if (version.legalBookCode) {
    const book = (pack?.legalBooks || []).find(b => b.code === version.legalBookCode);
    if (!book) {
      errors.push({
        path: 'legalBookCode',
        code: 'LEGAL_BOOK_NOT_FOUND',
        message: `Libro contable '${version.legalBookCode}' no existe en el paquete de jurisdicción`
      });
    }
  }

  // 5. Validar aplicabilidad (expresión de cabecera)
  if (version.applicability) {
    const valApp = validateExpression(version.applicability, {
      expectedType: 'BOOL',
      documentType: docType,
      lineContext: false
    });
    if (!valApp.ok) {
      for (const err of valApp.errors) {
        errors.push({
          path: `applicability${err.path ? `.${err.path}` : ''}`,
          code: 'EXPRESSION_INVALID',
          message: err.reason
        });
      }
    }
  }

  // 6. Validar líneas
  const lines = version.lines || [];
  if (lines.length < 2) {
    errors.push({
      path: 'lines',
      code: 'INSUFFICIENT_LINES',
      message: 'Una plantilla contable debe contener al menos 2 líneas'
    });
  }

  let debitCount = 0;
  let creditCount = 0;
  let balancingCount = 0;

  lines.forEach((line, index) => {
    const linePath = `lines[${index}]`;

    if (line.side === 'DEBIT') debitCount++;
    else if (line.side === 'CREDIT') creditCount++;

    if (line.balancingLine) balancingCount++;

    const lineCtx = !!line.forEachDocumentLine;

    // Expresión de importe (debe ser MONEY)
    if (!line.amount) {
      errors.push({
        path: `${linePath}.amount`,
        code: 'MISSING_AMOUNT_EXPRESSION',
        message: 'La línea debe definir una expresión de importe'
      });
    } else {
      const valAmount = validateExpression(line.amount, {
        expectedType: 'MONEY',
        documentType: docType,
        lineContext: lineCtx
      });
      if (!valAmount.ok) {
        for (const err of valAmount.errors) {
          errors.push({
            path: `${linePath}.amount`,
            code: 'EXPRESSION_INVALID',
            message: err.reason
          });
        }
      }
    }

    // Expresión condicional emitWhen (debe ser BOOL)
    if (line.emitWhen) {
      const valEmit = validateExpression(line.emitWhen, {
        expectedType: 'BOOL',
        documentType: docType,
        lineContext: lineCtx
      });
      if (!valEmit.ok) {
        for (const err of valEmit.errors) {
          errors.push({
            path: `${linePath}.emitWhen`,
            code: 'EXPRESSION_INVALID',
            message: err.reason
          });
        }
      }
    }

    // Expresión de dimensiones (cada una debe ser STRING)
    if (line.dimensions && typeof line.dimensions === 'object') {
      for (const [dimKey, dimExpr] of Object.entries(line.dimensions)) {
        const valDim = validateExpression(dimExpr, {
          expectedType: 'STRING',
          documentType: docType,
          lineContext: lineCtx
        });
        if (!valDim.ok) {
          for (const err of valDim.errors) {
            errors.push({
              path: `${linePath}.dimensions.${dimKey}`,
              code: 'EXPRESSION_INVALID',
              message: err.reason
            });
          }
        }
      }
    }

    // Expresión de descripción (si es objeto nodo)
    if (line.description && typeof line.description === 'object' && ('fn' in line.description || 'field' in line.description || 'const' in line.description)) {
      const valDesc = validateExpression(line.description, {
        expectedType: 'STRING',
        documentType: docType,
        lineContext: lineCtx
      });
      if (!valDesc.ok) {
        for (const err of valDesc.errors) {
          errors.push({
            path: `${linePath}.description`,
            code: 'EXPRESSION_INVALID',
            message: err.reason
          });
        }
      }
    }

    // Validación de accountRef
    const accRef = line.accountRef;
    if (!accRef) {
      errors.push({
        path: `${linePath}.accountRef`,
        code: 'MISSING_ACCOUNT_REF',
        message: 'La línea no define referencia de cuenta'
      });
    } else {
      if (scope === 'PACK' && accRef.kind === 'LITERAL') {
        errors.push({
          path: `${linePath}.accountRef`,
          code: 'LITERAL_NOT_ALLOWED_IN_PACK',
          message: 'Las plantillas de alcance PACK no pueden usar cuentas literales (RD-14)'
        });
      }

      if (accRef.kind === 'BY_OPERATION_TYPE' && !accRef.fallback) {
        warnings.push({
          path: `${linePath}.accountRef`,
          code: 'BY_OPERATION_TYPE_NO_FALLBACK',
          message: `La línea ${index + 1} usa BY_OPERATION_TYPE sin fallback definido`
        });
      }

      if (accRef.qualifierFrom) {
        const valQual = validateExpression(accRef.qualifierFrom, {
          expectedType: 'STRING',
          documentType: docType,
          lineContext: lineCtx
        });
        if (!valQual.ok) {
          for (const err of valQual.errors) {
            errors.push({
              path: `${linePath}.accountRef.qualifierFrom`,
              code: 'EXPRESSION_INVALID',
              message: err.reason
            });
          }
        }
      }
    }
  });

  if (debitCount === 0) {
    errors.push({
      path: 'lines',
      code: 'NO_DEBIT_LINES',
      message: 'La plantilla debe contener al menos una línea en el DEBE'
    });
  }

  if (creditCount === 0) {
    errors.push({
      path: 'lines',
      code: 'NO_CREDIT_LINES',
      message: 'La plantilla debe contener al menos una línea en el HABER'
    });
  }

  if (balancingCount > 1) {
    errors.push({
      path: 'lines',
      code: 'MULTIPLE_BALANCING_LINES',
      message: 'Solo se permite un máximo de una línea de cuadre (balancingLine)'
    });
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings
  };
}

