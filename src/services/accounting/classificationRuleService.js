import * as defaultRepo from '../storage/repository.js';
import { ok, fail, withLatency, authorize } from '../ingestion/serviceKit.js';
import { buildAuditEvent } from '../../domain/ingestion/audit.js';
import { resolveTenantContext } from './context.js';
import { validateExpression } from '../../domain/accounting/expressions/validate.js';
import { getDocumentType } from '../../domain/accounting/catalog.js';
import { classify } from '../../domain/accounting/classification.js';

/**
 * Construye un tipo de documento con la unión de todos los campos de cabecera y línea del paquete.
 * @param {import('../../domain/accounting/types.js').JurisdictionPack} pack
 */
function buildUnionDocumentType(pack) {
  const union = {
    code: 'UNION',
    headerFields: [],
    lineFields: []
  };

  for (const dt of (pack?.documentTypes || [])) {
    for (const hf of (dt.headerFields || [])) {
      if (!union.headerFields.some(f => f.key === hf.key)) {
        union.headerFields.push(hf);
      }
    }
    for (const lf of (dt.lineFields || [])) {
      if (!union.lineFields.some(f => f.key === lf.key)) {
        union.lineFields.push(lf);
      }
    }
  }

  return union;
}

/**
 * Lista las reglas de clasificación de la empresa, opcionalmente filtradas por estado.
 * @param {Object} ctx - Contexto { tenantId, userId, role }
 * @param {{ status?: 'ACTIVE'|'PROPOSED'|'RETIRED' }} [params]
 * @param {Object} [repo]
 */
export async function listClassificationRules(ctx, { status } = {}, repo = defaultRepo) {
  const settings = repo.getGlobal('demoSettings');
  await withLatency(settings);

  const authRes = authorize(ctx, 'VIEW_ACCOUNTING_CONFIG', repo);
  if (!authRes.ok) return authRes;

  const rules = repo.getCollection(ctx.tenantId, 'classificationRules') || [];
  if (status) {
    return ok(rules.filter(r => r.status === status));
  }

  return ok(rules);
}

/**
 * Guarda una regla de clasificación (nueva o editada). Incrementa versión y audita.
 * @param {Object} ctx - Contexto { tenantId, userId, role }
 * @param {{ rule: Object }} params
 * @param {Object} [repo]
 */
export async function saveClassificationRule(ctx, { rule }, repo = defaultRepo) {
  const settings = repo.getGlobal('demoSettings');
  await withLatency(settings);

  const authRes = authorize(ctx, 'EDIT_CLASSIFICATION_RULES', repo);
  if (!authRes.ok) return authRes;

  const ctxRes = resolveTenantContext(repo, ctx);
  if (!ctxRes.ok) return ctxRes;
  const { pack } = ctxRes.data;

  // 1. Validar la expresión condicional contra la unión de campos del paquete
  const unionDocType = buildUnionDocumentType(pack);
  const valRes = validateExpression(rule.condition, {
    documentType: unionDocType,
    inLineContext: rule.scope === 'LINE',
    expectedType: 'BOOL'
  });

  if (!valRes.ok) {
    return fail('EXPRESSION_INVALID', 'La condición de la regla es inválida', { errors: valRes.errors });
  }

  // 2. Persistir
  const rules = repo.getCollection(ctx.tenantId, 'classificationRules') || [];
  let savedRule;

  if (rule.id) {
    const idx = rules.findIndex(r => r.id === rule.id);
    if (idx >= 0) {
      const existing = rules[idx];
      const nextVersion = (existing.version || 1) + 1;
      savedRule = {
        ...existing,
        ...rule,
        version: nextVersion,
        updatedAt: new Date().toISOString(),
        updatedBy: ctx.userId
      };
      rules[idx] = savedRule;
    } else {
      savedRule = {
        ...rule,
        tenantId: ctx.tenantId,
        version: 1,
        createdAt: new Date().toISOString(),
        createdBy: ctx.userId
      };
      rules.push(savedRule);
    }
  } else {
    savedRule = {
      ...rule,
      id: `cr-${Date.now().toString().slice(-6)}`,
      tenantId: ctx.tenantId,
      version: 1,
      createdAt: new Date().toISOString(),
      createdBy: ctx.userId
    };
    rules.push(savedRule);
  }

  repo.setCollection(ctx.tenantId, 'classificationRules', rules);

  // 3. Auditoría
  const auditEvent = buildAuditEvent({
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    tenantId: ctx.tenantId,
    traceId: crypto.randomUUID(),
    userId: ctx.userId,
    role: ctx.role,
    action: 'CLASSIFICATION_RULE_SAVED',
    entityType: 'ClassificationRule',
    entityId: savedRule.id,
    detail: {
      name: savedRule.name,
      version: savedRule.version,
      scope: savedRule.scope,
      status: savedRule.status
    }
  });
  repo.appendOnly(ctx.tenantId, 'auditLog', [auditEvent]);

  return ok(savedRule);
}

/**
 * Cambia el estado de una regla de clasificación (p. ej. ACTIVE a RETIRED o PROPOSED a ACTIVE).
 * @param {Object} ctx - Contexto { tenantId, userId, role }
 * @param {{ ruleId: string, status: 'ACTIVE'|'RETIRED'|'PROPOSED' }} params
 * @param {Object} [repo]
 */
export async function setClassificationRuleStatus(ctx, { ruleId, status }, repo = defaultRepo) {
  const settings = repo.getGlobal('demoSettings');
  await withLatency(settings);

  const authRes = authorize(ctx, 'EDIT_CLASSIFICATION_RULES', repo);
  if (!authRes.ok) return authRes;

  const rules = repo.getCollection(ctx.tenantId, 'classificationRules') || [];
  const rule = rules.find(r => r.id === ruleId);

  if (!rule) {
    return fail('NOT_FOUND', `Regla con ID '${ruleId}' no encontrada`);
  }

  const previousStatus = rule.status;
  rule.status = status;
  rule.updatedAt = new Date().toISOString();
  rule.updatedBy = ctx.userId;

  repo.setCollection(ctx.tenantId, 'classificationRules', rules);

  const auditEvent = buildAuditEvent({
    id: crypto.randomUUID(),
    at: rule.updatedAt,
    tenantId: ctx.tenantId,
    traceId: crypto.randomUUID(),
    userId: ctx.userId,
    role: ctx.role,
    action: 'CLASSIFICATION_RULE_STATUS_CHANGED',
    entityType: 'ClassificationRule',
    entityId: ruleId,
    detail: {
      previousStatus,
      newStatus: status,
      version: rule.version
    }
  });
  repo.appendOnly(ctx.tenantId, 'auditLog', [auditEvent]);

  return ok(rule);
}

/**
 * Simula la clasificación contable de un documento canónico sin persistir nada.
 * @param {Object} ctx - Contexto { tenantId, userId, role }
 * @param {{ document: Object }} params
 * @param {Object} [repo]
 */
export async function testClassification(ctx, { document }, repo = defaultRepo) {
  const settings = repo.getGlobal('demoSettings');
  await withLatency(settings);

  const authRes = authorize(ctx, 'SIMULATE', repo);
  if (!authRes.ok) return authRes;

  const ctxRes = resolveTenantContext(repo, ctx);
  if (!ctxRes.ok) return ctxRes;
  const { pack } = ctxRes.data;

  const documentType = getDocumentType(pack, document.documentTypeCode, document.issueDate);
  const rules = repo.getCollection(ctx.tenantId, 'classificationRules') || [];

  const classificationResult = classify(document, { pack, documentType, rules });

  return ok(classificationResult);
}

