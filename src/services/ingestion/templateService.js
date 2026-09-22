/**
 * @fileoverview Servicio del Banco de Plantillas Global (HU-08, RF-19, RF-21, contracts/services.md §174-213)
 */

import * as repository from '../storage/repository.js';
import { serviceKit } from './serviceKit.js';
import { buildAuditEvent } from '../../domain/ingestion/audit.js';
import { mockPlanContable } from '../../data/mockPlanContable.js';
import { buildAccountIndex } from '../../domain/ingestion/accounts.js';
import { validateAccounts } from '../../domain/templates/templateAccounts.js';
import { validateTemplateVersion } from '../../domain/templates/schema.js';
import { runTestCases } from '../../domain/templates/testRunner.js';
import { initialActivations } from '../../domain/ingestion/templates.js';
import { 
  createTemplate as domainCreateTemplate,
  saveDraft as domainSaveDraft,
  canActivate as domainCanActivate,
  activate as domainActivate,
  deleteDraft as domainDeleteDraft,
  editTemplate as domainEditTemplate,
  retireTemplate as domainRetireTemplate
} from '../../domain/templates/lifecycle.js';

export function createTemplateService(deps = {}) {
  const repo = (deps && typeof deps.getCollection === 'function') ? deps : (deps.repo || repository);
  const clock = deps.clock || serviceKit.clock;
  const idGenerator = deps.idGenerator || serviceKit.idGenerator;
  const { ok, fail, authorize, validateCtx } = serviceKit;

  const pcgeIndex = buildAccountIndex(mockPlanContable);

  /**
   * Lista las plantillas del banco global
   * @param {Object} ctx
   * @param {Object} [options]
   * @param {boolean} [options.includeRetired=false]
   */
  async function listTemplateBank(ctx, { includeRetired = false } = {}) {
    const auth = authorize(ctx, 'LIST_TEMPLATE_BANK', repo, clock);
    if (!auth.ok) return auth;

    let templates = repo.getGlobal('templates') || [];

    if (!includeRetired) {
      templates = templates.filter(t => !t.retiredAt);
    }

    const summaries = templates.map(t => {
      const versions = t.versions || [];
      const activeV = versions.find(v => v.status === 'ACTIVE');
      const draftV = versions.find(v => v.status === 'DRAFT');

      return {
        templateId: t.templateId || t.id,
        code: t.code,
        name: t.name,
        operationType: t.operationType,
        activeVersion: activeV ? activeV.version : null,
        draftVersion: draftV ? draftV.version : null,
        retired: Boolean(t.retiredAt),
        versions: versions.map(v => ({
          version: v.version,
          status: v.status,
          activatedAt: v.activatedAt || null,
          usageCount: v.usageCount || 0
        }))
      };
    });

    return ok(summaries);
  }

  /**
   * Obtiene una plantilla completa por su ID
   * @param {Object} ctx
   * @param {Object} params
   * @param {string} params.templateId
   */
  async function getTemplate(ctx, { templateId } = {}) {
    const auth = authorize(ctx, 'GET_TEMPLATE', repo, clock);
    if (!auth.ok) return auth;

    if (!templateId) {
      return fail('VALIDATION_ERROR', 'templateId es obligatorio');
    }

    const templates = repo.getGlobal('templates') || [];
    const found = templates.find(t => t.templateId === templateId || t.id === templateId || t.code === templateId);

    if (!found) {
      return fail('NOT_FOUND', `Plantilla ${templateId} no encontrada`);
    }

    return ok(found);
  }

  /**
   * Crea una nueva plantilla con versión 1 en estado DRAFT
   * @param {Object} ctx
   * @param {Object} params
   */
  async function createTemplate(ctx, { code, name, operationType, defaults } = {}) {
    const auth = authorize(ctx, 'CREATE_TEMPLATE', repo, clock);
    if (!auth.ok) return auth;

    const templates = repo.getGlobal('templates') || [];

    // Validar código único
    if (code && templates.some(t => t.code === code.trim().toUpperCase())) {
      return fail('TEMPLATE_INVALID', 'El código de plantilla ya existe en el banco', [
        { path: 'code', message: `El código '${code}' ya se encuentra registrado` }
      ]);
    }

    let created;
    try {
      created = domainCreateTemplate({
        templateId: `PL-${code?.trim().toUpperCase()}`,
        code: code?.trim().toUpperCase(),
        name,
        operationType,
        defaults
      }, ctx.userId, clock);
    } catch (err) {
      return fail(err.code || 'TEMPLATE_INVALID', err.message, err.details);
    }

    templates.push(created);
    repo.setGlobal('templates', templates);

    const event = buildAuditEvent({
      id: idGenerator(),
      at: clock(),
      tenantId: 'global',
      traceId: idGenerator(),
      userId: ctx.userId,
      role: ctx.role,
      action: 'TEMPLATE_CREATED',
      entityType: 'Template',
      entityId: created.templateId,
      detail: { code: created.code, name: created.name }
    });
    repo.appendOnly('global', 'auditLog', [event]);

    return ok(created);
  }

  /**
   * Guarda o actualiza un borrador (DRAFT)
   * @param {Object} ctx
   * @param {Object} params
   */
  async function saveTemplateDraft(ctx, { templateId, version, draft } = {}) {
    const auth = authorize(ctx, 'SAVE_TEMPLATE_DRAFT', repo, clock);
    if (!auth.ok) return auth;

    const templates = repo.getGlobal('templates') || [];
    const template = templates.find(t => t.templateId === templateId || t.id === templateId);

    if (!template) {
      return fail('NOT_FOUND', `Plantilla ${templateId} no encontrada`);
    }

    const targetVersion = (template.versions || []).find(v => v.version === version);
    if (!targetVersion) {
      return fail('NOT_FOUND', `Versión ${version} de plantilla ${templateId} no encontrada`);
    }

    if (targetVersion.status !== 'DRAFT') {
      return fail('TEMPLATE_NOT_EDITABLE', 'Solo se pueden modificar versiones en estado DRAFT');
    }

    const mergedDefaults = draft?.defaults || targetVersion.defaults;
    const mergedDocRules = draft?.documentRules !== undefined ? draft.documentRules : targetVersion.documentRules;
    const mergedLineRules = draft?.lineRules !== undefined ? draft.lineRules : targetVersion.lineRules;
    const mergedTestCases = draft?.testCases !== undefined ? draft.testCases : targetVersion.testCases;

    const tempVersion = {
      ...targetVersion,
      defaults: mergedDefaults,
      documentRules: mergedDocRules,
      lineRules: mergedLineRules,
      testCases: mergedTestCases
    };

    const structValidation = validateTemplateVersion(tempVersion, { operationType: template.operationType });
    if (!structValidation.ok) {
      return fail('TEMPLATE_INVALID', 'Estructura de reglas o plantilla inválida', structValidation.errors);
    }

    const accountErrors = validateAccounts(tempVersion, pcgeIndex);

    try {
      domainSaveDraft(template, version, draft, ctx.userId, clock);
    } catch (err) {
      return fail(err.code || 'TEMPLATE_INVALID', err.message, err.details);
    }

    repo.setGlobal('templates', templates);

    const event = buildAuditEvent({
      id: idGenerator(),
      at: clock(),
      tenantId: 'global',
      traceId: idGenerator(),
      userId: ctx.userId,
      role: ctx.role,
      action: 'TEMPLATE_DRAFT_UPDATED',
      entityType: 'Template',
      entityId: template.templateId || templateId,
      detail: { version, accountErrorsCount: accountErrors.length }
    });
    repo.appendOnly('global', 'auditLog', [event]);

    return ok({
      template,
      version: targetVersion,
      accountErrors
    });
  }

  /**
   * Ejecuta los casos de prueba de una versión y guarda lastTestRun
   * @param {Object} ctx
   * @param {Object} params
   */
  async function runTemplateTests(ctx, { templateId, version } = {}) {
    const auth = authorize(ctx, 'RUN_TEMPLATE_TESTS', repo, clock);
    if (!auth.ok) return auth;

    const templates = repo.getGlobal('templates') || [];
    const template = templates.find(t => t.templateId === templateId || t.id === templateId);

    if (!template) {
      return fail('NOT_FOUND', `Plantilla ${templateId} no encontrada`);
    }

    const targetVersion = (template.versions || []).find(v => v.version === version);
    if (!targetVersion) {
      return fail('NOT_FOUND', `Versión ${version} no encontrada`);
    }

    const testRunResult = runTestCases(targetVersion, pcgeIndex, {
      clock,
      by: ctx.userId
    });

    targetVersion.lastTestRun = testRunResult;
    repo.setGlobal('templates', templates);

    const event = buildAuditEvent({
      id: idGenerator(),
      at: clock(),
      tenantId: 'global',
      traceId: idGenerator(),
      userId: ctx.userId,
      role: ctx.role,
      action: 'TEMPLATE_TESTS_RUN',
      entityType: 'Template',
      entityId: template.templateId || templateId,
      detail: { version, allPassed: testRunResult.allPassed }
    });
    repo.appendOnly('global', 'auditLog', [event]);

    return ok(testRunResult);
  }

  /**
   * Activa una versión DRAFT si cumple todas las condiciones (CA-21.3, CA-22.3)
   * @param {Object} ctx
   * @param {Object} params
   */
  async function activateTemplateVersion(ctx, { templateId, version } = {}) {
    const auth = authorize(ctx, 'ACTIVATE_TEMPLATE_VERSION', repo, clock);
    if (!auth.ok) return auth;

    const templates = repo.getGlobal('templates') || [];
    const template = templates.find(t => t.templateId === templateId || t.id === templateId);

    if (!template) {
      return fail('NOT_FOUND', `Plantilla ${templateId} no encontrada`);
    }

    const targetVersion = (template.versions || []).find(v => v.version === version);
    if (!targetVersion) {
      return fail('NOT_FOUND', `Versión ${version} no encontrada`);
    }

    const readiness = domainCanActivate(targetVersion, pcgeIndex);
    if (!readiness.ok) {
      return fail('TEMPLATE_NOT_READY', 'La versión no cumple con los requisitos para ser activada', readiness.missing);
    }

    let result;
    try {
      result = domainActivate(template, version, ctx.userId, clock, pcgeIndex);
    } catch (err) {
      return fail(err.code || 'TEMPLATE_NOT_READY', err.message, err.details);
    }

    repo.setGlobal('templates', templates);

    const event = buildAuditEvent({
      id: idGenerator(),
      at: clock(),
      tenantId: 'global',
      traceId: idGenerator(),
      userId: ctx.userId,
      role: ctx.role,
      action: 'TEMPLATE_VERSION_ACTIVATED',
      entityType: 'Template',
      entityId: template.templateId || templateId,
      detail: { version, activatedBy: ctx.userId }
    });
    repo.appendOnly('global', 'auditLog', [event]);

    return ok(result);
  }

  /**
   * Elimina una versión DRAFT de la plantilla (CA-22.1)
   * @param {Object} ctx
   * @param {Object} params
   */
  async function deleteTemplateDraft(ctx, { templateId, version } = {}) {
    const auth = authorize(ctx, 'DELETE_TEMPLATE_DRAFT', repo, clock);
    if (!auth.ok) return auth;

    let templates = repo.getGlobal('templates') || [];
    const template = templates.find(t => t.templateId === templateId || t.id === templateId);

    if (!template) {
      return fail('NOT_FOUND', `Plantilla ${templateId} no encontrada`);
    }

    let deleteResult;
    try {
      deleteResult = domainDeleteDraft(template, version);
    } catch (err) {
      return fail(err.code || 'TEMPLATE_NOT_EDITABLE', err.message);
    }

    if (deleteResult.deleted) {
      templates = templates.filter(t => (t.templateId || t.id) !== (template.templateId || template.id));
    }
    repo.setGlobal('templates', templates);

    const event = buildAuditEvent({
      id: idGenerator(),
      at: clock(),
      tenantId: 'global',
      traceId: idGenerator(),
      userId: ctx.userId,
      role: ctx.role,
      action: 'TEMPLATE_DRAFT_DELETED',
      entityType: 'Template',
      entityId: template.templateId || templateId,
      detail: { version, templateDeleted: deleteResult.deleted }
    });
    repo.appendOnly('global', 'auditLog', [event]);

    return ok({ deleted: true, templateDeleted: deleteResult.deleted });
  }

  /**
   * Crea o devuelve un borrador para editar una versión activa (CA-22.2)
   * @param {Object} ctx
   * @param {Object} params
   * @param {string} params.templateId
   */
  async function editTemplate(ctx, { templateId } = {}) {
    const auth = authorize(ctx, 'EDIT_TEMPLATE', repo, clock);
    if (!auth.ok) return auth;

    const templates = repo.getGlobal('templates') || [];
    const template = templates.find(t => t.templateId === templateId || t.id === templateId);

    if (!template) {
      return fail('NOT_FOUND', `Plantilla ${templateId} no encontrada`);
    }

    let result;
    try {
      result = domainEditTemplate(template, ctx.userId, clock);
    } catch (err) {
      return fail(err.code || 'TEMPLATE_INVALID', err.message);
    }

    if (result.created) {
      repo.setGlobal('templates', templates);

      const event = buildAuditEvent({
        id: idGenerator(),
        at: clock(),
        tenantId: 'global',
        traceId: idGenerator(),
        userId: ctx.userId,
        role: ctx.role,
        action: 'TEMPLATE_DRAFT_CREATED',
        entityType: 'Template',
        entityId: template.templateId || templateId,
        detail: { version: result.version.version, basedOnVersion: result.version.basedOnVersion }
      });
      repo.appendOnly('global', 'auditLog', [event]);
    }

    return ok(result);
  }

  /**
   * Retira una plantilla sin reemplazo (CA-22.5)
   * @param {Object} ctx
   * @param {Object} params
   * @param {string} params.templateId
   */
  async function retireTemplate(ctx, { templateId } = {}) {
    const auth = authorize(ctx, 'RETIRE_TEMPLATE', repo, clock);
    if (!auth.ok) return auth;

    const templates = repo.getGlobal('templates') || [];
    const template = templates.find(t => t.templateId === templateId || t.id === templateId);

    if (!template) {
      return fail('NOT_FOUND', `Plantilla ${templateId} no encontrada`);
    }

    let result;
    try {
      result = domainRetireTemplate(template, clock);
    } catch (err) {
      return fail(err.code || 'TEMPLATE_INVALID', err.message);
    }

    repo.setGlobal('templates', templates);

    const event = buildAuditEvent({
      id: idGenerator(),
      at: clock(),
      tenantId: 'global',
      traceId: idGenerator(),
      userId: ctx.userId,
      role: ctx.role,
      action: 'TEMPLATE_RETIRED',
      entityType: 'Template',
      entityId: template.templateId || templateId,
      detail: { retiredAt: template.retiredAt }
    });
    repo.appendOnly('global', 'auditLog', [event]);

    return ok(result);
  }

  /**
   * Lista las plantillas del banco con su estado de activación para la empresa del contexto
   * y las advertencias de cuentas recalculadas contra el catálogo vigente de la empresa.
   * (HU-10, CA-23.1, CA-23.2)
   * @param {Object} ctx
   */
  async function listCompanyTemplateActivations(ctx) {
    const validCtx = validateCtx(ctx, repo);
    if (!validCtx.ok) return validCtx;

    const auth = authorize(ctx, 'LIST_COMPANY_TEMPLATE_ACTIVATIONS', repo, clock);
    if (!auth.ok) return auth;

    const empresa = repo.getGlobal('empresas')?.find(e => e.id === ctx.tenantId);
    if (!empresa) return fail('NOT_FOUND', 'Empresa no encontrada');

    const bank = repo.getGlobal('templates') || [];
    let activations = repo.getCollection(ctx.tenantId, 'templateActivations');

    if (!activations) {
      activations = initialActivations(empresa, clock);
      repo.setCollection(ctx.tenantId, 'templateActivations', activations);
    }

    const rawCatalog = repo.getCollection(ctx.tenantId, 'chartOfAccounts') || [];
    const companyIndex = buildAccountIndex(rawCatalog);

    const items = bank.map(t => {
      const activeV = (t.versions || []).find(v => v.status === 'ACTIVE');
      const isRetired = Boolean(t.retiredAt);
      const tid = t.templateId || t.id;
      const act = activations.find(a => a.templateId === tid);
      const active = Boolean(act?.active);
      const activatedBy = act?.activatedBy || null;
      const activatedAt = act?.activatedAt || null;
      const warnings = activeV ? validateAccounts(activeV, companyIndex) : [];

      return {
        templateId: tid,
        code: t.code,
        name: t.name,
        operationType: t.operationType,
        activeVersion: activeV ? activeV.version : null,
        retired: isRetired,
        active,
        activatedBy,
        activatedAt,
        accountWarnings: warnings
      };
    });

    return ok(items);
  }

  /**
   * Activa o desactiva una plantilla para la empresa del contexto
   * (HU-10, CA-23.1 a CA-23.4)
   * @param {Object} ctx
   * @param {Object} params
   * @param {string} params.templateId
   * @param {boolean} params.active
   */
  async function setCompanyTemplateActivation(ctx, { templateId, active } = {}) {
    const validCtx = validateCtx(ctx, repo);
    if (!validCtx.ok) return validCtx;

    const auth = authorize(ctx, 'SET_COMPANY_TEMPLATE_ACTIVATION', repo, clock);
    if (!auth.ok) return auth;

    if (!templateId || typeof active !== 'boolean') {
      return fail('VALIDATION_ERROR', 'Parámetros inválidos: se requiere templateId y active (booleano)');
    }

    const empresa = repo.getGlobal('empresas')?.find(e => e.id === ctx.tenantId);
    if (!empresa) return fail('NOT_FOUND', 'Empresa no encontrada');

    const bank = repo.getGlobal('templates') || [];
    const tpl = bank.find(t => (t.templateId || t.id) === templateId);
    if (!tpl) return fail('NOT_FOUND', 'Plantilla no encontrada');

    const activeVer = (tpl.versions || []).find(v => v.status === 'ACTIVE');

    if (active === true) {
      if (!activeVer || tpl.retiredAt) {
        return fail('TEMPLATE_NOT_ACTIVE', 'La plantilla no tiene una versión activa o está retirada');
      }
    }

    let activations = repo.getCollection(ctx.tenantId, 'templateActivations');
    if (!activations) {
      activations = initialActivations(empresa, clock);
    }

    const rawCatalog = repo.getCollection(ctx.tenantId, 'chartOfAccounts') || [];
    const companyIndex = buildAccountIndex(rawCatalog);
    const warnings = activeVer ? validateAccounts(activeVer, companyIndex) : [];

    const now = clock();
    const updatedActivation = {
      templateId,
      active,
      activatedBy: ctx.userId,
      activatedAt: now,
      accountWarnings: warnings
    };

    const idx = activations.findIndex(a => a.templateId === templateId);
    if (idx >= 0) {
      activations[idx] = { ...activations[idx], ...updatedActivation };
    } else {
      activations.push(updatedActivation);
    }

    repo.setCollection(ctx.tenantId, 'templateActivations', activations);

    const auditEvent = buildAuditEvent({
      id: idGenerator(),
      at: now,
      tenantId: ctx.tenantId,
      traceId: idGenerator(),
      userId: ctx.userId,
      role: ctx.role,
      action: active ? 'TEMPLATE_COMPANY_ACTIVATED' : 'TEMPLATE_COMPANY_DEACTIVATED',
      entityType: 'TemplateActivation',
      entityId: templateId,
      detail: { active, accountWarnings: warnings }
    });
    repo.appendOnly(ctx.tenantId, 'auditLog', [auditEvent]);

    return ok(updatedActivation);
  }

  return {
    listTemplateBank,
    getTemplate,
    createTemplate,
    saveTemplateDraft,
    runTemplateTests,
    activateTemplateVersion,
    deleteTemplateDraft,
    editTemplate,
    retireTemplate,
    listCompanyTemplateActivations,
    setCompanyTemplateActivation
  };
}

export const defaultTemplateService = createTemplateService();

