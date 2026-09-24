import { evaluateExpression } from './expressions/evaluate.js';
import { getOperationTypes } from './catalog.js';

/**
 * Determina el tipo de operación para un documento y cada una de sus líneas.
 * Función pura, determinista y agnóstica por jurisdicción (RD-14, RD-16, R-08).
 *
 * Orden de decisión (SDD §20.4):
 * 1. Valor explícito de origen.
 * 2. Reglas ACTIVE por prioridad descendente (empate por id asc).
 * 3. Única operación admitida por tipo de comprobante y perspectiva.
 * 4. Líneas sin regla heredan tipo de documento; líneas mixtas adoptan mixedOperationTypes.
 * 5. Si no se puede decidir → CLASSIFICATION_REQUIRED.
 *
 * @param {Object} document - Documento canónico
 * @param {Object} options
 * @param {import('./types.js').JurisdictionPack} options.pack - Paquete normativo
 * @param {import('./types.js').DocumentTypeDefinition} options.documentType - Tipo de comprobante
 * @param {Array<Object>} options.rules - Catálogo de reglas del tenant
 * @returns {Object} Resultado de clasificación { ok, operationTypeCode, lineOperationTypes, trace, decidedBy } o { ok: false, pending, trace }
 */
export function classify(document, { pack, documentType, rules = [] } = {}) {
  const lines = document?.lines || [];
  const perspective = document?.perspective || 'RECEIVED';

  // 1. Valor explícito en el documento
  if (document?.operationTypeCode) {
    const lineOperationTypes = {};
    for (let idx = 0; idx < lines.length; idx++) {
      const l = lines[idx];
      const lineNo = l.lineNo ?? (idx + 1);
      lineOperationTypes[lineNo] = l.operationTypeCode || document.operationTypeCode;
    }

    return {
      ok: true,
      operationTypeCode: document.operationTypeCode,
      lineOperationTypes,
      trace: [{ ruleId: 'SOURCE', scope: 'DOCUMENT', matched: true }],
      decidedBy: 'SOURCE'
    };
  }

  const allowedOperations = getOperationTypes(pack, documentType, perspective) || [];
  const activeRules = (rules || []).filter(r => r.status === 'ACTIVE');

  // Ordenar por prioridad DESC, luego id ASC
  const sortedRules = [...activeRules].sort((a, b) => {
    const pA = a.priority ?? 0;
    const pB = b.priority ?? 0;
    if (pB !== pA) return pB - pA;
    return String(a.id || '').localeCompare(String(b.id || ''));
  });

  const trace = [];
  let docDecidedOp = null;
  let docDecidedBy = null;
  const lineOperationTypes = {};

  // 2. Evaluar reglas con alcance DOCUMENT
  for (const rule of sortedRules) {
    if (rule.scope !== 'DOCUMENT') continue;
    try {
      const match = Boolean(evaluateExpression(rule.condition, {
        document,
        pack,
        issueDate: document.issueDate
      }));

      if (match) {
        if (!allowedOperations.includes(rule.operationTypeCode)) {
          trace.push({
            ruleId: rule.id,
            scope: 'DOCUMENT',
            matched: true,
            skippedReason: 'OPERATION_NOT_ALLOWED'
          });
        } else {
          trace.push({
            ruleId: rule.id,
            scope: 'DOCUMENT',
            matched: true
          });
          if (!docDecidedOp) {
            docDecidedOp = rule.operationTypeCode;
            docDecidedBy = `RULE:${rule.id}`;
          }
        }
      } else {
        trace.push({
          ruleId: rule.id,
          scope: 'DOCUMENT',
          matched: false
        });
      }
    } catch (err) {
      trace.push({
        ruleId: rule.id,
        scope: 'DOCUMENT',
        matched: false,
        error: err.message
      });
    }
  }

  // 3. Evaluar reglas con alcance LINE
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const lineNo = line.lineNo ?? (idx + 1);

    if (line.operationTypeCode) {
      lineOperationTypes[lineNo] = line.operationTypeCode;
      continue;
    }

    for (const rule of sortedRules) {
      if (rule.scope !== 'LINE') continue;
      try {
        const match = Boolean(evaluateExpression(rule.condition, {
          document,
          line,
          pack,
          issueDate: document.issueDate
        }));

        if (match) {
          if (!allowedOperations.includes(rule.operationTypeCode)) {
            trace.push({
              ruleId: rule.id,
              scope: 'LINE',
              lineNo,
              matched: true,
              skippedReason: 'OPERATION_NOT_ALLOWED'
            });
          } else {
            trace.push({
              ruleId: rule.id,
              scope: 'LINE',
              lineNo,
              matched: true
            });
            if (!lineOperationTypes[lineNo]) {
              lineOperationTypes[lineNo] = rule.operationTypeCode;
            }
            break; // La primera regla de mayor prioridad asigna la línea
          }
        } else {
          trace.push({
            ruleId: rule.id,
            scope: 'LINE',
            lineNo,
            matched: false
          });
        }
      } catch (err) {
        trace.push({
          ruleId: rule.id,
          scope: 'LINE',
          lineNo,
          matched: false,
          error: err.message
        });
      }
    }
  }

  // 4. Si el documento no tiene tipo decidido, verificar si hay opción única para el comprobante
  if (!docDecidedOp && allowedOperations.length === 1) {
    docDecidedOp = allowedOperations[0];
    docDecidedBy = 'SINGLE_OPTION';
  }

  // 5. Líneas sin tipo asignado heredan el tipo del documento
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const lineNo = line.lineNo ?? (idx + 1);
    if (!lineOperationTypes[lineNo] && docDecidedOp) {
      lineOperationTypes[lineNo] = docDecidedOp;
    }
  }

  // 6. Determinar tipo final del documento según sus líneas
  if (lines.length > 0) {
    // Comprobar si alguna línea quedó sin clasificar
    for (let idx = 0; idx < lines.length; idx++) {
      const lineNo = lines[idx].lineNo ?? (idx + 1);
      if (!lineOperationTypes[lineNo]) {
        return {
          ok: false,
          pending: [{
            reasonCode: 'CLASSIFICATION_REQUIRED',
            message: `Línea ${lineNo} no pudo ser clasificada`,
            details: { lineNo }
          }],
          trace
        };
      }
    }

    const assignedOps = Object.values(lineOperationTypes);
    const uniqueOps = [...new Set(assignedOps)];

    if (uniqueOps.length > 1) {
      // Líneas mixtas
      const mixedOp = pack?.mixedOperationTypes?.[perspective] || 'PURCHASE_MIXED';
      return {
        ok: true,
        operationTypeCode: mixedOp,
        lineOperationTypes,
        trace,
        decidedBy: 'MIXED'
      };
    } else {
      // Todas las líneas coinciden
      const singleLineOp = uniqueOps[0];
      return {
        ok: true,
        operationTypeCode: singleLineOp,
        lineOperationTypes,
        trace,
        decidedBy: docDecidedBy || (docDecidedOp === singleLineOp ? 'RULE' : 'SINGLE_OPTION')
      };
    }
  } else {
    // Documento sin líneas
    if (!docDecidedOp) {
      return {
        ok: false,
        pending: [{
          reasonCode: 'CLASSIFICATION_REQUIRED',
          message: 'No se pudo clasificar el documento (sin líneas ni tipo aplicable)'
        }],
        trace
      };
    }

    return {
      ok: true,
      operationTypeCode: docDecidedOp,
      lineOperationTypes: {},
      trace,
      decidedBy: docDecidedBy
    };
  }
}

/**
 * Devuelve una copia profunda del documento con operationTypeCode asignado al documento y a cada línea.
 * Función pura: no muta el documento original.
 *
 * @param {Object} document - Documento canónico original
 * @param {{ operationTypeCode: string, lineOperationTypes: Record<number, string> }} result - Resultado exitoso de classify
 * @returns {Object} Nuevo documento con clasificación aplicada
 */
export function applyClassification(document, result) {
  if (!document) return null;
  const copy = JSON.parse(JSON.stringify(document));
  if (!result || !result.operationTypeCode) return copy;

  copy.operationTypeCode = result.operationTypeCode;

  if (Array.isArray(copy.lines)) {
    for (let idx = 0; idx < copy.lines.length; idx++) {
      const line = copy.lines[idx];
      const lineNo = line.lineNo ?? (idx + 1);
      if (result.lineOperationTypes && result.lineOperationTypes[lineNo]) {
        line.operationTypeCode = result.lineOperationTypes[lineNo];
      } else {
        line.operationTypeCode = result.operationTypeCode;
      }
    }
  }

  return copy;
}

