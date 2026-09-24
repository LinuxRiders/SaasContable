import * as defaultRepo from '../storage/repository.js';
import { ok, fail, withLatency, authorize } from '../ingestion/serviceKit.js';
import { buildAuditEvent } from '../../domain/ingestion/audit.js';
import { resolveTenantContext } from './context.js';
import { validateMapping, preloadMapping, diffMappingRoles } from '../../domain/accounting/accountMapping.js';
import { rolesUsedBy } from '../../domain/accounting/accountResolution.js';

/**
 * Obtiene la versión activa del mapa de cuentas de la empresa.
 * @param {Object} ctx - Contexto { tenantId, userId, role }
 * @param {Object} [repo] - Repositorio inyectado
 */
export async function getAccountMapping(ctx, repo = defaultRepo) {
  const settings = repo.getGlobal('demoSettings');
  await withLatency(settings);

  const authRes = authorize(ctx, 'VIEW_ACCOUNTING_CONFIG', repo);
  if (!authRes.ok) return authRes;

  const ctxRes = resolveTenantContext(repo, ctx);
  if (!ctxRes.ok) return ctxRes;
  const { pack, chart } = ctxRes.data;

  const versions = repo.getCollection(ctx.tenantId, 'accountMappings') || [];
  const activeVersion = versions[versions.length - 1];

  if (!activeVersion) {
    return fail('NOT_FOUND', `No existe mapa de cuentas para la empresa '${ctx.tenantId}'`);
  }

  // Enriquecer entradas con la descripción de la cuenta
  const enrichedEntries = activeVersion.entries.map(entry => {
    const acc = chart.find(a => a.codigo === entry.accountCode);
    return {
      ...entry,
      accountDescription: acc ? acc.descripcion : '(Cuenta no encontrada en plan)'
    };
  });

  // Calcular unmappedRoles respecto a los roles del paquete
  const mappedKeys = new Set(activeVersion.entries.map(e => `${e.roleCode}::${e.qualifier || ''}`));
  const unmappedRoles = [];

  for (const role of pack.accountRoles || []) {
    if (role.qualifier?.suggestions) {
      for (const qualVal of Object.keys(role.qualifier.suggestions)) {
        if (!mappedKeys.has(`${role.code}::${qualVal}`)) {
          unmappedRoles.push(role.code);
        }
      }
    } else {
      if (!mappedKeys.has(`${role.code}::`)) {
        unmappedRoles.push(role.code);
      }
    }
  }

  return ok({
    tenantId: activeVersion.tenantId,
    version: activeVersion.version,
    updatedAt: activeVersion.updatedAt,
    updatedBy: activeVersion.updatedBy,
    changedRoles: activeVersion.changedRoles || [],
    entries: enrichedEntries,
    unmappedRoles: Array.from(new Set(unmappedRoles)),
    chart: chart.map(a => ({
      codigo: a.codigo,
      descripcion: a.descripcion,
      esCuentaU: !!a.esCuentaU,
      activo: a.activo !== false
    }))
  });
}

/**
 * Analiza el impacto de roles sin mapear en las plantillas contables.
 * @param {Object} ctx - Contexto { tenantId, userId, role }
 * @param {Object} [repo] - Repositorio inyectado
 */
export async function getMappingImpact(ctx, repo = defaultRepo) {
  const settings = repo.getGlobal('demoSettings');
  await withLatency(settings);

  const authRes = authorize(ctx, 'VIEW_ACCOUNTING_CONFIG', repo);
  if (!authRes.ok) return authRes;

  const mappingRes = await getAccountMapping(ctx, repo);
  if (!mappingRes.ok) return mappingRes;
  const { unmappedRoles } = mappingRes.data;

  const ctxRes = resolveTenantContext(repo, ctx);
  if (!ctxRes.ok) return ctxRes;
  const { pack } = ctxRes.data;

  // Plantillas base del paquete y plantillas del tenant
  const tenantTemplates = repo.getCollection(ctx.tenantId, 'templates') || [];
  const baseTemplates = (pack.baseTemplates || []).map(t => ({
    ...t,
    currentVersion: t.version || 1
  }));
  const allTemplates = [...baseTemplates, ...tenantTemplates];

  const impact = [];
  for (const t of allTemplates) {
    const vObj = t.lines ? t : (t.versions && t.versions[t.versions.length - 1]);
    if (!vObj) continue;

    const used = rolesUsedBy(vObj);
    const blockedRoles = used.roles.filter(r => unmappedRoles.includes(r));
    if (blockedRoles.length > 0) {
      impact.push({
        templateId: t.id || t.code,
        templateName: t.name,
        scope: t.scope || 'PACK',
        blockedRoles
      });
    }
  }

  return ok(impact);
}

