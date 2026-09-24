import { evaluateExpression } from './expressions/evaluate.js';

/**
 * Selecciona deterministamente la mejor plantilla AST aplicable para el documento.
 * Función pura, determinista y agnóstica por jurisdicción (RD-14, RD-16, R-09, T084).
 *
 * Jerarquía de selección:
 * 1. applicability evalúa a true (o null).
 * 2. TENANT > PACK.
 * 3. Mayor priority.
 * 4. Empate en alcance y prioridad → AMBIGUOUS_TEMPLATE.
 *
 * @param {Object} document - Documento canónico clasificado
 * @param {Object} options
 * @param {Array<{ template: Object, version: Object }>} options.candidates - Plantillas candidatas activas
 * @returns {{ ok: boolean, template?: Object, version?: Object, trace: Array<Object>, pending?: Array<Object> }}
 */
export function selectTemplate(document, { candidates = [] } = {}) {
  const trace = [];
  const matching = [];

  for (const item of candidates) {
    const { template, version } = item;
    const priority = version.priority ?? 0;
    let matched = true;

    if (version.applicability) {
      try {
        matched = Boolean(evaluateExpression(version.applicability, {
          document,
          issueDate: document?.issueDate
        }));
      } catch (err) {
        matched = false;
      }
    }

    trace.push({
      templateId: template.id,
      version: version.version,
      scope: template.scope,
      priority,
      matched
    });

    if (matched) {
      matching.push(item);
    }
  }

  if (matching.length === 0) {
    return {
      ok: false,
      pending: [{
        reasonCode: 'NO_TEMPLATE',
        message: 'No se encontró ninguna plantilla activa aplicable para la terna y condiciones del documento'
      }],
      trace
    };
  }

  // Ordenar: 1. TENANT > PACK, 2. priority DESC
  matching.sort((a, b) => {
    if (a.template.scope !== b.template.scope) {
      return a.template.scope === 'TENANT' ? -1 : 1;
    }
    const pA = a.version.priority ?? 0;
    const pB = b.version.priority ?? 0;
    return pB - pA;
  });

  // Verificar ambigüedad entre las mejores candidatas
  if (matching.length >= 2) {
    const top1 = matching[0];
    const top2 = matching[1];

    const sameScope = top1.template.scope === top2.template.scope;
    const samePriority = (top1.version.priority ?? 0) === (top2.version.priority ?? 0);

    if (sameScope && samePriority) {
      return {
        ok: false,
        pending: [{
          reasonCode: 'AMBIGUOUS_TEMPLATE',
          message: `Ambigüedad entre plantillas '${top1.template.id}' y '${top2.template.id}' con idéntico alcance (${top1.template.scope}) y prioridad (${top1.version.priority ?? 0})`
        }],
        trace
      };
    }
  }

  const winner = matching[0];
  return {
    ok: true,
    template: winner.template,
    version: winner.version,
    trace
  };
}

