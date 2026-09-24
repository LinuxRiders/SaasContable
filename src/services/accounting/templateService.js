import * as defaultRepo from '../storage/repository.js';
import { ok, fail, withLatency, authorize, sha256 } from '../ingestion/serviceKit.js';
import { buildAuditEvent } from '../../domain/ingestion/audit.js';
import { resolveTenantContext } from './context.js';
import { validateTemplateVersion } from '../../domain/accounting/templateValidation.js';
import { newTemplate, duplicateTemplate as dupTemplateDomain, saveDraft, canEdit, contentForHash, checkActivation, nextVersionFrom } from '../../domain/accounting/templateLifecycle.js';
import { runTests } from '../../domain/accounting/testRunner.js';
import { checkTemplateAccounts } from '../../domain/accounting/accountResolution.js';
import { diffVersions } from '../../domain/accounting/templateDiff.js';
import { accountingEngine } from './simulationService.js';

/**
 * Lista las plantillas contables (PACK y TENANT) disponibles para la empresa.
 * @param {Object} ctx - Contexto { tenantId, userId, role }
 * @param {{ documentTypeCode?: string, scope?: string, includeRetired?: boolean }} [filter]
 * @param {Object} [repo] - Repositorio inyectado
 */
export async function listTemplates(ctx, { documentTypeCode, scope, includeRetired = false } = {}, repo = defaultRepo) {
  const settings = repo.getGlobal('demoSettings');
  await withLatency(settings);

  const authRes = authorize(ctx, 'VIEW_ACCOUNTING_CONFIG', repo);
  if (!authRes.ok) return authRes;

  const ctxRes = resolveTenantContext(repo, ctx);
  if (!ctxRes.ok) return ctxRes;
  const { pack } = ctxRes.data;

  const tenantTemplates = repo.getCollection(ctx.tenantId, 'templates') || [];
  const activations = repo.getCollection(ctx.tenantId, 'templateActivations') || [];
  const usageMap = repo.getCollection(ctx.tenantId, 'templateUsage') || {};

  // Normalizar plantillas base de paquete
  const baseTemplates = (pack.baseTemplates || []).map(t => ({
    id: t.id || t.code,
    code: t.code,
    name: t.name,
    scope: 'PACK',
    tenantId: null,
    duplicatedFrom: null,
    retiredAt: null,
    createdBy: 'system',
    createdAt: t.createdAt || '2026-01-01T00:00:00Z',
    versions: [
      {
        version: t.version || 1,
        status: 'PUBLISHED',
        documentTypeCode: t.documentTypeCode,
        perspective: t.perspective,
        operationTypeCode: t.operationTypeCode,
        priority: t.priority || 0,
        applicability: t.applicability || null,
        legalBookCode: t.legalBookCode || null,
        glosa: t.glosa || '',
        requiredInputs: t.requiredInputs || [],
        lines: t.lines || [],
        testCases: t.testCases || [],
        lastTestRun: null,
        diffFromPrevious: null,
        createdBy: 'system',
        createdAt: t.createdAt || '2026-01-01T00:00:00Z'
      }
    ]
  }));

  const all = [...baseTemplates, ...tenantTemplates];

  const filtered = all.filter(t => {
    if (!includeRetired && t.retiredAt) return false;
    if (scope && t.scope !== scope) return false;
    const latestVersion = t.versions[t.versions.length - 1];
    if (documentTypeCode && latestVersion.documentTypeCode !== documentTypeCode) return false;
    return true;
  });

  const enriched = filtered.map(t => {
    const latestVersion = t.versions[t.versions.length - 1];
    const activation = activations.find(a => a.templateId === t.id && a.version === latestVersion.version);
    const usage = usageMap[`${t.id}@${latestVersion.version}`] || 0;

    return {
      id: t.id,
      code: t.code,
      name: t.name,
      scope: t.scope,
      tenantId: t.tenantId,
      duplicatedFrom: t.duplicatedFrom,
      retiredAt: t.retiredAt,
      version: latestVersion.version,
      status: latestVersion.status,
      documentTypeCode: latestVersion.documentTypeCode,
      perspective: latestVersion.perspective,
      operationTypeCode: latestVersion.operationTypeCode,
      priority: latestVersion.priority,
      legalBookCode: latestVersion.legalBookCode,
      activationStatus: activation ? activation.status : 'INACTIVE',
      usageCount: usage,
      versionsCount: t.versions.length
    };
  });

  return ok(enriched);
}

