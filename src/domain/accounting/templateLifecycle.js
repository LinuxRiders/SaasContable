/**
 * Lógica pura del ciclo de vida de plantillas contables (creación, duplicación, edición de borrador).
 * Conforme a contracts/domain-api.md §6 y data-model.md §6.
 * Agnosticismo (RD-14): sin dependencias externas ni reglas por país.
 */

/**
 * Crea una nueva plantilla de empresa (alcance TENANT) en versión 1 DRAFT.
 * @param {{
 *   definition: Object,
 *   tenantId: string,
 *   createdBy: string,
 *   createdAt: string,
 *   id?: string
 * }} params
 * @returns {import('./types.js').ASTTemplate}
 */
export function newTemplate({ definition, tenantId, createdBy, createdAt, id }) {
  const templateId = id || crypto.randomUUID();

  const v1 = {
    version: 1,
    status: 'DRAFT',
    documentTypeCode: definition.documentTypeCode,
    perspective: definition.perspective,
    operationTypeCode: definition.operationTypeCode,
    priority: definition.priority || 0,
    applicability: definition.applicability || null,
    legalBookCode: definition.legalBookCode || null,
    glosa: definition.glosa || '',
    requiredInputs: definition.requiredInputs || [],
    lines: JSON.parse(JSON.stringify(definition.lines || [])),
    testCases: JSON.parse(JSON.stringify(definition.testCases || [])),
    lastTestRun: null,
    diffFromPrevious: null,
    createdBy,
    createdAt
  };

  return {
    id: templateId,
    code: definition.code,
    name: definition.name,
    scope: 'TENANT',
    tenantId,
    duplicatedFrom: null,
    retiredAt: null,
    createdBy,
    createdAt,
    versions: [v1]
  };
}

/**
 * Duplica una plantilla de paquete o de tenant como una nueva plantilla TENANT v1 DRAFT.
 * @param {import('./types.js').ASTTemplate|Object} source
 * @param {number} versionNumber
 * @param {{
 *   tenantId: string,
 *   createdBy: string,
 *   createdAt: string,
 *   id?: string,
 *   newCode?: string,
 *   newName?: string
 * }} options
 * @returns {import('./types.js').ASTTemplate}
 */
export function duplicateTemplate(source, versionNumber, { tenantId, createdBy, createdAt, id, newCode, newName }) {
  const sourceVersion = (source.versions && source.versions.find(v => v.version === versionNumber)) || source;
  const templateId = id || crypto.randomUUID();

  const v1 = {
    version: 1,
    status: 'DRAFT',
    documentTypeCode: sourceVersion.documentTypeCode,
    perspective: sourceVersion.perspective,
    operationTypeCode: sourceVersion.operationTypeCode,
    priority: sourceVersion.priority || 0,
    applicability: sourceVersion.applicability ? JSON.parse(JSON.stringify(sourceVersion.applicability)) : null,
    legalBookCode: sourceVersion.legalBookCode || null,
    glosa: sourceVersion.glosa || '',
    requiredInputs: sourceVersion.requiredInputs ? [...sourceVersion.requiredInputs] : [],
    lines: JSON.parse(JSON.stringify(sourceVersion.lines || [])),
    testCases: JSON.parse(JSON.stringify(sourceVersion.testCases || [])),
    lastTestRun: null,
    diffFromPrevious: null,
    createdBy,
    createdAt
  };

  return {
    id: templateId,
    code: newCode || `${source.code}_COPY`,
    name: newName || `Copia de ${source.name}`,
    scope: 'TENANT',
    tenantId,
    duplicatedFrom: source.id || source.code,
    retiredAt: null,
    createdBy,
    createdAt,
    versions: [v1]
  };
}

/**
 * Modifica la definición de una versión en borrador (DRAFT).
 * @param {import('./types.js').ASTTemplate} template
 * @param {number} versionNumber
 * @param {Object} definition
 * @returns {{ ok: boolean, template?: import('./types.js').ASTTemplate, version?: import('./types.js').TemplateVersion, code?: string, message?: string }}
 */
