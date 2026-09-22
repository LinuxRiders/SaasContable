/**
 * @fileoverview Lógica de plantillas ofrecidas y activaciones por empresa (R-11, data-model §4.5, CA-23.3)
 */

import { templateIdsForActiveIds } from '../../data/mockCategoriasPlantilla.js';

/**
 * Genera la lista de activaciones iniciales para una empresa mediante migración perezosa
 * @param {Object} empresa
 * @param {Function} [clock]
 * @returns {import('../templates/types.js').TemplateActivation[]}
 */
export function initialActivations(empresa, clock = () => new Date().toISOString()) {
  const activeIds = empresa?.plantillasActivasIds || [];
  const templateIds = templateIdsForActiveIds(activeIds);
  const now = clock();

  return templateIds.map(tId => ({
    templateId: tId,
    active: true,
    activatedBy: 'MIGRATION',
    activatedAt: now,
    accountWarnings: []
  }));
}

/**
 * Encuentra la versión activa (status === 'ACTIVE') de una plantilla
 * @param {import('../templates/types.js').Template} template
 * @returns {import('../templates/types.js').TemplateVersion|null}
 */
export function resolveActiveVersion(template) {
  if (!template || !Array.isArray(template.versions)) return null;
  return template.versions.find(v => v.status === 'ACTIVE') || null;
}

/**
 * Filtra las plantillas ofrecidas para la empresa:
 * Aquellas con active === true en activations, que no estén retiradas globalmente y que tengan versión ACTIVE
 * @param {import('../templates/types.js').Template[]} bank
 * @param {import('../templates/types.js').TemplateActivation[]} activations
 * @returns {import('../templates/types.js').Template[]}
 */
export function offeredTemplates(bank = [], activations = []) {
  const activeSet = new Set(
    activations.filter(a => a.active === true).map(a => a.templateId)
  );

  return bank.filter(tpl => {
    if (!activeSet.has(tpl.templateId)) return false;
    if (tpl.retiredAt) return false;
    const activeVer = resolveActiveVersion(tpl);
    return Boolean(activeVer);
  });
}

/**
 * Valida que una plantilla esté ofrecida para la empresa; si no, arroja TEMPLATE_NOT_ACTIVE
 * @param {string} templateId
 * @param {import('../templates/types.js').Template[]} bank
 * @param {import('../templates/types.js').TemplateActivation[]} activations
 * @returns {import('../templates/types.js').Template}
 */
export function assertTemplateOffered(templateId, bank = [], activations = []) {
  const offered = offeredTemplates(bank, activations);
  const found = offered.find(t => t.templateId === templateId);
  if (!found) {
    const err = new Error(`TEMPLATE_NOT_ACTIVE: La plantilla '${templateId}' no está activada o no tiene versión activa`);
    err.code = 'TEMPLATE_NOT_ACTIVE';
    throw err;
  }
  return found;
}