/**
 * Obtiene el detalle completo de una plantilla contable.
 * @param {Object} ctx - Contexto { tenantId, userId, role }
 * @param {{ templateId: string }} params
 * @param {Object} [repo] - Repositorio inyectado
 */
export async function getTemplate(ctx, { templateId }, repo = defaultRepo) {
  const settings = repo.getGlobal('demoSettings');
  await withLatency(settings);

  const authRes = authorize(ctx, 'VIEW_ACCOUNTING_CONFIG', repo);
  if (!authRes.ok) return authRes;

  const ctxRes = resolveTenantContext(repo, ctx);
  if (!ctxRes.ok) return ctxRes;
  const { pack } = ctxRes.data;

  let template = null;
  const baseTpl = (pack.baseTemplates || []).find(t => (t.id || t.code) === templateId || t.code === templateId);

  if (baseTpl) {
    template = {
      id: baseTpl.id || baseTpl.code,
      code: baseTpl.code,
      name: baseTpl.name,
      scope: 'PACK',
      tenantId: null,
      duplicatedFrom: null,
      retiredAt: null,
      createdBy: 'system',
      createdAt: baseTpl.createdAt || '2026-01-01T00:00:00Z',
      versions: [
        {
          version: baseTpl.version || 1,
          status: 'PUBLISHED',
          documentTypeCode: baseTpl.documentTypeCode,
          perspective: baseTpl.perspective,
          operationTypeCode: baseTpl.operationTypeCode,
          priority: baseTpl.priority || 0,
          applicability: baseTpl.applicability || null,
          legalBookCode: baseTpl.legalBookCode || null,
          glosa: baseTpl.glosa || '',
          requiredInputs: baseTpl.requiredInputs || [],
          lines: baseTpl.lines || [],
          testCases: baseTpl.testCases || [],
          lastTestRun: null,
          diffFromPrevious: null,
          createdBy: 'system',
          createdAt: baseTpl.createdAt || '2026-01-01T00:00:00Z'
        }
      ]
    };
  } else {
    const tenantTemplates = repo.getCollection(ctx.tenantId, 'templates') || [];
    template = tenantTemplates.find(t => t.id === templateId || t.code === templateId);
  }

  if (!template) {
    return fail('NOT_FOUND', `Plantilla con ID '${templateId}' no encontrada`);
  }

  const activations = repo.getCollection(ctx.tenantId, 'templateActivations') || [];
  const usageMap = repo.getCollection(ctx.tenantId, 'templateUsage') || {};

  return ok({
    ...template,
    activations: activations.filter(a => a.templateId === template.id),
    usageMap
  });
}

/**
 * Crea una nueva plantilla contable propia para la empresa (alcance TENANT).
 * @param {Object} ctx - Contexto { tenantId, userId, role }
 * @param {{ definition: Object }} params
 * @param {Object} [repo] - Repositorio inyectado
 */