export function saveDraft(template, versionNumber, definition) {
  if (!template || !template.versions) {
    return { ok: false, code: 'NOT_FOUND', message: 'Plantilla no encontrada' };
  }

  const vIndex = template.versions.findIndex(v => v.version === versionNumber);
  if (vIndex < 0) {
    return { ok: false, code: 'NOT_FOUND', message: `Versión ${versionNumber} no encontrada en la plantilla` };
  }

  const currentVersion = template.versions[vIndex];
  if (currentVersion.status !== 'DRAFT') {
    return { ok: false, code: 'NOT_EDITABLE', message: 'Solo se pueden modificar versiones en estado DRAFT (RD-10)' };
  }

  // Actualizar propiedades de cabecera en el template si se proveen
  if (definition.name) template.name = definition.name;
  if (definition.code) template.code = definition.code;

  // Actualizar versión
  const updatedVersion = {
    ...currentVersion,
    ...definition,
    version: currentVersion.version,
    status: 'DRAFT',
    createdBy: currentVersion.createdBy,
    createdAt: currentVersion.createdAt
  };

  if (definition.lines) {
    updatedVersion.lines = JSON.parse(JSON.stringify(definition.lines));
  }
  if (definition.testCases) {
    updatedVersion.testCases = JSON.parse(JSON.stringify(definition.testCases));
  }

  template.versions[vIndex] = updatedVersion;

  return {
    ok: true,
    template,
    version: updatedVersion
  };
}

/**
 * Determina si una plantilla y versión pueden ser editadas.
 * @param {import('./types.js').ASTTemplate|Object} template
 * @param {import('./types.js').TemplateVersion|Object} version
 * @param {number} [usageTotal=0]
 * @param {Array<Object>} [activations=[]]
 * @returns {{ editable: boolean, reason?: string }}
 */
export function canEdit(template, version, usageTotal = 0, activations = []) {
  if (template?.scope === 'PACK') {
    return { editable: false, reason: 'Las plantillas base de paquete son inmutables y de solo lectura' };
  }

  if (template?.retiredAt) {
    return { editable: false, reason: 'La plantilla ha sido retirada del catálogo' };
  }

  if (version?.status !== 'DRAFT') {
    return { editable: false, reason: 'Solo se pueden editar versiones en estado borrador (DRAFT)' };
  }

  if (usageTotal > 0) {
    return { editable: false, reason: 'La versión ya registra asientos contables generados (RD-10)' };
  }

  return { editable: true };
}

/**
 * Serializa de forma determinista cualquier objeto ordenando recursivamente todas sus claves.
 * @param {any} val
 * @returns {string}
 */
export function canonicalJson(val) {
  if (val === null || val === undefined || typeof val !== 'object') {
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    return '[' + val.map(item => canonicalJson(item)).join(',') + ']';
  }
  const keys = Object.keys(val).sort();
  return '{' + keys.map(k => `${JSON.stringify(k)}:${canonicalJson(val[k])}`).join(',') + '}';
}

/**
 * Devuelve la representación JSON canónica de una definición de plantilla para cálculo de hash.
 * @param {import('./types.js').TemplateVersion|Object} version
 * @returns {string}
 */
export function contentForHash(version) {
  if (!version) return '';
  const content = {
    documentTypeCode: version.documentTypeCode,
    perspective: version.perspective,
    operationTypeCode: version.operationTypeCode,
    priority: version.priority ?? 0,
    applicability: version.applicability || null,
    legalBookCode: version.legalBookCode || null,
    glosa: version.glosa || '',
    requiredInputs: version.requiredInputs || [],
    lines: version.lines || [],
    testCases: version.testCases || []
  };
  return canonicalJson(content);
}

/**
 * Verifica si una versión de plantilla cumple todas las condiciones para ser activada en una empresa.
 * Conforme a contracts/domain-api.md §6.
 *
 * @param {Object} params
 * @param {import('./types.js').ASTTemplate|Object} params.template
 * @param {import('./types.js').TemplateVersion|Object} params.version
 * @param {import('./types.js').TestRun|null} params.lastTestRun
 * @param {string} params.currentHash
 * @param {{ ok: boolean, unresolved?: Array<any> }} params.accountCheck
 * @param {Array<Object>} [params.activeInTenant=[]]
 * @returns {{ ok: boolean, errors: Array<{ code: string, message: string, details?: any }> }}
 */
