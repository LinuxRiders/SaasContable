import { can } from '../../domain/ingestion/permissions.js';
import { isReadOnly } from '../../domain/ingestion/periods.js';
import { buildAuditEvent } from '../../domain/ingestion/audit.js';

export function ok(data) {
  return { ok: true, data };
}

export function fail(code, message, details = {}) {
  return { ok: false, error: { code, message, details } };
}

export async function withLatency(settings) {
  if (!settings || !settings.latencyMs) return;
  return new Promise(resolve => setTimeout(resolve, settings.latencyMs));
}

export function validateCtx(ctx, repo) {
  if (!ctx || !ctx.tenantId) {
    return fail('VALIDATION_ERROR', 'Contexto inválido: falta empresa');
  }
  const empresas = repo.getGlobal('empresas') || [];
  const emp = empresas.find(e => e.id === ctx.tenantId);
  if (!emp && ctx.tenantId !== 'global') {
    return fail('VALIDATION_ERROR', 'Empresa desconocida');
  }
  return ok(emp);
}

export function authorize(ctx, operation, repo, clock = () => new Date().toISOString()) {
  if (!ctx || !can(ctx.role, operation)) {
    const event = buildAuditEvent({
      id: crypto.randomUUID(),
      at: clock(),
      tenantId: ctx?.tenantId || 'global',
      traceId: crypto.randomUUID(),
      userId: ctx?.userId || 'unknown',
      role: ctx?.role || 'UNKNOWN',
      action: 'ACTION_DENIED',
      entityType: 'Operation',
      entityId: operation,
      detail: { reason: `Role ${ctx?.role} cannot perform ${operation}` }
    });
    if (ctx?.tenantId && ctx.tenantId !== 'global') {
      repo.appendOnly(ctx.tenantId, 'auditLog', [event]);
    } else {
      repo.appendOnly('global', 'auditLog', [event]);
    }
    return fail('FORBIDDEN', `El rol ${ctx?.role} no tiene permiso para ${operation}`);
  }
  return ok(true);
}

export function assertWritablePeriod(ctx, repo, clock = () => new Date().toISOString()) {
  const empRes = validateCtx(ctx, repo);
  if (!empRes.ok) return empRes;
  const emp = empRes.data;
  if (isReadOnly(emp, ctx?.activePeriod)) {
    const event = buildAuditEvent({
      id: crypto.randomUUID(),
      at: clock(),
      tenantId: ctx.tenantId,
      traceId: crypto.randomUUID(),
      userId: ctx.userId,
      role: ctx.role,
      action: 'ACTION_DENIED',
      entityType: 'Period',
      entityId: ctx.activePeriod?.nombrePeriodo || 'DESCONOCIDO',
      detail: { reason: 'Period is closed' }
    });
    repo.appendOnly(ctx.tenantId, 'auditLog', [event]);
    return fail('PERIOD_READ_ONLY', 'El periodo activo está cerrado; no se permiten escrituras');
  }
  return ok(true);
}

export const clock = () => new Date().toISOString();
export const idGenerator = () => crypto.randomUUID();
export const sha256 = async (str) => {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const msgUint8 = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return 'fallback-' + Date.now();
};

export const injectables = {
  clock,
  idGenerator,
  hashEngine: sha256
};

export const serviceKit = {
  ok,
  fail,
  withLatency,
  validateCtx,
  authorize,
  assertWritablePeriod,
  clock,
  idGenerator,
  sha256,
  injectables
};

export default serviceKit;

