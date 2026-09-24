import { validateDocument } from './documentValidation.js';
import { resolvePerspective } from './perspective.js';
import { classify, applyClassification } from './classification.js';
import { selectTemplate } from './templateSelection.js';
import { evaluateTemplate } from './templateEvaluation.js';
import { getDocumentType } from './catalog.js';

/**
 * Interpreta un documento canónico de extremo a extremo según SDD §5.4 y contracts/domain-api.md §7.
 * Pasos: 1. Validación de esquema -> 2. Resolución de perspectiva -> 3. Clasificación de operación ->
 *        4. Selección de plantilla AST -> 5. Evaluación contable.
 *
 * Función pura, determinista y agnóstica por jurisdicción (RD-14, SC-007).
 *
 * @param {Object} document - Documento canónico
 * @param {Object} options
 * @param {import('./types.js').JurisdictionPack} options.pack
 * @param {string} options.tenantFiscalId
 * @param {Array<Object>} [options.rules]
 * @param {((terna: { documentTypeCode: string, perspective: string, operationTypeCode: string }) => Array<Object>)|Array<Object>} options.candidatesFor
 * @param {import('./types.js').AccountMapping} options.mapping
 * @param {Array<Object>} options.chart
 * @param {number|null} [options.fxRateMilli]
 * @param {string} [options.functionalCurrency]
 * @returns {Object} Resultado con { ok: true, entry, trace } o { ok: false, pending, trace, stoppedAt }
 */
export function interpretDocument(document, {
  pack,
  tenantFiscalId,
  rules = [],
  candidatesFor,
  mapping = { entries: [] },
  chart = [],
  fxRateMilli = null,
  functionalCurrency = pack?.defaultFunctionalCurrency || null
} = {}) {
  const trace = { steps: [] };

  // PASO 1: Validación de esquema (SDD §5.4 Paso 1)
  const schemaRes = validateDocument(document, { pack });
  if (!schemaRes.ok) {
    trace.steps.push({
      step: 'SCHEMA',
      ok: false,
      errors: schemaRes.pending
    });
    return {
      ok: false,
      pending: schemaRes.pending,
      trace,
      stoppedAt: 'SCHEMA'
    };
  }

  const documentType = getDocumentType(pack, document.documentTypeCode, document.issueDate);
  trace.steps.push({
    step: 'SCHEMA',
    ok: true,
    documentTypeCode: document.documentTypeCode
  });

  // PASO 2: Resolución de perspectiva (SDD §5.4 Paso 2)
  const perspRes = resolvePerspective(document, { documentType, tenantFiscalId });
  if (!perspRes.ok) {
    trace.steps.push({
      step: 'PERSPECTIVE',
      ok: false,
      errors: perspRes.pending
    });
    return {
      ok: false,
      pending: perspRes.pending,
      trace,
      stoppedAt: 'PERSPECTIVE'
    };
  }

  const perspective = perspRes.perspective;
  trace.steps.push({
    step: 'PERSPECTIVE',
    ok: true,
    perspective
  });

  const docWithPersp = {
    ...document,
    perspective
  };

  // PASO 3: Clasificación de la operación (SDD §5.4 Paso 3)
  const classRes = classify(docWithPersp, { pack, documentType, rules });
  if (!classRes.ok) {
    trace.steps.push({
      step: 'CLASSIFICATION',
      ok: false,
      trace: classRes.trace,
      errors: classRes.pending
    });
    return {
      ok: false,
      pending: classRes.pending,
      trace,
      stoppedAt: 'CLASSIFICATION'
    };
  }

  trace.steps.push({
    step: 'CLASSIFICATION',
    ok: true,
    operationTypeCode: classRes.operationTypeCode,
    lineOperationTypes: classRes.lineOperationTypes,
    decidedBy: classRes.decidedBy,
    trace: classRes.trace
  });

  const classifiedDoc = applyClassification(docWithPersp, classRes);

  // PASO 4: Selección de plantilla AST (SDD §5.4 Paso 6)
  const terna = {
    documentTypeCode: classifiedDoc.documentTypeCode,
    perspective: classifiedDoc.perspective,
    operationTypeCode: classifiedDoc.operationTypeCode
  };

  let candidates = [];
  if (typeof candidatesFor === 'function') {
    candidates = candidatesFor(terna) || [];
  } else if (Array.isArray(candidatesFor)) {
    candidates = candidatesFor;
  }

  const selRes = selectTemplate(classifiedDoc, { candidates });
  if (!selRes.ok) {
    trace.steps.push({
      step: 'SELECTION',
      ok: false,
      trace: selRes.trace,
      errors: selRes.pending
    });
    return {
      ok: false,
      pending: selRes.pending,
      trace,
      stoppedAt: 'SELECTION'
    };
  }

  trace.steps.push({
    step: 'SELECTION',
    ok: true,
    templateId: selRes.template.id,
    version: selRes.version.version,
    scope: selRes.template.scope,
    trace: selRes.trace
  });

  const selectedTemplate = selRes.template;
  const selectedVersion = selRes.version;

  // PASO 5: Evaluación contable (SDD §5.4 Paso 7)
  const evalRes = evaluateTemplate(selectedVersion, classifiedDoc, {
    pack,
    mapping,
    chart,
    fxRateMilli,
    functionalCurrency
  });

  if (!evalRes.ok) {
    const normalizedPending = (evalRes.pending || []).map(p => ({
      reasonCode: p.reasonCode || p.code,
      code: p.code || p.reasonCode,
      message: p.message,
      details: p.details || { roleCode: p.roleCode, qualifier: p.qualifier }
    }));
    trace.steps.push({
      step: 'EVALUATION',
      ok: false,
      trace: evalRes.trace,
      errors: normalizedPending
    });
    return {
      ok: false,
      pending: normalizedPending,
      trace,
      stoppedAt: 'EVALUATION'
    };
  }

  trace.steps.push({
    step: 'EVALUATION',
    ok: true,
    linesCount: evalRes.lines?.length || 0,
    trace: evalRes.trace
  });

  return {
    ok: true,
    entry: {
      lines: evalRes.lines,
      glosa: evalRes.glosa,
      legalBookCode: evalRes.legalBookCode,
      templateId: selectedTemplate.id,
      templateVersion: selectedVersion.version,
      perspective: classifiedDoc.perspective,
      operationTypeCode: classifiedDoc.operationTypeCode
    },
    trace
  };
}