export function checkActivation({ template, version, lastTestRun, currentHash, accountCheck, activeInTenant = [] }) {
  const errors = [];

  // 1. Plantilla no retirada
  if (template?.retiredAt) {
    errors.push({
      code: 'TEMPLATE_RETIRED',
      message: 'La plantilla ha sido retirada del catálogo'
    });
  }

  // 2. Casos de prueba presentes
  const testCases = version?.testCases || [];
  if (testCases.length === 0) {
    errors.push({
      code: 'NO_TEST_CASES',
      message: 'La plantilla no tiene casos de prueba definidos'
    });
  }

  // 3. Ejecución de pruebas registrada y en verde
  if (!lastTestRun) {
    errors.push({
      code: 'NO_TEST_RUN',
      message: 'La versión no tiene una ejecución de pruebas registrada'
    });
  } else {
    if (currentHash && lastTestRun.contentHash !== currentHash) {
      errors.push({
        code: 'HASH_MISMATCH',
        message: 'La versión ha sido modificada desde la última ejecución de pruebas'
      });
    }

    const results = lastTestRun.results || [];
    if (results.length === 0 || !results.every(r => r.status === 'PASS')) {
      errors.push({
        code: 'TESTS_FAILED',
        message: 'Uno o más casos de prueba no pasaron exitosamente'
      });
    }
  }

  // 4. Cuentas resueltas
  if (!accountCheck || !accountCheck.ok || (accountCheck.unresolved && accountCheck.unresolved.length > 0)) {
    errors.push({
      code: 'ACCOUNTS_UNRESOLVED',
      message: 'La plantilla contiene cuentas o roles no resueltos en el mapa de la empresa',
      details: { unresolved: accountCheck?.unresolved || [] }
    });
  }

  // 5. Sin conflicto de ambigüedad (misma terna, mismo alcance y misma prioridad en otra plantilla)
  const templateId = template?.id || template?.code;
  const scope = template?.scope || 'TENANT';
  const priority = version?.priority ?? 0;

  for (const active of activeInTenant) {
    const activeTemplateId = active.templateId || active.id;
    if (activeTemplateId === templateId) {
      // Es una versión previa de la misma plantilla; se superará al activar
      continue;
    }

    const sameTerna =
      active.documentTypeCode === version.documentTypeCode &&
      active.perspective === version.perspective &&
      active.operationTypeCode === version.operationTypeCode;

    const sameScope = (active.scope || 'TENANT') === scope;
    const samePriority = (active.priority ?? 0) === priority;

    if (sameTerna && sameScope && samePriority) {
      errors.push({
        code: 'AMBIGUOUS_CONFLICT',
        message: `Existe otra plantilla activa (${active.templateCode || active.code || activeTemplateId}) con la misma terna, alcance y prioridad (${priority})`,
        details: { conflictingTemplateId: activeTemplateId }
      });
    }
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

/**
 * Crea una nueva versión DRAFT v(n+1) a partir de una versión existente (RD-10).
 * Copia profundamente líneas, casos de prueba y aplicabilidad, reiniciando lastTestRun y diffFromPrevious.
 *
 * @param {import('./types.js').TemplateVersion} version - Versión de origen
 * @param {{ createdBy: string, createdAt: string }} options
 * @returns {import('./types.js').TemplateVersion}
 */
export function nextVersionFrom(version, { createdBy, createdAt }) {
  const nextVerNum = (version?.version || 1) + 1;

  return {
    version: nextVerNum,
    status: 'DRAFT',
    documentTypeCode: version.documentTypeCode,
    perspective: version.perspective,
    operationTypeCode: version.operationTypeCode,
    priority: version.priority ?? 0,
    applicability: version.applicability ? JSON.parse(JSON.stringify(version.applicability)) : null,
    legalBookCode: version.legalBookCode || null,
    glosa: version.glosa ? JSON.parse(JSON.stringify(version.glosa)) : '',
    requiredInputs: Array.isArray(version.requiredInputs) ? [...version.requiredInputs] : [],
    lines: JSON.parse(JSON.stringify(version.lines || [])),
    testCases: JSON.parse(JSON.stringify(version.testCases || [])),
    lastTestRun: null,
    diffFromPrevious: null,
    createdBy,
    createdAt
  };
}

