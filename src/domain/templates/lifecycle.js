/**
 * @fileoverview Ciclo de vida de plantillas y versiones (HU-08, RF-19, RF-21, R-22, data-model §4.1 - §4.2)
 */

import { validateTemplateHeader, validateTemplateVersion } from './schema.js';
import { validateAccounts } from './templateAccounts.js';
import { diffVersions } from './diff.js';

/**
 * Crea una nueva plantilla con versión 1 en estado DRAFT
 * @param {Object} header - { templateId, code, name, operationType, defaults }
 * @param {string} actor - Usuario que crea la plantilla
 * @param {Function} [clock] - Proveedor de tiempo ISO
 * @returns {import('./types.js').Template}
 */
export function createTemplate(header, actor, clock = () => new Date().toISOString()) {
  const headerValidation = validateTemplateHeader(header || {});
  if (!headerValidation.ok) {
    const err = new Error('Plantilla inválida: error en encabezado');
    err.code = 'TEMPLATE_INVALID';
    err.details = headerValidation.errors;
    throw err;
  }

  const now = clock();
  const templateId = header.templateId || `PL-${header.code}`;

  const v1 = {
    version: 1,
    status: 'DRAFT',
    basedOnVersion: null,
    defaults: header.defaults || {},
    documentRules: [],
    lineRules: [],
    testCases: [],
    lastTestRun: null,
    createdBy: actor,
    createdAt: now,
    updatedAt: now,
    activatedBy: null,
    activatedAt: null,
    diffFromPrevious: null,
    usageCount: 0
  };

  return {
    templateId,
    code: header.code,
    name: header.name,
    operationType: header.operationType,
    createdBy: actor,
    createdAt: now,
    retiredAt: null,
    versions: [v1]
  };
}

/**
 * Guarda o actualiza un borrador (DRAFT) de una versión de plantilla
 * @param {import('./types.js').Template} template
 * @param {number} versionNum
 * @param {Object} draft - { name?, defaults, documentRules, lineRules, testCases }
 * @param {string} actor
 * @param {Function} [clock]
 * @returns {import('./types.js').Template}
 */
export function saveDraft(template, versionNum, draft = {}, actor, clock = () => new Date().toISOString()) {
  if (!template || !Array.isArray(template.versions)) {
    const err = new Error('Plantilla inválida');
    err.code = 'TEMPLATE_INVALID';
    throw err;
  }

  const targetVersion = template.versions.find(v => v.version === versionNum);
  if (!targetVersion) {
    const err = new Error(`Versión ${versionNum} no encontrada`);
    err.code = 'TEMPLATE_NOT_FOUND';
    throw err;
  }

  if (targetVersion.status !== 'DRAFT') {
    const err = new Error(`Solo se pueden modificar versiones en estado DRAFT (estado actual: ${targetVersion.status})`);
    err.code = 'TEMPLATE_NOT_EDITABLE';
    throw err;
  }

  if (draft.name && typeof draft.name === 'string') {
    template.name = draft.name.trim();
  }

  if (draft.defaults) {
    targetVersion.defaults = draft.defaults;
  }
  if (Array.isArray(draft.documentRules)) {
    targetVersion.documentRules = draft.documentRules;
  }
  if (Array.isArray(draft.lineRules)) {
    targetVersion.lineRules = draft.lineRules;
  }
  if (Array.isArray(draft.testCases)) {
    targetVersion.testCases = draft.testCases;
  }

  const now = clock();
  targetVersion.updatedAt = now;
  targetVersion.lastTestRun = null; // Invalida las pruebas previas al modificar datos

  return template;
}

/**
 * Valida si una versión está lista para ser activada (CA-21.3)
 * @param {import('./types.js').TemplateVersion} version
 * @param {Record<string, Object>} [pcgeIndex={}]
 * @returns {{ ok: boolean, missing: string[], accountErrors: Array }}
 */
export function canActivate(version, pcgeIndex = {}) {
  const missing = [];

  // 1. Al menos un caso de prueba
  if (!Array.isArray(version.testCases) || version.testCases.length === 0) {
    missing.push('NO_TEST_CASES');
  }

  // 2. Ejecución de pruebas
  if (!version.lastTestRun) {
    missing.push('NO_TEST_RUN');
  } else {
    // Debe ser posterior o igual a la última modificación
    const testTime = new Date(version.lastTestRun.at).getTime();
    const updateTime = new Date(version.updatedAt).getTime();
    if (testTime < updateTime) {
      missing.push('OUTDATED_TEST_RUN');
    }

    if (!version.lastTestRun.allPassed) {
      missing.push('TESTS_FAILED');
    }

    if (Array.isArray(version.lastTestRun.uncoveredRuleIds) && version.lastTestRun.uncoveredRuleIds.length > 0) {
      missing.push('UNCOVERED_RULES');
    }
  }

  // 3. Cuentas válidas en el PCGE
  const accountErrors = validateAccounts(version, pcgeIndex);
  if (accountErrors.length > 0) {
    missing.push('ACCOUNT_ERRORS');
  }

  return {
    ok: missing.length === 0,
    missing,
    accountErrors
  };
}

/**
 * Pasa una versión DRAFT a ACTIVE y retira la versión ACTIVE anterior (CA-21.3, CA-22.3)
 * @param {import('./types.js').Template} template
 * @param {number} versionNum
 * @param {string} actor
 * @param {Function} [clock]
 * @param {Record<string, Object>} [pcgeIndex]
 * @returns {{ template: import('./types.js').Template, version: import('./types.js').TemplateVersion }}
 */
