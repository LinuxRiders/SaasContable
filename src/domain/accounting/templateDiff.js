/**
 * Comparación semántica de versiones de plantillas contables AST (RD-10, contracts/domain-api.md §6).
 * Función pura y agnóstica por jurisdicción.
 */

/**
 * Calcula las diferencias en lenguaje natural (español) entre dos versiones de plantilla.
 *
 * @param {Object} prev - Versión anterior
 * @param {Object} next - Versión siguiente
 * @returns {Array<string>} Lista de frases descriptivas de los cambios
 */
export function diffVersions(prev, next) {
  if (!prev || !next) return [];

  const diffs = [];

  // 1. Cabecera y Terna
  if (prev.documentTypeCode !== next.documentTypeCode) {
    diffs.push(`Tipo de comprobante: '${prev.documentTypeCode}' → '${next.documentTypeCode}'`);
  }

  if (prev.perspective !== next.perspective) {
    diffs.push(`Perspectiva: '${prev.perspective}' → '${next.perspective}'`);
  }

  if (prev.operationTypeCode !== next.operationTypeCode) {
    diffs.push(`Tipo de operación: '${prev.operationTypeCode}' → '${next.operationTypeCode}'`);
  }

  const prevPri = prev.priority ?? 0;
  const nextPri = next.priority ?? 0;
  if (prevPri !== nextPri) {
    diffs.push(`Prioridad: ${prevPri} → ${nextPri}`);
  }

  if (prev.legalBookCode !== next.legalBookCode) {
    diffs.push(`Libro oficial: '${prev.legalBookCode || 'Ninguno'}' → '${next.legalBookCode || 'Ninguno'}'`);
  }

  if (JSON.stringify(prev.glosa ?? null) !== JSON.stringify(next.glosa ?? null)) {
    diffs.push('Glosa modificada');
  }

  if (JSON.stringify(prev.applicability ?? null) !== JSON.stringify(next.applicability ?? null)) {
    diffs.push('Condición de aplicabilidad modificada');
  }

  // 2. Líneas
  const prevLines = Array.isArray(prev.lines) ? prev.lines : [];
  const nextLines = Array.isArray(next.lines) ? next.lines : [];

  const prevMap = new Map(prevLines.map(l => [l.id, l]));
  const nextMap = new Map(nextLines.map(l => [l.id, l]));

  // Líneas eliminadas y modificadas
  for (const [id, pLine] of prevMap) {
    if (!nextMap.has(id)) {
      diffs.push(`Línea '${id}' eliminada`);
      continue;
    }

    const nLine = nextMap.get(id);

    if (pLine.side !== nLine.side) {
      diffs.push(`Línea '${id}': lado ${pLine.side || '—'} → ${nLine.side || '—'}`);
    }

    const accP = pLine.accountRef || pLine.account;
    const accN = nLine.accountRef || nLine.account;
    if (JSON.stringify(accP ?? null) !== JSON.stringify(accN ?? null)) {
      diffs.push(`Línea '${id}': cuenta modificada`);
    }

    if (JSON.stringify(pLine.amount ?? null) !== JSON.stringify(nLine.amount ?? null)) {
      diffs.push(`Línea '${id}': importe cambió`);
    }

    if (JSON.stringify(pLine.emitWhen ?? null) !== JSON.stringify(nLine.emitWhen ?? null)) {
      diffs.push(`Línea '${id}': condición de emisión modificada`);
    }

    if (JSON.stringify(pLine.dimensions || {}) !== JSON.stringify(nLine.dimensions || {})) {
      diffs.push(`Línea '${id}': dimensiones modificadas`);
    }

    if (JSON.stringify(pLine.description ?? null) !== JSON.stringify(nLine.description ?? null)) {
      diffs.push(`Línea '${id}': descripción modificada`);
    }

    if (Boolean(pLine.balancingLine) !== Boolean(nLine.balancingLine)) {
      diffs.push(`Línea '${id}': indicador de cuadre modificado`);
    }

    if (Boolean(pLine.forEachDocumentLine) !== Boolean(nLine.forEachDocumentLine)) {
      diffs.push(`Línea '${id}': iteración por línea modificada`);
    }
  }

  // Líneas agregadas
  for (const [id, nLine] of nextMap) {
    if (!prevMap.has(id)) {
      diffs.push(`Línea '${id}' agregada (${nLine.side || 'DEBIT'})`);
    }
  }

  return diffs;
}