export async function createTemplate(ctx, { definition }, repo = defaultRepo) {
  const settings = repo.getGlobal('demoSettings');
  await withLatency(settings);

  const authRes = authorize(ctx, 'EDIT_TEMPLATES', repo);
  if (!authRes.ok) return authRes;

  const ctxRes = resolveTenantContext(repo, ctx);
  if (!ctxRes.ok) return ctxRes;
  const { pack } = ctxRes.data;

  // 1. Validar la versión inicial
  const valRes = validateTemplateVersion(definition, { pack, scope: 'TENANT' });
  if (!valRes.ok) {
    return fail('EXPRESSION_INVALID', 'La definición de la plantilla contiene errores de validación', { errors: valRes.errors, warnings: valRes.warnings });
  }

  // 2. Construir modelo de dominio
  const tpl = newTemplate({
    definition,
    tenantId: ctx.tenantId,
    createdBy: ctx.userId,
    createdAt: new Date().toISOString()
  });

  // 3. Persistir en la colección de plantillas del tenant
  const tenantTemplates = repo.getCollection(ctx.tenantId, 'templates') || [];
  tenantTemplates.push(tpl);
  repo.setCollection(ctx.tenantId, 'templates', tenantTemplates);

  // 4. Registrar evento de auditoría
  const auditEvent = buildAuditEvent({
    id: crypto.randomUUID(),
    at: tpl.createdAt,
    tenantId: ctx.tenantId,
    traceId: crypto.randomUUID(),
    userId: ctx.userId,
    role: ctx.role,
    action: 'TEMPLATE_CREATED',
    entityType: 'ASTTemplate',
    entityId: tpl.id,
    detail: {
      code: tpl.code,
      name: tpl.name,
      documentTypeCode: definition.documentTypeCode,
      operationTypeCode: definition.operationTypeCode
    }
  });
  repo.appendOnly(ctx.tenantId, 'auditLog', [auditEvent]);

  return ok(tpl);
}

/**
 * Duplica una plantilla existente (PACK o TENANT) como una nueva plantilla propia del tenant.
 * @param {Object} ctx - Contexto { tenantId, userId, role }
 * @param {{ templateId: string, version?: number, newCode?: string, newName?: string }} params
 * @param {Object} [repo] - Repositorio inyectado
 */
export async function duplicateTemplate(ctx, { templateId, version = 1, newCode, newName }, repo = defaultRepo) {
  const settings = repo.getGlobal('demoSettings');
  await withLatency(settings);

  const authRes = authorize(ctx, 'EDIT_TEMPLATES', repo);
  if (!authRes.ok) return authRes;

  const getRes = await getTemplate(ctx, { templateId }, repo);
  if (!getRes.ok) return getRes;
  const sourceTemplate = getRes.data;

  const duplicated = dupTemplateDomain(sourceTemplate, version, {
    tenantId: ctx.tenantId,
    createdBy: ctx.userId,
    createdAt: new Date().toISOString(),
    newCode,
    newName
  });

  const tenantTemplates = repo.getCollection(ctx.tenantId, 'templates') || [];
  tenantTemplates.push(duplicated);
  repo.setCollection(ctx.tenantId, 'templates', tenantTemplates);

  const auditEvent = buildAuditEvent({
    id: crypto.randomUUID(),
    at: duplicated.createdAt,
    tenantId: ctx.tenantId,
    traceId: crypto.randomUUID(),
    userId: ctx.userId,
    role: ctx.role,
    action: 'TEMPLATE_DUPLICATED',
    entityType: 'ASTTemplate',
    entityId: duplicated.id,
    detail: {
      duplicatedFrom: sourceTemplate.id,
      code: duplicated.code,
      name: duplicated.name
    }
  });
  repo.appendOnly(ctx.tenantId, 'auditLog', [auditEvent]);

  return ok(duplicated);
}

/**
 * Guarda un borrador de una versión de plantilla contable de la empresa.
 * @param {Object} ctx - Contexto { tenantId, userId, role }
 * @param {{ templateId: string, version: number, definition: Object }} params
 * @param {Object} [repo] - Repositorio inyectado
 */
