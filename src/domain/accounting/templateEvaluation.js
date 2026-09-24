/**
 * Evaluación pura de plantillas contables (SDD §20.8.3, data-model.md §12).
 * Algoritmo paso a paso: requiredInputs, expansión de líneas, resolución de cuentas,
 * evaluación de dimensiones, agrupación groupBy, conversión FX y ajuste por balancingLine.
 * Agnóstico de cualquier jurisdicción (RD-14).
 */

import { evaluateExpression } from './expressions/evaluate.js';
import { resolveAccount } from './accountResolution.js';
import { convert } from '../ingestion/fx.js';
import { checkBalance } from './balance.js';

/**
 * Obtiene un valor anidado a partir de una ruta tipo 'fields.costCenter'.
 * @param {Object} obj
 * @param {string} path
 * @returns {any}
 */
function getNestedValue(obj, path) {
  if (!obj || typeof path !== 'string') return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

/**
 * Evalúa una versión de plantilla contable contra un documento canónico.
 *
 * @param {import('./types.js').TemplateVersion} version - Definición de la versión de plantilla
 * @param {import('./types.js').CanonicalDocument} document - Documento canónico clasificado
 * @param {Object} options
 * @param {import('./types.js').JurisdictionPack} options.pack - Paquete de jurisdicción
 * @param {import('./types.js').AccountMapping} options.mapping - Mapa de cuentas de la empresa o inline
 * @param {Array<Object>} options.chart - Plan contable de la empresa
 * @param {number|null} [options.fxRateMilli=null] - Tasa de cambio en milésimas si doc.currency != functionalCurrency
 * @param {string} [options.functionalCurrency] - Moneda funcional del tenant
 * @returns {import('./types.js').EvaluationResult}
 */
export function evaluateTemplate(version, document, { pack, mapping, chart, fxRateMilli = null, functionalCurrency = pack?.defaultFunctionalCurrency || null }) {
  const pending = [];
  const trace = {
    templateId: version?.id || version?.code || 'UNKNOWN',
    version: version?.version || 1,
    steps: []
  };

  if (!version || !document) {
    return {
      ok: false,
      lines: [],
      glosa: '',
      legalBookCode: version?.legalBookCode || null,
      trace,
      pending: [{ code: 'INVALID_INPUT', message: 'Plantilla o documento no provisto' }]
    };
  }

  // Paso 1: Verificar requiredInputs
  const requiredInputs = version.requiredInputs || [];
  for (const inputPath of requiredInputs) {
    let val;
    if (inputPath.startsWith('line.')) {
      const lineProp = inputPath.replace(/^line\./, '');
      const docLines = Array.isArray(document.lines) ? document.lines : [];
      const hasMissing = docLines.some(l => {
        const v = getNestedValue(l, lineProp);
        return v === null || v === undefined || v === '';
      });
      if (hasMissing || docLines.length === 0) {
        val = undefined;
      } else {
        val = 'OK';
      }
    } else {
      val = getNestedValue(document, inputPath);
    }

    if (val === null || val === undefined || val === '') {
      pending.push({
        code: 'MISSING_INPUT',
        message: `Falta dato requerido en el documento: ${inputPath}`,
        details: { path: inputPath }
      });
    }
  }

  if (pending.length > 0) {
    return {
      ok: false,
      lines: [],
      glosa: '',
      legalBookCode: version.legalBookCode || null,
      trace,
      pending
    };
  }

  // Paso 2 y 3: Recorrer líneas de plantilla y expandir forEachDocumentLine
  const expandedLines = [];
  const templateLines = version.lines || [];

  for (const tmplLine of templateLines) {
    if (tmplLine.forEachDocumentLine) {
      const docLines = Array.isArray(document.lines) ? document.lines : [];
      for (const docLine of docLines) {
        const ctx = { document, line: docLine, pack, issueDate: document.issueDate };

        // emitWhen
        if (tmplLine.emitWhen) {
          const emit = evaluateExpression(tmplLine.emitWhen, ctx);
          if (!emit) continue;
        }

        // amount
        const rawAmount = evaluateExpression(tmplLine.amount, ctx);
        const amount = typeof rawAmount === 'number' ? rawAmount : Number(rawAmount || 0);

        if (amount < 0) {
          pending.push({
            code: 'INVALID_AMOUNT',
            message: `Importe negativo en línea de plantilla '${tmplLine.id}': ${amount}`,
            details: { templateLineId: tmplLine.id, amount }
          });
          continue;
        }

        if (amount === 0) {
          continue; // omitir importe cero
        }

        expandedLines.push({
          tmplLine,
          docLine,
          amount,
          sourceLineNos: [docLine.lineNo]
        });
      }
    } else {
      const ctx = { document, line: null, pack, issueDate: document.issueDate };

      // emitWhen
      if (tmplLine.emitWhen) {
        const emit = evaluateExpression(tmplLine.emitWhen, ctx);
        if (!emit) continue;
      }

      // amount
      const rawAmount = evaluateExpression(tmplLine.amount, ctx);
      const amount = typeof rawAmount === 'number' ? rawAmount : Number(rawAmount || 0);

      if (amount < 0) {
        pending.push({
          code: 'INVALID_AMOUNT',
          message: `Importe negativo en línea de plantilla '${tmplLine.id}': ${amount}`,
          details: { templateLineId: tmplLine.id, amount }
        });
        continue;
      }

      if (amount === 0) {
        continue; // omitir importe cero
      }

      expandedLines.push({
        tmplLine,
        docLine: null,
        amount,
        sourceLineNos: []
      });
    }
  }

  if (pending.length > 0) {
    return {
      ok: false,
      lines: [],
      glosa: '',
      legalBookCode: version.legalBookCode || null,
      trace,
      pending
    };
  }

  // Paso 4 y 5: Resolver cuenta, calificador, dimensiones y descripciones
  const intermediateLines = [];

  for (const item of expandedLines) {
    const { tmplLine, docLine, amount, sourceLineNos } = item;
    const ctx = { document, line: docLine, pack, issueDate: document.issueDate };
    const accountRef = tmplLine.account || tmplLine.accountRef;

    let qualifier = null;
    if (accountRef?.qualifierFrom) {
      qualifier = evaluateExpression(accountRef.qualifierFrom, ctx);
    } else if (accountRef?.qualifier) {
      qualifier = accountRef.qualifier;
    }

    const lineOperationType = docLine?.operationTypeCode || document.operationTypeCode || null;

    const resolved = resolveAccount(accountRef, {
      mapping,
      chart,
      qualifier,
      lineOperationType
    });

    if (!resolved.ok) {
      pending.push(...(resolved.pending || [{
        code: 'ACCOUNT_UNRESOLVED',
        message: `No se pudo resolver la cuenta para la línea '${tmplLine.id}'`,
        details: { templateLineId: tmplLine.id }
      }]));
      continue;
    }

    const accountCode = resolved.accountCode;
    const accountRole = resolved.accountRole || null;

    // Dimensiones
    const dimensions = {};
    if (tmplLine.dimensions) {
      for (const [dimKey, dimExpr] of Object.entries(tmplLine.dimensions)) {
        const dimVal = evaluateExpression(dimExpr, ctx);
        if (dimVal !== null && dimVal !== undefined && dimVal !== '') {
          dimensions[dimKey] = String(dimVal);
        }
      }
    }

    // Si costCenter no se definió en dimensions, heredar de docLine, document o qualifier
    if (!dimensions.costCenter) {
      if (docLine?.fields?.costCenter) {
        dimensions.costCenter = String(docLine.fields.costCenter);
      } else if (document?.fields?.costCenter) {
        dimensions.costCenter = String(document.fields.costCenter);
      } else if (qualifier && (accountRef?.roleCode === 'COST_DESTINATION' || accountRef?.value === 'COST_DESTINATION')) {
        dimensions.costCenter = String(qualifier);
      }
    }

    // Descripción
    let description = null;
    if (tmplLine.description) {
      description = evaluateExpression(tmplLine.description, ctx);
    } else if (docLine?.description) {
      description = docLine.description;
    }

    // Validación de dimensiones exigidas por el plan contable
    const chartAccount = (chart || []).find(a => a.codigo === accountCode || a.code === accountCode);
    if (chartAccount?.requiereCC && !dimensions.costCenter) {
      pending.push({
        code: 'MISSING_DIMENSION',
        message: `La cuenta '${accountCode}' requiere centro de costo y no fue provisto`,
        details: { accountCode, dimension: 'costCenter', templateLineId: tmplLine.id }
      });
    }

    intermediateLines.push({
      side: tmplLine.side,
      accountCode,
      accountRole,
      amountMinor: amount,
      dimensions,
      description: description ? String(description) : null,
      templateLineId: tmplLine.id,
      balancingLine: Boolean(tmplLine.balancingLine),
      groupBy: Boolean(tmplLine.groupBy),
      sourceLineNos
    });
  }

  if (pending.length > 0) {
    return {
      ok: false,
      lines: [],
      glosa: '',
      legalBookCode: version.legalBookCode || null,
      trace,
      pending
    };
  }

  // Paso 6: Aplicar groupBy
  const groupedLines = [];
  for (const line of intermediateLines) {
    if (line.groupBy) {
      const existing = groupedLines.find(g =>
        g.groupBy &&
        g.templateLineId === line.templateLineId &&
        g.side === line.side &&
        g.accountCode === line.accountCode &&
        JSON.stringify(g.dimensions) === JSON.stringify(line.dimensions)
      );
      if (existing) {
        existing.amountMinor += line.amountMinor;
        existing.sourceLineNos = [...existing.sourceLineNos, ...line.sourceLineNos];
        continue;
      }
    }
    groupedLines.push({ ...line, sourceLineNos: [...line.sourceLineNos] });
  }

  // Paso 7: Conversión FX y ajuste por balancingLine (RD-09)
  const docCurrency = document.currency || functionalCurrency;
  const isForeign = docCurrency !== functionalCurrency;
  const rateMilli = isForeign ? fxRateMilli : null;

  for (const line of groupedLines) {
    line.currency = docCurrency;
    line.fxRateMilli = rateMilli;
    if (rateMilli) {
      line.functionalAmountMinor = convert(line.amountMinor, rateMilli);
    } else {
      line.functionalAmountMinor = line.amountMinor;
    }
  }

  // Verificar balance contable
  const bal = checkBalance(groupedLines);
  if (!bal.ok) {
    const diff = bal.debitMinor - bal.creditMinor; // diff > 0 indica débitos exceden créditos
    const absDiff = Math.abs(diff);
    const tolerance = pack?.roundingToleranceMinor ?? 5;

    if (absDiff <= tolerance) {
      const balLine = groupedLines.find(l => l.balancingLine);
      if (balLine) {
        if (balLine.side === 'CREDIT') {
          balLine.functionalAmountMinor += diff;
        } else {
          balLine.functionalAmountMinor -= diff;
        }
      } else {
        pending.push({
          code: 'UNBALANCED',
          message: `Asiento descuadrado por ${absDiff} unidades mínimas y no se definió balancingLine`,
          details: { debitMinor: bal.debitMinor, creditMinor: bal.creditMinor, differenceMinor: absDiff, tolerance }
        });
      }
    } else {
      pending.push({
        code: 'UNBALANCED',
        message: `Asiento descuadrado: diferencia de ${absDiff} unidades mínimas supera la tolerancia de ${tolerance}`,
        details: { debitMinor: bal.debitMinor, creditMinor: bal.creditMinor, differenceMinor: absDiff, tolerance }
      });
    }
  }

  if (pending.length > 0) {
    return {
      ok: false,
      lines: [],
      glosa: '',
      legalBookCode: version.legalBookCode || null,
      trace,
      pending: pending.map(p => ({
        reasonCode: p.reasonCode || p.code,
        code: p.code || p.reasonCode,
        message: p.message,
        details: p.details || {}
      }))
    };
  }

  // Paso 8: Formatear resultado final con lineNo ordenado
  const finalLines = groupedLines.map((l, idx) => ({
    lineNo: idx + 1,
    side: l.side,
    accountCode: l.accountCode,
    accountRole: l.accountRole,
    amountMinor: l.amountMinor,
    currency: l.currency,
    fxRateMilli: l.fxRateMilli,
    functionalAmountMinor: l.functionalAmountMinor,
    dimensions: l.dimensions,
    description: l.description,
    templateLineId: l.templateLineId,
    sourceLineNos: l.sourceLineNos
  }));

  let glosa = '';
  if (version.glosa) {
    glosa = String(evaluateExpression(version.glosa, { document, pack, issueDate: document.issueDate }) || '');
  }

  return {
    ok: true,
    lines: finalLines,
    glosa,
    legalBookCode: version.legalBookCode || null,
    trace,
    pending: []
  };
}
