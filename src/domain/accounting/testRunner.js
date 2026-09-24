/**
 * Ejecutor puro de casos de prueba de plantillas contables.
 * Conforme a contracts/domain-api.md §6 y data-model.md §7.
 * Agnóstico de cualquier jurisdicción.
 */

import { evaluateTemplate } from './templateEvaluation.js';

/**
 * Ejecuta los casos de prueba definidos en una versión de plantilla.
 *
 * @param {import('./types.js').TemplateVersion} version - Versión de plantilla con sus testCases
 * @param {Object} options
 * @param {import('./types.js').JurisdictionPack} options.pack - Paquete de jurisdicción
 * @param {import('./types.js').AccountMapping} options.tenantMapping - Mapa de cuentas de la empresa
 * @param {Array<Object>} options.chart - Plan contable de la empresa
 * @param {string} [options.functionalCurrency] - Moneda funcional
 * @returns {{ ok: boolean, results: Array<{ testCaseId: string, status: 'PASS'|'FAIL', differences: string[] }> }}
 */
export function runTests(version, { pack, tenantMapping, chart, functionalCurrency = pack?.defaultFunctionalCurrency || null }) {
  const testCases = version?.testCases || [];
  const results = [];

  for (const tc of testCases) {
    const mapping = tc.mappingSource === 'INLINE' ? (tc.accountMapping || { entries: [] }) : tenantMapping;

    const evalResult = evaluateTemplate(version, tc.input, {
      pack,
      mapping,
      chart,
      fxRateMilli: tc.fxRateMilli ?? null,
      functionalCurrency
    });

    const differences = [];

    // Caso negativo (espera motivos pendientes)
    if (tc.expectedPending && Array.isArray(tc.expectedPending) && tc.expectedPending.length > 0) {
      if (evalResult.ok) {
        differences.push(`Se esperaban motivos pendientes [${tc.expectedPending.join(', ')}], pero la evaluación tuvo éxito.`);
      } else {
        const actualCodes = (evalResult.pending || []).map(p => p.code);
        const missing = tc.expectedPending.filter(code => !actualCodes.includes(code));
        if (missing.length > 0) {
          differences.push(`Faltan motivos pendientes esperados: ${missing.join(', ')} (obtenidos: ${actualCodes.join(', ')})`);
        }
      }
    } else {
      // Caso positivo (espera líneas de asiento)
      if (!evalResult.ok) {
        const reasons = (evalResult.pending || []).map(p => `${p.code}: ${p.message}`).join('; ');
        differences.push(`Evaluación fallida con motivos: ${reasons}`);
      } else {
        const expectedLines = tc.expectedLines || [];
        const actualLines = evalResult.lines || [];

        if (actualLines.length !== expectedLines.length) {
          differences.push(`Cantidad de líneas distinta: se esperaban ${expectedLines.length}, se obtuvieron ${actualLines.length}`);
        }

        const maxLen = Math.max(expectedLines.length, actualLines.length);
        for (let i = 0; i < maxLen; i++) {
          const exp = expectedLines[i];
          const act = actualLines[i];

          if (!exp) {
            differences.push(`Línea ${i + 1}: línea no esperada (obtenida cuenta ${act.accountCode}, lado ${act.side}, importe ${act.functionalAmountMinor})`);
            continue;
          }
          if (!act) {
            differences.push(`Línea ${i + 1}: línea faltante (esperada cuenta ${exp.accountCode}, lado ${exp.side}, importe ${exp.functionalAmountMinor})`);
            continue;
          }

          if (act.side !== exp.side) {
            differences.push(`Línea ${i + 1}: se esperaba lado ${exp.side}, se obtuvo ${act.side}`);
          }

          if (act.accountCode !== exp.accountCode) {
            differences.push(`Línea ${i + 1}: se esperaba ${exp.accountCode}, se obtuvo ${act.accountCode}`);
          }

          if (act.functionalAmountMinor !== exp.functionalAmountMinor) {
            differences.push(`Línea ${i + 1}: se esperaba importe ${exp.functionalAmountMinor}, se obtuvo ${act.functionalAmountMinor}`);
          }

          if (exp.dimensions && typeof exp.dimensions === 'object') {
            const actualDims = act.dimensions || {};
            for (const [k, v] of Object.entries(exp.dimensions)) {
              if (actualDims[k] !== v) {
                differences.push(`Línea ${i + 1}: dimensión '${k}' esperada '${v}', obtenida '${actualDims[k] || ''}'`);
              }
            }
          }
        }
      }
    }

    results.push({
      testCaseId: tc.id,
      status: differences.length === 0 ? 'PASS' : 'FAIL',
      differences
    });
  }

  const ok = results.length > 0 && results.every(r => r.status === 'PASS');

  return {
    ok,
    results
  };
}