export async function saveTemplateDraft(ctx, { templateId, version, definition }, repo = defaultRepo) {
  const settings = repo.getGlobal('demoSettings');
  await withLatency(settings);

  const authRes = authorize(ctx, 'EDIT_TEMPLATES', repo);
  if (!authRes.ok) return authRes;

  const ctxRes = resolveTenantContext(repo, ctx);
  if (!ctxRes.ok) return ctxRes;
  const { pack } = ctxRes.data;

  const tenantTemplates = repo.getCollection(ctx.tenantId, 'templates') || [];
  const tIndex = tenantTemplates.findIndex(t => t.id === templateId || t.code === templateId);

  if (tIndex < 0) {
    // Si la plantilla es PACK, no está en tenantTemplates
    const isPack = (pack.baseTemplates || []).some(t => (t.id || t.code) === templateId || t.code === templateId);
    if (isPack) {
      return fail('NOT_EDITABLE', 'Las plantillas del paquete de jurisdicción son inmutables (solo lectura)');
    }
    return fail('NOT_FOUND', `Plantilla '${templateId}' no encontrada en la empresa`);
  }

  const template = tenantTemplates[tIndex];
  const vObj = template.versions.find(v => v.version === version);
  if (!vObj) {
    return fail('NOT_FOUND', `Versión ${version} no encontrada en la plantilla`);
  }

  // 1. Validar si es editable
  const usageMap = repo.getCollection(ctx.tenantId, 'templateUsage') || {};
  const usageCount = usageMap[`${template.id}@${version}`] || 0;
  const editCheck = canEdit(template, vObj, usageCount);
  if (!editCheck.editable) {
    return fail('NOT_EDITABLE', editCheck.reason);
  }

  // 2. Validar versión combinada
  const combined = { ...vObj, ...definition };
  const valRes = validateTemplateVersion(combined, { pack, scope: 'TENANT' });
  if (!valRes.ok) {
    return fail('EXPRESSION_INVALID', 'La definición contiene errores de validación', { errors: valRes.errors, warnings: valRes.warnings });
  }

  // 3. Aplicar cambios a través de saveDraft
  const saveRes = saveDraft(template, version, definition);
  if (!saveRes.ok) {
    return fail(saveRes.code || 'VALIDATION_ERROR', saveRes.message);
  }

  // Calcular diffFromPrevious respecto a la versión anterior si version > 1
  if (version > 1) {
    const prevVersion = template.versions.find(v => v.version === version - 1);
    if (prevVersion) {
      saveRes.version.diffFromPrevious = diffVersions(prevVersion, saveRes.version);
    }
  }

  tenantTemplates[tIndex] = template;
  repo.setCollection(ctx.tenantId, 'templates', tenantTemplates);

  // 4. Registrar evento de auditoría
  const auditEvent = buildAuditEvent({
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    tenantId: ctx.tenantId,
    traceId: crypto.randomUUID(),
    userId: ctx.userId,
    role: ctx.role,
    action: 'TEMPLATE_DRAFT_SAVED',
    entityType: 'ASTTemplate',
    entityId: template.id,
    detail: {
      version,
      code: template.code,
      linesCount: (combined.lines || []).length
    }
  });
  repo.appendOnly(ctx.tenantId, 'auditLog', [auditEvent]);

  return ok(template);
}

/**
 * Ejecuta las pruebas de una versión de plantilla y persiste el resultado TestRun.
 * @param {Object} ctx - Contexto { tenantId, userId, role }
 * @param {{ templateId: string, version: number }} params
 * @param {Object} [repo] - Repositorio inyectado
 */