export function activate(template, versionNum, actor, clock = () => new Date().toISOString(), pcgeIndex = null) {
  if (!template || !Array.isArray(template.versions)) {
    const err = new Error('Plantilla inválida');
    err.code = 'TEMPLATE_INVALID';
    throw err;
  }

  const targetVersion = template.versions.find(v => v.version === versionNum);
  if (!targetVersion || targetVersion.status !== 'DRAFT') {
    const err = new Error(`Solo se pueden activar versiones en estado DRAFT`);
    err.code = 'TEMPLATE_NOT_DRAFT';
    throw err;
  }

  if (pcgeIndex) {
    const readiness = canActivate(targetVersion, pcgeIndex);
    if (!readiness.ok) {
      const err = new Error('La plantilla no cumple las condiciones para ser activada');
      err.code = 'TEMPLATE_NOT_READY';
      err.details = readiness.missing;
      throw err;
    }
  }

  const now = clock();

  // Buscar la versión activa anterior para calcular diferencias (CA-22.3)
  const previousActive = template.versions.find(v => v.status === 'ACTIVE' && v.version !== versionNum) ||
    template.versions.find(v => v.version === targetVersion.basedOnVersion);

  if (previousActive) {
    targetVersion.diffFromPrevious = diffVersions(previousActive, targetVersion);
  }

  // Pasar cualquier ACTIVE previa a RETIRED
  template.versions.forEach(v => {
    if (v.status === 'ACTIVE' && v.version !== versionNum) {
      v.status = 'RETIRED';
    }
  });

  targetVersion.status = 'ACTIVE';
  targetVersion.activatedBy = actor;
  targetVersion.activatedAt = now;
  template.retiredAt = null;

  return {
    template,
    version: targetVersion
  };
}

/**
 * Crea o devuelve un borrador para editar una plantilla (CA-22.2).
 * Si ya existe un DRAFT, lo devuelve. Si no, copia la versión ACTIVE (o la última) a DRAFT v(max+1) con basedOnVersion.
 * @param {import('./types.js').Template} template
 * @param {string} actor
 * @param {Function} [clock]
 * @returns {{ template: import('./types.js').Template, version: import('./types.js').TemplateVersion, created: boolean }}
 */
export function editTemplate(template, actor, clock = () => new Date().toISOString()) {
  if (!template || !Array.isArray(template.versions)) {
    const err = new Error('Plantilla inválida');
    err.code = 'TEMPLATE_INVALID';
    throw err;
  }

  // Si ya existe un DRAFT, lo devuelve directamente
  const existingDraft = template.versions.find(v => v.status === 'DRAFT');
  if (existingDraft) {
    return {
      template,
      version: existingDraft,
      created: false
    };
  }

  // Encontrar la versión base (la activa o la de mayor versión)
  const baseVersion = template.versions.find(v => v.status === 'ACTIVE') ||
    template.versions.reduce((max, v) => (v.version > max.version ? v : max), template.versions[0]);

  const maxVersion = template.versions.reduce((max, v) => Math.max(max, v.version), 0);
  const nextVersionNum = maxVersion + 1;
  const now = clock();

  const newDraft = {
    version: nextVersionNum,
    status: 'DRAFT',
    basedOnVersion: baseVersion?.version || null,
    defaults: JSON.parse(JSON.stringify(baseVersion?.defaults || {})),
    documentRules: JSON.parse(JSON.stringify(baseVersion?.documentRules || [])),
    lineRules: JSON.parse(JSON.stringify(baseVersion?.lineRules || [])),
    testCases: JSON.parse(JSON.stringify(baseVersion?.testCases || [])),
    lastTestRun: null,
    createdBy: actor,
    createdAt: now,
    updatedAt: now,
    activatedBy: null,
    activatedAt: null,
    diffFromPrevious: null,
    usageCount: 0
  };

  template.versions.push(newDraft);

  return {
    template,
    version: newDraft,
    created: true
  };
}

/**
 * Retira una plantilla sin reemplazo (CA-22.5).
 * La versión ACTIVE pasa a RETIRED y se fija retiredAt.
 * @param {import('./types.js').Template} template
 * @param {Function} [clock]
 * @returns {{ template: import('./types.js').Template }}
 */
export function retireTemplate(template, clock = () => new Date().toISOString()) {
  if (!template || !Array.isArray(template.versions)) {
    const err = new Error('Plantilla inválida');
    err.code = 'TEMPLATE_INVALID';
    throw err;
  }

  const now = clock();

  template.versions.forEach(v => {
    if (v.status === 'ACTIVE') {
      v.status = 'RETIRED';
    }
  });

  template.retiredAt = now;

  return {
    template
  };
}

/**
 * Elimina un borrador (DRAFT). Si era la única versión, la plantilla completa se elimina (CA-22.1).
 * @param {import('./types.js').Template} template
 * @param {number} versionNum
 * @returns {{ template: import('./types.js').Template|null, deleted: boolean, deletedVersion: number }}
 */
export function deleteDraft(template, versionNum) {
  if (!template || !Array.isArray(template.versions)) {
    const err = new Error('Plantilla inválida');
    err.code = 'TEMPLATE_INVALID';
    throw err;
  }

  const targetVersion = template.versions.find(v => v.version === versionNum);
  if (!targetVersion) {
    const err = new Error(`Versión ${versionNum} no encontrada`);
    err.code = 'TEMPLATE_NOT_FOUND';
    throw err;
  }

  if (targetVersion.status !== 'DRAFT') {
    const err = new Error(`Solo se pueden eliminar versiones en estado DRAFT (estado actual: ${targetVersion.status})`);
    err.code = 'TEMPLATE_NOT_EDITABLE';
    throw err;
  }

  template.versions = template.versions.filter(v => v.version !== versionNum);

  if (template.versions.length === 0) {
    return {
      template: null,
      deleted: true,
      deletedVersion: versionNum
    };
  }

  return {
    template,
    deleted: false,
    deletedVersion: versionNum
  };
}