/**
 * Guarda una nueva versión del mapa de cuentas de la empresa.
 * @param {Object} ctx - Contexto { tenantId, userId, role }
 * @param {{ expectedVersion: number, entries: Array<{ roleCode: string, qualifier?: string|null, accountCode: string }> }} params
 * @param {Object} [repo] - Repositorio inyectado
 */
export async function saveAccountMapping(ctx, { expectedVersion, entries }, repo = defaultRepo) {
  const settings = repo.getGlobal('demoSettings');
  await withLatency(settings);

  const authRes = authorize(ctx, 'EDIT_ACCOUNT_MAPPING', repo);
  if (!authRes.ok) return authRes;

  const ctxRes = resolveTenantContext(repo, ctx);
  if (!ctxRes.ok) return ctxRes;
  const { pack, chart } = ctxRes.data;

  // 1. Validar entradas
  const valRes = validateMapping(entries, { pack, chart });
  if (!valRes.ok) {
    return fail('VALIDATION_ERROR', 'Existen errores de validación en las cuentas asignadas', { errors: valRes.errors });
  }

  // 2. Verificar versión esperada (control de concurrencia optimista)
  const versions = repo.getCollection(ctx.tenantId, 'accountMappings') || [];
  const current = versions[versions.length - 1];
  if (current && current.version !== expectedVersion) {
    return fail('CONFLICT', `El mapa de cuentas fue modificado concurrentemente (versión actual: ${current.version}, esperada: ${expectedVersion})`);
  }

  // 3. Determinar roles modificados
  const prevEntries = current ? current.entries : [];
  const changedRoles = diffMappingRoles(prevEntries, entries);

  // 4. Crear nueva versión
  const nextVersionNum = current ? current.version + 1 : 1;
  const newVersion = {
    tenantId: ctx.tenantId,
    version: nextVersionNum,
    entries: entries.map(e => ({
      roleCode: e.roleCode,
      qualifier: e.qualifier || null,
      accountCode: e.accountCode
    })),
    updatedAt: new Date().toISOString(),
    updatedBy: ctx.userId,
    changedRoles
  };

  versions.push(newVersion);
  repo.setCollection(ctx.tenantId, 'accountMappings', versions);

  // 5. Registrar evento de auditoría
  const auditEvent = buildAuditEvent({
    id: crypto.randomUUID(),
    at: newVersion.updatedAt,
    tenantId: ctx.tenantId,
    traceId: crypto.randomUUID(),
    userId: ctx.userId,
    role: ctx.role,
    action: 'ACCOUNT_MAPPING_SAVED',
    entityType: 'AccountMapping',
    entityId: `v${newVersion.version}`,
    detail: {
      version: newVersion.version,
      changedRoles,
      totalEntries: newVersion.entries.length
    }
  });
  repo.appendOnly(ctx.tenantId, 'auditLog', [auditEvent]);

  return ok(newVersion);
}

/**
 * Sugiere asignaciones precargadas sin persistir.
 * @param {Object} ctx - Contexto { tenantId, userId, role }
 * @param {Object} [repo] - Repositorio inyectado
 */
export async function suggestMapping(ctx, repo = defaultRepo) {
  const settings = repo.getGlobal('demoSettings');
  await withLatency(settings);

  const authRes = authorize(ctx, 'EDIT_ACCOUNT_MAPPING', repo);
  if (!authRes.ok) return authRes;

  const ctxRes = resolveTenantContext(repo, ctx);
  if (!ctxRes.ok) return ctxRes;
  const { pack, chart } = ctxRes.data;

  const versions = repo.getCollection(ctx.tenantId, 'accountMappings') || [];
  const current = versions[versions.length - 1];
  const existing = current ? current.entries : [];

  const suggested = preloadMapping(pack, chart, existing);
  return ok(suggested);
}

/**
 * Obtiene el historial de versiones del mapa de cuentas de la empresa.
 * @param {Object} ctx - Contexto { tenantId, userId, role }
 * @param {Object} [repo] - Repositorio inyectado
 */
export async function listMappingVersions(ctx, repo = defaultRepo) {
  const settings = repo.getGlobal('demoSettings');
  await withLatency(settings);

  const authRes = authorize(ctx, 'VIEW_CONFIG_AUDIT', repo);
  if (!authRes.ok) return authRes;

  const versions = repo.getCollection(ctx.tenantId, 'accountMappings') || [];
  return ok(versions);
}