export async function runTemplateTests(ctx, { templateId, version }, repo = defaultRepo) {
  const settings = repo.getGlobal('demoSettings');
  await withLatency(settings);

  const authRes = authorize(ctx, 'RUN_TEMPLATE_TESTS', repo);
  if (!authRes.ok) return authRes;

  const ctxRes = resolveTenantContext(repo, ctx);
  if (!ctxRes.ok) return ctxRes;
  const { pack } = ctxRes.data;

  // Buscar plantilla
  let template = null;
  const tenantTemplates = repo.getCollection(ctx.tenantId, 'templates') || [];
  let tIndex = tenantTemplates.findIndex(t => t.id === templateId || t.code === templateId);

  if (tIndex >= 0) {
    template = tenantTemplates[tIndex];
  } else {
    const baseTpl = (pack.baseTemplates || []).find(t => (t.id || t.code) === templateId || t.code === templateId);
    if (baseTpl) {
      template = {
        id: baseTpl.id || baseTpl.code,
        code: baseTpl.code,
        name: baseTpl.name,
        scope: 'PACK',
        versions: [baseTpl]
      };
    }
  }

  if (!template) {
    return fail('NOT_FOUND', `Plantilla '${templateId}' no encontrada`);
  }

  const vObj = template.versions.find(v => v.version === version);
  if (!vObj) {
    return fail('NOT_FOUND', `Versión ${version} no encontrada en la plantilla '${templateId}'`);
  }

  const chart = repo.getCollection(ctx.tenantId, 'chartOfAccounts') || [];
  const mappings = repo.getCollection(ctx.tenantId, 'accountMappings') || [];
  const tenantMapping = mappings[mappings.length - 1] || { entries: [] };

  const testResults = runTests(vObj, {
    pack,
    tenantMapping,
    chart,
    functionalCurrency: pack.defaultFunctionalCurrency || 'PEN'
  });

  const canonicalStr = contentForHash(vObj);
  const hash = await sha256(canonicalStr);

  const testRun = {
    at: new Date().toISOString(),
    tenantId: ctx.tenantId,
    contentHash: hash,
    results: testResults.results
  };

  if (template.scope === 'TENANT') {
    vObj.lastTestRun = testRun;
    tenantTemplates[tIndex] = template;
    repo.setCollection(ctx.tenantId, 'templates', tenantTemplates);
  } else {
    const packTestRuns = repo.getCollection(ctx.tenantId, 'packTestRuns') || {};
    packTestRuns[`${template.id}@${version}`] = testRun;
    repo.setCollection(ctx.tenantId, 'packTestRuns', packTestRuns);
  }

  const auditEvent = buildAuditEvent({
    id: crypto.randomUUID(),
    at: testRun.at,
    tenantId: ctx.tenantId,
    traceId: crypto.randomUUID(),
    userId: ctx.userId,
    role: ctx.role,
    action: 'TEMPLATE_TESTS_RUN',
    entityType: 'ASTTemplate',
    entityId: template.id,
    detail: {
      version,
      pass: testResults.ok,
      resultsCount: testResults.results.length
    }
  });
  repo.appendOnly(ctx.tenantId, 'auditLog', [auditEvent]);

  return ok(testRun);
}

/**
 * Activa una versión de plantilla para la empresa actual tras verificar requisitos.
 * @param {Object} ctx - Contexto { tenantId, userId, role }
 * @param {{ templateId: string, version: number }} params
 * @param {Object} [repo] - Repositorio inyectado
 */
export async function activateTemplate(ctx, { templateId, version }, repo = defaultRepo) {
  const settings = repo.getGlobal('demoSettings');
  await withLatency(settings);

  const authRes = authorize(ctx, 'ACTIVATE_TEMPLATES', repo);
  if (!authRes.ok) return authRes;

  const ctxRes = resolveTenantContext(repo, ctx);
  if (!ctxRes.ok) return ctxRes;
  const { pack } = ctxRes.data;

  // Buscar plantilla
  let template = null;
  const tenantTemplates = repo.getCollection(ctx.tenantId, 'templates') || [];
  let tIndex = tenantTemplates.findIndex(t => t.id === templateId || t.code === templateId);

  if (tIndex >= 0) {
    template = tenantTemplates[tIndex];
  } else {
    const baseTpl = (pack.baseTemplates || []).find(t => (t.id || t.code) === templateId || t.code === templateId);
    if (baseTpl) {
      template = {
        id: baseTpl.id || baseTpl.code,
        code: baseTpl.code,
        name: baseTpl.name,
        scope: 'PACK',
        versions: [baseTpl]
      };
    }
  }

  if (!template) {
    return fail('NOT_FOUND', `Plantilla '${templateId}' no encontrada`);
  }

  const vObj = template.versions.find(v => v.version === version);
  if (!vObj) {
    return fail('NOT_FOUND', `Versión ${version} no encontrada en la plantilla '${templateId}'`);
  }

  const chart = repo.getCollection(ctx.tenantId, 'chartOfAccounts') || [];
  const mappings = repo.getCollection(ctx.tenantId, 'accountMappings') || [];
  const tenantMapping = mappings[mappings.length - 1] || { entries: [] };

  // Re-ejecutar pruebas sin persistir como verificación final
  const testResults = runTests(vObj, {
    pack,
    tenantMapping,
    chart,
    functionalCurrency: pack.defaultFunctionalCurrency || 'PEN'
  });

  const canonicalStr = contentForHash(vObj);
  const hash = await sha256(canonicalStr);

  const finalTestRun = {
    at: new Date().toISOString(),
    tenantId: ctx.tenantId,
    contentHash: hash,
    results: testResults.results
  };

  const accountCheck = checkTemplateAccounts(vObj, { mapping: tenantMapping, chart });

  // Recopilar activaciones existentes en el tenant para comprobar ambigüedad
  const activations = repo.getCollection(ctx.tenantId, 'templateActivations') || [];
  const activeEntries = activations.filter(a => a.status === 'ACTIVE');

  // Enriquecer activaciones para checkActivation
  const activeInTenant = [];
  for (const act of activeEntries) {
    let actTemplate = tenantTemplates.find(t => t.id === act.templateId);
    let actVersionObj = actTemplate ? actTemplate.versions.find(v => v.version === act.version) : null;

    if (!actVersionObj) {
      const base = (pack.baseTemplates || []).find(t => (t.id || t.code) === act.templateId || t.code === act.templateId);
      if (base) {
        actTemplate = { id: base.id || base.code, scope: 'PACK' };
        actVersionObj = base;
      }
    }

    if (actVersionObj) {
      activeInTenant.push({
        templateId: act.templateId,
        templateCode: actTemplate.code,
        documentTypeCode: actVersionObj.documentTypeCode,
        perspective: actVersionObj.perspective,
        operationTypeCode: actVersionObj.operationTypeCode,
        scope: actTemplate.scope,
        priority: actVersionObj.priority ?? 0
      });
    }
  }

  const check = checkActivation({
    template,
    version: vObj,
    lastTestRun: finalTestRun,
    currentHash: hash,
    accountCheck,
    activeInTenant
  });

  if (!check.ok) {
    return fail('ACTIVATION_BLOCKED', 'Condiciones no cumplidas para activar la plantilla', { errors: check.errors });
  }

  // Marcar versión PUBLISHED si es TENANT
  if (template.scope === 'TENANT') {
    vObj.status = 'PUBLISHED';
    tenantTemplates[tIndex] = template;
    repo.setCollection(ctx.tenantId, 'templates', tenantTemplates);
  }

  // Actualizar activación existente o pasar activaciones previas de la misma plantilla a SUPERSEDED
  let existingForSameVersion = null;
  for (const act of activations) {
    if (act.templateId === template.id) {
      if (act.version === version) {
        existingForSameVersion = act;
      } else if (act.status === 'ACTIVE') {
        act.status = 'SUPERSEDED';
        act.deactivatedAt = finalTestRun.at;
      }
    }
  }

  let newActivation;
  if (existingForSameVersion) {
    existingForSameVersion.status = 'ACTIVE';
    existingForSameVersion.activatedBy = ctx.userId;
    existingForSameVersion.activatedAt = finalTestRun.at;
    existingForSameVersion.deactivatedAt = null;
    existingForSameVersion.testRunAt = finalTestRun.at;
    newActivation = existingForSameVersion;
  } else {
    newActivation = {
      templateId: template.id,
      version,
      status: 'ACTIVE',
      activatedBy: ctx.userId,
      activatedAt: finalTestRun.at,
      deactivatedAt: null,
      testRunAt: finalTestRun.at
    };
    activations.push(newActivation);
  }

  repo.setCollection(ctx.tenantId, 'templateActivations', activations);

  const auditEvent = buildAuditEvent({
    id: crypto.randomUUID(),
    at: finalTestRun.at,
    tenantId: ctx.tenantId,
    traceId: crypto.randomUUID(),
    userId: ctx.userId,
    role: ctx.role,
    action: 'TEMPLATE_ACTIVATED',
    entityType: 'TemplateActivation',
    entityId: template.id,
    detail: {
      version,
      code: template.code,
      scope: template.scope
    }
  });
  repo.appendOnly(ctx.tenantId, 'auditLog', [auditEvent]);

  return ok(newActivation);
}

/**
 * Desactiva una plantilla activa para la empresa.
 * @param {Object} ctx - Contexto { tenantId, userId, role }
 * @param {{ templateId: string }} params
 * @param {Object} [repo] - Repositorio inyectado
 */
export async function deactivateTemplate(ctx, { templateId }, repo = defaultRepo) {
  const settings = repo.getGlobal('demoSettings');
  await withLatency(settings);

  const authRes = authorize(ctx, 'ACTIVATE_TEMPLATES', repo);
  if (!authRes.ok) return authRes;

  const activations = repo.getCollection(ctx.tenantId, 'templateActivations') || [];
  const activeAct = activations.find(a => a.templateId === templateId && a.status === 'ACTIVE');

  if (!activeAct) {
    return fail('NOT_FOUND', `No hay una activación activa para la plantilla '${templateId}'`);
  }

  activeAct.status = 'INACTIVE';
  activeAct.deactivatedAt = new Date().toISOString();
  repo.setCollection(ctx.tenantId, 'templateActivations', activations);

  const auditEvent = buildAuditEvent({
    id: crypto.randomUUID(),
    at: activeAct.deactivatedAt,
    tenantId: ctx.tenantId,
    traceId: crypto.randomUUID(),
    userId: ctx.userId,
    role: ctx.role,
    action: 'TEMPLATE_DEACTIVATED',
    entityType: 'TemplateActivation',
    entityId: templateId,
    detail: {
      version: activeAct.version
    }
  });
  repo.appendOnly(ctx.tenantId, 'auditLog', [auditEvent]);

  return ok(activeAct);
}

/**
 * Crea una nueva versión DRAFT para una plantilla TENANT a partir de una versión previa (RD-10).
 * @param {Object} ctx - Contexto { tenantId, userId, role }
 * @param {{ templateId: string, fromVersion: number }} params
 * @param {Object} [repo] - Repositorio inyectado
 */
export async function createTemplateVersion(ctx, { templateId, fromVersion }, repo = defaultRepo) {
  const settings = repo.getGlobal('demoSettings');
  await withLatency(settings);

  const authRes = authorize(ctx, 'EDIT_TEMPLATES', repo);
  if (!authRes.ok) return authRes;

  const tenantTemplates = repo.getCollection(ctx.tenantId, 'templates') || [];
  const tIndex = tenantTemplates.findIndex(t => t.id === templateId || t.code === templateId);

  if (tIndex < 0) {
    return fail('NOT_FOUND', `Plantilla '${templateId}' no encontrada en la empresa`);
  }

  const template = tenantTemplates[tIndex];
  if (template.retiredAt) {
    return fail('NOT_EDITABLE', 'La plantilla está retirada del catálogo');
  }

  const fromV = template.versions.find(v => v.version === fromVersion);
  if (!fromV) {
    return fail('NOT_FOUND', `Versión origen ${fromVersion} no encontrada en la plantilla`);
  }

  const now = new Date().toISOString();
  const nextV = nextVersionFrom(fromV, { createdBy: ctx.userId, createdAt: now });

  template.versions.push(nextV);
  repo.setCollection(ctx.tenantId, 'templates', tenantTemplates);

  const auditEvent = buildAuditEvent({
    id: crypto.randomUUID(),
    at: now,
    tenantId: ctx.tenantId,
    traceId: crypto.randomUUID(),
    userId: ctx.userId,
    role: ctx.role,
    action: 'TEMPLATE_VERSION_CREATED',
    entityType: 'ASTTemplate',
    entityId: template.id,
    detail: {
      version: nextV.version,
      fromVersion,
      code: template.code
    }
  });
  repo.appendOnly(ctx.tenantId, 'auditLog', [auditEvent]);

  return ok(template);
}

/**
 * Obtiene las diferencias semánticas en español entre dos versiones de una plantilla.
 * @param {Object} ctx - Contexto { tenantId, userId, role }
 * @param {{ templateId: string, fromVersion: number, toVersion: number }} params
 * @param {Object} [repo] - Repositorio inyectado
 */
export async function getTemplateDiff(ctx, { templateId, fromVersion, toVersion }, repo = defaultRepo) {
  const settings = repo.getGlobal('demoSettings');
  await withLatency(settings);

  const authRes = authorize(ctx, 'VIEW_ACCOUNTING_CONFIG', repo);
  if (!authRes.ok) return authRes;

  const ctxRes = resolveTenantContext(repo, ctx);
  if (!ctxRes.ok) return ctxRes;
  const { pack } = ctxRes.data;

  let template = null;
  const tenantTemplates = repo.getCollection(ctx.tenantId, 'templates') || [];
  const t = tenantTemplates.find(t => t.id === templateId || t.code === templateId);

  if (t) {
    template = t;
  } else {
    const base = (pack.baseTemplates || []).find(t => (t.id || t.code) === templateId || t.code === templateId);
    if (base) {
      template = {
        id: base.id || base.code,
        versions: [base]
      };
    }
  }

  if (!template) {
    return fail('NOT_FOUND', `Plantilla '${templateId}' no encontrada`);
  }

  const vFrom = template.versions.find(v => v.version === fromVersion);
  const vTo = template.versions.find(v => v.version === toVersion);

  if (!vFrom || !vTo) {
    return fail('NOT_FOUND', 'Una o ambas versiones no existen en la plantilla');
  }

  const diffs = diffVersions(vFrom, vTo);
  return ok(diffs);
}

/**
 * Retira una plantilla TENANT del catálogo, desactivando sus activaciones activas (RD-10).
 * @param {Object} ctx - Contexto { tenantId, userId, role }
 * @param {{ templateId: string }} params
 * @param {Object} [repo] - Repositorio inyectado
 */
export async function retireTemplate(ctx, { templateId }, repo = defaultRepo) {
  const settings = repo.getGlobal('demoSettings');
  await withLatency(settings);

  const authRes = authorize(ctx, 'EDIT_TEMPLATES', repo);
  if (!authRes.ok) return authRes;

  const tenantTemplates = repo.getCollection(ctx.tenantId, 'templates') || [];
  const tIndex = tenantTemplates.findIndex(t => t.id === templateId || t.code === templateId);

  if (tIndex < 0) {
    return fail('NOT_FOUND', `Plantilla '${templateId}' no encontrada en la empresa o es de paquete`);
  }

  const template = tenantTemplates[tIndex];
  const now = new Date().toISOString();
  template.retiredAt = now;
  repo.setCollection(ctx.tenantId, 'templates', tenantTemplates);

  // Inactivar activaciones vigentes en el tenant
  const activations = repo.getCollection(ctx.tenantId, 'templateActivations') || [];
  for (const act of activations) {
    if (act.templateId === template.id && act.status === 'ACTIVE') {
      act.status = 'INACTIVE';
      act.deactivatedAt = now;
    }
  }
  repo.setCollection(ctx.tenantId, 'templateActivations', activations);

  const auditEvent = buildAuditEvent({
    id: crypto.randomUUID(),
    at: now,
    tenantId: ctx.tenantId,
    traceId: crypto.randomUUID(),
    userId: ctx.userId,
    role: ctx.role,
    action: 'TEMPLATE_RETIRED',
    entityType: 'ASTTemplate',
    entityId: template.id,
    detail: {
      code: template.code,
      name: template.name
    }
  });
  repo.appendOnly(ctx.tenantId, 'auditLog', [auditEvent]);

  return ok(template);
}

/**
 * Marca una versión de plantilla como usada con fines de demostración (RD-10).
 * Solo permitido cuando demoSettings.demoMode === true.
 * @param {Object} ctx - Contexto { tenantId, userId, role }
 * @param {{ templateId: string, version: number }} params
 * @param {Object} [repo] - Repositorio inyectado
 */
export async function markTemplateUsedForDemo(ctx, { templateId, version }, repo = defaultRepo) {
  const settings = repo.getGlobal('demoSettings') || {};
  if (!settings.demoMode) {
    return fail('FORBIDDEN', 'Esta operación solo está disponible en modo demostración (demoMode)');
  }

  const authRes = authorize(ctx, 'EDIT_TEMPLATES', repo);
  if (!authRes.ok) return authRes;

  return accountingEngine.recordTemplateUsage(ctx, { templateId, version }, repo);
}


